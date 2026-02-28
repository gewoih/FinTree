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
      <div class="global-score__layout">
        <div class="global-score__main">
          <p class="global-score__label">
            Общий рейтинг месяца
          </p>

          <div class="global-score__headline">
            <p class="global-score__value">
              {{ model.scoreLabel }}
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

        <section
          v-if="$slots.factors"
          class="global-score__factors"
          aria-label="Факторы, из которых складывается рейтинг"
        >
          <div class="global-score__factors-grid">
            <slot name="factors" />
          </div>
        </section>
      </div>
    </template>
  </section>
</template>

<style scoped>
.global-score {
  display: grid;
  gap: var(--ft-space-4);

  padding: clamp(1rem, 1.8vw, 1.5rem);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
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
  min-height: 0;
}

.global-score__layout {
  display: grid;
  gap: var(--ft-space-3);
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

.global-score__description {
  margin: 0;
  font-size: var(--ft-text-base);
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

.global-score__factors {
  display: grid;
  gap: var(--ft-space-3);
}

.global-score__factors-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ft-space-3);
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
    padding: var(--ft-space-3) var(--ft-space-2);
  }

  .global-score__error {
    flex-direction: column;
    align-items: flex-start;
  }

  .global-score__description {
    font-size: var(--ft-text-base);
  }

  .global-score__factors-grid {
    grid-template-columns: 1fr;
  }
}

@media (width >= 641px) and (width <= 1023px) {
  .global-score__factors-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width >= 1024px) {
  .global-score__layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
    align-items: stretch;
    min-height: 100%;
  }

  .global-score__main {
    display: flex;
    flex-direction: column;
    gap: var(--ft-space-3);
    justify-content: center;

    height: 100%;
  }

  .global-score__factors-grid {
    grid-template-rows: repeat(2, minmax(0, 1fr));
    align-items: stretch;
  }
}
</style>
