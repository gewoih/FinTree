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
    rgb(239 68 68 / 18%),
    rgb(220 38 38 / 22%)
  );
  border-color: rgb(239 68 68 / 40%);
  box-shadow: 0 2px 12px rgb(239 68 68 / 20%);
}

.urgency-badge--hot {
  color: var(--ft-warning-400);
  background: linear-gradient(
    135deg,
    rgb(249 115 22 / 18%),
    rgb(245 158 11 / 22%)
  );
  border-color: rgb(249 115 22 / 40%);
  box-shadow: 0 2px 12px rgb(249 115 22 / 20%);
}

.urgency-badge--warning {
  color: var(--ft-warning-400);
  background: rgb(245 158 11 / 18%);
  border-color: rgb(245 158 11 / 35%);
}

/* Light mode */
.light-mode .urgency-badge--urgent {
  color: var(--ft-danger-700);
  background: linear-gradient(
    135deg,
    rgb(239 68 68 / 12%),
    rgb(220 38 38 / 16%)
  );
  border-color: rgb(239 68 68 / 30%);
  box-shadow: 0 2px 8px rgb(239 68 68 / 12%);
}

.light-mode .urgency-badge--hot {
  color: var(--ft-warning-700);
  background: linear-gradient(
    135deg,
    rgb(249 115 22 / 12%),
    rgb(245 158 11 / 16%)
  );
  border-color: rgb(249 115 22 / 30%);
  box-shadow: 0 2px 8px rgb(249 115 22 / 12%);
}

.light-mode .urgency-badge--warning {
  color: var(--ft-warning-700);
  background: rgb(245 158 11 / 12%);
  border-color: rgb(245 158 11 / 25%);
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
