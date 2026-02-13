<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useFinanceStore } from '../stores/finance';
import type { Account, CreateTransferPayload, UpdateTransferPayload } from '../types';
import { VALIDATION_RULES } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import { validators } from '../services/validation.service';
import { parseUtcDateOnlyToLocalDate, toUtcDateOnlyIso } from '../utils/dateOnly';

const store = useFinanceStore();
const confirm = useConfirm();
const toast = useToast();

const props = defineProps<{
  visible: boolean;
  transfer?: UpdateTransferPayload | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const fromAccount = ref<Account | null>(null);
const toAccount = ref<Account | null>(null);
const fromAmount = ref<number | null>(null);
const toAmount = ref<number | null>(null);
const feeAmount = ref<number | null>(null);
const description = ref<string>('');
const date = ref<Date>(new Date());
const isDeleting = ref(false);

const isEditMode = computed(() => !!props.transfer);

const resetForm = () => {
  fromAccount.value = store.primaryAccount ?? store.accounts[0] ?? null;
  toAccount.value = store.accounts.find(a => a.id !== fromAccount.value?.id) ?? null;
  fromAmount.value = null;
  toAmount.value = null;
  feeAmount.value = null;
  description.value = '';
  date.value = new Date();
};

const applyTransfer = (transfer: UpdateTransferPayload) => {
  fromAccount.value = store.accounts.find(a => a.id === transfer.fromAccountId) ?? null;
  toAccount.value = store.accounts.find(a => a.id === transfer.toAccountId) ?? null;
  fromAmount.value = transfer.fromAmount;
  toAmount.value = transfer.toAmount;
  feeAmount.value = transfer.feeAmount ?? null;
  description.value = transfer.description ?? '';
  date.value = parseUtcDateOnlyToLocalDate(transfer.occurredAt) ?? new Date(transfer.occurredAt);
};

watch(
  () => props.visible,
  visible => {
    if (visible) {
      if (isEditMode.value && props.transfer) {
        applyTransfer(props.transfer);
      } else {
        resetForm();
      }
    }
  }
);

watch(
  () => props.transfer,
  transfer => {
    if (props.visible && transfer) {
      applyTransfer(transfer);
    }
  }
);

watch(fromAccount, account => {
  if (account && toAccount.value?.id === account.id) {
    toAccount.value = store.accounts.find(a => a.id !== account.id) ?? null;
  }
});

watch(
  () => store.accounts,
  accounts => {
    if (isEditMode.value && props.transfer) {
      applyTransfer(props.transfer);
      return;
    }
    if (!fromAccount.value && accounts.length) {
      fromAccount.value = store.primaryAccount ?? accounts[0] ?? null;
    }
    if (!toAccount.value && accounts.length) {
      toAccount.value = accounts.find(a => a.id !== fromAccount.value?.id) ?? null;
    }
  }
);

const fromCurrency = computed(() => fromAccount.value?.currency?.code ?? fromAccount.value?.currencyCode ?? '—');
const fromCurrencySymbol = computed(() => fromAccount.value?.currency?.symbol ?? '');
const toCurrency = computed(() => toAccount.value?.currency?.code ?? toAccount.value?.currencyCode ?? '—');
const toCurrencySymbol = computed(() => toAccount.value?.currency?.symbol ?? '');

const isSameCurrency = computed(() => {
  const from = fromCurrency.value;
  const to = toCurrency.value;
  return !!from && !!to && from !== '—' && from === to;
});

const resolvedToAmount = computed(() => (isSameCurrency.value ? fromAmount.value : toAmount.value));

const isFromAmountValid = computed(() => validators.isAmountValid(fromAmount.value));
const isToAmountValid = computed(() =>
  isSameCurrency.value
    ? validators.isAmountValid(fromAmount.value)
    : validators.isAmountValid(toAmount.value)
);
const isFeeValid = computed(() => feeAmount.value == null || feeAmount.value >= 0);
const isAccountsValid = computed(
  () => fromAccount.value && toAccount.value && fromAccount.value.id !== toAccount.value.id
);

const formatRate = (value: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);

const exchangeRate = computed(() => {
  if (isSameCurrency.value) {
    return null;
  }
  if (!isAccountsValid.value || !isFromAmountValid.value || !isToAmountValid.value || !isFeeValid.value) {
    return null;
  }

  const fromValue = fromAmount.value ?? 0;
  const toValue = resolvedToAmount.value ?? 0;
  const feeValue = feeAmount.value ?? 0;

  if (fromValue <= 0 || toValue <= 0 || feeValue < 0) {
    return null;
  }

  const fromCode = fromCurrency.value;
  const toCode = toCurrency.value;
  if (!fromCode || !toCode || fromCode === '—' || toCode === '—') {
    return null;
  }

  if (fromCode === toCode) {
    return null;
  }

  const effectiveFrom = fromValue + feeValue;
  if (effectiveFrom <= 0) {
    return null;
  }

  return toValue / effectiveFrom;
});

const exchangeRateLabel = computed(() => {
  if (!exchangeRate.value) {
    return null;
  }

  const feeValue = feeAmount.value ?? 0;
  const label = feeValue > 0 ? 'Курс (с комиссией)' : 'Курс';
  return `${label}: 1 ${fromCurrency.value} = ${formatRate(exchangeRate.value)} ${toCurrency.value}`;
});

const submitDisabled = computed(
  () => !isAccountsValid.value || !isFromAmountValid.value || !isToAmountValid.value || !isFeeValid.value
);

const { isSubmitting, handleSubmit: submitTransfer, showWarning } = useFormModal(
  async () => {
    if (isEditMode.value && props.transfer) {
      const payload: UpdateTransferPayload = {
        transferId: props.transfer.transferId,
        fromAccountId: fromAccount.value!.id,
        toAccountId: toAccount.value!.id,
        fromAmount: fromAmount.value!,
        toAmount: resolvedToAmount.value!,
        feeAmount: feeAmount.value ?? null,
        occurredAt: toUtcDateOnlyIso(date.value),
        description: description.value ? description.value.trim() : null,
      };

      return await store.updateTransfer(payload);
    }

    const payload: CreateTransferPayload = {
      fromAccountId: fromAccount.value!.id,
      toAccountId: toAccount.value!.id,
      fromAmount: fromAmount.value!,
      toAmount: resolvedToAmount.value!,
      feeAmount: feeAmount.value ?? null,
      occurredAt: toUtcDateOnlyIso(date.value),
      description: description.value ? description.value.trim() : null,
    };

    return await store.createTransfer(payload);
  },
  {
    successMessage: 'Перевод сохранен.',
    errorMessage: 'Не удалось сохранить перевод.',
  }
);

const handleSubmit = async () => {
  if (props.readonly) {
    showWarning('Редактирование недоступно в режиме просмотра.');
    return;
  }

  if (!isAccountsValid.value) {
    showWarning('Выберите разные счета для перевода.');
    return;
  }
  if (!isFromAmountValid.value || !isToAmountValid.value) {
    showWarning('Введите корректные суммы перевода.');
    return;
  }
  if (!isFeeValid.value) {
    showWarning('Комиссия не может быть отрицательной.');
    return;
  }

  const success = await submitTransfer();
  if (success) {
    emit('update:visible', false);
  }
};

const handleDelete = () => {
  if (props.readonly) return;
  if (!props.transfer) return;

  confirm.require({
    message: 'Удалить этот перевод? Все связанные транзакции будут удалены.',
    header: 'Подтверждение удаления',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    acceptClass: 'p-button-danger',
    accept: async () => {
      isDeleting.value = true;
      const success = await store.deleteTransfer(props.transfer!.transferId);
      isDeleting.value = false;

      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Перевод удален' : 'Не удалось удалить',
        detail: success
          ? 'Перевод больше не отображается в списке.'
          : 'Пожалуйста, попробуйте еще раз.',
        life: 3000
      });

      if (success) {
        emit('update:visible', false);
      }
    }
  });
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    :header="isEditMode ? 'Редактирование перевода' : 'Новый перевод'"
    modal
    class="transfer-dialog"
    :style="{ width: '560px' }"
    @update:visible="val => emit('update:visible', val)"
  >
    <form
      class="transfer-form"
      @submit.prevent="handleSubmit"
    >
      <div class="field">
        <label for="from-account">Счет списания *</label>
        <Select
          id="from-account"
          v-model="fromAccount"
          :options="store.accounts"
          option-label="name"
          placeholder="Выберите счет"
          :disabled="props.readonly"
          class="w-full"
        >
          <template #option="slotProps">
            <div class="option-line">
              <div class="option-name">
                <i class="pi pi-credit-card" />
                <span>{{ slotProps.option.name }}</span>
              </div>
              <span class="option-currency">
                {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
              </span>
            </div>
          </template>
        </Select>
      </div>

      <div class="field">
        <label for="to-account">Счет зачисления *</label>
        <Select
          id="to-account"
          v-model="toAccount"
          :options="store.accounts.filter(acc => acc.id !== fromAccount?.id)"
          option-label="name"
          placeholder="Выберите счет"
          :disabled="props.readonly"
          class="w-full"
        >
          <template #option="slotProps">
            <div class="option-line">
              <div class="option-name">
                <i class="pi pi-credit-card" />
                <span>{{ slotProps.option.name }}</span>
              </div>
              <span class="option-currency">
                {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
              </span>
            </div>
          </template>
        </Select>
      </div>

      <div class="field field--amount">
        <label for="from-amount">Сумма списания *</label>
        <div class="amount-input">
          <InputNumber
            id="from-amount"
            v-model="fromAmount"
            mode="decimal"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :min="VALIDATION_RULES.minAmount"
            placeholder="0.00"
            :disabled="props.readonly"
            :class="{ 'p-invalid': !isFromAmountValid && fromAmount !== null }"
          />
          <span class="currency-chip">{{ fromCurrencySymbol || fromCurrency }}</span>
        </div>
      </div>

      <div
        v-if="!isSameCurrency"
        class="field field--amount"
      >
        <label for="to-amount">Сумма зачисления *</label>
        <div class="amount-input">
          <InputNumber
            id="to-amount"
            v-model="toAmount"
            mode="decimal"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :min="VALIDATION_RULES.minAmount"
            placeholder="0.00"
            :disabled="props.readonly"
            :class="{ 'p-invalid': !isToAmountValid && toAmount !== null }"
          />
          <span class="currency-chip">{{ toCurrencySymbol || toCurrency }}</span>
        </div>
      </div>

      <div class="field field--amount">
        <label for="fee-amount">Комиссия</label>
        <div class="amount-input">
          <InputNumber
            id="fee-amount"
            v-model="feeAmount"
            mode="decimal"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :min="0"
            placeholder="0.00"
            :disabled="props.readonly"
          />
          <span class="currency-chip">{{ fromCurrencySymbol || fromCurrency }}</span>
        </div>
      </div>

      <div
        v-if="exchangeRateLabel"
        class="field field--full"
      >
        <div class="rate-hint">
          <i
            class="pi pi-chart-line"
            aria-hidden="true"
          />
          <span>{{ exchangeRateLabel }}</span>
        </div>
      </div>

      <div class="field">
        <label for="transfer-date">Дата</label>
        <DatePicker
          id="transfer-date"
          v-model="date"
          date-format="dd.mm.yy"
          :show-icon="true"
          :disabled="props.readonly"
          class="w-full"
        />
      </div>

      <div class="field field--full">
        <label for="transfer-description">Заметка</label>
        <InputText
          id="transfer-description"
          v-model="description"
          placeholder="Например: перевод между счетами"
          :disabled="props.readonly"
          class="w-full"
        />
      </div>

      <footer class="form-actions">
        <div class="form-actions__left">
          <Button
            v-if="isEditMode"
            type="button"
            label="Удалить"
            icon="pi pi-trash"
            severity="danger"
            outlined
            :loading="isDeleting"
            :disabled="props.readonly || isSubmitting"
            @click="handleDelete"
          />
        </div>
        <div class="form-actions__right">
          <Button
            type="button"
            label="Отмена"
            icon="pi pi-times"
            severity="secondary"
            outlined
            :disabled="isSubmitting || isDeleting"
            @click="emit('update:visible', false)"
          />
          <Button
            type="submit"
            :label="isEditMode ? 'Обновить' : 'Сохранить'"
            icon="pi pi-check"
            :disabled="props.readonly || submitDisabled || isDeleting"
            :loading="isSubmitting"
          />
        </div>
      </footer>
    </form>
  </Dialog>
</template>

<style scoped>
.transfer-dialog :deep(.p-dialog-content) {
  padding: clamp(1.8rem, 2.2vw, 2.3rem);
  background: var(--ft-surface-elevated);
}

.transfer-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ft-space-4);
}

.field {
  display: grid;
  gap: var(--ft-space-2);
}

.field--full {
  grid-column: 1 / -1;
}

.field--amount {
  grid-column: span 1;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.currency-chip {
  padding: 0.35rem 0.6rem;
  border-radius: var(--ft-radius-md);
  background: var(--ft-surface-muted);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  white-space: nowrap;
}

.option-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: var(--ft-space-2);
}

.option-name {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.option-currency {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ft-space-3);
  margin-top: var(--ft-space-2);
}

.form-actions__left,
.form-actions__right {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.rate-hint {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  padding: 0.5rem 0.75rem;
  border-radius: var(--ft-radius-md);
  background: var(--ft-surface-muted);
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
}

.rate-hint i {
  color: var(--ft-primary-400);
}

@media (max-width: 640px) {
  .transfer-form {
    grid-template-columns: 1fr;
  }
}
</style>
