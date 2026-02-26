<script setup lang="ts">
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import UiButton from '@/ui/UiButton.vue'

type GlobalMonthScoreAccent = 'good' | 'average' | 'poor' | 'neutral'
type GlobalMonthScoreDeltaTone = 'better' | 'worse' | 'neutral' | null

interface GlobalMonthScoreModel {
  score: number | null
  scoreLabel: string
  statusLabel: string
  statusDescription: string
  accent: GlobalMonthScoreAccent
  deltaLabel: string | null
  deltaTone: GlobalMonthScoreDeltaTone
}

defineProps<{
  loading: boolean
  error: string | null
  model: GlobalMonthScoreModel
}>()

const emit = defineEmits<{
  (event: 'retry'): void
}>()

const accentClass = (accent: GlobalMonthScoreAccent) => `global-score--${accent}`
const statusClass = (accent: GlobalMonthScoreAccent) => `global-score__status--${accent}`

function deltaClass(tone: GlobalMonthScoreDeltaTone): string {
  if (tone === 'better') return 'global-score__delta--better'
  if (tone === 'worse') return 'global-score__delta--worse'
  return 'global-score__delta--neutral'
}
</script>

<template>
  <section
    class="global-score"
    :class="accentClass(model.accent)"
  >
    <template v-if="loading">
      <div class="global-score__loading">
        <Skeleton
          width="220px"
          height="18px"
        />
        <Skeleton
          width="180px"
          height="56px"
        />
        <Skeleton
          width="100%"
          height="16px"
        />
      </div>
    </template>

    <template v-else-if="error">
      <Message
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        <div class="global-score__error">
          <p class="global-score__error-title">
            Не удалось загрузить общий рейтинг месяца
          </p>
          <UiButton
            label="Повторить"
            icon="pi pi-refresh"
            size="sm"
            @click="emit('retry')"
          />
        </div>
      </Message>
    </template>

    <template v-else>
      <div class="global-score__main">
        <p class="global-score__label">
          Общий рейтинг месяца
        </p>

        <div class="global-score__headline">
          <p class="global-score__value">
            {{ model.scoreLabel }}
          </p>
          <p
            class="global-score__status"
            :class="statusClass(model.accent)"
          >
            {{ model.statusLabel }}
          </p>
        </div>

        <p class="global-score__description">
          {{ model.statusDescription }}
        </p>

        <p
          class="global-score__delta"
          :class="deltaClass(model.deltaTone)"
        >
          {{ model.deltaLabel ?? 'Нет данных для сравнения с предыдущим месяцем' }}
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.global-score {
  display: grid;
  gap: var(--ft-space-4);

  padding: clamp(1.25rem, 2.2vw, 1.85rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);
}

.global-score__loading {
  display: grid;
  gap: var(--ft-space-3);
}

.global-score__error {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.global-score__error-title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.global-score__main {
  display: grid;
  gap: var(--ft-space-2);
}

.global-score__label {
  margin: 0;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.global-score__headline {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;
}

.global-score__value {
  margin: 0;

  font-size: clamp(2.1rem, 5vw, 3.1rem);
  font-weight: var(--ft-font-bold);
  line-height: 1;
  color: var(--ft-text-primary);
}

.global-score__status {
  margin: 0;
  padding: var(--ft-space-1) var(--ft-space-2);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);

  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-full);
}

.global-score__status--good {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-400) 10%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400) 30%, transparent);
}

.global-score__status--average {
  color: var(--ft-warning-400);
  background: color-mix(in srgb, var(--ft-warning-400) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-warning-400) 34%, transparent);
}

.global-score__status--poor {
  color: var(--ft-danger-400);
  background: color-mix(in srgb, var(--ft-danger-400) 12%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-400) 34%, transparent);
}

.global-score__status--neutral {
  color: var(--ft-text-secondary);
  background: color-mix(in srgb, var(--ft-surface-raised) 88%, transparent);
}

.global-score__description {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.global-score__delta {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
}

.global-score__delta--better {
  color: var(--ft-success-400);
}

.global-score__delta--worse {
  color: var(--ft-danger-400);
}

.global-score__delta--neutral {
  color: var(--ft-text-muted);
}

.global-score--good .global-score__value {
  color: var(--ft-success-400);
}

.global-score--average .global-score__value {
  color: var(--ft-warning-400);
}

.global-score--poor .global-score__value {
  color: var(--ft-danger-400);
}

@media (width <= 640px) {
  .global-score {
    gap: var(--ft-space-3);
    padding: var(--ft-space-4);
  }

  .global-score__error {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
