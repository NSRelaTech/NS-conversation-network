import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Group {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  memberCount: number;
}

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="hover:border-stone-300 transition-colors">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-stone-900 truncate">{group.name}</h3>
              {group.description && (
                <p className="mt-1 text-sm text-stone-500 line-clamp-2">{group.description}</p>
              )}
            </div>
            <Badge variant={group.privacy === 'public' ? 'secondary' : 'outline'}>
              {group.privacy}
            </Badge>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-stone-400">
            <Users className="h-3.5 w-3.5" />
            <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
