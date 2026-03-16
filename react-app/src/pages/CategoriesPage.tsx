import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as categoriesApi from '@/api/categories';
import { queryKeys } from '@/api/queryKeys';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { CATEGORY_TYPE, type Category, type CategoryType } from '@/types';
import { useCurrentUser } from '@/features/auth/session';
import { resolveApiErrorMessage } from '@/utils/errors';
import { CategoryFormModal } from '@/features/categories/CategoryFormModal';
import { CategoryManager } from '@/features/categories/CategoryManager';

function compareCategories(left: Category, right: Category): number {
  if (left.type !== right.type) {
    return left.type === CATEGORY_TYPE.Expense ? -1 : 1;
  }

  const leftIsUncategorized = left.name.trim().toLocaleLowerCase('ru-RU') === 'без категории';
  const rightIsUncategorized = right.name.trim().toLocaleLowerCase('ru-RU') === 'без категории';

  if (leftIsUncategorized !== rightIsUncategorized) {
    return leftIsUncategorized ? -1 : 1;
  }

  return left.name.localeCompare(right.name, 'ru-RU');
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? true;
  const [selectedType, setSelectedType] = useState<CategoryType>(CATEGORY_TYPE.Expense);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: categoriesApi.getCategories,
    staleTime: 60_000,
  });

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).slice().sort(compareCategories),
    [categoriesQuery.data],
  );

  const invalidateCategoryData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
    ]);
  };

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.createCategory,
    onSuccess: async () => {
      await invalidateCategoryData();
      setIsModalOpen(false);
      setEditingCategory(null);
      toast.success('Категория создана');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось создать категорию.'));
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: categoriesApi.updateCategory,
    onSuccess: async () => {
      await invalidateCategoryData();
      setIsModalOpen(false);
      setEditingCategory(null);
      toast.success('Категория сохранена');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сохранить категорию.'));
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: async () => {
      await invalidateCategoryData();
      setDeleteTarget(null);
      setIsModalOpen(false);
      setEditingCategory(null);
      toast.success('Категория удалена');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось удалить категорию.'));
    },
  });

  const hasCategories = categories.length > 0;
  const showInlineError = categoriesQuery.isError && hasCategories;
  const showBlockingError = categoriesQuery.isError && !hasCategories && !categoriesQuery.isLoading;

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title="Категории"
          subtitle="Находите нужные категории быстрее и редактируйте их без лишних переходов."
          className="mb-0"
        />

        {showInlineError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Не удалось обновить категории</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(
                categoriesQuery.error,
                'Показаны последние доступные данные.',
              )}
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => void categoriesQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        ) : null}

        {showBlockingError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="font-medium text-foreground">Не удалось загрузить категории</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(categoriesQuery.error, 'Попробуйте повторить запрос.')}
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => void categoriesQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        ) : (
          <CategoryManager
            categories={categories}
            loading={categoriesQuery.isLoading && !hasCategories}
            readonly={isReadOnlyMode}
            selectedType={selectedType}
            onSelectedTypeChange={setSelectedType}
            onCreate={() => {
              setEditingCategory(null);
              setIsModalOpen(true);
            }}
            onEdit={(category) => {
              setEditingCategory(category);
              setSelectedType(category.type);
              setIsModalOpen(true);
            }}
          />
        )}

        <CategoryFormModal
          open={isModalOpen}
          category={editingCategory}
          defaultType={selectedType}
          readonly={isReadOnlyMode}
          isSaving={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          isDeleting={deleteCategoryMutation.isPending}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setEditingCategory(null);
            }
          }}
          onSubmit={async (payload) => {
            if ('id' in payload) {
              await updateCategoryMutation.mutateAsync(payload);
              return;
            }

            await createCategoryMutation.mutateAsync(payload);
          }}
          onDelete={async (category) => {
            setDeleteTarget(category);
          }}
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={
            deleteTarget
              ? `Удалить категорию «${deleteTarget.name}»?`
              : 'Удалить категорию'
          }
          description="Все транзакции будут перенесены в «Без категории»."
          confirmLabel="Удалить"
          variant="destructive"
          isLoading={deleteCategoryMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) {
              deleteCategoryMutation.mutate(deleteTarget.id);
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
