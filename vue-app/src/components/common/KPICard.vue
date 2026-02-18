<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '../../ui/UiCard.vue'
import UiSkeleton from '../../ui/UiSkeleton.vue'

interface Props {
  title: string
  value: string | number
  icon?: string
  trend?: number | null
  trendLabel?: string
  loading?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  trend: null,
  trendLabel: '',
  loading: false,
  variant: 'default'
})

const trendDirection = computed(() => {
  if (props.trend === null || props.trend === undefined) return null
  return props.trend > 0 ? 'up' : props.trend < 0 ? 'down' : 'neutral'
})

const trendIcon = computed(() => {
  if (!trendDirection.value) return null
  return trendDirection.value === 'up' ? 'pi-arrow-up' :
         trendDirection.value === 'down' ? 'pi-arrow-down' :
         'pi-minus'
})

const trendClass = computed(() => {
  if (!trendDirection.value) return ''
  return `kpi-card__trend--${trendDirection.value}`
})
</script>

<template>
  <UiCard
    class="kpi-card"
    variant="muted"
    padding="lg"
    :class="`kpi-card--${variant}`"
  >
    <template #header>
      <div class="kpi-card__header">
        <span class="kpi-card__title">{{ title }}</span>
        <i
          v-if="icon"
          :class="['pi', icon, 'kpi-card__icon']"
        />
      </div>
    </template>

    <div
      v-if="loading"
      class="kpi-card__loading"
    >
      <UiSkeleton
        width="80%"
        height="1.5rem"
      />
      <UiSkeleton
        width="60%"
        height="2.25rem"
      />
      <UiSkeleton
        width="45%"
        height="1rem"
      />
    </div>

    <template v-else>
      <div class="kpi-card__value">
        {{ value }}
      </div>

      <div
        v-if="trend !== null && trend !== undefined"
        class="kpi-card__footer"
      >
        <div
          class="kpi-card__trend"
          :class="trendClass"
        >
          <i :class="['pi', trendIcon]" />
          <span>{{ Math.abs(trend) }}%</span>
        </div>
        <span
          v-if="trendLabel"
          class="kpi-card__trend-label"
        >
          {{ trendLabel }}
        </span>
      </div>
    </template>
  </UiCard>
</template>

<style scoped>
.kpi-card {
  height: 100%;
}

:deep(.ui-card__body) {
  gap: var(--ft-space-3);
}

.kpi-card__header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.kpi-card__title {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-card__icon {
  font-size: 1.25rem;
  color: var(--ft-text-secondary);
}

.kpi-card__value {
  font-size: var(--ft-text-3xl);
  font-weight: var(--ft-font-bold);
  line-height: 1.2;
  color: var(--ft-text-primary);
}

.kpi-card__footer {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  font-size: var(--ft-text-sm);
}

.kpi-card__trend {
  display: inline-flex;
  gap: var(--ft-space-1);
  align-items: center;

  padding: var(--ft-space-1) var(--ft-space-2);

  font-weight: var(--ft-font-semibold);

  border-radius: var(--ft-radius-lg);
}

.kpi-card__trend--up {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-500) 15%, transparent);
}

.light-mode .kpi-card__trend--up {
  background: color-mix(in srgb, var(--ft-success-500) 10%, transparent);
}

.kpi-card__trend--down {
  color: var(--ft-danger-400);
  background: color-mix(in srgb, var(--ft-danger-500) 15%, transparent);
}

.light-mode .kpi-card__trend--down {
  background: color-mix(in srgb, var(--ft-danger-500) 10%, transparent);
}

.kpi-card__trend--neutral {
  color: var(--ft-text-secondary);
  background: color-mix(in srgb, var(--ft-text-secondary) 10%, transparent);
}

.kpi-card__trend-label {
  color: var(--ft-text-secondary);
}

/* Variant styles */
.kpi-card--success {
  border-left: 4px solid var(--ft-success-500);
}

.kpi-card--warning {
  border-left: 4px solid var(--ft-warning-500);
}

.kpi-card--danger {
  border-left: 4px solid var(--ft-danger-500);
}

.kpi-card__loading {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}
</style>
