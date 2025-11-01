<script setup lang="ts">
import { computed } from 'vue'

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
  <Card class="kpi-card" :class="`kpi-card--${variant}`">
    <template #content>
      <div v-if="loading" class="kpi-card__loading">
        <Skeleton width="100%" height="1.5rem" class="mb-3" />
        <Skeleton width="60%" height="2.5rem" class="mb-2" />
        <Skeleton width="40%" height="1rem" />
      </div>

      <div v-else class="kpi-card__content">
        <div class="kpi-card__header">
          <span class="kpi-card__title">{{ title }}</span>
          <i v-if="icon" :class="['pi', icon, 'kpi-card__icon']" />
        </div>

        <div class="kpi-card__value">{{ value }}</div>

        <div v-if="trend !== null && trend !== undefined" class="kpi-card__footer">
          <div class="kpi-card__trend" :class="trendClass">
            <i :class="['pi', trendIcon]" />
            <span>{{ Math.abs(trend) }}%</span>
          </div>
          <span v-if="trendLabel" class="kpi-card__trend-label">
            {{ trendLabel }}
          </span>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.kpi-card {
  height: 100%;
  transition: all var(--ft-transition-base);
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
}

.kpi-card:hover {
  border-color: var(--ft-border-default);
  box-shadow: var(--ft-shadow-md);
  transform: translateY(-2px);
}

.kpi-card__content {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
}

.kpi-card__header {
  display: flex;
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
  color: var(--ft-text-tertiary);
}

.kpi-card__value {
  font-size: var(--ft-text-3xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  line-height: 1.2;
}

.kpi-card__footer {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-text-sm);
}

.kpi-card__trend {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-1);
  padding: var(--ft-space-1) var(--ft-space-2);
  border-radius: var(--ft-radius-md);
  font-weight: var(--ft-font-semibold);
}

.kpi-card__trend--up {
  background: rgba(34, 197, 94, 0.1);
  color: var(--ft-success-600);
}

.dark-mode .kpi-card__trend--up {
  background: rgba(34, 197, 94, 0.15);
  color: var(--ft-success-400);
}

.kpi-card__trend--down {
  background: rgba(239, 68, 68, 0.1);
  color: var(--ft-danger-600);
}

.dark-mode .kpi-card__trend--down {
  background: rgba(239, 68, 68, 0.15);
  color: var(--ft-danger-400);
}

.kpi-card__trend--neutral {
  background: rgba(107, 114, 128, 0.1);
  color: var(--ft-text-tertiary);
}

.kpi-card__trend-label {
  color: var(--ft-text-tertiary);
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
  padding: var(--ft-space-2) 0;
}
</style>
