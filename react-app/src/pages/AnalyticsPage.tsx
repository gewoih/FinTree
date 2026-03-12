import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover } from 'radix-ui';

import { useUserStore } from '@/stores/userStore';
import * as analyticsApi from '@/api/analytics';
import * as accountsApi from '@/api/accounts';
import * as userApi from '@/api/user';
import { apiClient } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { SummaryStrip } from '@/components/analytics/SummaryStrip';
import { GlobalMonthScoreCard } from '@/components/analytics/GlobalMonthScoreCard';
import { HealthScoreCard } from '@/components/analytics/HealthScoreCard';
import { SpendingPieCard } from '@/components/analytics/SpendingPieCard';
import { SpendingBarsCard } from '@/components/analytics/SpendingBarsCard';
import { PeakDaysCard } from '@/components/analytics/PeakDaysCard';
import { CategoryDeltaCard } from '@/components/analytics/CategoryDeltaCard';
import { ForecastCard } from '@/components/analytics/ForecastCard';
import { EvolutionTab } from '@/components/analytics/EvolutionTab';
import { OnboardingStepper, type OnboardingStep } from '@/components/analytics/OnboardingStepper';
import {
  buildGlobalScoreModel,
  buildHealthMetricCards,
  buildSummaryMetrics,
  type GlobalScoreModel,
} from '@/components/analytics/models';
import { formatYearMonth } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PathValues } from '@/router/paths';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab = 'now' | 'evolution';
type CategoryDatasetMode = 'expenses' | 'income';
type CategoryScope = 'all' | 'mandatory' | 'discretionary';
type ExpenseGranularity = 'days' | 'weeks' | 'months';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthHeading(date: Date): string {
  const label = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  const cleaned = label.replace(/\s*г\.$/i, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ─── Month Picker ─────────────────────────────────────────────────────────────

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [pickerYear, setPickerYear] = useState(value.getFullYear());
  const now = startOfMonth(new Date());

  return (
    <div className="p-3 w-64">
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPickerYear((y) => y - 1)}
          aria-label="Предыдущий год"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold">{pickerYear}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPickerYear((y) => y + 1)}
          disabled={pickerYear >= now.getFullYear()}
          aria-label="Следующий год"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS_RU.map((name, idx) => {
          const d = new Date(pickerYear, idx, 1);
          const isDisabled = d > now;
          const isSelected = isSameMonth(d, value);
          return (
            <button
              key={name}
              disabled={isDisabled}
              onClick={() => onChange(d)}
              className={cn(
                'rounded px-2 py-1.5 text-sm transition-colors min-h-[36px]',
                isSelected
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'hover:bg-muted text-foreground',
                isDisabled && 'opacity-40 cursor-not-allowed',
              )}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { currentUser } = useUserStore();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<ActiveTab>('now');
  const [pieMode, setPieMode] = useState<CategoryDatasetMode>('expenses');
  const [pieScope, setPieScope] = useState<CategoryScope>('all');
  const [granularity, setGranularity] = useState<ExpenseGranularity>('days');
  const [retrospectiveDismissed, setRetrospectiveDismissed] = useState(false);
  const [categoriesStepDone] = useState(
    () => sessionStorage.getItem('ft_categories_visited') === 'true',
  );

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const now = startOfMonth(new Date());
  const isCurrentMonth = isSameMonth(selectedDate, now);
  const isPreviousMonth = isSameMonth(selectedDate, addMonths(now, -1));

  const isFirstRun = Boolean(
    currentUser &&
      currentUser.onboardingCompleted === false &&
      currentUser.onboardingSkipped === false,
  );
  const currency = currentUser?.baseCurrencyCode ?? 'RUB';

  // ── Queries ──
  const dashboardQuery = useQuery({
    queryKey: queryKeys.analytics.dashboard(selectedYear, selectedMonth),
    queryFn: () => analyticsApi.getAnalyticsDashboard(selectedYear, selectedMonth),
    staleTime: 60_000,
    enabled: !isFirstRun,
  });

  const transactionsCheckQuery = useQuery({
    queryKey: queryKeys.transactions.check(),
    queryFn: async () => {
      const res = await apiClient.get<{ total: number; items: unknown[] }>(
        '/transactions?page=1&size=1',
      );
      return res.data;
    },
    staleTime: 30_000,
    enabled: isFirstRun,
  });

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts.active(),
    queryFn: () => accountsApi.getAccounts(false),
    staleTime: 60_000,
    enabled: isFirstRun,
  });

  // ── Handlers ──
  const handlePrevMonth = useCallback(() => setSelectedDate((d) => addMonths(d, -1)), []);

  const handleNextMonth = useCallback(() => {
    if (!isCurrentMonth) setSelectedDate((d) => addMonths(d, 1));
  }, [isCurrentMonth]);

  const handleMonthSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
    },
    [],
  );

  const handleSkipOnboarding = useCallback(async () => {
    await userApi.skipOnboarding();
    useUserStore.setState((s) => ({
      currentUser: s.currentUser ? { ...s.currentUser, onboardingSkipped: true } : s.currentUser,
    }));
  }, []);

  // ── Onboarding steps ──
  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    const hasMain = accountsQuery.data?.some((a) => a.isMain) ?? false;
    const hasTransactions = (transactionsCheckQuery.data?.total ?? 0) > 0;
    return [
      {
        key: 'categories',
        title: 'Проверьте категории',
        description: 'Убедитесь, что категории подходят для вашего бюджета.',
        completed: categoriesStepDone,
        actionLabel: 'Открыть категории',
        actionTo: '/categories',
      },
      {
        key: 'account',
        title: 'Добавьте счёт',
        description: 'Добавьте основной счёт, с которого ведёте учёт.',
        completed: hasMain,
        actionLabel: 'Открыть счета',
        actionTo: '/accounts',
      },
      {
        key: 'transaction',
        title: 'Добавьте транзакцию',
        description: 'Внесите первую транзакцию, чтобы начать отслеживать расходы.',
        completed: hasTransactions,
        actionLabel: 'Открыть транзакции',
        actionTo: '/transactions',
      },
      {
        key: 'telegram',
        title: 'Подключите Telegram',
        description: 'Добавляйте транзакции прямо из Telegram-бота.',
        completed: currentUser?.telegramUserId !== null && currentUser?.telegramUserId !== undefined,
        optional: true,
        actionLabel: 'Открыть профиль',
        actionTo: '/profile',
      },
    ];
  }, [
    categoriesStepDone,
    accountsQuery.data,
    transactionsCheckQuery.data,
    currentUser?.telegramUserId,
  ]);

  // ── Computed ──
  const summaryMetrics = useMemo(
    () => (dashboardQuery.data ? buildSummaryMetrics(dashboardQuery.data.health, currency) : []),
    [dashboardQuery.data, currency],
  );
  const globalScoreModel = useMemo<GlobalScoreModel>(
    () =>
      dashboardQuery.data
        ? buildGlobalScoreModel(dashboardQuery.data.health)
        : {
            score: null,
            scoreLabel: '—',
            description: 'Добавьте больше операций за месяц, чтобы оценка стала точнее.',
            accent: 'neutral',
            deltaLabel: null,
            deltaTone: null,
          },
    [dashboardQuery.data],
  );
  const healthCards = useMemo(
    () =>
      dashboardQuery.data
        ? buildHealthMetricCards(dashboardQuery.data.health, dashboardQuery.data.readiness, currency)
        : [],
    [dashboardQuery.data, currency],
  );

  const data = dashboardQuery.data;
  const dashboardError = dashboardQuery.error
    ? (dashboardQuery.error instanceof Error
        ? dashboardQuery.error.message
        : 'Ошибка загрузки')
    : null;

  // ── Render: first run / onboarding ──
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

  const monthLabel = formatMonthHeading(selectedDate);

  const retroPath = `/reflections/${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-8 p-4 sm:p-6 lg:gap-10 lg:px-8">

        <div className="flex flex-col gap-4">
          <PageHeader
            title="Главная"
            actions={(
              <div
                className="flex items-center rounded-full border border-[var(--ft-border-subtle)] px-1.5 py-1 shadow-[var(--ft-shadow-sm)]"
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 92%, var(--ft-bg-base)) 0%, var(--ft-surface-base) 100%)',
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  aria-label="Предыдущий месяц"
                  className="rounded-full text-[var(--ft-text-secondary)]"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      className="min-h-[44px] min-w-[168px] rounded-full px-5 text-center text-lg font-semibold capitalize text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--ft-text-primary)_4%,transparent)]"
                      aria-label="Выбрать месяц"
                    >
                      {monthLabel}
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="z-50 rounded-2xl border border-border bg-popover shadow-lg outline-none"
                      sideOffset={8}
                    >
                      <MonthPicker value={selectedDate} onChange={handleMonthSelect} />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  aria-label="Следующий месяц"
                  className="rounded-full text-[var(--ft-text-secondary)]"
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>
            )}
          />

          {isPreviousMonth && !retrospectiveDismissed && (
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
                onClick={() => setRetrospectiveDismissed(true)}
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
                { id: 'now' as ActiveTab, label: 'Сейчас' },
                { id: 'evolution' as ActiveTab, label: 'Динамика' },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'min-h-[44px] px-5 py-3 text-base font-semibold transition-colors border-b-2 -mb-px',
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

        <div hidden={activeTab !== 'now'} className="flex flex-col gap-6">
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
                    zoneBar={card.zoneBar}
                  />
                ))}
              </>
            )}
          </GlobalMonthScoreCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
              onModeChange={setPieMode}
              onScopeChange={setPieScope}
              onCategorySelect={() => {}}
              onRetry={() => dashboardQuery.refetch()}
            />
            <SpendingBarsCard
              loading={dashboardQuery.isLoading}
              error={dashboardError}
              spending={data?.spending ?? null}
              currency={currency}
              granularity={granularity}
              granularityOptions={[
                { label: 'День', value: 'days' },
                { label: 'Неделя', value: 'weeks' },
                { label: 'Месяц', value: 'months' },
              ]}
              onGranularityChange={setGranularity}
              onRetry={() => dashboardQuery.refetch()}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <PeakDaysCard
              loading={dashboardQuery.isLoading}
              error={dashboardError}
              peaks={data?.peakDays ?? []}
              summary={data?.peaks ?? { count: 0, total: 0, sharePercent: null, monthTotal: null }}
              currency={currency}
              onRetry={() => dashboardQuery.refetch()}
              onPeakSelect={() => {}}
            />
            <CategoryDeltaCard
              loading={dashboardQuery.isLoading}
              error={dashboardError}
              periodLabel={formatYearMonth(selectedYear, selectedMonth)}
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
          <EvolutionTab isActive={activeTab === 'evolution'} />
        </div>
      </div>
    </ErrorBoundary>
  );
}
