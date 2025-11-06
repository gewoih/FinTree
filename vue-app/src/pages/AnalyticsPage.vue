<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Line, Pie, Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import { apiService } from '../services/api.service.ts';
import type { MonthlyExpenseDto, CategoryExpenseDto, NetWorthSnapshotDto, FinancialHealthMetricsDto } from '../types.ts';
import { formatCurrency } from '../utils/formatters';
import FinancialHealthSummaryCard from '../components/analytics/FinancialHealthSummaryCard.vue';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const financeStore = useFinanceStore();
const userStore = useUserStore();

// Data from API
const monthlyExpenses = ref<MonthlyExpenseDto[]>([]);
const categoryExpenses = ref<CategoryExpenseDto[]>([]);
const netWorthSnapshots = ref<NetWorthSnapshotDto[]>([]);
const isAnalyticsLoading = ref(true);

const financialPeriodOptions = [
  { value: 1, label: '1 месяц' },
  { value: 3, label: '3 месяца' },
  { value: 6, label: '6 месяцев' },
  { value: 12, label: '12 месяцев' },
] as const;
type FinancialPeriod = (typeof financialPeriodOptions)[number]['value'];

const financialPeriod = ref<FinancialPeriod>(3);
const financialHealth = ref<FinancialHealthMetricsDto | null>(null);
const isFinancialHealthLoading = ref(false);

const analyticsCurrencyCode = computed(() => {
  return userStore.baseCurrencyCode ||
    financeStore.primaryAccount?.currency?.code ||
    financeStore.primaryAccount?.currencyCode ||
    'USD';
});

const formatAmount = (value: number) => {
  const currencyCode = analyticsCurrencyCode.value;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(value);
};

const formatPercent = (value: number | null | undefined, fractionDigits = 0): string => {
  if (value === null || value === undefined) return '—';
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(fractionDigits)}%`;
};

const formatMonths = (value: number | null | undefined, fractionDigits = 1): string => {
  if (value === null || value === undefined) return '—';
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(fractionDigits)} мес`;
};

const monthNameFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1);
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const monthName = capitalize(monthNameFormatter.format(date));
  return `${monthName} ${year}`;
}

function formatExpenseLabel(point: MonthlyExpenseDto): string {
  if (expenseGranularity.value === 'days' && point.day != null) {
    const date = new Date(point.year, point.month - 1, point.day);
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
  }

  if (expenseGranularity.value === 'weeks' && point.week != null) {
    return `Неделя ${point.week}, ${point.year}`;
  }

  return formatMonthLabel(point.year, point.month);
}

const selectedFinancialPeriodLabel = computed(() => {
  const option = financialPeriodOptions.find(option => option.value === financialPeriod.value);
  return option?.label ?? 'Период';
});

const hasFinancialMetrics = computed(() => {
  const data = financialHealth.value;
  if (!data) return false;

  return [
    data.savingsRate,
    data.liquidityMonths,
    data.expenseVolatility,
    data.incomeDiversity
  ].some(value => value !== null && value !== undefined);
});

const financialMetricCards = computed(() => {
  const data = financialHealth.value;

  return [
    {
      key: 'savingsRate',
      label: 'Уровень сбережений',
      description: 'Доля дохода, которая остаётся после расходов',
      value: formatPercent(data?.savingsRate ?? null, 0)
    },
    {
      key: 'liquidityMonths',
      label: 'Запас ликвидности',
      description: 'Сколько месяцев обязательных расходов покрывают ликвидные активы',
      value: formatMonths(data?.liquidityMonths ?? null, 1)
    },
    {
      key: 'expenseVolatility',
      label: 'Волатильность расходов',
      description: 'Изменчивость ежемесячных трат относительно среднего',
      value: formatPercent(data?.expenseVolatility ?? null, 0)
    },
    {
      key: 'incomeDiversity',
      label: 'Диверсификация доходов',
      description: 'Доля крупнейшего источника дохода',
      value: formatPercent(data?.incomeDiversity ?? null, 0)
    }
  ];
});

async function loadFinancialHealth(): Promise<void> {
  isFinancialHealthLoading.value = true;
  try {
    const data = await apiService.getFinancialHealthMetrics(financialPeriod.value);
    financialHealth.value = data;
  } catch (error) {
    console.error('Failed to load financial health metrics:', error);
    financialHealth.value = null;
  } finally {
    isFinancialHealthLoading.value = false;
  }
}

// Time period filters for category expenses
type CategoryTimePeriod = 'week' | 'month' | '3months' | '6months' | '12months' | 'all';
const categoryTimePeriod = ref<CategoryTimePeriod>('month');
const categoryPeriods = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: '3months', label: '3 месяца' },
  { value: '6months', label: '6 месяцев' },
  { value: '12months', label: '12 месяцев' },
  { value: 'all', label: 'Всё время' }
] as const;

// Granularity filters for monthly expenses
type ExpenseGranularity = 'days' | 'weeks' | 'months';
const expenseGranularity = ref<ExpenseGranularity>('months');
const expenseGranularities = [
  { value: 'days', label: 'По дням' },
  { value: 'weeks', label: 'По неделям' },
  { value: 'months', label: 'По месяцам' }
] as const;

// Calculate date range based on category time period
const categoryDateRange = computed(() => {
  const now = new Date();
  const to = new Date(now);
  let from: Date;

  switch (categoryTimePeriod.value) {
    case 'week':
      from = new Date(now);
      from.setDate(now.getDate() - 6);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '3months':
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      break;
    case '6months':
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      break;
    case '12months':
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      break;
    case 'all':
      from = new Date(2000, 0, 1); // Far in the past
      break;
  }

  return { from, to };
});

// Fetch category expenses when time period changes
watch(categoryTimePeriod, async () => {
  try {
    const { from, to } = categoryDateRange.value;
    const data = await apiService.getExpensesByCategoryByDateRange(from, to);
    categoryExpenses.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to load category expenses:', error);
    categoryExpenses.value = [];
  }
}, { immediate: true });

watch(financialPeriod, async (newValue, oldValue) => {
  if (newValue === oldValue) return;
  await loadFinancialHealth();
});

// Sorted monthly expenses
const sortedMonthlyExpenses = computed(() => {
  const granularity = expenseGranularity.value;

  return monthlyExpenses.value
    .slice()
    .sort((a, b) => {
      const yearComparison = a.year - b.year;
      if (yearComparison !== 0) return yearComparison;

      if (granularity === 'days' && a.day != null && b.day != null) {
        const monthComparison = a.month - b.month;
        if (monthComparison !== 0) return monthComparison;
        return (a.day ?? 0) - (b.day ?? 0);
      }

      if (granularity === 'weeks' && a.week != null && b.week != null) {
        return (a.week ?? 0) - (b.week ?? 0);
      }

      return a.month - b.month;
    });
});

const expenseLabels = computed(() =>
  sortedMonthlyExpenses.value.map(point => formatExpenseLabel(point))
);

// Sorted networth snapshots
const sortedNetWorth = computed(() =>
  netWorthSnapshots.value
    .slice()
    .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
);

const latestExpensePoint = computed(() => sortedMonthlyExpenses.value.at(-1) ?? null);
const previousExpensePoint = computed(() => sortedMonthlyExpenses.value.at(-2) ?? null);

const monthlyExpenseTrend = computed(() => {
  if (!latestExpensePoint.value || !previousExpensePoint.value) return null;
  return latestExpensePoint.value.amount - previousExpensePoint.value.amount;
});

const dominantCategory = computed(() => {
  if (!categoryExpenses.value.length) return null;
  return [...categoryExpenses.value].sort((a, b) => b.amount - a.amount)[0] ?? null;
});

const totalCategoryAmount = computed(() =>
  categoryExpenses.value.reduce((sum, category) => sum + category.amount, 0)
);

const topCategoryShare = computed(() => {
  if (!dominantCategory.value || !totalCategoryAmount.value) return null;
  return dominantCategory.value.amount / totalCategoryAmount.value;
});

const heroHighlights = computed(() => {
  const currencyCode = analyticsCurrencyCode.value;
  const lastNet = sortedNetWorth.value.at(-1) ?? null;
  const previousNet = sortedNetWorth.value.at(-2) ?? null;
  const netDelta =
    lastNet && previousNet ? lastNet.totalBalance - previousNet.totalBalance : null;

  const latestExpenseAmount = latestExpensePoint.value?.amount ?? null;
  const expenseTrendValue = monthlyExpenseTrend.value;

  const savingsRate = financialHealth.value?.savingsRate ?? null;

  return [
    {
      key: 'netWorth',
      label: 'Стоимость активов',
      primary: lastNet ? formatCurrency(lastNet.totalBalance, currencyCode) : '—',
      secondary:
        netDelta !== null
          ? `${netDelta >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(netDelta), currencyCode)}`
          : 'Нет динамики',
      secondaryTone: netDelta === null ? 'muted' : netDelta >= 0 ? 'positive' : 'negative',
    },
    {
      key: 'monthlySpend',
      label: 'Расходы за период',
      primary: latestExpenseAmount !== null ? formatCurrency(latestExpenseAmount, currencyCode) : '—',
      secondary:
        expenseTrendValue !== null
          ? `${expenseTrendValue >= 0 ? '▲' : '▼'} ${formatCurrency(
              Math.abs(expenseTrendValue),
              currencyCode
            )} vs прошлый период`
          : 'Нет данных для сравнения',
      secondaryTone:
        expenseTrendValue === null
          ? 'muted'
          : expenseTrendValue <= 0
          ? 'positive'
          : 'negative',
    },
    {
      key: 'savingsRate',
      label: 'Уровень сбережений',
      primary: savingsRate !== null ? formatPercent(savingsRate, 0) : '—',
      secondary: 'Цель на квартал: 30%',
      secondaryTone:
        savingsRate !== null && savingsRate >= 0.3
          ? 'positive'
          : savingsRate !== null
          ? 'warning'
          : 'muted',
    },
    {
      key: 'topCategory',
      label: 'Топ категория расходов',
      primary: dominantCategory.value?.name ?? '—',
      secondary: dominantCategory.value
        ? formatCurrency(dominantCategory.value.amount, currencyCode)
        : 'Добавьте расходы, чтобы увидеть лидеров',
      secondaryTone: 'muted',
    },
  ];
});

const improvementTips = computed(() => {
  const tips: string[] = [];

  const savingsRate = financialHealth.value?.savingsRate ?? null;
  if (savingsRate !== null) {
    if (savingsRate < 0.25) {
      tips.push(
        'Поднимите долю сбережений до 25%: настройте автоматический перевод в накопления сразу после зарплаты.'
      );
    } else {
      tips.push('Удерживайте текущий уровень сбережений — вы уже двигаетесь быстрее среднего.');
    }
  }

  if (monthlyExpenseTrend.value !== null) {
    if (monthlyExpenseTrend.value > 0) {
      tips.push(
        'Расходы растут относительно прошлого периода — зафиксируйте лимит для крупнейших статей расходов.'
      );
    } else if (monthlyExpenseTrend.value < 0) {
      tips.push(
        'Траты сокращаются — закрепите прогресс, добавив автоматические правила и уведомления.'
      );
    }
  }

  if (topCategoryShare.value !== null && topCategoryShare.value > 0.35 && dominantCategory.value) {
    tips.push(
      `Категория «${dominantCategory.value.name}» занимает ${Math.round(
        topCategoryShare.value * 100
      )}% ваших расходов. Установите для неё недельный или месячный бюджет.`
    );
  }

  if (!tips.length) {
    tips.push('Продолжайте фиксировать операции — новые инсайты появятся после нескольких транзакций.');
  }

  return tips.slice(0, 3);
});

// Net Worth trend chart
const balanceChartData = computed(() => {
  const points = sortedNetWorth.value;
  return {
    labels: points.map(item => formatMonthLabel(item.year, item.month)),
    datasets: [
      {
        label: 'Общий баланс',
        data: points.map(item => item.totalBalance),
        borderColor: 'rgba(56, 189, 248, 1)',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(56, 189, 248, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ]
  };
});

// Category pie chart
const categoryChartData = computed(() => ({
  labels: categoryExpenses.value.map(c => c.name),
  datasets: [
    {
      data: categoryExpenses.value.map(c => c.amount),
      backgroundColor: categoryExpenses.value.map(c => c.color),
      borderColor: 'rgba(148, 163, 184, 0.35)',
      borderWidth: 1,
      hoverBorderWidth: 2,
      hoverBorderColor: '#f8fafc',
    }
  ]
}));

// Monthly expenses bar chart
const expensesChartData = computed(() => {
  const points = sortedMonthlyExpenses.value;
  return {
    labels: expenseLabels.value,
    datasets: [
      {
        label: 'Расходы',
        data: points.map(item => item.amount),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        borderRadius: 8,
      }
    ]
  };
});

// Chart options
const balanceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'start' as const,
      labels: {
        color: '#e2e8f0',
        font: { size: 14, weight: 600 as const },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 8,
        boxHeight: 8,
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(15, 23, 42, 0.98)',
      titleColor: '#f8fafc',
      titleFont: { size: 14, weight: 600 as const },
      bodyColor: '#e2e8f0',
      bodyFont: { size: 13 },
      padding: 16,
      borderColor: 'rgba(56, 189, 248, 0.4)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 6,
      usePointStyle: true,
      callbacks: {
        label: function(context: any) {
          return `${context.dataset.label}: ${formatAmount(context.parsed.y ?? 0)}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(148, 163, 184, 0.08)',
        lineWidth: 1,
      },
      border: {
        display: false,
      },
      ticks: {
        color: 'rgba(148, 163, 184, 0.85)',
        font: { size: 12, weight: 500 as const },
        padding: 8,
      }
    },
    y: {
      beginAtZero: false,
      grid: {
        color: 'rgba(148, 163, 184, 0.08)',
        lineWidth: 1,
      },
      border: {
        display: false,
      },
      ticks: {
        color: 'rgba(148, 163, 184, 0.85)',
        font: { size: 12, weight: 500 as const },
        padding: 12,
        callback(value: string | number) {
          const numericValue = typeof value === 'number' ? value : Number(value);
          if (!Number.isFinite(numericValue)) {
            return typeof value === 'string' ? value : String(value);
          }
          return formatAmount(numericValue);
        }
      }
    }
  }
};

const categoryChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        color: '#e2e8f0',
        font: { size: 14, weight: 500 as const },
        usePointStyle: true,
        padding: 12,
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(15, 23, 42, 0.98)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      bodyFont: { size: 13 },
      padding: 16,
      borderColor: 'rgba(148, 163, 184, 0.4)',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = total ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
          return `${context.label}: ${formatAmount(context.parsed ?? 0)} (${percentage}%)`;
        }
      }
    }
  }
};

const expensesChartOptions = computed(() => {
  const currencyCode = analyticsCurrencyCode.value;
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          color: '#e2e8f0',
          font: { size: 14, weight: 600 as const },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        titleColor: '#f8fafc',
        titleFont: { size: 14, weight: 600 as const },
        bodyColor: '#e2e8f0',
        bodyFont: { size: 13 },
        padding: 16,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label(context: any) {
            const value = context.parsed?.y ?? 0;
            const safeValue = Math.max(value, 0);
            return `${context.dataset.label}: ${formatCurrency(safeValue, currencyCode)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.08)',
          lineWidth: 1,
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'rgba(148, 163, 184, 0.85)',
          font: { size: 12, weight: 500 as const },
          padding: 8,
          maxRotation: 45,
          minRotation: 0,
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.08)',
          lineWidth: 1,
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'rgba(148, 163, 184, 0.85)',
          font: { size: 12, weight: 500 as const },
          padding: 12,
          callback(value: string | number) {
            const numericValue = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(numericValue)) {
              return typeof value === 'string' ? value : String(value);
            }
            return formatCurrency(numericValue, currencyCode);
          }
        }
      }
    }
  };
});

async function fetchExpensesByGranularity(): Promise<void> {
  try {
    const data = await apiService.getExpensesByGranularity(expenseGranularity.value);
    monthlyExpenses.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to load expenses by granularity:', error);
    monthlyExpenses.value = [];
  }
}

async function fetchAllData(): Promise<void> {
  try {
    const networth = await apiService.getNetWorthTrend();
    netWorthSnapshots.value = Array.isArray(networth) ? networth : [];
    await fetchExpensesByGranularity();
  } catch (error) {
    console.error('Failed to load analytics data:', error);
  }
}

// Watch granularity changes
watch(expenseGranularity, async () => {
  await fetchExpensesByGranularity();
});

onMounted(async () => {
  isAnalyticsLoading.value = true;
  try {
    await Promise.all([
      financeStore.fetchCurrencies(),
      financeStore.fetchAccounts(),
      financeStore.fetchCategories(),
      userStore.fetchCurrentUser(),
      fetchAllData(),
      loadFinancialHealth(),
    ]);
  } finally {
    isAnalyticsLoading.value = false;
  }
});
</script>

<template>
  <div class="analytics page">
    <PageHeader
      title="Аналитика"
      subtitle="Динамика капитала, структура расходов и персональные подсказки"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Аналитика' }
      ]"
    >
      <template #actions>
        <AppButton size="md" icon="pi pi-bolt">
          Запланировать цель
        </AppButton>
      </template>
    </PageHeader>

    <section class="analytics__summary">
      <AppCard class="summary-card" padding="lg" elevated>
        <header class="summary-card__header">
          <div class="summary-card__intro">
            <p class="summary-card__eyebrow">Личная аналитика</p>
            <h2 class="summary-card__title">Финансовая траектория</h2>
            <p class="summary-card__copy">
              Ключевые показатели за выбранный период — {{ selectedFinancialPeriodLabel }}.
              Отслеживайте баланс, расходы и прогресс по целям в одном месте.
            </p>
          </div>
        </header>
        <div class="summary-card__metrics">
          <article
            v-for="metric in heroHighlights"
            :key="metric.key"
            class="summary-metric"
          >
            <span class="summary-metric__label">{{ metric.label }}</span>
            <span class="summary-metric__value">{{ metric.primary }}</span>
            <span
              class="summary-metric__meta"
              :class="`summary-metric__meta--${metric.secondaryTone ?? 'muted'}`"
            >
              {{ metric.secondary }}
            </span>
          </article>
        </div>
      </AppCard>
    </section>

    <section class="analytics__grid">
      <FinancialHealthSummaryCard
        class="analytics-card analytics-card--health"
        :loading="isFinancialHealthLoading"
        :metrics="financialMetricCards"
        :has-data="hasFinancialMetrics"
        :period-label="selectedFinancialPeriodLabel"
      >
        <template #actions>
          <div class="segmented" role="tablist" aria-label="Период финансового здоровья">
            <button
              v-for="option in financialPeriodOptions"
              :key="option.value"
              type="button"
              :class="['segmented__btn', { 'is-active': financialPeriod === option.value }]"
              @click="financialPeriod = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </template>
      </FinancialHealthSummaryCard>

      <AppCard class="analytics-card analytics-card--net-worth" padding="lg" elevated>
        <template #header>
          <div class="analytics-card__header">
            <div class="analytics-card__title">
              <span class="analytics-card__icon">
                <i class="pi pi-chart-line" aria-hidden="true" />
              </span>
              <div>
                <h3>Тренд баланса</h3>
                <p>Как меняется стоимость активов по месяцам</p>
              </div>
            </div>
          </div>
        </template>

        <div v-if="isAnalyticsLoading" class="chart-container chart-container--loading">
          <Skeleton width="100%" height="280px" />
        </div>
        <div v-else-if="sortedNetWorth.length === 0" class="analytics-empty">
          <i class="pi pi-chart-line analytics-empty__icon" />
          <p class="analytics-empty__title">Недостаточно данных</p>
          <p class="analytics-empty__subtitle">
            Добавьте транзакции, чтобы увидеть динамику баланса.
          </p>
        </div>
        <div v-else class="chart-container">
          <Line :data="balanceChartData" :options="balanceChartOptions" />
        </div>
      </AppCard>

      <AppCard class="analytics-card analytics-card--categories" padding="lg" elevated>
        <template #header>
          <div class="analytics-card__header">
            <div class="analytics-card__title">
              <span class="analytics-card__icon">
                <i class="pi pi-chart-pie" aria-hidden="true" />
              </span>
              <div>
                <h3>Расходы по категориям</h3>
                <p>Структура трат за выбранный период</p>
              </div>
            </div>
            <div class="segmented" role="tablist" aria-label="Период по категориям">
              <button
                v-for="period in categoryPeriods"
                :key="period.value"
                type="button"
                :class="['segmented__btn', { 'is-active': categoryTimePeriod === period.value }]"
                @click="categoryTimePeriod = period.value as CategoryTimePeriod"
              >
                {{ period.label }}
              </button>
            </div>
          </div>
        </template>

        <div v-if="isAnalyticsLoading" class="chart-container chart-container--loading">
          <Skeleton width="100%" height="280px" />
        </div>
        <div v-else-if="categoryExpenses.length === 0" class="analytics-empty analytics-empty--compact">
          <i class="pi pi-inbox analytics-empty__icon" />
          <p class="analytics-empty__title">Нет данных</p>
          <p class="analytics-empty__subtitle">
            Запишите операции, чтобы увидеть лидирующие категории.
          </p>
        </div>
        <div v-else class="chart-container chart-container--pie">
          <Pie :data="categoryChartData" :options="categoryChartOptions" />
        </div>
      </AppCard>

      <AppCard class="analytics-card analytics-card--expenses" padding="lg" elevated>
        <template #header>
          <div class="analytics-card__header">
            <div class="analytics-card__title">
              <span class="analytics-card__icon">
                <i class="pi pi-chart-bar" aria-hidden="true" />
              </span>
              <div>
                <h3>Динамика расходов</h3>
                <p>Сравнивайте траты по выбранной детализации</p>
              </div>
            </div>
            <div class="segmented" role="tablist" aria-label="Гранулярность расходов">
              <button
                v-for="granularity in expenseGranularities"
                :key="granularity.value"
                type="button"
                :class="['segmented__btn', { 'is-active': expenseGranularity === granularity.value }]"
                @click="expenseGranularity = granularity.value as ExpenseGranularity"
              >
                {{ granularity.label }}
              </button>
            </div>
          </div>
        </template>

        <div v-if="isAnalyticsLoading" class="chart-container chart-container--loading">
          <Skeleton width="100%" height="280px" />
        </div>
        <div v-else-if="sortedMonthlyExpenses.length === 0" class="analytics-empty analytics-empty--compact">
          <i class="pi pi-database analytics-empty__icon" />
          <p class="analytics-empty__title">Недостаточно данных</p>
          <p class="analytics-empty__subtitle">
            Добавьте операции, чтобы увидеть динамику расходов.
          </p>
        </div>
        <div v-else class="chart-container">
          <Bar :data="expensesChartData" :options="expensesChartOptions" />
        </div>
      </AppCard>

      <AppCard
        v-if="improvementTips.length > 0"
        class="analytics-card analytics-card--insights"
        padding="lg"
        elevated
      >
        <template #header>
          <div class="analytics-card__header">
            <div class="analytics-card__title">
              <span class="analytics-card__icon">
                <i class="pi pi-lightbulb" aria-hidden="true" />
              </span>
              <div>
                <h3>Следующие шаги</h3>
                <p>Персональные рекомендации на основе текущих данных</p>
              </div>
            </div>
          </div>
        </template>

        <ul class="insight-list">
          <li v-for="tip in improvementTips" :key="tip">
            <i class="pi pi-check-circle" aria-hidden="true" />
            <span>{{ tip }}</span>
          </li>
        </ul>
      </AppCard>
    </section>
  </div>
</template>

<style scoped>
.analytics {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-7);
  padding-bottom: var(--ft-space-8);
}

.analytics__summary {
  margin-top: var(--ft-space-5);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-soft);
  background: linear-gradient(145deg, rgba(37, 99, 235, 0.12), rgba(15, 23, 42, 0.6));
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.28);
}

.summary-card__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--ft-space-4);
}

.summary-card__intro {
  display: grid;
  gap: var(--ft-space-2);
  max-width: clamp(320px, 60vw, 560px);
}

.summary-card__eyebrow {
  margin: 0;
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: var(--ft-font-semibold);
  color: rgba(191, 219, 254, 0.9);
}

.summary-card__title {
  margin: 0;
  font-size: clamp(var(--ft-text-2xl), 3.8vw, var(--ft-text-3xl));
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-inverse);
}

.summary-card__copy {
  margin: 0;
  font-size: var(--ft-text-base);
  line-height: var(--ft-leading-relaxed);
  color: rgba(226, 232, 240, 0.85);
}

.summary-card__metrics {
  display: grid;
  gap: var(--ft-space-4);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.summary-metric {
  display: grid;
  gap: var(--ft-space-2);
  padding: var(--ft-space-4);
  border-radius: var(--ft-radius-xl);
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.summary-metric__label {
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.72);
}

.summary-metric__value {
  font-size: clamp(var(--ft-text-lg), 3vw, var(--ft-text-2xl));
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-inverse);
}

.summary-metric__meta {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
}

.summary-metric__meta--muted {
  color: rgba(209, 213, 219, 0.8);
}

.summary-metric__meta--positive {
  color: var(--ft-success-400);
}

.summary-metric__meta--negative {
  color: var(--ft-danger-400);
}

.summary-metric__meta--warning {
  color: var(--ft-warning-400);
}

.analytics__grid {
  display: grid;
  gap: var(--ft-space-6);
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: stretch;
}

.analytics-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: clamp(var(--ft-space-5), 3vw, var(--ft-space-6));
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-soft);
  background: var(--ft-surface-soft);
  box-shadow: var(--ft-shadow-card);
}

.analytics-card__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.analytics-card__title {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.analytics-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--ft-radius-lg);
  background: rgba(37, 99, 235, 0.14);
  color: var(--ft-primary-600);
}

.analytics-card__title h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.analytics-card__title p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.segmented {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-1);
  padding: var(--ft-space-1);
  border-radius: 999px;
  background: var(--ft-surface-muted);
}

.segmented__btn {
  border: none;
  background: transparent;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  padding: var(--ft-space-2) var(--ft-space-3);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--ft-transition-fast);
}

.segmented__btn:hover {
  color: var(--ft-heading);
}

.segmented__btn.is-active {
  background: var(--ft-primary-600);
  color: var(--ft-text-inverse);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
}

.segmented__btn:focus-visible {
  outline: 2px solid var(--ft-focus-ring);
  outline-offset: 2px;
}

.chart-container {
  position: relative;
  min-height: 320px;
  height: 360px;
}

.chart-container--pie {
  height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container--loading {
  display: grid;
  place-items: center;
}

.analytics-empty {
  display: grid;
  place-items: center;
  gap: var(--ft-space-3);
  text-align: center;
  min-height: 300px;
  padding: var(--ft-space-6);
  border-radius: var(--ft-radius-xl);
  border: 1px dashed var(--ft-border-soft);
  background: var(--ft-surface-muted);
}

.analytics-empty--compact {
  min-height: 260px;
}

.analytics-empty__icon {
  font-size: var(--ft-text-3xl);
  color: var(--ft-primary-500);
}

.analytics-empty__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.analytics-empty__subtitle {
  margin: 0;
  max-width: 36ch;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.insight-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--ft-space-3);
}

.insight-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3) var(--ft-space-4);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-muted);
}

.insight-list i {
  color: var(--ft-success-500);
  font-size: 1rem;
  margin-top: 2px;
}

@media (min-width: 1200px) {
  .analytics__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .analytics-card--health {
    grid-column: span 2;
  }

  .analytics-card--net-worth {
    grid-column: span 4;
  }

  .analytics-card--categories,
  .analytics-card--expenses {
    grid-column: span 3;
  }

  .analytics-card--insights {
    grid-column: span 6;
  }
}

@media (max-width: 768px) {
  .analytics {
    gap: var(--ft-space-5);
  }

  .summary-card__header {
    flex-direction: column;
    gap: var(--ft-space-3);
  }

  .chart-container {
    height: 320px;
  }

  .segmented {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .segmented__btn {
    flex: 1 1 auto;
    text-align: center;
  }
}
</style>
