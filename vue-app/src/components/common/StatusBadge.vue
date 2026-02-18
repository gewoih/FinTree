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

/* Severities — dark theme (default) */
.status-badge--success {
  color: var(--ft-status-badge-success-text);
  background: var(--ft-status-badge-success-bg);
  border-color: var(--ft-status-badge-success-border);
}

.status-badge--warning {
  color: var(--ft-status-badge-warning-text);
  background: var(--ft-status-badge-warning-bg);
  border-color: var(--ft-status-badge-warning-border);
}

.status-badge--danger {
  color: var(--ft-status-badge-danger-text);
  background: var(--ft-status-badge-danger-bg);
  border-color: var(--ft-status-badge-danger-border);
}

.status-badge--info {
  color: var(--ft-status-badge-info-text);
  background: var(--ft-status-badge-info-bg);
  border-color: var(--ft-status-badge-info-border);
}

.status-badge--secondary {
  color: var(--ft-status-badge-secondary-text);
  background: var(--ft-status-badge-secondary-bg);
  border-color: var(--ft-status-badge-secondary-border);
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
