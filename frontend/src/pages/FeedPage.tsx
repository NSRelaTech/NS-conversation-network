import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { FeedSortToggle, type FeedSort } from '@/components/feed/FeedSortToggle';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface FeedResponse {
  success: boolean;
  data: any[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function FeedPage() {
  const [sort, setSort] = useState<FeedSort>('latest');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['feed', sort],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20', sort });
      if (pageParam) params.set('cursor', pageParam);
      return api<FeedResponse>(`/feed?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor ?? undefined,
  });

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Feed</h1>
        <p className="text-sm text-stone-500 mt-0.5">Posts from people and groups you follow</p>
      </div>
      <CreatePostForm />
      <FeedSortToggle value={sort} onChange={setSort} />

      {isLoading && (
        <p className="text-center text-stone-400 py-8">Loading feed...</p>
      )}

      {error && (
        <p className="text-center text-red-500 py-8">{error.message}</p>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {posts.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="rounded-full bg-stone-100 p-4 mb-4">
            <MessageCircle className="h-8 w-8 text-stone-400" />
          </div>
          <p className="text-stone-600 font-medium">No posts yet</p>
          <p className="text-sm text-stone-400 mt-1">Start a conversation or join a group to see posts here</p>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
