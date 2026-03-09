<script setup lang="ts">
import { computed } from 'vue'
import Skeleton from 'primevue/skeleton'
import type { FreedomCalculatorResultDto } from '@/types.ts'

const props = defineProps<{
  result: FreedomCalculatorResultDto | null
  loading: boolean
}>()

function pluralizeDays(n: number): string {
  const lastTwo = n % 100
  const lastOne = n % 10
  if (lastTwo >= 11 && lastTwo <= 19)
    return 'дней'
  if (lastOne === 1)
    return 'день'
  if (lastOne >= 2 && lastOne <= 4)
    return 'дня'
  return 'дней'
}

const daysLabel = computed(() => {
  if (!props.result)
    return ''
  return `${pluralizeDays(props.result.freeDaysPerYear)} свободы в год`
})

const progressWidth = computed(() => {
  if (!props.result)
    return '0%'
  return `${Math.min(100, (props.result.freeDaysPerYear / 365) * 100)}%`
})

const isFinanciallyIndependent = computed(() =>
  props.result !== null && props.result.freeDaysPerYear >= 365,
)
</script>

<template>
  <div class="freedom-hero">
    <template v-if="loading">
      <div class="freedom-hero__kpi">
        <Skeleton
          height="64px"
          width="120px"
          border-radius="6px"
        />
        <Skeleton
          height="20px"
          width="200px"
          border-radius="4px"
        />
      </div>
      <div class="freedom-hero__progress-section">
        <Skeleton
          height="48px"
          width="80px"
          border-radius="6px"
        />
        <Skeleton
          height="8px"
          border-radius="4px"
        />
      </div>
    </template>

    <template v-else-if="result">
      <div class="freedom-hero__kpi">
        <div class="freedom-hero__number">
          {{ result.freeDaysPerYear }}
        </div>
        <div class="freedom-hero__days-label">
          {{ daysLabel }}
        </div>
      </div>

      <div class="freedom-hero__progress-section">
        <div
          class="freedom-hero__percent"
          :class="{ 'freedom-hero__percent--complete': isFinanciallyIndependent }"
        >
          {{ result.percentToFi }}%
        </div>
        <div class="freedom-hero__percent-label">
          к финансовой независимости
        </div>
        <div
          class="freedom-hero__progress-track"
          role="progressbar"
          :aria-valuenow="result.freeDaysPerYear"
          aria-valuemin="0"
          aria-valuemax="365"
        >
          <div
            class="freedom-hero__progress-fill"
            :style="{ width: progressWidth }"
          />
        </div>
      </div>
    </template>

    <div
      v-else
      class="freedom-hero__placeholder"
    >
      Настройте параметры для расчёта
    </div>
  </div>
</template>

<style scoped>
.freedom-hero {
  display: flex;
  gap: var(--ft-space-8);
  align-items: center;
  padding: var(--ft-space-4) var(--ft-space-6);
}

.freedom-hero__kpi {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--ft-space-1);
}

.freedom-hero__number {
  font-size: clamp(2.5rem, 4vw, 4rem);
  font-weight: var(--ft-font-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--ft-text-primary);
}

.freedom-hero__days-label {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  white-space: nowrap;
}

.freedom-hero__progress-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.freedom-hero__percent {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: var(--ft-font-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--ft-success-500);
}

.freedom-hero__percent--complete {
  color: var(--ft-success-400);
}

.freedom-hero__percent-label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.freedom-hero__progress-track {
  overflow: hidden;

  width: 100%;
  height: 10px;

  background: var(--ft-border-default);
  border-radius: var(--ft-radius-xl);
}

.freedom-hero__progress-fill {
  height: 100%;
  background: var(--ft-success-500);
  border-radius: var(--ft-radius-xl);
  transition: width var(--ft-transition-base);
}

.freedom-hero__placeholder {
  padding: var(--ft-space-4) 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

@media (width <= 640px) {
  .freedom-hero {
    flex-direction: column;
    gap: var(--ft-space-4);
    align-items: flex-start;
    padding: var(--ft-space-4);
  }
}
</style>
