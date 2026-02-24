<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import UiInputNumber from '@/ui/UiInputNumber.vue'

import type { Account } from '../types'
import { useAccountBalanceAdjustments } from '../composables/useAccountBalanceAdjustments'
import { useFinanceStore } from '../stores/finance'

import FormField from "@/components/common/FormField.vue";
import UiButton from "@/ui/UiButton.vue";


type BalanceAdjustableAccount = {
  id: string
  name: string
  currencyCode: string
  balance?: number | null
  currency?: Account['currency'] | null
}

const props = defineProps<{
  visible: boolean
  account: BalanceAdjustableAccount | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const toast = useToast()
const financeStore = useFinanceStore()
const {
  saving,
  saveAdjustment
} = useAccountBalanceAdjustments()
const newBalance = ref<number | null>(null)

const resolvedAccount = computed(() => {
  if (!props.account) return null
  return financeStore.accounts.find(account => account.id === props.account?.id) ?? props.account
})

const accountCurrency = computed(
  () => resolvedAccount.value?.currency?.code ?? resolvedAccount.value?.currencyCode ?? 'RUB'
)





const submitAdjustment = async () => {
  if (props.readonly) {
    toast.add({
      severity: 'warn',
      summary: 'Режим просмотра',
      detail: 'Корректировка баланса недоступна без активной подписки.',
      life: 2500,
    })
    return
  }

  if (!props.account) return
  if (newBalance.value == null) {
    toast.add({
      severity: 'warn',
      summary: 'Введите баланс',
      detail: 'Укажите фактический баланс для корректировки.',
      life: 2500,
    })
    return
  }

  const success = await saveAdjustment(props.account.id, newBalance.value)
  if (!success) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось сохранить корректировку.',
      life: 2500,
    })
    return
  }

  await financeStore.fetchAccounts(true)
  toast.add({
    severity: 'success',
    summary: 'Баланс обновлен',
    detail: 'Корректировка сохранена.',
    life: 2500,
  })
  newBalance.value = null
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      newBalance.value = props.account?.balance ?? null
    }
  }
)
</script>

<template>
  <Dialog
    :visible="props.visible"
    :closable="false"
    modal
    class="adjustments-dialog"
    :style="{ width: '420px' }"
    :breakpoints="{ '640px': 'calc(100vw - 1rem)' }"
    append-to="body"
    dismissable-mask
    @update:visible="val => emit('update:visible', val)"
  >
    <div class="adjustments-modal">
      <header class="adjustments-modal__header">
        <h2 class="adjustments-modal__title">
          Изменение баланса для '{{ props.account?.name ?? 'Счета' }}'
        </h2>
        <button
          type="button"
          class="adjustments-modal__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>


      <FormField
        label="Текущий баланс"
        required
      >
        <template #default="{ fieldAttrs }">
          <UiInputNumber
            v-model="newBalance"
            :input-id="fieldAttrs.id"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :use-grouping="true"
            class="w-full"
            placeholder="Введите сумму"
          />
        </template>
        <template #label-after>
          <i
            v-tooltip.top="`Укажите актуальный баланс вашего счета для синхронизации (${accountCurrency})`"
            class="pi pi-question-circle form-field__tooltip-icon"
          />
        </template>
      </FormField>

      <div class="adjustments-modal__actions">
        <UiButton
          type="button"
          icon="pi pi-check"
          :loading="saving"
          :disabled="saving || props.readonly"
          @click="submitAdjustment"
        >
          Сохранить
        </UiButton>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.adjustments-modal {
  display: grid;
  gap: var(--ft-space-4);
  padding: var(--ft-space-6);
}

.adjustments-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.adjustments-modal__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: 700;
  color: var(--ft-text-primary);
}

.adjustments-modal__close {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;
  padding: 0;

  color: var(--ft-text-tertiary);

  background: none;
  border: none;
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.adjustments-modal__close:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

.adjustments-account {
  padding: var(--ft-space-3);
  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);
}

.adjustments-account h4 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
}

.adjustments-account p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
}

.adjustments-note {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.adjustments-modal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  justify-content: flex-end;
}

.adjustments-modal__actions :deep(.ui-button) {
  flex: 0 0 auto;
  min-width: 156px;
  min-height: 44px;
}

.adjustments-modal__actions :deep(.p-button-label) {
  white-space: nowrap;
}

.adjustments-history h5 {
  margin: 0 0 var(--ft-space-2);
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
}

.adjustments-modal__skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

.adjustments-list {
  overflow-y: auto;
  display: grid;
  gap: var(--ft-space-2);

  max-height: 220px;
  margin: 0;
  padding: 0;

  list-style: none;
}

.adjustments-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-2) var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.adjustments-list__amount {
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-primary);
}

.adjustments-list__date {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}

@media (width <= 640px) {
  .adjustments-modal__actions :deep(.ui-button) {
    width: 100%;
    min-width: 0;
  }
}
</style>
