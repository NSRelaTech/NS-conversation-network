import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { GroupCard } from '@/components/groups/GroupCard';
import { Button } from '@/components/ui/button';
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
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button asChild size="sm">
          <Link to="/groups/create">
            <Plus className="h-4 w-4 mr-1" />
            New group
          </Link>
        </Button>
      </div>

      {isLoading && <p className="text-center text-stone-400 py-8">Loading groups...</p>}
      {error && <p className="text-center text-red-500 py-8">{error.message}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((group: any) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>

      {filtered.length === 0 && !isLoading && !error && (
        <p className="text-center text-stone-400 py-8">No groups found.</p>
      )}
    </div>
  );
}
