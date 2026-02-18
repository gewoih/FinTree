<script setup lang="ts">
interface Props {
  text: string
  icon?: string
  pulse?: boolean
  variant?: 'urgent' | 'hot' | 'warning'
}

withDefaults(defineProps<Props>(), {
  icon: '',
  pulse: false,
  variant: 'urgent'
})
</script>

<template>
  <div
    class="urgency-badge"
    :class="[
      `urgency-badge--${variant}`,
      { 'urgency-badge--pulse': pulse }
    ]"
  >
    <span
      v-if="icon"
      class="urgency-badge__icon"
    >{{ icon }}</span>
    <span class="urgency-badge__text">{{ text }}</span>
  </div>
</template>

<style scoped>
.urgency-badge {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  white-space: nowrap;

  border: 1px solid transparent;
  border-radius: var(--ft-radius-full);

  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

/* Variants */
.urgency-badge--urgent {
  color: var(--ft-danger-400);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-danger-500) 18%, transparent),
    color-mix(in srgb, var(--ft-danger-600) 22%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-danger-500) 40%, transparent);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--ft-danger-500) 20%, transparent);
}

.urgency-badge--hot {
  color: var(--ft-warning-400);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-orange-500) 18%, transparent),
    color-mix(in srgb, var(--ft-warning-500) 22%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-orange-500) 40%, transparent);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--ft-orange-500) 20%, transparent);
}

.urgency-badge--warning {
  color: var(--ft-warning-400);
  background: color-mix(in srgb, var(--ft-warning-500) 18%, transparent);
  border-color: color-mix(in srgb, var(--ft-warning-500) 35%, transparent);
}

/* Light mode */
.light-mode .urgency-badge--urgent {
  color: var(--ft-danger-700);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-danger-500) 12%, transparent),
    color-mix(in srgb, var(--ft-danger-600) 16%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-danger-500) 30%, transparent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ft-danger-500) 12%, transparent);
}

.light-mode .urgency-badge--hot {
  color: var(--ft-warning-700);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-orange-500) 12%, transparent),
    color-mix(in srgb, var(--ft-warning-500) 16%, transparent)
  );
  border-color: color-mix(in srgb, var(--ft-orange-500) 30%, transparent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ft-orange-500) 12%, transparent);
}

.light-mode .urgency-badge--warning {
  color: var(--ft-warning-700);
  background: color-mix(in srgb, var(--ft-warning-500) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-warning-500) 25%, transparent);
}

/* Pulse animation */
.urgency-badge--pulse {
  animation: urgency-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes urgency-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.02);
    opacity: 0.85;
  }
}

/* Icon */
.urgency-badge__icon {
  font-size: 1.1em;
  line-height: 1;
}

/* Text */
.urgency-badge__text {
  line-height: 1.2;
}

/* Hover effect */
.urgency-badge:hover {
  transform: translateY(-1px);
}

.urgency-badge--pulse:hover {
  animation-play-state: paused;
}
</style>
