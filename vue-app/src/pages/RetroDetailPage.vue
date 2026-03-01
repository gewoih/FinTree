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
  wins: '',
  savingsOpportunities: '',
  disciplineRating: null,
  impulseControlRating: null,
  confidenceRating: null,
})

const isMeaningfulSubmission = computed(() => {
  return form.value.disciplineRating != null ||
    form.value.impulseControlRating != null ||
    form.value.confidenceRating != null ||
    Boolean(form.value.conclusion?.trim()) ||
    Boolean(form.value.nextMonthPlan?.trim()) ||
    Boolean(form.value.wins?.trim()) ||
    Boolean(form.value.savingsOpportunities?.trim())
})

const canSave = computed(() => isMeaningfulSubmission.value && !saving.value)

const formattedMonth = computed(() => {
  if (!month.value) return 'Рефлексия'

  const [yearRaw, monthRaw] = month.value.split('-')
  const year = Number(yearRaw)
  const monthValue = Number(monthRaw)

  if (!Number.isFinite(year) || !Number.isFinite(monthValue)) return month.value

  const date = new Date(year, monthValue - 1, 1)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
})

// Analytics display helpers
const scoreStatusLabel = computed(() => {
  const score = summary.value?.health.totalMonthScore
  if (score == null) return null
  if (score >= 80) return 'Отличный месяц'
  if (score >= 60) return 'Хороший месяц'
  if (score >= 40) return 'Средний результат'
  if (score >= 20) return 'Требует внимания'
  return 'Критично'
})

const scoreTone = computed(() => {
  const score = summary.value?.health.totalMonthScore
  if (score == null) return ''
  if (score >= 65) return 'good'
  if (score >= 45) return 'average'
  return 'poor'
})

const monthDeltaLabel = computed(() => {
  const value = summary.value?.health.monthOverMonthChangePercent
  if (value == null) return null
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}% к пред. месяцу`
})

const isDeltaPositive = computed(() => {
  return (summary.value?.health.monthOverMonthChangePercent ?? 0) < 0
})

const stabilityActionLabel = computed(() => {
  const code = summary.value?.health.stabilityActionCode
  if (code === 'keep_routine') return 'Поддерживайте ритм'
  if (code === 'smooth_spikes') return 'Сгладьте всплески'
  if (code === 'cap_impulse_spend') return 'Контролируйте импульсы'
  return null
})

const peaksLabel = computed(() => {
  const p = summary.value?.peaks
  if (!p || p.count === 0) return null
  const total = p.total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
  const share = p.sharePercent != null ? ` • ${p.sharePercent.toFixed(1)}%` : ''
  return `${p.count} дн. • ${total} ₽${share}`
})

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

function charCount(value: string | null | undefined, max: number): string {
  return `${(value ?? '').length} / ${max}`
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
  if (!month.value || saving.value) return

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
    wins: value.wins ?? '',
    savingsOpportunities: value.savingsOpportunities ?? '',
    disciplineRating: value.disciplineRating,
    impulseControlRating: value.impulseControlRating,
    confidenceRating: value.confidenceRating,
  }
})

watch(isMeaningfulSubmission, value => {
  if (value) emptySubmissionError.value = null
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

    <!-- Analytics snapshot -->
    <section class="retro-detail-page__block">
      <h2 class="retro-detail-page__block-title">
        Итоги месяца
      </h2>

      <div
        v-if="summaryState === 'loading'"
        class="retro-detail-page__summary-skeleton"
      >
        <Skeleton
          v-for="i in 5"
          :key="i"
          height="80px"
        />
      </div>

      <Message
        v-else-if="summaryState === 'error'"
        severity="warn"
      >
        {{ summaryError || 'Не удалось загрузить итоговые показатели.' }}
      </Message>

      <template v-else-if="summary">
        <!-- Overall score card -->
        <div
          class="retro-detail-page__score-card"
          :class="scoreTone ? `retro-detail-page__score-card--${scoreTone}` : ''"
        >
          <div class="retro-detail-page__score-main">
            <span class="retro-detail-page__score-label">Общий рейтинг</span>
            <span class="retro-detail-page__score-value">
              {{ summary.health.totalMonthScore != null ? `${summary.health.totalMonthScore}/100` : '—' }}
            </span>
            <span
              v-if="scoreStatusLabel"
              class="retro-detail-page__score-status"
            >{{ scoreStatusLabel }}</span>
          </div>
          <span
            v-if="monthDeltaLabel"
            class="retro-detail-page__score-delta"
            :class="{ 'retro-detail-page__score-delta--positive': isDeltaPositive }"
          >
            {{ monthDeltaLabel }}
          </span>
        </div>

        <!-- Factor cards 2×2 -->
        <div class="retro-detail-page__factors">
          <article class="retro-detail-page__factor">
            <span class="retro-detail-page__factor-label">Сбережения</span>
            <span class="retro-detail-page__factor-value retro-detail-page__factor-value--good">
              {{ summary.health.savingsRate != null ? `${(summary.health.savingsRate * 100).toFixed(1)}%` : '—' }}
            </span>
            <span class="retro-detail-page__factor-sub">
              {{ summary.health.netCashflow != null && summary.health.netCashflow > 0 ? `+${formatMoney(summary.health.netCashflow)} ₽ сохранено` : '' }}
            </span>
          </article>

          <article class="retro-detail-page__factor">
            <span class="retro-detail-page__factor-label">Стабильность трат</span>
            <span
              class="retro-detail-page__factor-value"
              :class="summary.health.stabilityStatus ? `retro-detail-page__factor-value--${summary.health.stabilityStatus}` : ''"
            >
              {{ summary.health.stabilityScore != null ? `${summary.health.stabilityScore}/100` : '—' }}
            </span>
            <span class="retro-detail-page__factor-sub">{{ stabilityActionLabel }}</span>
          </article>

          <article class="retro-detail-page__factor">
            <span class="retro-detail-page__factor-label">Необязательные</span>
            <span class="retro-detail-page__factor-value">
              {{ summary.health.discretionarySharePercent != null ? `${summary.health.discretionarySharePercent.toFixed(1)}%` : '—' }}
            </span>
            <span class="retro-detail-page__factor-sub">
              {{ summary.health.discretionaryTotal != null ? `${formatMoney(summary.health.discretionaryTotal)} ₽` : '' }}
            </span>
          </article>

          <article class="retro-detail-page__factor">
            <span class="retro-detail-page__factor-label">Расходы</span>
            <span class="retro-detail-page__factor-value">{{ formatMoney(summary.health.monthTotal) }} ₽</span>
            <span class="retro-detail-page__factor-sub">
              {{ summary.health.monthIncome != null ? `доход: ${formatMoney(summary.health.monthIncome)} ₽` : '' }}
            </span>
          </article>
        </div>

        <!-- Stats chips row -->
        <div class="retro-detail-page__stats-row">
          <div
            v-if="summary.health.meanDaily != null"
            class="retro-detail-page__stat-chip"
          >
            <span class="retro-detail-page__stat-chip-label">Средний день</span>
            <span class="retro-detail-page__stat-chip-value">{{ formatMoney(summary.health.meanDaily) }} ₽</span>
          </div>
          <div
            v-if="summary.health.medianDaily != null"
            class="retro-detail-page__stat-chip"
          >
            <span class="retro-detail-page__stat-chip-label">Медианный день</span>
            <span class="retro-detail-page__stat-chip-value">{{ formatMoney(summary.health.medianDaily) }} ₽</span>
          </div>
          <div
            v-if="peaksLabel"
            class="retro-detail-page__stat-chip"
          >
            <span class="retro-detail-page__stat-chip-label">Пиковые дни</span>
            <span class="retro-detail-page__stat-chip-value">{{ peaksLabel }}</span>
          </div>
        </div>
      </template>

      <p
        v-else
        class="retro-detail-page__hint"
      >
        Итоги за выбранный месяц пока недоступны.
      </p>
    </section>

    <!-- Self-assessment -->
    <section class="retro-detail-page__block">
      <h2 class="retro-detail-page__block-title">
        Самооценка
      </h2>
      <p class="retro-detail-page__hint">
        5 — отлично, 1 — требует улучшения
      </p>

      <div
        v-for="item in [
          { key: 'disciplineRating', label: 'Дисциплина', hint: 'Придерживался ли я бюджета?' },
          { key: 'impulseControlRating', label: 'Контроль импульсов', hint: 'Избегал ли необдуманных покупок?' },
          { key: 'confidenceRating', label: 'Финансовая уверенность', hint: 'Чувствую ли я контроль над деньгами?' },
        ]"
        :key="item.key"
        class="retro-detail-page__rating-row"
      >
        <div class="retro-detail-page__rating-meta">
          <span class="retro-detail-page__label">{{ item.label }}</span>
          <span class="retro-detail-page__hint">{{ item.hint }}</span>
        </div>
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

    <!-- Guided reflection -->
    <section class="retro-detail-page__block">
      <h2 class="retro-detail-page__block-title">
        Рефлексия
      </h2>

      <div class="retro-detail-page__field">
        <label
          for="retro-wins"
          class="retro-detail-page__label"
        >Что получилось?</label>
        <p class="retro-detail-page__field-hint">
          Достижения месяца — что сделал хорошо
        </p>
        <textarea
          id="retro-wins"
          v-model="form.wins"
          class="retro-detail-page__textarea"
          placeholder="Придерживался бюджета, закрыл долг, отложил 20 тыс"
          maxlength="1000"
        />
        <span class="retro-detail-page__char-count">{{ charCount(form.wins, 1000) }}</span>
      </div>

      <div class="retro-detail-page__field">
        <label
          for="retro-savings"
          class="retro-detail-page__label"
        >Что можно было сделать лучше?</label>
        <p class="retro-detail-page__field-hint">
          Конкретные покупки и суммы — это поможет вспомнить что изменить
        </p>
        <textarea
          id="retro-savings"
          v-model="form.savingsOpportunities"
          class="retro-detail-page__textarea"
          placeholder="Кафе можно было сократить до 10 тыс&#10;Импульсивная покупка — 15 тыс"
          maxlength="2000"
        />
        <span class="retro-detail-page__char-count">{{ charCount(form.savingsOpportunities, 2000) }}</span>
      </div>

      <div class="retro-detail-page__field">
        <label
          for="retro-conclusion"
          class="retro-detail-page__label"
        >Выводы</label>
        <p class="retro-detail-page__field-hint">
          Ключевые уроки месяца — каждый вывод с новой строки
        </p>
        <textarea
          id="retro-conclusion"
          v-model="form.conclusion"
          class="retro-detail-page__textarea"
          placeholder="Не сочетать несколько крупных покупок в месяц&#10;Кафе — сократить до 10 тыс.&#10;"
          maxlength="2000"
        />
        <span class="retro-detail-page__char-count">{{ charCount(form.conclusion, 2000) }}</span>
      </div>

      <div class="retro-detail-page__field">
        <label
          for="retro-next-month"
          class="retro-detail-page__label"
        >На следующий месяц</label>
        <p class="retro-detail-page__field-hint">
          Конкретные цели и ограничения
        </p>
        <textarea
          id="retro-next-month"
          v-model="form.nextMonthPlan"
          class="retro-detail-page__textarea"
          placeholder="Отменить ненужные подписки"
          maxlength="2000"
        />
        <span class="retro-detail-page__char-count">{{ charCount(form.nextMonthPlan, 2000) }}</span>
      </div>
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

    <div class="retro-detail-page__save-bar">
      <button
        type="button"
        class="retro-detail-page__save"
        :disabled="!canSave"
        @click="handleSave"
      >
        {{ saving ? 'Сохранение…' : 'Сохранить рефлексию' }}
      </button>
    </div>
  </PageContainer>
</template>

<style scoped>
.retro-detail-page {
  gap: var(--ft-space-5);
  max-width: 860px;
}

.retro-detail-page__block {
  display: grid;
  gap: var(--ft-space-4);

  padding: var(--ft-space-5);

  background: var(--ft-surface-raised);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
}

.retro-detail-page__block-title {
  margin: 0;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

/* Score card */
.retro-detail-page__score-card {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;

  padding: var(--ft-space-4);

  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);
  background: var(--ft-surface-base);
}

.retro-detail-page__score-card--good {
  border-color: color-mix(in srgb, var(--ft-success-400) 25%, transparent);
  background: color-mix(in srgb, var(--ft-success-400) 6%, transparent);
}

.retro-detail-page__score-card--average {
  border-color: color-mix(in srgb, var(--ft-warning-400) 25%, transparent);
  background: color-mix(in srgb, var(--ft-warning-400) 6%, transparent);
}

.retro-detail-page__score-card--poor {
  border-color: color-mix(in srgb, var(--ft-danger-400) 25%, transparent);
  background: color-mix(in srgb, var(--ft-danger-400) 6%, transparent);
}

.retro-detail-page__score-main {
  display: grid;
  gap: var(--ft-space-1);
}

.retro-detail-page__score-label {
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.retro-detail-page__score-value {
  font-size: var(--ft-text-3xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  line-height: 1;
}

.retro-detail-page__score-status {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.retro-detail-page__score-delta {
  flex-shrink: 0;

  padding: var(--ft-space-1) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-tertiary);
  white-space: nowrap;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-full);
}

.retro-detail-page__score-delta--positive {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-400) 8%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-400) 25%, transparent);
}

/* Factor cards */
.retro-detail-page__factors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ft-space-2);
}

.retro-detail-page__factor {
  display: grid;
  gap: 2px;

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.retro-detail-page__factor-label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.retro-detail-page__factor-value {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.retro-detail-page__factor-value--good {
  color: var(--ft-success-400);
}

.retro-detail-page__factor-value--average {
  color: var(--ft-warning-400);
}

.retro-detail-page__factor-value--poor {
  color: var(--ft-danger-400);
}

.retro-detail-page__factor-sub {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  min-height: 1em;
}

/* Stats chips */
.retro-detail-page__stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
}

.retro-detail-page__stat-chip {
  display: grid;
  gap: 2px;

  padding: var(--ft-space-2) var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.retro-detail-page__stat-chip-label {
  font-size: 0.65rem;
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.retro-detail-page__stat-chip-value {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

/* Analytics skeleton */
.retro-detail-page__summary-skeleton {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ft-space-2);
}

/* Rating rows */
.retro-detail-page__rating-row {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-2) 0;
  border-bottom: 1px solid var(--ft-border-subtle);
}

.retro-detail-page__rating-row:last-of-type {
  border-bottom: none;
}

.retro-detail-page__rating-meta {
  display: grid;
  gap: 2px;
}

.retro-detail-page__label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
}

.retro-detail-page__stars {
  display: flex;
  gap: var(--ft-space-1);
  flex-shrink: 0;
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

.retro-detail-page__star:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

/* Text fields */
.retro-detail-page__field {
  display: grid;
  gap: var(--ft-space-1);
}

.retro-detail-page__field-hint {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.retro-detail-page__textarea {
  width: 100%;
  min-height: 100px;
  padding: var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-family: inherit;
  color: var(--ft-text-primary);
  line-height: 1.6;

  resize: vertical;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition: border-color var(--ft-transition-fast);
}

.retro-detail-page__textarea:focus-visible {
  outline: none;
  border-color: var(--ft-primary-400);
}

.retro-detail-page__char-count {
  justify-self: end;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

/* Hint */
.retro-detail-page__hint {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

/* Save bar */
.retro-detail-page__save-bar {
  display: flex;
  justify-content: flex-end;
}

.retro-detail-page__save {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-3) var(--ft-space-6);

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

.retro-detail-page__save:focus-visible,
.retro-detail-page__back:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

/* Back button */
.retro-detail-page__back {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition: border-color var(--ft-transition-fast);
}

.retro-detail-page__back:hover {
  border-color: var(--ft-border-strong);
}

/* Responsive */
@media (width <= 640px) {
  .retro-detail-page__factors {
    grid-template-columns: minmax(0, 1fr);
  }

  .retro-detail-page__summary-skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .retro-detail-page__rating-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ft-space-2);
  }

  .retro-detail-page__save-bar {
    position: sticky;
    bottom: var(--ft-space-4);
  }

  .retro-detail-page__save {
    width: 100%;
  }

  .retro-detail-page__score-card {
    flex-direction: column;
  }
}
</style>
