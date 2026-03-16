import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { getCategoryColorToken } from '@/utils/categoryPalette';
import { cn } from '@/utils/cn';
import type { Category } from '@/types';
import { renderCategoryIcon } from './categoryIcons';

interface CategoryGridItemProps {
  category: Category;
  readonly?: boolean;
  searchValue: string;
  onEdit: (category: Category) => void;
}

function renderHighlightedName(name: string, searchValue: string): ReactNode {
  const query = searchValue.trim();

  if (!query) {
    return name;
  }

  const normalizedName = name.toLocaleLowerCase('ru-RU');
  const normalizedQuery = query.toLocaleLowerCase('ru-RU');
  const matchIndex = normalizedName.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return name;
  }

  const matchEnd = matchIndex + query.length;

  return (
    <>
      {name.slice(0, matchIndex)}
      <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {name.slice(matchIndex, matchEnd)}
      </mark>
      {name.slice(matchEnd)}
    </>
  );
}

export function CategoryGridItem({
  category,
  readonly = false,
  searchValue,
  onEdit,
}: CategoryGridItemProps) {
  const accentColor = getCategoryColorToken(category.id);

  const content = (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-1 flex shrink-0 items-center gap-3">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
        <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground">
          {renderCategoryIcon(category.icon, { className: 'size-4' })}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">
          {renderHighlightedName(category.name, searchValue)}
        </p>
        {category.isMandatory ? (
          <Badge
            variant="outline"
            className="mt-2 border-primary/25 bg-primary/10 text-primary"
          >
            Обязательная
          </Badge>
        ) : null}
      </div>
    </div>
  );

  if (readonly) {
    return (
      <div className="min-h-[88px] rounded-xl border border-border bg-card/80 p-4 shadow-[var(--ft-shadow-sm)]">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'min-h-[88px] w-full rounded-xl border border-border bg-card/80 p-4 text-left shadow-[var(--ft-shadow-sm)] transition-[border-color,box-shadow,transform]',
        'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--ft-shadow-md)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
        'motion-reduce:transform-none motion-reduce:transition-none',
      )}
      aria-label={`Изменить категорию ${category.name}`}
      onClick={() => onEdit(category)}
    >
      {content}
    </button>
  );
}
