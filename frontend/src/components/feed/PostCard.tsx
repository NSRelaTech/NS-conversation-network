import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PostAuthor {
  id: string;
  username: string;
  profilePictureUrl: string | null;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  author: PostAuthor;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
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
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);

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
    onError: () => {
      setLiked((prev) => !prev);
      setLikesCount(post.likesCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const initials = post.author.username.slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-stone-200 text-stone-600 text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-stone-900">{post.author.username}</span>
              <span className="text-sm text-stone-400">{timeAgo(post.createdAt)}</span>
            </div>
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
              <Button variant="ghost" size="sm" className="gap-1.5 text-stone-500">
                <MessageCircle className="h-4 w-4" />
                {post.commentsCount > 0 && <span>{post.commentsCount}</span>}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
