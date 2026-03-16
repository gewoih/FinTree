import { useDeferredValue, useMemo, useState } from 'react';
import { Tags } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_TYPE, type Category, type CategoryType } from '@/types';
import { CategoryGridItem } from './CategoryGridItem';
import { CategoryToolbar } from './CategoryToolbar';

interface CategoryManagerProps {
  categories: Category[];
  loading?: boolean;
  readonly?: boolean;
  selectedType: CategoryType;
  onSelectedTypeChange: (type: CategoryType) => void;
  onCreate: () => void;
  onEdit: (category: Category) => void;
}

const EMPTY_TYPE_COUNTS: Record<CategoryType, number> = {
  [CATEGORY_TYPE.Expense]: 0,
  [CATEGORY_TYPE.Income]: 0,
};

function getPluralizedWord(
  count: number,
  singular: string,
  few: string,
  many: string,
): string {
  const lastTwoDigits = Math.abs(count) % 100;
  const lastDigit = lastTwoDigits % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return many;
  }

  if (lastDigit === 1) {
    return singular;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }

  return many;
}

function formatCategoryCount(count: number): string {
  return `${count} ${getPluralizedWord(count, 'категория', 'категории', 'категорий')}`;
}

function formatMandatoryCategoryCount(count: number): string {
  return `${count} ${getPluralizedWord(
    count,
    'обязательная категория',
    'обязательные категории',
    'обязательных категорий',
  )}`;
}

export function CategoryManager({
  categories,
  loading = false,
  readonly = false,
  selectedType,
  onSelectedTypeChange,
  onCreate,
  onEdit,
}: CategoryManagerProps) {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  const countsByType = useMemo(
    () => {
      const counts = { ...EMPTY_TYPE_COUNTS };

      categories.forEach((category) => {
        counts[category.type] += 1;
      });

      return counts;
    },
    [categories],
  );
  const selectedCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType],
  );
  const normalizedSearch = deferredSearch.trim().toLocaleLowerCase('ru-RU');
  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return selectedCategories;
    }

    return selectedCategories.filter((category) =>
      category.name.toLocaleLowerCase('ru-RU').includes(normalizedSearch),
    );
  }, [normalizedSearch, selectedCategories]);
  const hasSearch = searchInput.trim().length > 0;
  const mandatoryCount = selectedCategories.filter((category) => category.isMandatory).length;
  const visibleMandatoryCount = filteredCategories.filter((category) => category.isMandatory).length;
  const statusParts = hasSearch
    ? [`Найдено ${formatCategoryCount(filteredCategories.length)} из ${formatCategoryCount(selectedCategories.length)}`]
    : [formatCategoryCount(selectedCategories.length)];

  if (selectedType === CATEGORY_TYPE.Expense) {
    const relevantMandatoryCount = hasSearch ? visibleMandatoryCount : mandatoryCount;

    if (relevantMandatoryCount > 0) {
      statusParts.push(formatMandatoryCategoryCount(relevantMandatoryCount));
    }
  }

  const typeLabel = selectedType === CATEGORY_TYPE.Income ? 'доходов' : 'расходов';

  return (
    <section className="space-y-4">
      <CategoryToolbar
        readonly={readonly}
        selectedType={selectedType}
        searchValue={searchInput}
        statusLabel={statusParts.join(' · ')}
        countsByType={countsByType}
        onSearchChange={setSearchInput}
        onSelectedTypeChange={onSelectedTypeChange}
        onCreate={onCreate}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[88px] rounded-xl" />
          ))}
        </div>
      ) : selectedCategories.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title={`Пока нет категорий ${typeLabel}`}
          description={`Добавьте первую категорию для ${typeLabel}, чтобы быстрее заполнять транзакции и видеть понятную аналитику.`}
          action={
            readonly
              ? undefined
              : {
                  label: 'Создать категорию',
                  onClick: onCreate,
                }
          }
          className="min-h-[280px] rounded-2xl border border-border bg-card/70"
        />
      ) : filteredCategories.length === 0 && hasSearch ? (
        <EmptyState
          icon={<Tags />}
          title="Ничего не найдено"
          description="Измените запрос или очистите поиск, чтобы снова увидеть категории."
          action={{ label: 'Сбросить поиск', onClick: () => setSearchInput('') }}
          className="min-h-[280px] rounded-2xl border border-border bg-card/70"
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCategories.map((category) => {
            return (
              <li key={category.id}>
                <CategoryGridItem
                  category={category}
                  readonly={readonly}
                  searchValue={searchInput}
                  onEdit={onEdit}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
