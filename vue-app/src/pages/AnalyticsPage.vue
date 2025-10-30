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

// Регистрируем компоненты Chart.js
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

const monthNameFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1);
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
    console.error('Ошибка загрузки ежемесячных расходов:', error);
    monthlyExpenses.value = [];
  }
}

// Моковые данные для демонстрации
const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь'];
const selectedMonth = ref('Октябрь');
const monthOptions = months.map(m => ({ label: m, value: m }));

// График баланса по месяцам
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

// Круговая диаграмма - расходы по категориям
const categoryChartData = computed(() => ({
  labels: ['Продукты', 'Транспорт', 'Развлечения', 'Здоровье', 'Одежда', 'Жильё', 'Прочее'],
  datasets: [
    {
      data: [85000, 42000, 28000, 35000, 22000, 95000, 35000],
      backgroundColor: [
        'rgba(56, 189, 248, 0.8)',  // Голубой
        'rgba(167, 139, 250, 0.8)', // Фиолетовый
        'rgba(251, 146, 60, 0.8)',  // Оранжевый
        'rgba(16, 185, 129, 0.8)',  // Зелёный
        'rgba(244, 114, 182, 0.8)', // Розовый
        'rgba(45, 212, 191, 0.8)',  // Бирюзовый
        'rgba(148, 163, 184, 0.8)', // Серый
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

// Столбчатая диаграмма - расходы по месяцам
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

// Опции для графиков
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
          return `${context.dataset.label}: ${context.parsed.y.toLocaleString('ru-RU')} ₸`;
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
          return value.toLocaleString('ru-RU') + ' ₸';
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
          return `${context.label}: ${context.parsed.toLocaleString('ru-RU')} ₸ (${percentage}%)`;
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
              return `${context.dataset.label}: ${safeValue.toLocaleString('ru-RU')}`;
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
              return numericValue.toLocaleString('ru-RU');
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
  <div class="page analytics-page">
    <!-- Заголовок -->
    <section class="ft-section">
      <div class="ft-section__head">
        <span class="ft-kicker">Финансовая аналитика</span>
        <h1 class="ft-display ft-display--section">Обзор ваших финансов</h1>
        <p class="ft-text ft-text--muted">
          Визуализация доходов, расходов и баланса. Данные обновляются в реальном времени.
        </p>
      </div>
    </section>

    <!-- График баланса -->
    <section class="ft-section">
      <Card class="ft-card chart-card">
        <template #title>
          <div class="card-header">
            <div>
              <h3 class="chart-title">Динамика общего баланса</h3>
              <p class="chart-subtitle">Изменение баланса по месяцам</p>
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

    <!-- Расходы и категории -->
    <div class="charts-grid">
      <!-- Круговая диаграмма категорий -->
      <Card class="ft-card chart-card">
        <template #title>
          <div class="card-header">
            <div>
              <h3 class="chart-title">Расходы по категориям</h3>
              <p class="chart-subtitle">За выбранный месяц</p>
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

      <!-- Столбчатая диаграмма расходов -->
      <Card class="ft-card chart-card">
        <template #title>
          <div class="card-header">
            <div>
              <h3 class="chart-title">Доходы и расходы</h3>
              <p class="chart-subtitle">Сравнение по месяцам</p>
            </div>
          </div>
        </template>
        <template #content>
          <div class="chart-wrapper">
            <Bar :data="expensesChartData" :options="expensesChartOptions" />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.analytics-page {
  gap: clamp(2rem, 2.5vw, 2.5rem);
}

.ft-stat-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.ft-stat__value.expense {
  color: #ef4444;
}

.ft-stat__value.income {
  color: var(--ft-success);
}

.ft-stat__value.savings {
  color: var(--ft-accent);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 500px), 1fr));
  gap: clamp(1.5rem, 2vw, 2rem);
}

.chart-card {
  position: relative;
  overflow: hidden;
}

.chart-card::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.08), transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.chart-card :deep(.p-card-content) {
  position: relative;
  z-index: 1;
  padding-top: 1rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.chart-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ft-heading);
}

.chart-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--ft-text-muted);
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

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
  }

  .month-selector {
    width: 100%;
  }
}
</style>
