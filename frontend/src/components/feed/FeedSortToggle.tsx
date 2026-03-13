import { Button } from '@/components/ui/button';
import { Clock, TrendingUp } from 'lucide-react';

export type FeedSort = 'latest' | 'popular';

export function FeedSortToggle({
  value,
  onChange,
}: {
  value: FeedSort;
  onChange: (sort: FeedSort) => void;
}) {
  return (
    <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5 w-fit">
      <Button
        variant={value === 'latest' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => onChange('latest')}
      >
        <Clock className="h-3 w-3" />
        Latest
      </Button>
      <Button
        variant={value === 'popular' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => onChange('popular')}
      >
        <TrendingUp className="h-3 w-3" />
        Popular
      </Button>
    </div>
  );
}
