import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { CATEGORY_TYPE, type CategoryType } from '@/types';

interface CategoryToolbarProps {
  readonly?: boolean;
  selectedType: CategoryType;
  searchValue: string;
  statusLabel: string;
  countsByType: Record<CategoryType, number>;
  onSearchChange: (value: string) => void;
  onSelectedTypeChange: (type: CategoryType) => void;
  onCreate: () => void;
}

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: CATEGORY_TYPE.Expense, label: 'Расходы' },
  { value: CATEGORY_TYPE.Income, label: 'Доходы' },
];

export function CategoryToolbar({
  readonly = false,
  selectedType,
  searchValue,
  statusLabel,
  countsByType,
  onSearchChange,
  onSelectedTypeChange,
  onCreate,
}: CategoryToolbarProps) {
  const hasSearch = searchValue.trim().length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--ft-shadow-sm)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Найти категорию"
            aria-label="Найти категорию"
            className="h-11 rounded-lg border-border bg-background/40 pr-12 pl-10 shadow-[var(--ft-shadow-xs)]"
          />
          {hasSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Очистить поиск"
              onClick={() => onSearchChange('')}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="Фильтр по типу категорий"
          className="grid w-full grid-cols-2 rounded-lg border border-border bg-background/40 p-1 shadow-[var(--ft-shadow-xs)] sm:inline-flex sm:w-auto sm:min-w-[260px] sm:grid-cols-none"
        >
          {TYPE_OPTIONS.map((option) => {
            const isActive = selectedType === option.value;
            const count = countsByType[option.value] ?? 0;

            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-start',
                  isActive
                    ? 'bg-primary/15 text-foreground shadow-[var(--ft-shadow-xs)]'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                onClick={() => onSelectedTypeChange(option.value)}
              >
                <span>{option.label}</span>
                <strong className="text-sm font-semibold">{count}</strong>
              </button>
            );
          })}
        </div>

        {!readonly ? (
          <Button className="w-full rounded-lg px-4 lg:w-auto" onClick={onCreate}>
            <Plus className="size-4" />
            Новая категория
          </Button>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        {statusLabel}
      </p>
    </div>
  );
}
