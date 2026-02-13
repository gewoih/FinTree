<script setup lang="ts">
interface Props {
  label: string
  severity?: 'success' | 'warning' | 'danger' | 'info' | 'secondary'
  icon?: string
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

withDefaults(defineProps<Props>(), {
  severity: 'secondary',
  icon: '',
  size: 'md',
  dot: false
})
</script>

<template>
  <div
    class="status-badge"
    :class="[`status-badge--${severity}`, `status-badge--${size}`]"
  >
    <span
      v-if="dot"
      class="status-badge__dot"
    />
    <i
      v-else-if="icon"
      :class="['pi', icon, 'status-badge__icon']"
    />
    <span class="status-badge__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  font-weight: var(--ft-font-semibold);
  white-space: nowrap;

  border: 1px solid transparent;
  border-radius: var(--ft-radius-full);
}

/* Sizes */
.status-badge--sm {
  padding: var(--ft-space-1) var(--ft-space-2);
  font-size: var(--ft-text-xs);
}

.status-badge--md {
  font-size: var(--ft-text-sm);
}

.status-badge--lg {
  padding: var(--ft-space-3) var(--ft-space-4);
  font-size: var(--ft-text-base);
}

/* Severities - Light theme */
.status-badge--success {
  color: var(--ft-success-700);
  background: rgb(34 197 94 / 10%);
  border-color: rgb(34 197 94 / 20%);
}

.status-badge--warning {
  color: var(--ft-warning-700);
  background: rgb(245 158 11 / 10%);
  border-color: rgb(245 158 11 / 20%);
}

.status-badge--danger {
  color: var(--ft-danger-700);
  background: rgb(239 68 68 / 10%);
  border-color: rgb(239 68 68 / 20%);
}

.status-badge--info {
  color: var(--ft-info-700);
  background: color-mix(in srgb, var(--ft-info-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-info-500) 22%, transparent);
}

.status-badge--secondary {
  color: var(--ft-gray-700);
  background: rgb(107 114 128 / 10%);
  border-color: rgb(107 114 128 / 20%);
}

/* Dark mode */
.dark-mode .status-badge--success {
  color: var(--ft-success-400);
  background: rgb(34 197 94 / 15%);
  border-color: rgb(34 197 94 / 30%);
}

.dark-mode .status-badge--warning {
  color: var(--ft-warning-400);
  background: rgb(245 158 11 / 15%);
  border-color: rgb(245 158 11 / 30%);
}

.dark-mode .status-badge--danger {
  color: var(--ft-danger-400);
  background: rgb(239 68 68 / 15%);
  border-color: rgb(239 68 68 / 30%);
}

.dark-mode .status-badge--info {
  color: var(--ft-info-400);
  background: color-mix(in srgb, var(--ft-info-500) 18%, transparent);
  border-color: color-mix(in srgb, var(--ft-info-500) 32%, transparent);
}

.dark-mode .status-badge--secondary {
  color: var(--ft-gray-400);
  background: rgb(107 114 128 / 15%);
  border-color: rgb(107 114 128 / 30%);
}

/* Icon */
.status-badge__icon {
  font-size: 0.875em;
}

/* Dot */
.status-badge__dot {
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: 50%;
}

.status-badge__label {
  line-height: 1;
}
</style>
