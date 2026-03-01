<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'

type MonthOption = {
  label: string
  value: string
  hasRetrospective: boolean
}

const props = defineProps<{
  visible: boolean
  selectedMonth: string | null
  loading: boolean
  options: MonthOption[]
  fetchError: string | null
  submitError: string | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:selectedMonth': [value: string | null]
  confirm: []
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    emit('update:visible', value)
  },
})

const localMonth = computed({
  get: () => props.selectedMonth,
  set: (value: string | null) => {
    emit('update:selectedMonth', value)
  },
})

const canSubmit = computed(() => Boolean(localMonth.value) && props.options.length > 0)

const onCancel = () => {
  emit('update:visible', false)
  emit('update:selectedMonth', null)
}

const onConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    modal
    header="Новая рефлексия"
    class="retrospective-month-modal"
    :style="{ width: 'min(520px, calc(100vw - 2rem))' }"
  >
    <div class="retrospective-month-modal__content">
      <p class="retrospective-month-modal__hint">
        Выберите месяц, в котором были транзакции. Доступны только завершённые месяцы.
      </p>

      <Skeleton
        v-if="loading"
        height="44px"
      />

      <Message
        v-else-if="fetchError"
        severity="error"
      >
        {{ fetchError }}
      </Message>

      <template v-else-if="options.length > 0">
        <label
          for="reflection-month-select"
          class="retrospective-month-modal__label"
        >
          Месяц
        </label>

        <Select
          id="reflection-month-select"
          v-model="localMonth"
          :options="options"
          option-label="label"
          option-value="value"
          placeholder="Выберите месяц"
          fluid
        >
          <template #option="slotProps">
            <div class="retrospective-month-modal__option">
              <span>{{ slotProps.option.label }}</span>
              <span
                v-if="slotProps.option.hasRetrospective"
                class="retrospective-month-modal__option-badge"
              >
                уже есть
              </span>
            </div>
          </template>
        </Select>

        <p class="retrospective-month-modal__meta">
          Пометка «уже есть» означает, что откроется редактирование сохранённой записи.
        </p>
      </template>

      <Message
        v-else
        severity="info"
      >
        Пока нет завершённых месяцев с транзакциями для создания рефлексии.
      </Message>

      <Message
        v-if="submitError"
        severity="warn"
      >
        {{ submitError }}
      </Message>
    </div>

    <template #footer>
      <div class="retrospective-month-modal__actions">
        <button
          type="button"
          class="retrospective-month-modal__btn"
          @click="onCancel"
        >
          Отмена
        </button>
        <button
          type="button"
          class="retrospective-month-modal__btn retrospective-month-modal__btn--primary"
          :disabled="!canSubmit"
          @click="onConfirm"
        >
          Продолжить
        </button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.retrospective-month-modal__content {
  display: grid;
  gap: var(--ft-space-3);
}

.retrospective-month-modal__hint,
.retrospective-month-modal__meta {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.retrospective-month-modal__label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.retrospective-month-modal__actions {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: flex-end;
}

.retrospective-month-modal__option {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;
}

.retrospective-month-modal__option-badge {
  padding: 2px 8px;

  font-size: 0.65rem;
  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-full);
}

.retrospective-month-modal :deep(.p-dialog-content) {
  padding-top: var(--ft-space-2);
}

.retrospective-month-modal__btn {
  cursor: pointer;

  min-height: 44px;
  padding: var(--ft-space-2) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition: background-color var(--ft-transition-fast), color var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.retrospective-month-modal__btn:hover {
  background: color-mix(in srgb, var(--ft-primary-400) 10%, transparent);
}

.retrospective-month-modal__btn:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

.retrospective-month-modal__btn--primary {
  color: var(--ft-surface-base);
  background: var(--ft-primary-400);
  border-color: var(--ft-primary-400);
}

.retrospective-month-modal__btn--primary:hover:not(:disabled) {
  background: var(--ft-primary-500);
}

.retrospective-month-modal__btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (width <= 640px) {
  .retrospective-month-modal__actions {
    width: 100%;
  }

  .retrospective-month-modal__btn {
    flex: 1;
  }
}
</style>
