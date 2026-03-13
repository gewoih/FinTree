import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import type { AccountsView } from './accountModels';

interface AccountsToolbarProps {
  view: AccountsView;
  activeCount: number;
  archivedCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onViewChange: (view: AccountsView) => void;
}

export function AccountsToolbar({
  view,
  activeCount,
  archivedCount,
  searchValue,
  onSearchChange,
  onViewChange,
}: AccountsToolbarProps) {
  const tabs: Array<{ value: AccountsView; label: string; count: number }> = [
    { value: 'active', label: 'Активные', count: activeCount },
    { value: 'archived', label: 'Архив', count: archivedCount },
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div
        role="tablist"
        aria-label="Фильтр по статусу счетов"
        className="grid w-full grid-cols-2 rounded-lg border border-border bg-card/80 p-1 shadow-[var(--ft-shadow-sm)] sm:inline-flex sm:w-auto sm:grid-cols-none"
      >
        {tabs.map((tab) => {
          const isActive = view === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-start',
                isActive
                  ? 'bg-primary/15 text-foreground shadow-[var(--ft-shadow-xs)]'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
              onClick={() => onViewChange(tab.value)}
            >
              <span>{tab.label}</span>
              <strong className="text-sm font-semibold">{tab.count}</strong>
            </button>
          );
        })}
      </div>

      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск"
          aria-label="Поиск по счетам"
          className="h-11 rounded-lg border-border bg-card/60 pl-10 shadow-[var(--ft-shadow-sm)]"
        />
      </div>
    </div>
  );
}
