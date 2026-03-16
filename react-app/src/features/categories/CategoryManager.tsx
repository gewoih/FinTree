import { ArrowRight, Plus, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { getCategoryColorToken } from '@/utils/categoryPalette';
import { CATEGORY_TYPE, type Category, type CategoryType } from '@/types';
import { getCategoryIcon } from './categoryIcons';

interface CategoryManagerProps {
  categories: Category[];
  loading?: boolean;
  readonly?: boolean;
  selectedType: CategoryType;
  onSelectedTypeChange: (type: CategoryType) => void;
  onCreate: () => void;
  onEdit: (category: Category) => void;
}

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: CATEGORY_TYPE.Expense, label: 'Расходы' },
  { value: CATEGORY_TYPE.Income, label: 'Доходы' },
];

export function CategoryManager({
  categories,
  loading = false,
  readonly = false,
  selectedType,
  onSelectedTypeChange,
  onCreate,
  onEdit,
}: CategoryManagerProps) {
  const filteredCategories = categories.filter((category) => category.type === selectedType);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card/90 px-5 py-5 shadow-[var(--ft-shadow-sm)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Категории</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Организуйте транзакции в понятные группы, чтобы аналитика была точнее.
            </p>
          </div>

          {!readonly ? (
            <Button className="min-h-[44px] rounded-lg px-4" onClick={onCreate}>
              <Plus className="size-4" />
              Новая категория
            </Button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2" role="tablist" aria-label="Фильтр по типу категорий">
          {TYPE_OPTIONS.map((option) => {
            const isActive = selectedType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-primary bg-primary/12 text-primary shadow-[var(--ft-shadow-sm)]'
                    : 'border-border bg-background/40 text-muted-foreground hover:border-primary/25 hover:text-foreground',
                )}
                onClick={() => onSelectedTypeChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[116px] rounded-xl" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="Нет категорий"
          description={`Добавьте категорию для ${selectedType === CATEGORY_TYPE.Income ? 'доходов' : 'расходов'}.`}
          action={
            readonly
              ? undefined
              : {
                  label: 'Создать категорию',
                  onClick: onCreate,
                }
          }
          className="min-h-[280px] rounded-xl border border-border bg-card/70"
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map((category) => {
            const Icon = getCategoryIcon(category.icon);

            return (
              <li key={category.id}>
                <button
                  type="button"
                  disabled={readonly}
                  onClick={() => onEdit(category)}
                  className={cn(
                    'flex min-h-[116px] w-full flex-col justify-between rounded-xl border border-border bg-card/90 p-4 text-left shadow-[var(--ft-shadow-sm)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--ft-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-[var(--ft-shadow-sm)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: getCategoryColorToken(category.id) }}
                        aria-hidden="true"
                      />
                      <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {category.name}
                        </p>
                        {category.isMandatory ? (
                          <Badge variant="outline" className="mt-1 border-primary/25 bg-primary/10 text-primary">
                            Обязательная
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {!readonly ? <ArrowRight className="size-4 text-muted-foreground" /> : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
