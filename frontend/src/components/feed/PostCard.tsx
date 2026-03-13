import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CommentSection } from './CommentSection';

interface PostAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  profilePictureUrl: string | null;
}

interface PostGroup {
  id: string;
  name: string;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  author: PostAuthor;
  group?: PostGroup | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  userReaction?: string | null;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwner = currentUserId === post.authorId;
  const [liked, setLiked] = useState(!!post.userReaction);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);

  // Sync from server when feed refetches
  useEffect(() => {
    setLiked(!!post.userReaction);
    setLikesCount(post.likesCount);
  }, [post.userReaction, post.likesCount]);

  const toggleLike = useMutation({
    mutationFn: () =>
      api<any>(`/posts/${post.id}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type: 'like' }),
      }),
    onMutate: () => {
      setLiked((prev) => !prev);
      setLikesCount((prev) => liked ? prev - 1 : prev + 1);
    },
    onSuccess: (data) => {
      const action = data?.data?.action;
      if (action === 'added') {
        setLiked(true);
      } else if (action === 'removed') {
        setLiked(false);
      }
    },
    onError: () => {
      setLiked((prev) => !prev);
      setLikesCount(post.likesCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const deletePost = useMutation({
    mutationFn: () =>
      api<any>(`/posts/${post.id}`, { method: 'DELETE' }),
    onMutate: () => {
      // Optimistically remove post from all feed caches
      const removPost = (old: any) => {
        if (!old) return old;
        // InfiniteQuery structure: { pages: [{ data: [...] }] }
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: (page.data || []).filter((p: any) => p.id !== post.id),
            })),
          };
        }
        // Regular query structure: { data: [...] }
        if (old.data) {
          return { ...old, data: old.data.filter((p: any) => p.id !== post.id) };
        }
        return old;
      };
      queryClient.setQueriesData({ queryKey: ['feed'] }, removPost);
      queryClient.setQueriesData({ queryKey: ['group-feed'] }, removPost);
      queryClient.setQueriesData({ queryKey: ['user-posts'] }, removPost);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['group-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });

  const initials = post.author.username.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            {post.author.profilePictureUrl && <AvatarImage src={post.author.profilePictureUrl} />}
            <AvatarFallback className="bg-stone-200 text-stone-600 text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-900">{post.author.displayName || post.author.username}</span>
              {post.author.displayName && (
                <span className="text-sm text-stone-400">@{post.author.username}</span>
              )}
              <span className="text-sm text-stone-400">{timeAgo(post.createdAt)}</span>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 w-7 p-0 text-stone-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm('Delete this post?')) deletePost.mutate();
                  }}
                  disabled={deletePost.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {post.group && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-stone-400">
                <Users className="h-3 w-3" />
                <span>{post.group.name}</span>
              </div>
            )}
            <p className="mt-1 text-stone-700 whitespace-pre-wrap break-words">{post.content}</p>
            <div className="mt-3 flex gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 ${liked ? 'text-red-500' : 'text-stone-500'}`}
                onClick={() => toggleLike.mutate()}
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-stone-500"
                onClick={() => setShowComments((prev) => !prev)}
              >
                <MessageCircle className="h-4 w-4" />
                {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
              </Button>
            </div>
            {showComments && <CommentSection postId={post.id} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
