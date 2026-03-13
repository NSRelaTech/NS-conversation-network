import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { GroupCard } from '@/components/groups/GroupCard';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GroupsResponse {
  groups: any[];
  total: number;
}

export function GroupsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api<GroupsResponse>('/groups?limit=50'),
  });

  const groups = data?.groups ?? [];
  const filtered = search
    ? groups.filter((g: any) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Groups</h1>
          <p className="text-sm text-stone-500 mt-0.5">Communities you can join and participate in</p>
        </div>
        <Link to="/groups/create" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4 mr-1" />
          New group
        </Link>
      </div>
      <Input
        placeholder="Search groups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading && <p className="text-center text-stone-400 py-8">Loading groups...</p>}
      {error && <p className="text-center text-red-500 py-8">{error.message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((group: any) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>

      {filtered.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="rounded-full bg-stone-100 p-4 mb-4">
            <Users className="h-8 w-8 text-stone-400" />
          </div>
          <p className="text-stone-600 font-medium">{search ? 'No groups match your search' : 'No groups yet'}</p>
          <p className="text-sm text-stone-400 mt-1">
            {search ? 'Try a different search term' : 'Create the first group for your community'}
          </p>
          {!search && (
            <Link to="/groups/create" className={`${buttonVariants({ size: "sm" })} mt-4`}>
              <Plus className="h-4 w-4 mr-1" />
              Create a group
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
