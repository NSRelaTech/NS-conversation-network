import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: { id: string; username: string };
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

export function CommentSection({ postId }: { postId: string }) {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api<any>(`/posts/${postId}/comments`),
  });

  const comments: Comment[] = data?.data ?? [];

  const createComment = useMutation({
    mutationFn: () =>
      api<any>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['group-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      api<any>(`/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['group-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      {isLoading && <p className="text-xs text-stone-400">Loading comments...</p>}

      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarFallback className="bg-stone-200 text-stone-600 text-[10px]">
              {comment.author.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stone-900">{comment.author.username}</span>
              <span className="text-xs text-stone-400">{timeAgo(comment.createdAt)}</span>
              {currentUserId === comment.authorId && (
                <button
                  onClick={() => {
                    if (confirm('Delete comment?')) deleteComment.mutate(comment.id);
                  }}
                  className="ml-auto text-stone-400 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-sm text-stone-700 break-words">{comment.content}</p>
          </div>
        </div>
      ))}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (content.trim()) createComment.mutate();
        }}
      >
        <Input
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="text-sm h-10"
        />
        <Button
          type="submit"
          size="sm"
          className="h-10 px-3"
          disabled={!content.trim() || createComment.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
