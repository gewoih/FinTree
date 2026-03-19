import { startTransition, useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import * as analyticsApi from '@/api/analytics';
import * as accountsApi from '@/api/accounts';
import * as retrospectivesApi from '@/api/retrospectives';
import * as userApi from '@/api/user';
import { apiClient } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { UNCATEGORIZED_CATEGORY_ID } from '@/components/analytics/chartModels';
import {
  buildGlobalScoreModel,
  buildHealthMetricCards,
  buildSummaryMetrics,
  type GlobalScoreModel,
} from '@/components/analytics/models';
import { setCurrentUserSnapshot, useCurrentUser } from '@/features/auth/session';
import { formatYearMonth } from '@/utils/format';
import type { PathValues } from '@/router/paths';
import type { OnboardingStep } from '@/components/analytics/OnboardingStepper';

type ActiveTab = 'now' | 'evolution';
type CategoryDatasetMode = 'expenses' | 'income';
type CategoryScope = 'all' | 'mandatory' | 'discretionary';

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
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  const cleaned = label.replace(/\s*г\.$/i, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useAnalyticsPage() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfMonth(new Date()));
  const [activeTab, setActiveTab] = useState<ActiveTab>('now');
  const [pieMode, setPieMode] = useState<CategoryDatasetMode>('expenses');
  const [pieScope, setPieScope] = useState<CategoryScope>('all');
  const [dismissedRetrospectiveBannerKey, setDismissedRetrospectiveBannerKey] = useState<string | null>(null);
  const [categoriesStepDone] = useState(
    () => sessionStorage.getItem('ft_categories_visited') === 'true',
  );

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;
  const today = new Date();
  const now = startOfMonth(today);
  const isCurrentMonth = isSameMonth(selectedDate, now);
  const isRetrospectiveBannerPeriod = today.getDate() <= 7;
  const previousMonthDate = addMonths(now, -1);
  const previousMonthStr = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const retrospectiveBannerKey = `${currentUser?.id ?? 'anonymous'}:${previousMonthStr}`;

  const isFirstRun = Boolean(
    currentUser &&
      currentUser.onboardingCompleted === false &&
      currentUser.onboardingSkipped === false,
  );
  const currency = currentUser?.baseCurrencyCode ?? 'RUB';

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

  const retrospectiveBannerQuery = useQuery({
    queryKey: queryKeys.retrospectives.bannerStatus(previousMonthStr),
    queryFn: () => retrospectivesApi.getBannerStatus(previousMonthStr),
    staleTime: 300_000,
    enabled: !isFirstRun && isRetrospectiveBannerPeriod,
  });

  const dismissRetrospectiveBannerMutation = useMutation({
    mutationFn: () => retrospectivesApi.dismissBanner(previousMonthStr),
    onMutate: () => {
      setDismissedRetrospectiveBannerKey(retrospectiveBannerKey);
    },
    onSuccess: () => {
      queryClient.setQueryData(
        queryKeys.retrospectives.bannerStatus(previousMonthStr),
        { showBanner: false },
      );
    },
    onError: () => {
      // Keep banner hidden for the current session to avoid flicker if the dismiss request fails.
    },
  });

  const handlePrevMonth = useCallback(() => setSelectedDate((d) => addMonths(d, -1)), []);

  const handleNextMonth = useCallback(() => {
    if (!isCurrentMonth) setSelectedDate((d) => addMonths(d, 1));
  }, [isCurrentMonth]);

  const handleMonthSelect = useCallback((date: Date) => setSelectedDate(date), []);

  const handleSkipOnboarding = useCallback(async () => {
    const updatedUser = await userApi.skipOnboarding();
    setCurrentUserSnapshot(updatedUser);
  }, []);

  const openTransactions = useCallback(
    (search: Record<string, string | boolean>) => {
      void navigate({ to: '/transactions' as PathValues, search: search as never });
    },
    [navigate],
  );

  const handleCategorySelect = useCallback(
    (item: { id: string }) => {
      const search: Record<string, string | boolean> = {
        dateFrom: formatDateParam(new Date(selectedYear, selectedMonth - 1, 1)),
        dateTo: formatDateParam(new Date(selectedYear, selectedMonth, 0)),
      };
      if (item.id !== UNCATEGORIZED_CATEGORY_ID) {
        search.categoryId = item.id;
      }
      openTransactions(search);
    },
    [openTransactions, selectedMonth, selectedYear],
  );

  const handlePeakSelect = useCallback(
    (peak: { year: number; month: number; day: number }) => {
      const date = new Date(peak.year, peak.month - 1, peak.day);
      const value = formatDateParam(date);
      openTransactions({ dateFrom: value, dateTo: value, isMandatory: false });
    },
    [openTransactions],
  );

  const handlePieModeChange = useCallback(
    (value: CategoryDatasetMode) => startTransition(() => setPieMode(value)),
    [],
  );

  const handlePieScopeChange = useCallback(
    (value: CategoryScope) => startTransition(() => setPieScope(value)),
    [],
  );

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
  }, [categoriesStepDone, accountsQuery.data, transactionsCheckQuery.data, currentUser?.telegramUserId]);

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
    ? dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : 'Ошибка загрузки'
    : null;

  const monthLabel = formatMonthHeading(selectedDate);
  const retroPath = `/reflections/${previousMonthStr}`;
  const periodLabel = formatYearMonth(selectedYear, selectedMonth);

  const shouldShowRetrospectiveBanner =
    activeTab === 'now' &&
    isRetrospectiveBannerPeriod &&
    dismissedRetrospectiveBannerKey !== retrospectiveBannerKey &&
    (retrospectiveBannerQuery.data?.showBanner ?? false);

  return {
    currentUser,
    navigate,
    selectedDate,
    activeTab,
    setActiveTab,
    pieMode,
    pieScope,
    isFirstRun,
    isCurrentMonth,
    currency,
    selectedYear,
    selectedMonth,
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
  };
}
