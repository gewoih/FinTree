<script setup lang="ts">
type HealthAccent = 'good' | 'average' | 'poor' | 'neutral';

defineProps<{
  title: string;
  icon: string;
  mainValue: string;
  mainLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  accent: HealthAccent;
  tooltip: string;
}>();

const barClass = (accent: HealthAccent) => `health-score__bar--${accent}`;
const valueClass = (accent: HealthAccent) => `health-score__main-value--${accent}`;
</script>

<template>
  <div class="health-score">
    <div class="health-score__header">
      <span
        class="health-score__icon"
        :class="`health-score__icon--${accent}`"
      >
        <i :class="icon" />
      </span>
      <p class="health-score__title">
        {{ title }}
      </p>
      <i
        v-tooltip.top="tooltip"
        class="pi pi-question-circle health-score__hint"
      />
    </div>

    <div class="health-score__body">
      <p
        class="health-score__main-value"
        :class="valueClass(accent)"
      >
        {{ mainValue }}
      </p>
      <p class="health-score__main-label">
        {{ mainLabel }}
      </p>
    </div>

    <div
      v-if="secondaryValue"
      class="health-score__secondary"
    >
      <span class="health-score__secondary-value">{{ secondaryValue }}</span>
      <span
        v-if="secondaryLabel"
        class="health-score__secondary-label"
      >{{ secondaryLabel }}</span>
    </div>

    <div
      class="health-score__bar"
      :class="barClass(accent)"
    />
  </div>
</template>

<style scoped>
.health-score {
  position: relative;

  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: clamp(1.25rem, 2vw, 1.75rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);
}

.health-score__header {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.health-score__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;

  width: var(--ft-control-height);
  height: var(--ft-control-height);

  font-size: 1.05rem;
  color: var(--ft-text-secondary);

  background: color-mix(in srgb, var(--ft-surface-raised) 80%, transparent);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.health-score__icon--good {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-400) 10%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400) 20%, transparent);
}

.health-score__icon--average {
  color: var(--ft-warning-400);
  background: color-mix(in srgb, var(--ft-warning-400) 10%, transparent);
  border-color: color-mix(in srgb, var(--ft-warning-400) 20%, transparent);
}

.health-score__icon--poor {
  color: var(--ft-danger-400);
  background: color-mix(in srgb, var(--ft-danger-400) 10%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-400) 20%, transparent);
}

.health-score__title {
  margin: 0;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
}

.health-score__hint {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Ensure minimum touch target size */
  min-width: var(--ft-control-height);
  min-height: var(--ft-control-height);
  margin-left: auto;

  font-size: 1rem;
  color: var(--ft-text-muted);

  transition: color var(--ft-transition-fast);
}

.health-score__hint:hover {
  color: var(--ft-text-secondary);
}

.health-score__hint:active {
  color: var(--ft-accent-primary);
}

.health-score__body {
  display: grid;
  gap: 2px;
}

.health-score__main-value {
  margin: 0;

  font-size: clamp(1.75rem, 2.5vw, 2.25rem);
  font-weight: var(--ft-font-bold);
  line-height: 1.15;
  color: var(--ft-text-primary);
}

.health-score__main-value--good {
  color: var(--ft-success-400);
}

.health-score__main-value--average {
  color: var(--ft-warning-400);
}

.health-score__main-value--poor {
  color: var(--ft-danger-400);
}

.health-score__main-label {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.health-score__secondary {
  display: flex;
  gap: var(--ft-space-2);
  align-items: baseline;

  padding-top: var(--ft-space-1);

  font-size: var(--ft-text-base);

  border-top: 1px solid var(--ft-border-subtle);
}

.health-score__secondary-value {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.health-score__secondary-label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.health-score__bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;

  height: 3px;

  background: var(--ft-border-subtle);
  border-radius: 0 0 var(--ft-radius-xl) var(--ft-radius-xl);
}

.health-score__bar--good {
  background: var(--ft-success-400);
}

.health-score__bar--average {
  background: var(--ft-warning-400);
}

.health-score__bar--poor {
  background: var(--ft-danger-400);
}

@media (width <= 640px) {
  .health-score {
    gap: var(--ft-space-3);
    padding: var(--ft-space-4);
  }

  .health-score__main-value {
    font-size: 1.5rem;
  }

  .health-score__icon {
    width: 36px;
    height: 36px;
    font-size: 0.95rem;
  }
}
</style>
