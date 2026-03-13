import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { Button } from '@/components/ui/button';

interface FeedResponse {
  success: boolean;
  data: any[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function FeedPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return api<FeedResponse>(`/feed?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor ?? undefined,
  });

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="space-y-4">
      <CreatePostForm />

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
        <p className="text-center text-stone-400 py-8">
          No posts yet. Be the first to share something!
        </p>
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
