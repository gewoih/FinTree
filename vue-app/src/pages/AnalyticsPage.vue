<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
import Select from 'primevue/select';
import Card from 'primevue/card';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import { apiService } from '../services/api.service.ts';
import type { MonthlyExpenseDto } from '../types.ts';
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
const monthlyExpenses = ref<MonthlyExpenseDto[]>([]);

const analyticsCurrencyCode = computed(() => {
  if (userStore.baseCurrencyCode) {
    return userStore.baseCurrencyCode;
  }
  return (
    financeStore.primaryAccount?.currency?.code ??
    financeStore.primaryAccount?.currencyCode ??
    null
  );
});

const formatAmount = (value: number) => {
  const currencyCode = analyticsCurrencyCode.value ?? 'USD'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(Math.max(value, 0))
}

const monthNameFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toLocaleUpperCase('en-US') + value.slice(1);
}

function formatMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const monthName = capitalize(monthNameFormatter.format(date));
  return `${monthName} ${year}`;
}

async function fetchMonthlyExpenses(): Promise<void> {
  try {
    const data = await apiService.getMonthlyExpenses();
    monthlyExpenses.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to load monthly expenses:', error);
    monthlyExpenses.value = [];
  }
}

// Mock data for demo purposes
const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь'];
const selectedMonth = ref('Октябрь');
const monthOptions = months.map(m => ({ label: m, value: m }));

// Balance chart configuration
const balanceChartData = computed(() => ({
  labels: months,
  datasets: [
    {
      label: 'Общий баланс',
      data: [850000, 920000, 1050000, 980000, 1120000, 1180000, 1150000, 1250000, 1200000, 1280000],
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
}));

// Pie chart — spend by category
const categoryChartData = computed(() => ({
  labels: ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Одежда', 'Жилье', 'Другое'],
  datasets: [
    {
      data: [85000, 42000, 28000, 35000, 22000, 95000, 35000],
      backgroundColor: [
        'rgba(56, 189, 248, 0.8)',  // Sky
        'rgba(167, 139, 250, 0.8)', // Indigo
        'rgba(251, 146, 60, 0.8)',  // Amber
        'rgba(16, 185, 129, 0.8)',  // Emerald
        'rgba(244, 114, 182, 0.8)', // Pink
        'rgba(45, 212, 191, 0.8)',  // Teal
        'rgba(148, 163, 184, 0.8)', // Slate
      ],
      borderColor: 'rgba(15, 23, 42, 0.8)',
      borderWidth: 2,
    }
  ]
}));

const sortedMonthlyExpenses = computed(() =>
  monthlyExpenses.value
    .slice()
    .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year))
);

// Bar chart — expenses by month
const expensesChartData = computed(() => {
  const points = sortedMonthlyExpenses.value;
  return {
    labels: points.map(item => formatMonthLabel(item.year, item.month)),
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
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        color: '#e2e8f0',
        font: { size: 13 },
        padding: 15,
        usePointStyle: true,
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
                hidden: false,
                index: i
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
            if (!currencyCode) {
          return `${context.dataset.label}: ${formatAmount(safeValue)}`;
            }
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
            if (!currencyCode) {
              return numericValue.toLocaleString('en-US');
            }
            return formatCurrency(numericValue, currencyCode);
          }
        }
      }
    }
  };
});

onMounted(async () => {
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts(),
    financeStore.fetchCategories(),
    userStore.fetchCurrentUser(),
    fetchMonthlyExpenses(),
  ]);
});
</script>

<template>
  <div class="analytics page">
    <PageHeader
      title="Аналитика"
      subtitle="Визуализируйте тренды баланса, категории расходов и месячный денежный поток"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Аналитика' }
      ]"
    />

    <section class="analytics__primary">
      <Card class="chart-card ft-card">
        <template #title>
          <div class="chart-header">
            <div>
              <h3>Тренд баланса</h3>
              <p>Изменение общего баланса месяц за месяцем</p>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-wrapper">
            <Line :data="balanceChartData" :options="balanceChartOptions" />
          </div>
        </template>
      </Card>
    </section>

    <section class="analytics__grid">
      <Card class="chart-card ft-card">
        <template #title>
          <div class="chart-header">
            <div>
              <h3>Расходы по категориям</h3>
              <p>Распределение за выбранный месяц</p>
            </div>
            <Select
              v-model="selectedMonth"
              :options="monthOptions"
              option-label="label"
              option-value="value"
              class="month-selector"
            />
          </div>
        </template>
        <template #content>
          <div class="chart-wrapper chart-wrapper--pie">
            <Pie :data="categoryChartData" :options="categoryChartOptions" />
          </div>
        </template>
      </Card>

      <Card class="chart-card">
        <template #title>
          <div class="chart-header">
            <div>
              <h3>Месячные расходы</h3>
              <p>Сравните расходы месяц за месяцем</p>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-wrapper">
            <Bar :data="expensesChartData" :options="expensesChartOptions" />
          </div>
        </template>
      </Card>
    </section>
  </div>
</template>

<style scoped>
.analytics {
  gap: var(--ft-space-8);
}

.analytics__primary,
.analytics__grid {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);
}

.analytics__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--ft-space-5);
}


.chart-card {
  position: relative;
  overflow: hidden;
}

.chart-card :deep(.p-card-content) {
  padding-top: var(--ft-space-3);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-3);
  flex-wrap: wrap;
}

.chart-header h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.chart-header p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.month-selector {
  min-width: 150px;
}

.chart-wrapper {
  position: relative;
  height: 350px;
  padding: 1rem 0;
}

.chart-wrapper--pie {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 300px;
  }

  .chart-wrapper--pie {
    height: 350px;
  }

  .analytics__grid {
    grid-template-columns: 1fr;
  }

  .chart-header {
    flex-direction: column;
  }

  .month-selector {
    width: 100%;
  }
}
</style>
