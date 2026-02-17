<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import type { Account, AccountBalanceAdjustmentDto } from '../types'
import { apiService } from '../services/api.service'
import { useFinanceStore } from '../stores/finance'
import { formatCurrency, formatDate } from '../utils/formatters'
import FormField from "@/components/common/FormField.vue";
import UiButton from "@/ui/UiButton.vue";
import UiSkeleton from "@/ui/UiSkeleton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

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

const adjustments = ref<AccountBalanceAdjustmentDto[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const newBalance = ref<number | null>(null)
const saving = ref(false)

const resolvedAccount = computed(() => {
  if (!props.account) return null
  return financeStore.accounts.find(account => account.id === props.account?.id) ?? props.account
})

const accountCurrency = computed(
  () => resolvedAccount.value?.currency?.code ?? resolvedAccount.value?.currencyCode ?? 'RUB'
)

const currentBalanceLabel = computed(() => {
  if (!resolvedAccount.value) return '—'
  return formatCurrency(resolvedAccount.value.balance ?? 0, accountCurrency.value)
})

const formattedAdjustments = computed(() =>
  adjustments.value.map(adj => ({
    ...adj,
    dateLabel: formatDate(adj.occurredAt),
    amountLabel: formatCurrency(Number(adj.amount ?? 0), accountCurrency.value),
  }))
)

const loadAdjustments = async () => {
  if (!props.account) return
  loading.value = true
  error.value = null
  try {
    const data = await apiService.getAccountBalanceAdjustments(props.account.id)
    adjustments.value = data ?? []
  } catch (err) {
    console.error('Не удалось загрузить корректировки:', err)
    error.value = 'Не удалось загрузить корректировки.'
    adjustments.value = []
  } finally {
    loading.value = false
  }
}

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

  saving.value = true
  try {
    await apiService.createAccountBalanceAdjustment(props.account.id, newBalance.value)
    await Promise.all([
      loadAdjustments(),
      financeStore.fetchAccounts(true),
    ])
    toast.add({
      severity: 'success',
      summary: 'Баланс обновлен',
      detail: 'Корректировка сохранена.',
      life: 2500,
    })
    newBalance.value = null
  } catch (err) {
    console.error('Не удалось сохранить корректировку:', err)
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось сохранить корректировку.',
      life: 2500,
    })
  } finally {
    saving.value = false
  }
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      newBalance.value = props.account?.balance ?? null
      void loadAdjustments()
    }
  }
)

watch(
  () => props.account?.id,
  () => {
    if (props.visible) {
      newBalance.value = props.account?.balance ?? null
      void loadAdjustments()
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
    dismissable-mask
    @update:visible="val => emit('update:visible', val)"
  >
    <div class="adjustments-modal">
      <header class="adjustments-modal__header">
        <h2 class="adjustments-modal__title">Корректировка баланса</h2>
        <button
          type="button"
          class="adjustments-modal__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>
      <div class="adjustments-account">
        <h4>{{ props.account?.name ?? 'Счет' }}</h4>
        <p>Текущий баланс: <strong>{{ currentBalanceLabel }}</strong></p>
      </div>

      <p class="adjustments-note">
        Укажите фактический баланс на текущий момент. Транзакции и история операций не изменяются.
      </p>

      <FormField
        label="Фактический баланс"
        required
      >
        <template #default="{ fieldAttrs }">
          <InputNumber
            v-model="newBalance"
            :input-id="fieldAttrs.id"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :use-grouping="true"
            class="w-full"
            placeholder="Введите сумму"
          />
        </template>
        <template #hint>
          Баланс указывается в валюте счёта ({{ accountCurrency }}).
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

      <section class="adjustments-history">
        <h5>История корректировок</h5>

        <div
          v-if="loading"
          class="adjustments-modal__skeleton"
        >
          <UiSkeleton
            v-for="i in 3"
            :key="i"
            height="44px"
          />
        </div>

        <div
          v-else-if="error"
          class="adjustments-modal__error"
        >
          <Message
            severity="error"
            icon="pi pi-exclamation-triangle"
            :closable="false"
          >
            {{ error }}
          </Message>
        </div>

        <EmptyState
          v-else-if="formattedAdjustments.length === 0"
          icon="pi pi-history"
          title="Нет корректировок"
          description="Добавьте первую корректировку, чтобы зафиксировать актуальный баланс."
        />

        <ul
          v-else
          class="adjustments-list"
        >
          <li
            v-for="adjustment in formattedAdjustments"
            :key="adjustment.id"
            class="adjustments-list__item"
          >
            <div>
              <div class="adjustments-list__amount">
                {{ adjustment.amountLabel }}
              </div>
              <div class="adjustments-list__date">
                {{ adjustment.dateLabel }}
              </div>
            </div>
          </li>
        </ul>
      </section>
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

  transition: color 0.15s, background-color 0.15s;
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
