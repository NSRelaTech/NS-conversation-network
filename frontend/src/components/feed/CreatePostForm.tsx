import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

export function CreatePostForm() {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: () =>
      api<any>('/posts', {
        method: 'POST',
        body: JSON.stringify({ content, visibility: 'public' }),
      }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={5000}
          rows={3}
          className="resize-none"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-stone-400">{content.length}/5000</span>
          <Button
            size="sm"
            disabled={!content.trim() || createPost.isPending}
            onClick={() => createPost.mutate()}
          >
            {createPost.isPending ? 'Posting...' : 'Post'}
          </Button>
        </div>
        {createPost.error && (
          <p className="mt-2 text-sm text-red-500">{createPost.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
