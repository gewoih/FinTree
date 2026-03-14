import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import * as retrospectivesApi from '@/api/retrospectives';
import { queryKeys } from '@/api/queryKeys';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PATHS } from '@/router/paths';
import { useUserStore } from '@/stores/userStore';
import { resolveApiErrorMessage } from '@/utils/errors';
import { ReflectionsHistoryChart } from '@/features/reflections/ReflectionsHistoryChart';
import { RetrospectiveMonthCard } from '@/features/reflections/RetrospectiveMonthCard';
import { RetrospectiveMonthDialog } from '@/features/reflections/RetrospectiveMonthDialog';
import {
  formatReflectionMonth,
  REFLECTION_RANGE_OPTIONS,
  sortReflectionsAscending,
  sortReflectionsDescending,
  type ReflectionMonthOption,
  type ReflectionChartRange,
} from '@/features/reflections/reflectionModels';

const EMPTY_RETROSPECTIVES: Awaited<
  ReturnType<typeof retrospectivesApi.getRetrospectives>
> = [];

export default function ReflectionsPage() {
  const navigate = useNavigate();
  const currentUser = useUserStore((state) => state.currentUser);
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const [selectedRange, setSelectedRange] = useState<ReflectionChartRange>(
    REFLECTION_RANGE_OPTIONS[1]?.value ?? 12
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCreateMonth, setSelectedCreateMonth] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const retrospectivesQuery = useQuery({
    queryKey: queryKeys.retrospectives.list(),
    queryFn: retrospectivesApi.getRetrospectives,
    staleTime: 30_000,
  });

  const availableMonthsQuery = useQuery({
    queryKey: queryKeys.retrospectives.availableMonths(),
    queryFn: retrospectivesApi.getRetrospectiveAvailableMonths,
    enabled: isCreateDialogOpen,
    staleTime: 30_000,
  });

  const retrospectives = retrospectivesQuery.data ?? EMPTY_RETROSPECTIVES;
  const hasRetrospectives = retrospectives.length > 0;

  const chartItems = useMemo(
    () => sortReflectionsAscending(retrospectives),
    [retrospectives]
  );
  const cardItems = useMemo(
    () => sortReflectionsDescending(retrospectives),
    [retrospectives]
  );
  const existingMonths = useMemo(
    () => new Set(retrospectives.map((item) => item.month)),
    [retrospectives]
  );
  const monthOptions = useMemo<ReflectionMonthOption[]>(
    () =>
      (availableMonthsQuery.data ?? []).map((month) => ({
        label: formatReflectionMonth(month),
        value: month,
        hasRetrospective: existingMonths.has(month),
      })),
    [availableMonthsQuery.data, existingMonths]
  );

  const openRetrospective = (month: string) => {
    void navigate({
      to: PATHS.RETRO_DETAIL,
      params: { month },
    });
  };

  const handleOpenCreateDialog = () => {
    if (isReadOnlyMode) {
      void navigate({ to: PATHS.PROFILE });
      return;
    }

    setIsCreateDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);

    if (!open) {
      setSelectedCreateMonth('');
      setCreateError(null);
    }
  };

  const handleConfirmCreateMonth = () => {
    if (!selectedCreateMonth) {
      setCreateError('Выберите месяц для рефлексии.');
      return;
    }

    setCreateError(null);
    setIsCreateDialogOpen(false);
    openRetrospective(selectedCreateMonth);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title="Рефлексии"
          subtitle="Короткие итоги месяца: что сработало, где были лишние траты и что поменять дальше."
          className="mb-0"
          actions={(
            <Button
              className="min-h-[44px] rounded-xl px-4"
              disabled={isReadOnlyMode}
              onClick={handleOpenCreateDialog}
            >
              <Plus className="size-4" />
              Добавить
            </Button>
          )}
        />

        {isReadOnlyMode ? (
          <div className="rounded-2xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Режим просмотра</div>
            <div className="mt-1 text-muted-foreground">
              Историю можно просматривать, но создавать и сохранять новые рефлексии можно только с активной подпиской.
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => void navigate({ to: PATHS.PROFILE })}
            >
              Открыть профиль
            </Button>
          </div>
        ) : null}

        {retrospectivesQuery.isError && hasRetrospectives ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">Не удалось обновить рефлексии</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(
                retrospectivesQuery.error,
                'Показаны последние доступные данные.',
              )}
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => void retrospectivesQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        ) : null}

        {retrospectivesQuery.isLoading && !hasRetrospectives ? (
          <>
            <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
              <CardContent className="space-y-4 pt-6">
                <Skeleton className="h-[320px] rounded-2xl" />
                <div className="flex gap-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-5 w-28 rounded-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-[248px] rounded-2xl" />
              ))}
            </div>
          </>
        ) : retrospectivesQuery.isError && !hasRetrospectives ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm">
            <div className="font-medium text-foreground">Не удалось загрузить рефлексии</div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(
                retrospectivesQuery.error,
                'Попробуйте повторить запрос.',
              )}
            </div>
            <Button
              className="mt-3 min-h-[44px]"
              variant="outline"
              onClick={() => void retrospectivesQuery.refetch()}
            >
              Повторить
            </Button>
          </div>
        ) : !hasRetrospectives ? (
          <Card className="rounded-2xl border border-dashed border-border/80 bg-background/20 shadow-[var(--ft-shadow-sm)]">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Пока нет рефлексий</h2>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Подведите итоги любого прошедшего месяца, чтобы видеть свой прогресс не только по цифрам, но и по собственным выводам.
                </p>
              </div>
              {!isReadOnlyMode ? (
                <Button className="min-h-[44px] rounded-xl px-4" onClick={handleOpenCreateDialog}>
                  <Plus className="size-4" />
                  Добавить первую рефлексию
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <>
            <ReflectionsHistoryChart
              items={chartItems}
              range={selectedRange}
              onRangeChange={setSelectedRange}
            />

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {cardItems.map((item) => (
                <RetrospectiveMonthCard
                  key={item.month}
                  item={item}
                  onOpen={openRetrospective}
                />
              ))}
            </div>
          </>
        )}

        <RetrospectiveMonthDialog
          open={isCreateDialogOpen}
          onOpenChange={handleDialogOpenChange}
          options={monthOptions}
          loading={availableMonthsQuery.isLoading}
          fetchError={
            availableMonthsQuery.isError
              ? resolveApiErrorMessage(
                  availableMonthsQuery.error,
                  'Не удалось загрузить доступные месяцы.',
                )
              : null
          }
          submitError={createError}
          selectedMonth={selectedCreateMonth}
          onSelectedMonthChange={(month) => {
            setSelectedCreateMonth(month);
            setCreateError(null);
          }}
          onConfirm={handleConfirmCreateMonth}
        />
      </div>
    </ErrorBoundary>
  );
}
