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
import type { MonthlyExpenseDto, CategoryExpenseDto, NetWorthSnapshotDto } from '../types.ts';
import { formatCurrency } from '../utils/formatters';

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
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: '#e2e8f0',
        font: { size: 14 },
        padding: 20,
        usePointStyle: true,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      padding: 12,
      borderColor: 'rgba(56, 189, 248, 0.3)',
      borderWidth: 1,
      displayColors: true,
      callbacks: {
        label: function(context: any) {
          return `${context.dataset.label}: ${formatAmount(context.parsed.y ?? 0)}`;
        }
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
      ticks: { color: '#94a3b8', font: { size: 12 } }
    },
    y: {
      beginAtZero: false,
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
      ticks: {
        color: '#94a3b8',
        font: { size: 12 },
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
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        color: '#f1f5f9',
        font: { size: 13, weight: 500 as const },
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle',
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
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      padding: 12,
      borderColor: 'rgba(56, 189, 248, 0.3)',
      borderWidth: 1,
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
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          font: { size: 14 },
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 12,
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
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
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: '#94a3b8', font: { size: 12 } }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 12 },
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
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts(),
    financeStore.fetchCategories(),
    userStore.fetchCurrentUser(),
    fetchAllData(),
  ]);
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
          <div v-if="sortedNetWorth.length === 0" class="empty-state">
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
            <div v-if="categoryExpenses.length === 0" class="empty-state empty-state--compact">
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
            <div v-if="sortedMonthlyExpenses.length === 0" class="empty-state empty-state--compact">
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
  gap: var(--ft-space-6);
}

.analytics__content {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}

.analytics__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr));
  gap: var(--ft-space-6);
}

/* Chart Cards */
.chart-card {
  position: relative;
  background: var(--ft-surface);
  border: 1px solid var(--ft-border);
  border-radius: var(--ft-radius-lg);
  overflow: hidden;
  transition: all 0.2s ease;
}

.chart-card:hover {
  border-color: var(--ft-border-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.chart-card--primary {
  background: linear-gradient(135deg,
    var(--ft-surface) 0%,
    rgba(56, 189, 248, 0.03) 100%);
  border-color: rgba(56, 189, 248, 0.15);
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
  gap: var(--ft-space-4);
}

.chart-header__text {
  flex: 1;
  min-width: 0;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
  line-height: 1.3;
}

.chart-icon {
  color: var(--ft-accent);
  font-size: 1.25rem;
}

.chart-subtitle {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
  line-height: 1.5;
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
}

.filter-btn {
  padding: var(--ft-space-2) var(--ft-space-3);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-muted);
  background: var(--ft-surface);
  border: 1px solid var(--ft-border);
  border-radius: var(--ft-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  color: var(--ft-text);
  border-color: var(--ft-border-hover);
  background: var(--ft-surface-elevated);
}

.filter-btn--active {
  color: var(--ft-accent);
  background: rgba(56, 189, 248, 0.1);
  border-color: var(--ft-accent);
  font-weight: var(--ft-font-semibold);
}

.filter-btn--active:hover {
  background: rgba(56, 189, 248, 0.15);
}

/* Chart Containers */
.chart-container {
  position: relative;
  min-height: 300px;
  height: 400px;
}

.chart-container--pie {
  height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ft-space-4) 0;
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ft-space-3);
  min-height: 400px;
  padding: var(--ft-space-8);
  text-align: center;
}

.empty-state--compact {
  min-height: 350px;
  padding: var(--ft-space-6);
}

.empty-state__icon {
  font-size: 3rem;
  color: var(--ft-text-muted);
  opacity: 0.5;
}

.empty-state__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.empty-state__subtitle {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
  max-width: 300px;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .chart-container {
    height: 350px;
  }

  .chart-container--pie {
    height: 400px;
  }
}

@media (max-width: 768px) {
  .analytics {
    gap: var(--ft-space-5);
  }

  .analytics__content {
    gap: var(--ft-space-5);
  }

  .analytics__grid {
    grid-template-columns: 1fr;
    gap: var(--ft-space-5);
  }

  .chart-card :deep(.p-card-header) {
    padding: var(--ft-space-4) var(--ft-space-5);
  }

  .chart-card :deep(.p-card-content) {
    padding: var(--ft-space-5);
  }

  .chart-header {
    flex-direction: column;
    gap: var(--ft-space-3);
  }

  .chart-title {
    font-size: var(--ft-text-lg);
  }

  .month-selector {
    width: 100%;
    min-width: 0;
  }

  .filter-group {
    width: 100%;
    justify-content: flex-start;
  }

  .filter-btn {
    flex: 1;
    min-width: fit-content;
  }

  .chart-container {
    height: 300px;
  }

  .chart-container--pie {
    height: 350px;
  }

  .empty-state {
    min-height: 300px;
    padding: var(--ft-space-6);
  }

  .empty-state--compact {
    min-height: 280px;
  }

  .empty-state__icon {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .chart-card :deep(.p-card-header) {
    padding: var(--ft-space-4);
  }

  .chart-card :deep(.p-card-content) {
    padding: var(--ft-space-4);
  }

  .chart-title {
    font-size: var(--ft-text-base);
  }

  .chart-icon {
    font-size: 1.1rem;
  }

  .chart-container {
    height: 280px;
  }

  .chart-container--pie {
    height: 320px;
  }
}
</style>
