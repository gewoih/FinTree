import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--ft-shadow-sm)]">
      <div role="tablist" className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={view === 'active' ? 'default' : 'outline'}
          className={cn('min-h-[44px] rounded-full px-4', view === 'active' && 'shadow-sm')}
          onClick={() => onViewChange('active')}
        >
          Активные
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
            {activeCount}
          </span>
        </Button>

        <Button
          type="button"
          variant={view === 'archived' ? 'default' : 'outline'}
          className={cn(
            'min-h-[44px] rounded-full px-4',
            view === 'archived' && 'shadow-sm'
          )}
          onClick={() => onViewChange('archived')}
        >
          Архив
          <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
            {archivedCount}
          </span>
        </Button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск по названию или валюте"
          className="h-11 rounded-xl pl-9"
        />
      </div>
    </div>
  );
}
