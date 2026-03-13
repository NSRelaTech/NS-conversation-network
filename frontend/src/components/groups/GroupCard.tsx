import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Group {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  memberCount: number;
}

function MemberAvatarStack({ count }: { count: number }) {
  const shown = Math.min(count, 3);
  const colors = ['bg-stone-300', 'bg-stone-400', 'bg-stone-200'];

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded-full ${colors[i]} border-2 border-white`}
          />
        ))}
      </div>
      <span className="ml-2 text-sm text-stone-500">
        {count} {count === 1 ? 'member' : 'members'}
      </span>
    </div>
  );
}

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="hover:border-stone-300 transition-colors h-full">
        <CardContent className="pt-6 flex flex-col h-full">
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
          <div className="mt-auto pt-3">
            <MemberAvatarStack count={group.memberCount} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
