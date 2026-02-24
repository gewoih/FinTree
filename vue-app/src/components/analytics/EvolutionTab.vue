<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js'
import { useEvolutionTab, KPI_OPTIONS } from '@/composables/useEvolutionTab'
import type { EvolutionRange } from '@/composables/useEvolutionTab'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip)

const {
  state,
  error,
  selectedKpi,
  selectedRange,
  chartLabels,
  chartValues,
  currentMonthValue,
  monthOverMonthDelta,
  load,
  changeRange,
} = useEvolutionTab()

onMounted(load)

const RANGES: { value: EvolutionRange; label: string }[] = [
  { value: 6, label: '6 мес' },
  { value: 12, label: '12 мес' },
  { value: 0, label: 'Всё' },
]

const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      data: chartValues.value,
      borderColor: '#D4DE95',
      backgroundColor: 'transparent',
      pointBackgroundColor: '#D4DE95',
      spanGaps: false,
      tension: 0.3,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(255,255,255,0.06)' } },
  },
}

const deltaLabel = computed(() => {
  const d = monthOverMonthDelta.value
  if (d == null) return null
  const sign = d >= 0 ? '+' : ''
  return `${sign}${d.toFixed(2)} к прошлому месяцу`
})
</script>

<template>
  <div class="evolution-tab">
    <!-- Range filter -->
    <div
      class="evolution-tab__ranges"
      role="group"
      aria-label="Период"
    >
      <button
        v-for="r in RANGES"
        :key="r.value"
        class="evolution-tab__range-btn"
        :class="{ 'evolution-tab__range-btn--active': selectedRange === r.value }"
        @click="changeRange(r.value)"
      >
        {{ r.label }}
      </button>
    </div>

    <!-- KPI selector -->
    <select
      v-model="selectedKpi"
      class="evolution-tab__kpi-select"
      aria-label="Показатель"
    >
      <option
        v-for="opt in KPI_OPTIONS"
        :key="opt.key"
        :value="opt.key"
      >
        {{ opt.label }}
      </option>
    </select>

    <!-- Chart area -->
    <div
      class="evolution-tab__chart-wrap"
      role="img"
      :aria-label="`График: ${KPI_OPTIONS.find(o => o.key === selectedKpi)?.label}`"
    >
      <template v-if="state === 'loading'">
        <div class="evolution-tab__loading">
          Загрузка…
        </div>
      </template>
      <template v-else-if="state === 'error'">
        <div class="evolution-tab__error">
          {{ error }}
        </div>
      </template>
      <template v-else-if="state === 'empty'">
        <div class="evolution-tab__error">
          Нет данных за выбранный период
        </div>
      </template>
      <template v-else>
        <Line
          :data="chartData"
          :options="chartOptions"
        />
      </template>
    </div>

    <!-- Current value + delta -->
    <div
      v-if="currentMonthValue != null"
      class="evolution-tab__summary"
    >
      <span class="evolution-tab__current">Текущий месяц: {{ currentMonthValue }}</span>
      <span
        v-if="deltaLabel"
        class="evolution-tab__delta"
      >{{ deltaLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.evolution-tab {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: var(--ft-space-4);
}

.evolution-tab__ranges {
  display: flex;
  gap: var(--ft-space-2);
}

.evolution-tab__range-btn {
  cursor: pointer;

  padding: var(--ft-space-1) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition: all var(--ft-transition-fast);
}

.evolution-tab__range-btn--active {
  color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-400) 10%, transparent);
  border-color: var(--ft-primary-400);
}

.evolution-tab__kpi-select {
  width: 100%;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.evolution-tab__chart-wrap {
  position: relative;
  height: 240px;
}

.evolution-tab__loading,
.evolution-tab__error {
  display: flex;
  align-items: center;
  justify-content: center;

  height: 100%;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

.evolution-tab__summary {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.evolution-tab__current {
  font-size: var(--ft-text-sm);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-primary);
}

.evolution-tab__delta {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}
</style>
