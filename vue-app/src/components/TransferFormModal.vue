<script setup lang="ts">
import UiDialog from '../ui/UiDialog.vue';
import UiSelect from '../ui/UiSelect.vue';
import UiInputNumber from '../ui/UiInputNumber.vue';
import UiInputText from '../ui/UiInputText.vue';
import UiDatePicker from '../ui/UiDatePicker.vue';
import { useConfirm } from 'primevue/useconfirm';
import UiButton from '../ui/UiButton.vue';
import { useToast } from 'primevue/usetoast';
import type { CreateTransferPayload, UpdateTransferPayload } from '../types';
import { VALIDATION_RULES } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import { useTransferFormState } from '../composables/useTransferFormState';
import { toUtcDateOnlyIso } from '../utils/dateOnly';

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
const {
  store,
  fromAccount,
  toAccount,
  fromAmount,
  toAmount,
  feeAmount,
  description,
  today,
  date,
  isDeleting,
  isEditMode,
  fromCurrency,
  fromCurrencySymbol,
  toCurrency,
  toCurrencySymbol,
  isSameCurrency,
  resolvedToAmount,
  isFromAmountValid,
  isToAmountValid,
  isFeeValid,
  isAccountsValid,
  exchangeRateLabel,
  submitDisabled
} = useTransferFormState(props);

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
  <UiDialog
    :visible="props.visible"
    modal
    class="transfer-dialog"
    :closable="false"
    :dismissable-mask="true"
    @update:visible="val => emit('update:visible', val)"
  >
    <template #header>
      <span />
    </template>

    <form
      class="xfer-form"
      @submit.prevent="handleSubmit"
    >
      <header class="xfer-form__header">
        <h2 class="xfer-form__title">
          {{ isEditMode ? 'Редактирование перевода' : 'Новый перевод' }}
        </h2>
        <button
          type="button"
          class="xfer-form__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>

      <!-- Transfer flow -->
      <div class="xfer-flow">
        <!-- From block -->
        <div class="xfer-flow__block">
          <span class="xfer-flow__label">Откуда</span>
          <UiSelect
            id="from-account"
            v-model="fromAccount"
            :options="store.accounts"
            option-label="name"
            placeholder="Выберите счёт"
            :disabled="props.readonly"
            :autofocus="props.visible"
            class="w-full"
          >
            <template #option="slotProps">
              <div class="xfer-form__option-line">
                <div class="xfer-form__option-name">
                  <i class="pi pi-credit-card" />
                  <span>{{ slotProps.option.name }}</span>
                </div>
                <span class="xfer-form__option-currency">
                  {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
                </span>
              </div>
            </template>
          </UiSelect>
          <div class="xfer-flow__amount-row">
            <UiInputNumber
              id="from-amount"
              v-model="fromAmount"
              mode="decimal"
              :min-fraction-digits="2"
              :max-fraction-digits="2"
              :min="VALIDATION_RULES.minAmount"
              placeholder="0.00"
              :disabled="props.readonly"
              :invalid="!isFromAmountValid && fromAmount !== null"
            />
            <span class="xfer-flow__currency">{{ fromCurrencySymbol || fromCurrency }}</span>
          </div>
        </div>

        <!-- Arrow divider -->
        <div class="xfer-flow__divider">
          <span class="xfer-flow__arrow">
            <i class="pi pi-arrow-down" />
          </span>
        </div>

        <!-- To block -->
        <div class="xfer-flow__block">
          <span class="xfer-flow__label">Куда</span>
          <UiSelect
            id="to-account"
            v-model="toAccount"
            :options="store.accounts.filter(acc => acc.id !== fromAccount?.id)"
            option-label="name"
            placeholder="Выберите счёт"
            :disabled="props.readonly"
            class="w-full"
          >
            <template #option="slotProps">
              <div class="xfer-form__option-line">
                <div class="xfer-form__option-name">
                  <i class="pi pi-credit-card" />
                  <span>{{ slotProps.option.name }}</span>
                </div>
                <span class="xfer-form__option-currency">
                  {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
                </span>
              </div>
            </template>
          </UiSelect>
          <div
            v-if="!isSameCurrency"
            class="xfer-flow__amount-row"
          >
            <UiInputNumber
              id="to-amount"
              v-model="toAmount"
              mode="decimal"
              :min-fraction-digits="2"
              :max-fraction-digits="2"
              :min="VALIDATION_RULES.minAmount"
              placeholder="0.00"
              :disabled="props.readonly"
              :invalid="!isToAmountValid && toAmount !== null"
            />
            <span class="xfer-flow__currency">{{ toCurrencySymbol || toCurrency }}</span>
          </div>
        </div>
      </div>

      <!-- Rate badge -->
      <div
        v-if="exchangeRateLabel"
        class="xfer-form__rate"
      >
        <i
          class="pi pi-chart-line"
          aria-hidden="true"
        />
        <span>{{ exchangeRateLabel }}</span>
      </div>

      <!-- Fee + Date row -->
      <div class="xfer-form__fields">
        <div class="xfer-form__field">
          <label for="fee-amount">Комиссия</label>
          <div class="xfer-flow__amount-row">
            <UiInputNumber
              id="fee-amount"
              v-model="feeAmount"
              mode="decimal"
              :min-fraction-digits="2"
              :max-fraction-digits="2"
              :min="0"
              placeholder="0.00"
              :disabled="props.readonly"
            />
            <span class="xfer-flow__currency">{{ fromCurrencySymbol || fromCurrency }}</span>
          </div>
        </div>

        <div class="xfer-form__field">
          <label for="transfer-date">Дата</label>
          <UiDatePicker
            id="transfer-date"
            v-model="date"
            date-format="dd.mm.yy"
            :show-icon="true"
            :select-other-months="true"
            :max-date="today"
            :disabled="props.readonly"
            class="w-full"
          />
        </div>
      </div>

      <!-- Description -->
      <div class="xfer-form__field xfer-form__field--full">
        <label for="transfer-description">Заметка</label>
        <UiInputText
          id="transfer-description"
          v-model="description"
          placeholder="Например: перевод между счетами"
          :disabled="props.readonly"
          class="w-full"
        />
      </div>

      <!-- Footer -->
      <footer class="xfer-form__footer">
        <div class="xfer-form__footer-left">
          <UiButton
            v-if="isEditMode"
            type="button"
            label="Удалить"
            icon="pi pi-trash"
            variant="danger"
            :loading="isDeleting"
            :disabled="props.readonly || isSubmitting"
            @click="handleDelete"
          />
        </div>
        <div class="xfer-form__footer-right">
          <UiButton
            type="button"
            label="Отмена"
            variant="secondary"
            :disabled="isSubmitting || isDeleting"
            @click="emit('update:visible', false)"
          />
          <UiButton
            type="submit"
            :label="isEditMode ? 'Обновить' : 'Сохранить'"
            icon="pi pi-check"
            :disabled="props.readonly || submitDisabled || isDeleting"
            :loading="isSubmitting"
          />
        </div>
      </footer>
    </form>
  </UiDialog>
</template>

<style scoped>
.transfer-dialog {
  width: 540px;
  max-width: 95vw;
}

.transfer-dialog :deep(.p-dialog-header) {
  display: none;
}

.transfer-dialog :deep(.p-dialog-content) {
  overflow: hidden auto;
  padding: 0;
}

.xfer-form {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);

  padding: var(--ft-space-6, 1.5rem);

  background: var(--ft-surface-raised);
}

/* --- Header --- */
.xfer-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.xfer-form__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: 700;
  color: var(--ft-text-primary);
}

.xfer-form__close {
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

.xfer-form__close:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

/* --- Transfer flow --- */
.xfer-flow {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.xfer-flow__block {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);

  padding: var(--ft-space-4);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
}

.xfer-flow__label {
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.xfer-flow__amount-row {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  min-width: 0;
}

.xfer-flow__amount-row :deep(.ui-input-number__root),
.xfer-flow__amount-row :deep(.p-inputnumber) {
  flex: 1;
  min-width: 0;
}

.xfer-flow__amount-row :deep(.ui-input-number__input),
.xfer-flow__amount-row :deep(.p-inputnumber-input) {
  width: 100%;
  min-width: 0;
}

.xfer-flow__currency {
  padding: 0.35rem 0.6rem;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  white-space: nowrap;

  background: var(--ft-surface-raised);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

/* --- Arrow divider --- */
.xfer-flow__divider {
  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;

  height: 36px;
}

.xfer-flow__divider::before {
  content: '';

  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);

  width: 2px;

  background: var(--ft-border-soft);
}

.xfer-flow__arrow {
  position: relative;
  z-index: var(--ft-z-above);

  display: flex;
  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;

  font-size: var(--ft-text-sm);
  color: var(--ft-primary-400);

  background: var(--ft-surface-raised);
  border: 2px solid var(--ft-border-default);
  border-radius: 50%;
}

/* --- Rate badge --- */
.xfer-form__rate {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
  align-self: flex-start;

  padding: 0.4rem 0.75rem;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.xfer-form__rate i {
  color: var(--ft-primary-400);
}

/* --- Fields grid --- */
.xfer-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ft-space-4);
}

.xfer-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  min-width: 0;
}

.xfer-form__field--full {
  grid-column: 1 / -1;
}

.xfer-form__field label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
}

.xfer-form__option-line {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;

  width: 100%;
}

.xfer-form__option-name {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.xfer-form__option-currency {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

/* --- Footer --- */
.xfer-form__footer {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.xfer-form__footer-left,
.xfer-form__footer-right {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

@media (width <= 640px) {
  .xfer-form {
    padding: var(--ft-space-4);
  }

  .xfer-form__fields {
    grid-template-columns: 1fr;
  }

  .xfer-form__footer {
    flex-direction: column;
    gap: var(--ft-space-3);
  }

  .xfer-form__footer-left,
  .xfer-form__footer-right {
    flex-direction: column;
    width: 100%;
  }

  .xfer-form__footer-right {
    flex-direction: column-reverse;
  }

  .xfer-form__footer :deep(.p-button) {
    width: 100%;
  }
}
</style>
