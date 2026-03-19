import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { MonthPicker } from '@/components/analytics/MonthPicker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { SummaryStrip } from '@/components/analytics/SummaryStrip';
import { GlobalMonthScoreCard } from '@/components/analytics/GlobalMonthScoreCard';
import { HealthScoreCard } from '@/components/analytics/HealthScoreCard';
import { SpendingPieCard } from '@/components/analytics/SpendingPieCard';
import { PeakDaysCard } from '@/components/analytics/PeakDaysCard';
import { CategoryDeltaCard } from '@/components/analytics/CategoryDeltaCard';
import { ForecastCard } from '@/components/analytics/ForecastCard';
import { EvolutionTab } from '@/components/analytics/EvolutionTab';
import { OnboardingStepper } from '@/components/analytics/OnboardingStepper';
import { cn } from '@/utils/cn';
import type { PathValues } from '@/router/paths';
import { useAnalyticsPage } from '@/features/analytics/useAnalyticsPage';

export default function AnalyticsPage() {
  const {
    navigate,
    activeTab,
    setActiveTab,
    pieMode,
    pieScope,
    isFirstRun,
    selectedDate,
    isCurrentMonth,
    currency,
    periodLabel,
    dashboardQuery,
    transactionsCheckQuery,
    accountsQuery,
    dismissRetrospectiveBannerMutation,
    handlePrevMonth,
    handleNextMonth,
    handleMonthSelect,
    handleSkipOnboarding,
    handleCategorySelect,
    handlePeakSelect,
    handlePieModeChange,
    handlePieScopeChange,
    onboardingSteps,
    summaryMetrics,
    globalScoreModel,
    healthCards,
    data,
    dashboardError,
    monthLabel,
    retroPath,
    shouldShowRetrospectiveBanner,
  } = useAnalyticsPage();

  if (isFirstRun) {
    if (transactionsCheckQuery.isLoading || accountsQuery.isLoading) {
      return (
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          {(['a', 'b', 'c'] as const).map((k) => (
            <Skeleton key={k} className="h-16 w-full" />
          ))}
        </div>
      );
    }
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <OnboardingStepper
          steps={onboardingSteps}
          loading={false}
          onStepClick={(step) => navigate({ to: step.actionTo as PathValues })}
          onSkip={handleSkipOnboarding}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6 p-4 sm:p-5 lg:gap-7 lg:px-6">

        <div className="flex flex-col gap-4">
          <PageHeader
            title="Главная"
            actions={(
              <div className="flex items-center rounded-lg border border-[var(--ft-border-default)] bg-[var(--ft-analytics-surface-subtle)] px-1.5 py-1 shadow-[var(--ft-shadow-xs)]">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  aria-label="Предыдущий месяц"
                  className="rounded-md text-[var(--ft-text-secondary)]"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="min-h-[44px] min-w-[168px] rounded-md px-5 text-center text-sm font-semibold capitalize text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--ft-text-primary)_4%,transparent)]"
                      aria-label="Выбрать месяц"
                    >
                      {monthLabel}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-lg p-0" sideOffset={8}>
                    <MonthPicker value={selectedDate} onChange={handleMonthSelect} />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  aria-label="Следующий месяц"
                  className="rounded-md text-[var(--ft-text-secondary)]"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            )}
          />

          {shouldShowRetrospectiveBanner && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
              <span className="text-foreground">
                Прошлый месяц завершён. Хотите подвести итоги?{' '}
                <button
                  onClick={() => navigate({ to: retroPath as PathValues })}
                  className="text-primary underline-offset-2 hover:underline font-medium"
                >
                  Открыть итоги
                </button>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => dismissRetrospectiveBannerMutation.mutate()}
                aria-label="Закрыть баннер"
                className="min-h-[44px] min-w-[44px] shrink-0"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}

          <div role="tablist" className="flex gap-1 border-b border-[var(--ft-border-subtle)]">
            {(
              [
                { id: 'now', label: 'Сейчас' },
                { id: 'evolution', label: 'Динамика' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'min-h-[44px] cursor-pointer px-5 py-3 text-base font-semibold transition-colors border-b-2 -mb-px outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-sm',
                  activeTab === tab.id
                    ? 'border-[var(--ft-primary-400)] text-[var(--ft-primary-400)]'
                    : 'border-transparent text-[var(--ft-text-tertiary)] hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div hidden={activeTab !== 'now'} className="flex flex-col gap-5">
          <SummaryStrip
            loading={dashboardQuery.isLoading}
            error={dashboardError}
            metrics={summaryMetrics}
            onRetry={() => dashboardQuery.refetch()}
          />

          <GlobalMonthScoreCard
            loading={dashboardQuery.isLoading}
            error={dashboardError}
            model={globalScoreModel}
            onRetry={() => dashboardQuery.refetch()}
            detailFooter={
              <PeakDaysCard
                loading={dashboardQuery.isLoading}
                error={dashboardError}
                peaks={data?.peakDays ?? []}
                summary={data?.peaks ?? { count: 0, total: 0, sharePercent: null, monthTotal: null }}
                currency={currency}
                onRetry={() => dashboardQuery.refetch()}
                onPeakSelect={handlePeakSelect}
                isCompact
              />
            }
          >
            {healthCards.length > 0 && (
              <>
                {healthCards.map((card) => (
                  <HealthScoreCard
                    key={card.key}
                    title={card.title}
                    icon={card.icon}
                    value={card.value}
                    supportingValue={card.supportingValue}
                    supportingLabel={card.supportingLabel}
                    accent={card.accent}
                    tooltip={card.tooltip}
                    progress={card.progress}
                    benchmarkLabel={card.benchmarkLabel}
                    isPreview={card.isPreview}
                  />
                ))}
              </>
            )}
          </GlobalMonthScoreCard>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SpendingPieCard
              loading={dashboardQuery.isLoading}
              error={dashboardError}
              data={pieMode === 'expenses' ? (data?.categories ?? null) : (data?.incomeCategories ?? null)}
              currency={currency}
              mode={pieMode}
              modeOptions={[
                { label: 'Расходы', value: 'expenses' },
                { label: 'Доходы', value: 'income' },
              ]}
              scope={pieScope}
              scopeOptions={[
                { label: 'Все', value: 'all' },
                { label: 'Обязательные', value: 'mandatory' },
                { label: 'По желанию', value: 'discretionary' },
              ]}
              onModeChange={handlePieModeChange}
              onScopeChange={handlePieScopeChange}
              onCategorySelect={handleCategorySelect}
              onRetry={() => dashboardQuery.refetch()}
            />
            <CategoryDeltaCard
              loading={dashboardQuery.isLoading}
              error={dashboardError}
              periodLabel={periodLabel}
              increased={data?.categories.delta.increased ?? []}
              decreased={data?.categories.delta.decreased ?? []}
              currency={currency}
              onRetry={() => dashboardQuery.refetch()}
            />
          </div>

          <ForecastCard
            loading={dashboardQuery.isLoading}
            error={dashboardError}
            forecast={data?.forecast ?? null}
            currency={currency}
            isCurrentMonth={isCurrentMonth}
            readinessMet={data?.readiness.hasForecastAndStabilityData ?? false}
            readinessMessage="Недостаточно данных, продолжайте добавлять транзакции"
            observedExpenseDays={data?.readiness.observedExpenseDays ?? 0}
            requiredExpenseDays={data?.readiness.requiredExpenseDays ?? 7}
            onRetry={() => dashboardQuery.refetch()}
          />
        </div>

        <div hidden={activeTab !== 'evolution'}>
          <EvolutionTab
            isActive={activeTab === 'evolution'}
            spending={data?.spending ?? null}
            currency={currency}
            dashboardLoading={dashboardQuery.isLoading}
            dashboardError={dashboardError}
            onDashboardRetry={() => dashboardQuery.refetch()}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
