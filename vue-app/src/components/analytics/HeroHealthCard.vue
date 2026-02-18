<script setup lang="ts">
import UiCard from '@/ui/UiCard.vue';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiButton from '../../ui/UiButton.vue';
import { useHeroHealthCardState } from '@/composables/useHeroHealthCardState';
import type { HealthGroup, PeakDayItem, PeaksSummary } from '@/types/hero-health-card';

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | null;
    groups: HealthGroup[];
    peaks: PeakDayItem[];
    peaksSummary: PeaksSummary;
  }>(),
  {
    groups: () => [],
    peaks: () => [],
    peaksSummary: () => ({ count: 0, totalLabel: '—', shareLabel: '—', shareValue: null, monthLabel: '—' }),
  }
);

const emit = defineEmits<{
  (event: 'retry'): void;
  (event: 'select-peak', value: PeakDayItem): void;
  (event: 'select-peak-summary'): void;
}>();

const {
  showEmpty,
  metricValueClass,
  metricIconClass,
  peaksShareClass,
  showAllPeaks,
  visiblePeaks,
  hasMorePeaks
} = useHeroHealthCardState(props);
</script>

<template>
  <UiCard class="hero-card">
    <template #default>
      <div class="hero-card__header">
        <div>
          <h2 class="hero-card__title">
            Финансовое здоровье
          </h2>
        </div>
      </div>

      <div
        v-if="loading"
        class="hero-card__loading"
        role="status"
        aria-live="polite"
      >
        <UiSkeleton
          width="128px"
          height="128px"
          border-radius="999px"
        />
        <div class="hero-card__loading-metrics">
          <UiSkeleton
            v-for="index in 4"
            :key="index"
            height="72px"
            width="100%"
            border-radius="20px"
          />
        </div>
      </div>

      <div
        v-else-if="error"
        class="hero-card__message"
      >
        <UiMessage
          severity="error"
          icon="pi pi-exclamation-triangle"
          :closable="false"
        >
          <div class="hero-card__message-body">
            <p class="hero-card__message-title">
              Не удалось загрузить данные
            </p>
            <p class="hero-card__message-text">
              {{ error }}
            </p>
            <UiButton
              label="Повторить"
              icon="pi pi-refresh"
              size="sm"
              @click="emit('retry')"
            />
          </div>
        </UiMessage>
      </div>

      <div
        v-else-if="showEmpty"
        class="hero-card__message"
      >
        <UiMessage
          severity="info"
          icon="pi pi-inbox"
          :closable="false"
        >
          <div class="hero-card__message-body hero-card__message-body--compact">
            <p class="hero-card__message-title">
              Нет данных
            </p>
            <p class="hero-card__message-text">
              Добавьте несколько транзакций, чтобы увидеть метрики.
            </p>
          </div>
        </UiMessage>
      </div>

      <div
        v-else
        class="hero-card__content"
      >
        <div class="hero-card__insights">
          <div
            class="hero-card__metrics"
            role="list"
          >
            <article
              v-for="group in groups"
              :key="group.key"
              class="hero-card__metric hero-card__group"
              :class="group.accent ? `hero-card__group--${group.accent}` : null"
              role="listitem"
            >
              <p class="hero-card__group-title">
                {{ group.title }}
              </p>
              <div class="hero-card__group-list">
                <div
                  v-for="metric in group.metrics"
                  :key="metric.key"
                  class="hero-card__metric-row"
                >
                  <div class="hero-card__metric-text">
                    <p class="hero-card__metric-label">
                      {{ metric.label }}
                    </p>
                    <p
                      class="hero-card__metric-value hero-card__metric-value--compact"
                      :class="metricValueClass(metric.accent)"
                    >
                      {{ metric.value }}
                    </p>
                    <p
                      v-if="metric.meta"
                      class="hero-card__metric-meta"
                    >
                      {{ metric.meta }}
                    </p>
                  </div>
                  <span
                    v-tooltip.top="metric.tooltip"
                    class="hero-card__metric-icon"
                    :class="metricIconClass(metric.accent)"
                  >
                    <i :class="metric.icon" />
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div class="hero-card__peaks">
            <div class="hero-card__peaks-header">
              <p class="hero-card__peaks-title">
                Пиковые дни
              </p>
            </div>
            <button
              type="button"
              class="hero-card__peak-share"
              :class="peaksShareClass"
              @click="emit('select-peak-summary')"
            >
              <p class="hero-card__peak-share-value">
                {{ peaksSummary.shareLabel }}
              </p>
              <p class="hero-card__peak-share-line">
                расходов сформированы пиковыми днями
              </p>
              <p class="hero-card__peak-share-meta">
                {{ peaksSummary.count }} дней · {{ peaksSummary.totalLabel }} из {{ peaksSummary.monthLabel }}
              </p>
            </button>
            <div class="hero-card__peaks-divider" />
            <div
              class="hero-card__peaks-grid"
              role="list"
            >
              <button
                v-for="peak in visiblePeaks"
                :key="peak.label"
                type="button"
                class="hero-card__metric hero-card__metric--clickable hero-card__peak-item"
                role="listitem"
                @click="emit('select-peak', peak)"
              >
                <div class="hero-card__metric-content">
                  <p class="hero-card__metric-label">
                    {{ peak.label }}
                  </p>
                  <p class="hero-card__metric-value">
                    {{ peak.amountLabel }}
                  </p>
                  <p class="hero-card__metric-meta">
                    {{ peak.shareLabel }} от месяца
                  </p>
                </div>
              </button>

              <div
                v-if="!peaks.length"
                class="hero-card__metric hero-card__metric--empty hero-card__peak-item"
                role="listitem"
              >
                <div class="hero-card__metric-content">
                  <p class="hero-card__metric-label">
                    Нет пиковых дней
                  </p>
                  <p class="hero-card__metric-value">
                    Расходы стабильны
                  </p>
                </div>
              </div>
            </div>
            <button
              v-if="hasMorePeaks"
              type="button"
              class="hero-card__peaks-toggle"
              @click="showAllPeaks = !showAllPeaks"
            >
              {{ showAllPeaks ? 'Свернуть' : 'Показать все' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </UiCard>
</template>

<style scoped src="../../styles/components/hero-health-card.css"></style>
