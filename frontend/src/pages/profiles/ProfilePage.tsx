import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProfileHeader } from '@/components/profiles/ProfileHeader';
import { PostCard } from '@/components/feed/PostCard';
import { FeedSortToggle, type FeedSort } from '@/components/feed/FeedSortToggle';
import { Button } from '@/components/ui/button';

export function ProfilePage() {
  const [sort, setSort] = useState<FeedSort>('latest');
  const { username: userId } = useParams<{ username: string }>();

  const { data: profileResult, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api<any>(`/profiles/${userId}`),
    enabled: !!userId,
  });

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['user-posts', userId, sort],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20', sort });
      if (pageParam) params.set('cursor', pageParam);
      return api<any>(`/users/${userId}/posts?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor ?? undefined,
    enabled: !!userId,
  });

  const posts = postsData?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) return <p className="text-center text-stone-400 py-8">Loading profile...</p>;
  if (error) return <p className="text-center text-red-500 py-8">{error.message}</p>;

  const profile = profileResult?.data;
  if (!profile) return <p className="text-center text-stone-400 py-8">Profile not found</p>;

  return (
    <div className="space-y-4">
      <ProfileHeader profile={profile} />
      <FeedSortToggle value={sort} onChange={setSort} />

      {posts.map((post: any) => (
        <PostCard key={post.id} post={post} />
      ))}

      {posts.length === 0 && (
        <p className="text-center text-stone-400 py-8">No posts yet.</p>
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
