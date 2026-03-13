import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostForm } from '@/components/feed/CreatePostForm';
import { FeedSortToggle, type FeedSort } from '@/components/feed/FeedSortToggle';
import { JoinLeaveButton } from '@/components/groups/JoinLeaveButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function GroupDetailPage() {
  const { slug: groupId } = useParams<{ slug: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<FeedSort>('latest');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

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
  const isAdmin = membersData?.members?.some((m: any) => m.userId === userId && m.role === 'ADMIN') ?? false;

  const updateGroup = useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      api<any>(`/groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: () => api<any>(`/groups/${groupId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      navigate('/groups');
    },
  });

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['group-feed', groupId, sort],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20', sort });
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
        {editing ? (
          <div className="space-y-3">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
            />
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateGroup.mutate({ name: editName, description: editDescription })}
                disabled={!editName.trim() || updateGroup.isPending}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
            {updateGroup.error && (
              <p className="text-sm text-red-500">{updateGroup.error.message}</p>
            )}
          </div>
        ) : (
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
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditName(group.name);
                      setEditDescription(group.description || '');
                      setEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Delete this group? This cannot be undone.')) deleteGroup.mutate();
                    }}
                    disabled={deleteGroup.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <JoinLeaveButton groupId={group.id} isMember={isMember} />
            </div>
          </div>
        )}
      </div>

      {/* Group feed */}
      <div className="space-y-4">
        {isMember && <CreatePostForm groupId={group.id} />}
        <FeedSortToggle value={sort} onChange={setSort} />

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
