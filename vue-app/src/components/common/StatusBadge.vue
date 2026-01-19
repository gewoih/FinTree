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
  align-items: center;
  gap: var(--ft-space-2);
  padding: var(--ft-space-2) var(--ft-space-3);
  border-radius: var(--ft-radius-full);
  font-weight: var(--ft-font-semibold);
  white-space: nowrap;
  border: 1px solid transparent;
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
  background: rgba(34, 197, 94, 0.1);
  color: var(--ft-success-700);
  border-color: rgba(34, 197, 94, 0.2);
}

.status-badge--warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--ft-warning-700);
  border-color: rgba(245, 158, 11, 0.2);
}

.status-badge--danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--ft-danger-700);
  border-color: rgba(239, 68, 68, 0.2);
}

.status-badge--info {
  background: rgba(59, 130, 246, 0.1);
  color: var(--ft-info-700);
  border-color: rgba(59, 130, 246, 0.2);
}

.status-badge--secondary {
  background: rgba(107, 114, 128, 0.1);
  color: var(--ft-gray-700);
  border-color: rgba(107, 114, 128, 0.2);
}

/* Dark mode */
.dark-mode .status-badge--success {
  background: rgba(34, 197, 94, 0.15);
  color: var(--ft-success-400);
  border-color: rgba(34, 197, 94, 0.3);
}

.dark-mode .status-badge--warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--ft-warning-400);
  border-color: rgba(245, 158, 11, 0.3);
}

.dark-mode .status-badge--danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--ft-danger-400);
  border-color: rgba(239, 68, 68, 0.3);
}

.dark-mode .status-badge--info {
  background: rgba(59, 130, 246, 0.15);
  color: var(--ft-info-400);
  border-color: rgba(59, 130, 246, 0.3);
}

.dark-mode .status-badge--secondary {
  background: rgba(107, 114, 128, 0.15);
  color: var(--ft-gray-400);
  border-color: rgba(107, 114, 128, 0.3);
}

/* Icon */
.status-badge__icon {
  font-size: 0.875em;
}

/* Dot */
.status-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge__label {
  line-height: 1;
}
</style>
