import { Clock, TrendingUp } from 'lucide-react';

export type FeedSort = 'latest' | 'popular';

export function FeedSortToggle({
  value,
  onChange,
}: {
  value: FeedSort;
  onChange: (sort: FeedSort) => void;
}) {
  const options = [
    { key: 'latest' as const, icon: Clock, label: 'Latest' },
    { key: 'popular' as const, icon: TrendingUp, label: 'Popular' },
  ];

  return (
    <div className="inline-flex rounded-lg bg-stone-100 p-1 gap-0.5">
      {options.map(({ key, icon: Icon, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              active
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
