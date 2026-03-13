import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { JoinLeaveButton } from '@/components/groups/JoinLeaveButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function GroupDetailPage() {
  const { slug: groupId } = useParams<{ slug: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const { data: group, isLoading, error } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api<any>(`/groups/${groupId}`),
    enabled: !!groupId,
  });

  const { data: membersData } = useQuery({
    queryKey: ['group', groupId, 'members'],
    queryFn: () => api<any>(`/groups/${groupId}/members`),
    enabled: !!groupId,
  });

  const isMember = membersData?.members?.some((m: any) => m.userId === userId) ?? false;

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['group-feed', groupId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);
      return api<any>(`/groups/${groupId}/feed?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor ?? undefined,
    enabled: !!groupId,
  });

  const posts = feedData?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) return <p className="text-center text-stone-400 py-8">Loading group...</p>;
  if (error) return <p className="text-center text-red-500 py-8">{error.message}</p>;
  if (!group) return <p className="text-center text-stone-400 py-8">Group not found</p>;

  return (
    <div className="space-y-6">
      {/* Group header */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-stone-900">{group.name}</h1>
              <Badge variant={group.privacy === 'public' ? 'secondary' : 'outline'}>
                {group.privacy}
              </Badge>
            </div>
            {group.description && (
              <p className="mt-2 text-stone-600">{group.description}</p>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-sm text-stone-400">
              <Users className="h-3.5 w-3.5" />
              <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
          <JoinLeaveButton groupId={group.id} isMember={isMember} />
        </div>
      </div>

      {/* Group feed */}
      <div className="space-y-4">
        {isMember && <CreatePostForm />}

        {posts.map((post: any) => (
          <PostCard key={post.id} post={post} />
        ))}

        {posts.length === 0 && (
          <p className="text-center text-stone-400 py-8">No posts in this group yet.</p>
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
    </div>
  );
}
