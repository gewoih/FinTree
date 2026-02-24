<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useRetrospectiveDetail } from '@/composables/useReflections'
import type { AnalyticsDashboardDto, UpsertRetrospectivePayload } from '@/types'

const router = useRouter()
const route = useRoute()

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/
const routeMonth = computed(() => (route.params.month as string | undefined) ?? '')

const month = ref(routeMonth.value)
const summary = ref<AnalyticsDashboardDto | null>(null)
const summaryState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const summaryError = ref<string | null>(null)
const emptySubmissionError = ref<string | null>(null)

const {
  data,
  state,
  error,
  saving,
  setMonth,
  load,
  save,
  loadSummary: fetchSummary,
} = useRetrospectiveDetail(month.value)

const form = ref<UpsertRetrospectivePayload>({
  month: month.value,
  conclusion: '',
  nextMonthPlan: '',
  disciplineRating: null,
  impulseControlRating: null,
  confidenceRating: null,
})

const isMeaningfulSubmission = computed(() => {
  return form.value.disciplineRating != null ||
    form.value.impulseControlRating != null ||
    form.value.confidenceRating != null ||
    Boolean(form.value.conclusion?.trim()) ||
    Boolean(form.value.nextMonthPlan?.trim())
})

const canSave = computed(() => isMeaningfulSubmission.value && !saving.value)

const formattedMonth = computed(() => {
  if (!month.value) {
    return 'Рефлексия'
  }

  const [yearRaw, monthRaw] = month.value.split('-')
  const year = Number(yearRaw)
  const monthValue = Number(monthRaw)

  if (!Number.isFinite(year) || !Number.isFinite(monthValue)) {
    return month.value
  }

  const date = new Date(year, monthValue - 1, 1)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
})

const previousMonthDelta = computed(() => {
  const value = summary.value?.health.monthOverMonthChangePercent
  if (value == null) return '—'

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
})

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

function formatPercent(value: number | null | undefined, multiplier = 1) {
  if (value == null) return '—'
  return `${(value * multiplier).toFixed(1)}%`
}

function setRating(field: 'disciplineRating' | 'impulseControlRating' | 'confidenceRating', value: number) {
  const currentValue = form.value[field]
  form.value[field] = currentValue === value ? null : value
}

function isFilled(field: 'disciplineRating' | 'impulseControlRating' | 'confidenceRating', value: number) {
  const currentValue = form.value[field]
  return currentValue != null && currentValue >= value
}

async function loadSummary() {
  if (!month.value) {
    summary.value = null
    summaryState.value = 'idle'
    return
  }

  summaryState.value = 'loading'
  summaryError.value = null

  try {
    summary.value = await fetchSummary(month.value)
    summaryState.value = 'success'
  } catch (requestError: unknown) {
    summaryError.value = requestError instanceof Error
      ? requestError.message
      : 'Не удалось загрузить итоги месяца'
    summaryState.value = 'error'
  }
}

async function handleSave() {
  if (!month.value || saving.value) {
    return
  }

  if (!isMeaningfulSubmission.value) {
    emptySubmissionError.value = 'Заполните хотя бы одну оценку или текстовый блок.'
    return
  }

  const payload: UpsertRetrospectivePayload = {
    ...form.value,
    month: month.value,
  }

  await save(payload)
  router.push('/reflections')
}

watch(routeMonth, value => {
  if (!MONTH_REGEX.test(value)) {
    router.replace('/reflections')
    return
  }

  month.value = value
})

watch(month, value => {
  form.value.month = value
  setMonth(value)

  if (!value) {
    summary.value = null
    summaryState.value = 'idle'
    return
  }

  void load()
  void loadSummary()
})

watch(data, value => {
  if (!value) return

  form.value = {
    month: value.month,
    conclusion: value.conclusion ?? '',
    nextMonthPlan: value.nextMonthPlan ?? '',
    disciplineRating: value.disciplineRating,
    impulseControlRating: value.impulseControlRating,
    confidenceRating: value.confidenceRating,
  }
})

watch(isMeaningfulSubmission, value => {
  if (value) {
    emptySubmissionError.value = null
  }
})

onMounted(async () => {
  if (!MONTH_REGEX.test(month.value)) {
    await router.replace('/reflections')
    return
  }

  await Promise.all([load(), loadSummary()])
})
</script>

<template>
  <PageContainer class="retro-detail-page">
    <PageHeader :title="formattedMonth">
      <template #actions>
        <button
          type="button"
          class="retro-detail-page__back"
          @click="router.push('/reflections')"
        >
          Назад
        </button>
      </template>
    </PageHeader>

    <section class="retro-detail-page__block">
      <h2 class="retro-detail-page__block-title">
        Итоги месяца
      </h2>

      <div
        v-if="summaryState === 'loading'"
        class="retro-detail-page__summary-skeleton"
      >
        <Skeleton
          v-for="index in 4"
          :key="index"
          height="84px"
        />
      </div>

      <Message
        v-else-if="summaryState === 'error'"
        severity="warn"
      >
        {{ summaryError || 'Не удалось загрузить итоговые показатели.' }}
      </Message>

      <div
        v-else-if="summary"
        class="retro-detail-page__summary-grid"
      >
        <article class="retro-detail-page__summary-item">
          <span class="retro-detail-page__summary-label">Доходы</span>
          <span class="retro-detail-page__summary-value">{{ formatMoney(summary.health.monthIncome) }}</span>
        </article>
        <article class="retro-detail-page__summary-item">
          <span class="retro-detail-page__summary-label">Расходы</span>
          <span class="retro-detail-page__summary-value">{{ formatMoney(summary.health.monthTotal) }}</span>
        </article>
        <article class="retro-detail-page__summary-item">
          <span class="retro-detail-page__summary-label">Норма сбережений</span>
          <span class="retro-detail-page__summary-value">{{ formatPercent(summary.health.savingsRate, 100) }}</span>
        </article>
        <article class="retro-detail-page__summary-item">
          <span class="retro-detail-page__summary-label">Δ к прошлому месяцу</span>
          <span class="retro-detail-page__summary-value">{{ previousMonthDelta }}</span>
        </article>
      </div>

      <p
        v-else
        class="retro-detail-page__hint"
      >
        Итоги за выбранный месяц пока недоступны.
      </p>
    </section>

    <section class="retro-detail-page__block">
      <h2 class="retro-detail-page__block-title">
        Самооценка
      </h2>

      <p class="retro-detail-page__hint">
        5 = отлично, 1 = нужна заметная доработка
      </p>

      <div
        v-for="item in [
          { key: 'disciplineRating', label: 'Дисциплина' },
          { key: 'impulseControlRating', label: 'Контроль импульсов' },
          { key: 'confidenceRating', label: 'Финансовая уверенность' }
        ]"
        :key="item.key"
        class="retro-detail-page__rating-row"
      >
        <span class="retro-detail-page__label">{{ item.label }}</span>
        <div class="retro-detail-page__stars">
          <button
            v-for="value in 5"
            :key="value"
            type="button"
            class="retro-detail-page__star"
            :class="{ 'retro-detail-page__star--filled': isFilled(item.key as 'disciplineRating' | 'impulseControlRating' | 'confidenceRating', value) }"
            :aria-label="`${item.label}: ${value}`"
            @click="setRating(item.key as 'disciplineRating' | 'impulseControlRating' | 'confidenceRating', value)"
          >
            ★
          </button>
        </div>
      </div>
    </section>

    <section class="retro-detail-page__block">
      <h2 class="retro-detail-page__block-title">
        Рефлексия
      </h2>

      <label
        for="retro-conclusion"
        class="retro-detail-page__label"
      >
        Выводы за месяц
      </label>
      <textarea
        id="retro-conclusion"
        v-model="form.conclusion"
        class="retro-detail-page__textarea"
        rows="4"
      />

      <label
        for="retro-next-month-plan"
        class="retro-detail-page__label"
      >
        План на следующий месяц
      </label>
      <textarea
        id="retro-next-month-plan"
        v-model="form.nextMonthPlan"
        class="retro-detail-page__textarea"
        rows="4"
      />
    </section>

    <Message
      v-if="emptySubmissionError"
      severity="warn"
    >
      {{ emptySubmissionError }}
    </Message>

    <Message
      v-if="state === 'error' || error"
      severity="error"
    >
      {{ error || 'Не удалось загрузить рефлексию.' }}
    </Message>

    <button
      type="button"
      class="retro-detail-page__save"
      :disabled="!canSave"
      @click="handleSave"
    >
      {{ saving ? 'Сохранение…' : 'Сохранить' }}
    </button>
  </PageContainer>
</template>

<style scoped>
.retro-detail-page {
  gap: var(--ft-space-5);
  max-width: 840px;
}

.retro-detail-page__block {
  display: grid;
  gap: var(--ft-space-3);

  padding: var(--ft-space-4);

  background: var(--ft-surface-raised);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
}

.retro-detail-page__block-title {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.retro-detail-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ft-space-2);
}

.retro-detail-page__summary-skeleton {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ft-space-2);
}

.retro-detail-page__summary-item {
  display: grid;
  gap: var(--ft-space-1);

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.retro-detail-page__summary-label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.retro-detail-page__summary-value {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.retro-detail-page__label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.retro-detail-page__textarea {
  width: 100%;
  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.retro-detail-page__textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.retro-detail-page__textarea:focus-visible,
.retro-detail-page__save:focus-visible,
.retro-detail-page__back:focus-visible,
.retro-detail-page__star:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

.retro-detail-page__rating-row {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.retro-detail-page__stars {
  display: flex;
  gap: var(--ft-space-1);
}

.retro-detail-page__star {
  cursor: pointer;

  min-width: 44px;
  min-height: 44px;

  font-size: 1.4rem;
  line-height: 1;
  color: var(--ft-border-strong);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-sm);

  transition: color var(--ft-transition-fast), transform var(--ft-transition-fast);
}

.retro-detail-page__star:hover {
  transform: translateY(-1px);
}

.retro-detail-page__star--filled {
  color: var(--ft-primary-400);
}

.retro-detail-page__save {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-surface-base);

  background: var(--ft-primary-400);
  border: none;
  border-radius: var(--ft-radius-md);

  transition: background-color var(--ft-transition-fast), opacity var(--ft-transition-fast);
}

.retro-detail-page__save:hover:not(:disabled) {
  background: var(--ft-primary-500);
}

.retro-detail-page__save:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.retro-detail-page__back {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.retro-detail-page__hint {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

@media (width <= 640px) {
  .retro-detail-page__summary-grid,
  .retro-detail-page__summary-skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .retro-detail-page__rating-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
