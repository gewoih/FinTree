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
  color: var(--ft-urgency-urgent-text);
  background: var(--ft-urgency-urgent-bg);
  border-color: var(--ft-urgency-urgent-border);
  box-shadow: var(--ft-urgency-urgent-shadow);
}

.urgency-badge--hot {
  color: var(--ft-urgency-hot-text);
  background: var(--ft-urgency-hot-bg);
  border-color: var(--ft-urgency-hot-border);
  box-shadow: var(--ft-urgency-hot-shadow);
}

.urgency-badge--warning {
  color: var(--ft-urgency-warning-text);
  background: var(--ft-urgency-warning-bg);
  border-color: var(--ft-urgency-warning-border);
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
