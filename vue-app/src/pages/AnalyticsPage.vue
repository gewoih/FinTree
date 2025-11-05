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
import Card from 'primevue/card';
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
}

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

// Granularity filters for monthly expenses
type ExpenseGranularity = 'days' | 'weeks' | 'months';
const expenseGranularity = ref<ExpenseGranularity>('months');

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
        dash: [5, 5],
      },
      ticks: {
        color: 'rgba(148, 163, 184, 0.85)',
        font: { size: 12, weight: 500 as const },
        padding: 12,
        callback: function(value: any) {
          return formatAmount(value);
        }
      }
    }
  }
};

const categoryChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'point' as const,
    intersect: true,
  },
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      align: 'start' as const,
      labels: {
        color: '#f1f5f9',
        font: { size: 13, weight: 600 as const },
        padding: 12,
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 10,
        boxHeight: 10,
        generateLabels: function(chart: any) {
          const data = chart.data;
          if (data.labels.length && data.datasets.length) {
            const dataset = data.datasets[0];
            const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
            return data.labels.map((label: string, i: number) => {
              const value = dataset.data[i];
              const percentage = ((value / total) * 100).toFixed(1);
              return {
                text: `${label}: ${percentage}%`,
                fillStyle: dataset.backgroundColor[i],
                strokeStyle: dataset.backgroundColor[i],
                hidden: false,
                index: i,
                fontColor: '#f1f5f9'
              };
            });
          }
          return [];
        }
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
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((context.parsed / total) * 100).toFixed(1);
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
      subtitle="Отслеживайте динамику баланса, структуру расходов и денежный поток"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Аналитика' }
      ]"
    />

    <section class="analytics__content">
      <FinancialHealthSummaryCard
        :loading="isFinancialHealthLoading"
        :metrics="financialMetricCards"
        :has-data="hasFinancialMetrics"
        :period-label="selectedFinancialPeriodLabel"
      >
        <template #actions>
          <div class="filter-group">
            <button
              v-for="option in financialPeriodOptions"
              :key="option.value"
              :class="['filter-btn', { 'filter-btn--active': financialPeriod === option.value }]"
              type="button"
              @click="financialPeriod = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </template>
      </FinancialHealthSummaryCard>

      <!-- Net Worth Trend - Full Width -->
      <Card class="chart-card chart-card--primary">
        <template #title>
          <div class="chart-header">
            <div class="chart-header__text">
                <h3 class="chart-title">
                  <i class="pi pi-chart-line chart-icon" />
                  Тренд баланса
                </h3>
                <p class="chart-subtitle">Изменение общей стоимости активов по месяцам</p>
            </div>
          </div>
        </template>
        <template #content>
          <div v-if="isAnalyticsLoading" class="chart-container chart-container--loading">
            <Skeleton width="100%" height="280px" />
          </div>
          <div v-else-if="sortedNetWorth.length === 0" class="empty-state">
            <i class="pi pi-chart-line empty-state__icon" />
            <p class="empty-state__title">Недостаточно данных</p>
            <p class="empty-state__subtitle">Добавьте транзакции, чтобы увидеть тренд баланса</p>
          </div>
          <div v-else class="chart-container">
            <Line :data="balanceChartData" :options="balanceChartOptions" />
          </div>
        </template>
      </Card>

      <!-- Charts Grid -->
      <div class="analytics__grid">
        <!-- Category Pie Chart -->
        <Card class="chart-card">
          <template #title>
            <div class="chart-header">
              <div class="chart-header__text">
                <h3 class="chart-title">
                  <i class="pi pi-chart-pie chart-icon" />
                  Расходы по категориям
                </h3>
                <p class="chart-subtitle">Структура расходов за выбранный период</p>
              </div>
              <div class="filter-group">
                <button
                  v-for="period in [
                    { value: 'week', label: 'Неделя' },
                    { value: 'month', label: 'Месяц' },
                    { value: '3months', label: '3 месяца' },
                    { value: '6months', label: '6 месяцев' },
                    { value: '12months', label: '12 месяцев' },
                    { value: 'all', label: 'Всё время' }
                  ]"
                  :key="period.value"
                  :class="['filter-btn', { 'filter-btn--active': categoryTimePeriod === period.value }]"
                  @click="categoryTimePeriod = period.value as CategoryTimePeriod"
                >
                  {{ period.label }}
                </button>
              </div>
            </div>
          </template>
          <template #content>
            <div v-if="isAnalyticsLoading" class="chart-container chart-container--loading">
              <Skeleton width="100%" height="280px" />
            </div>
            <div v-else-if="categoryExpenses.length === 0" class="empty-state empty-state--compact">
              <i class="pi pi-inbox empty-state__icon" />
              <p class="empty-state__title">Нет данных</p>
              <p class="empty-state__subtitle">За выбранный период нет расходов</p>
            </div>
            <div v-else class="chart-container chart-container--pie">
              <Pie :data="categoryChartData" :options="categoryChartOptions" />
            </div>
          </template>
        </Card>

        <!-- Monthly Expenses Bar Chart -->
        <Card class="chart-card">
          <template #title>
            <div class="chart-header">
              <div class="chart-header__text">
                <h3 class="chart-title">
                  <i class="pi pi-chart-bar chart-icon" />
                  Динамика расходов
                </h3>
                <p class="chart-subtitle">Изучайте пики расходов по дням, неделям или месяцам</p>
              </div>
              <div class="filter-group">
                <button
                  v-for="granularity in [
                    { value: 'days', label: 'По дням' },
                    { value: 'weeks', label: 'По неделям' },
                    { value: 'months', label: 'По месяцам' }
                  ]"
                  :key="granularity.value"
                  :class="['filter-btn', { 'filter-btn--active': expenseGranularity === granularity.value }]"
                  @click="expenseGranularity = granularity.value as ExpenseGranularity"
                >
                  {{ granularity.label }}
                </button>
              </div>
            </div>
          </template>
          <template #content>
            <div v-if="isAnalyticsLoading" class="chart-container chart-container--loading">
              <Skeleton width="100%" height="280px" />
            </div>
            <div v-else-if="sortedMonthlyExpenses.length === 0" class="empty-state empty-state--compact">
              <i class="pi pi-database empty-state__icon" />
              <p class="empty-state__title">Недостаточно данных</p>
              <p class="empty-state__subtitle">Добавьте операции, чтобы увидеть динамику расходов</p>
            </div>
            <div v-else class="chart-container">
              <Bar :data="expensesChartData" :options="expensesChartOptions" />
            </div>
          </template>
        </Card>
      </div>
    </section>
  </div>
</template>

<style scoped>
.analytics {
  gap: var(--ft-space-7);
  padding-bottom: var(--ft-space-8);
}

.analytics__content {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-7);
}

.analytics__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr));
  gap: var(--ft-space-7);
}

/* Chart Cards */
.chart-card {
  position: relative;
  background: var(--ft-surface);
  border: 1px solid var(--ft-border);
  border-radius: var(--ft-radius-xl);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-card:hover {
  border-color: var(--ft-border-hover);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.chart-card--primary {
  background: linear-gradient(135deg,
    var(--ft-surface) 0%,
    rgba(56, 189, 248, 0.04) 50%,
    rgba(56, 189, 248, 0.06) 100%);
  border-color: rgba(56, 189, 248, 0.2);
}

.chart-card--primary:hover {
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 8px 32px rgba(56, 189, 248, 0.15), 0 2px 12px rgba(0, 0, 0, 0.08);
}

.chart-card :deep(.p-card-header) {
  padding: var(--ft-space-5) var(--ft-space-6);
  border-bottom: 1px solid var(--ft-border-soft);
  background: var(--ft-surface-elevated);
}

.chart-card :deep(.p-card-body) {
  padding: 0;
}

.chart-card :deep(.p-card-content) {
  padding: var(--ft-space-6);
}

/* Chart Header */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-5);
}

.chart-header__text {
  flex: 1;
  min-width: 0;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-heading);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.chart-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg,
    rgba(56, 189, 248, 0.15) 0%,
    rgba(56, 189, 248, 0.25) 100%);
  border-radius: var(--ft-radius-md);
  color: rgba(56, 189, 248, 1);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.chart-card:hover .chart-icon {
  transform: scale(1.1) rotate(5deg);
}

.chart-subtitle {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
  line-height: 1.6;
  font-weight: var(--ft-font-normal);
}

.month-selector {
  min-width: 180px;
  flex-shrink: 0;
}

/* Filter Group */
.filter-group {
  display: flex;
  gap: var(--ft-space-2);
  flex-wrap: wrap;
  align-items: center;
  background: rgba(15, 23, 42, 0.4);
  padding: var(--ft-space-2);
  border-radius: var(--ft-radius-lg);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.filter-btn {
  position: relative;
  padding: var(--ft-space-2) var(--ft-space-4);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: rgba(148, 163, 184, 0.9);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  overflow: hidden;
}

.filter-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    rgba(56, 189, 248, 0.1) 0%,
    rgba(56, 189, 248, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.filter-btn:hover {
  color: rgba(203, 213, 225, 1);
  border-color: rgba(148, 163, 184, 0.2);
  background: rgba(148, 163, 184, 0.08);
}

.filter-btn--active {
  color: #ffffff;
  background: linear-gradient(135deg,
    rgba(56, 189, 248, 0.25) 0%,
    rgba(56, 189, 248, 0.35) 100%);
  border-color: rgba(56, 189, 248, 0.4);
  font-weight: var(--ft-font-semibold);
  box-shadow: 0 2px 8px rgba(56, 189, 248, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.filter-btn--active::before {
  opacity: 1;
}

.filter-btn--active:hover {
  background: linear-gradient(135deg,
    rgba(56, 189, 248, 0.3) 0%,
    rgba(56, 189, 248, 0.4) 100%);
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* Chart Containers */
.chart-container {
  position: relative;
  min-height: 320px;
  height: 420px;
  padding: var(--ft-space-4) 0;
}

.chart-container--pie {
  height: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ft-space-5) 0;
}

.chart-container--loading {
  display: grid;
  place-items: center;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ft-space-4);
  min-height: 400px;
  padding: var(--ft-space-8);
  text-align: center;
  background: radial-gradient(circle at center,
    rgba(148, 163, 184, 0.03) 0%,
    transparent 70%);
}

.empty-state--compact {
  min-height: 360px;
  padding: var(--ft-space-7);
}

.empty-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  font-size: 2.5rem;
  color: rgba(148, 163, 184, 0.6);
  background: radial-gradient(circle,
    rgba(148, 163, 184, 0.08) 0%,
    rgba(148, 163, 184, 0.03) 70%,
    transparent 100%);
  border-radius: 50%;
  border: 2px dashed rgba(148, 163, 184, 0.15);
}

.empty-state__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
  letter-spacing: -0.01em;
}

.empty-state__subtitle {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: rgba(148, 163, 184, 0.8);
  max-width: 320px;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .analytics {
    gap: var(--ft-space-6);
  }

  .analytics__content {
    gap: var(--ft-space-6);
  }

  .analytics__grid {
    gap: var(--ft-space-6);
  }

  .chart-container {
    height: 380px;
  }

  .chart-container--pie {
    height: 440px;
  }

}

@media (max-width: 768px) {
  .analytics {
    gap: var(--ft-space-5);
    padding-bottom: var(--ft-space-7);
  }

  .analytics__content {
    gap: var(--ft-space-5);
  }

  .analytics__grid {
    grid-template-columns: 1fr;
    gap: var(--ft-space-5);
  }

  .chart-card {
    border-radius: var(--ft-radius-lg);
  }

  .chart-card :deep(.p-card-header) {
    padding: var(--ft-space-5);
  }

  .chart-card :deep(.p-card-content) {
    padding: var(--ft-space-5);
  }

  .chart-header {
    flex-direction: column;
    gap: var(--ft-space-4);
    align-items: stretch;
  }

  .chart-title {
    font-size: var(--ft-text-lg);
  }

  .chart-icon {
    width: 28px;
    height: 28px;
    font-size: 0.95rem;
  }

  .month-selector {
    width: 100%;
    min-width: 0;
  }

  .filter-group {
    width: 100%;
    justify-content: flex-start;
    padding: var(--ft-space-2);
  }

  .filter-btn {
    flex: 1;
    min-width: fit-content;
    padding: var(--ft-space-2) var(--ft-space-3);
    font-size: 0.8125rem;
  }

  .chart-container {
    height: 320px;
    min-height: 280px;
  }

  .chart-container--pie {
    height: 380px;
  }

  .empty-state {
    min-height: 320px;
    padding: var(--ft-space-7);
    gap: var(--ft-space-3);
  }

  .empty-state--compact {
    min-height: 300px;
    padding: var(--ft-space-6);
  }

  .empty-state__icon {
    width: 70px;
    height: 70px;
    font-size: 2.25rem;
  }
}

@media (max-width: 480px) {
  .analytics {
    gap: var(--ft-space-4);
  }

  .analytics__content {
    gap: var(--ft-space-4);
  }

  .analytics__grid {
    gap: var(--ft-space-4);
  }

  .chart-card :deep(.p-card-header) {
    padding: var(--ft-space-4);
  }

  .chart-card :deep(.p-card-content) {
    padding: var(--ft-space-4);
  }

  .chart-header {
    gap: var(--ft-space-3);
  }

  .chart-title {
    font-size: var(--ft-text-base);
    gap: var(--ft-space-2);
  }

  .chart-icon {
    width: 26px;
    height: 26px;
    font-size: 0.875rem;
  }

  .chart-subtitle {
    font-size: 0.8125rem;
  }

  .filter-group {
    gap: var(--ft-space-1);
    padding: var(--ft-space-1);
  }

  .filter-btn {
    padding: var(--ft-space-2);
    font-size: 0.75rem;
  }

  .chart-container {
    height: 280px;
    min-height: 260px;
  }

  .chart-container--pie {
    height: 340px;
  }

  .empty-state {
    min-height: 280px;
    padding: var(--ft-space-6);
  }

  .empty-state--compact {
    min-height: 260px;
    padding: var(--ft-space-5);
  }

  .empty-state__icon {
    width: 60px;
    height: 60px;
    font-size: 2rem;
  }

}
</style>
