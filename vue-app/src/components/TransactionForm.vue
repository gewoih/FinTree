<script setup lang="ts">
/* eslint-disable max-lines */
import { computed, ref, watch, watchEffect } from 'vue';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import UiButton from '../ui/UiButton.vue';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import type {
  CreateTransferPayload,
  NewTransactionPayload,
  Transaction,
  UpdateTransactionPayload,
  UpdateTransferPayload,
} from '../types.ts';
import { TRANSACTION_TYPE } from '../types.ts';
import { VALIDATION_RULES } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import { useTransactionFormState } from '../composables/useTransactionFormState';
import { useTransferFormState } from '../composables/useTransferFormState';
import { toUtcDateOnlyIso } from '../utils/dateOnly';

const { confirmDanger } = useConfirmDialog();
const toast = useToast();

const props = defineProps<{
  visible: boolean;
  transaction?: Transaction | null;
  transfer?: UpdateTransferPayload | null;
  defaultType?: 'Transfer';
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// ---- Transaction form state ----
const {
  store,
  isEditMode: isTxnEditMode,
  maxDate,
  transactionType,
  selectedAccount,
  selectedCategory,
  amount,
  description: txnDescription,
  date: txnDate,
  isMandatory,
  mandatoryOverridden,
  showAdvanced,
  isDeleting: isTxnDeleting,
  markTouched,
  resetTouched,
  markAllTouched,
  persistLastUsedCategory,
  applyMandatorySuggestion,
  toggleMandatory,
  handleAmountInput,
  refreshMaxDate,
  filteredCategories,
  isIncome,
  currencyCode,
  currencySymbol,
  submitDisabled: txnSubmitDisabled,
  amountError,
  categoryError,
  accountError,
  dateError,
} = useTransactionFormState(props);

// ---- Transfer form state ----
const {
  fromAccount,
  toAccount,
  fromAmount,
  toAmount,
  feeAmount,
  description: xferDescription,
  today: xferToday,
  date: xferDate,
  isDeleting: isXferDeleting,
  isEditMode: isXferEditMode,
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
  submitDisabled: xferSubmitDisabled,
} = useTransferFormState(props);

// ---- Form mode (3-tab selector) ----
type FormMode = typeof TRANSACTION_TYPE.Expense | typeof TRANSACTION_TYPE.Income | 'Transfer';

const formMode = ref<FormMode>(TRANSACTION_TYPE.Expense);

const allTypeOptions = [
  { label: 'Расход', value: TRANSACTION_TYPE.Expense },
  { label: 'Доход', value: TRANSACTION_TYPE.Income },
  { label: 'Перевод', value: 'Transfer' as const },
];

const isTransferMode = computed(() => formMode.value === 'Transfer');
const isEditMode = computed(() => isTxnEditMode.value || isXferEditMode.value);
const isDeleting = computed(() => isTxnDeleting.value || isXferDeleting.value);

const formTitle = computed(() => {
  if (isTransferMode.value) {
    return isXferEditMode.value ? 'Редактирование перевода' : 'Новый перевод';
  }
  return isTxnEditMode.value ? 'Редактирование транзакции' : 'Новая транзакция';
});

// Keep txn composable's transactionType in sync when in expense/income mode
watchEffect(() => {
  if (formMode.value !== 'Transfer') {
    transactionType.value = formMode.value as typeof TRANSACTION_TYPE.Expense | typeof TRANSACTION_TYPE.Income;
  }
});

// Set formMode when dialog opens/resets
watch(
  () => props.visible,
  visible => {
    if (visible) {
      if (props.transfer) {
        formMode.value = 'Transfer';
      } else if (props.defaultType === 'Transfer') {
        formMode.value = 'Transfer';
      } else if (props.transaction) {
        formMode.value = props.transaction.type as FormMode;
      }
    } else {
      formMode.value = TRANSACTION_TYPE.Expense;
    }
  }
);

// ---- Transaction submit ----
const { isSubmitting: isTxnSubmitting, handleSubmit: handleTxnSubmit, showWarning } = useFormModal(
  async () => {
    if (isTxnEditMode.value && props.transaction) {
      const payload: UpdateTransactionPayload = {
        id: props.transaction.id,
        type: transactionType.value,
        accountId: selectedAccount.value!.id,
        categoryId: selectedCategory.value!.id,
        amount: amount.value!,
        occurredAt: toUtcDateOnlyIso(txnDate.value),
        description: txnDescription.value ? txnDescription.value.trim() : null,
        isMandatory: isMandatory.value,
      };
      return await store.updateTransaction(payload);
    }

    const payload: NewTransactionPayload = {
      type: transactionType.value,
      accountId: selectedAccount.value!.id,
      categoryId: selectedCategory.value!.id,
      amount: amount.value!,
      occurredAt: toUtcDateOnlyIso(txnDate.value),
      description: txnDescription.value ? txnDescription.value.trim() : null,
      isMandatory: isMandatory.value,
    };
    return await store.addTransaction(payload);
  },
  {
    successMessage: isTxnEditMode.value ? 'Транзакция обновлена успешно.' : 'Транзакция добавлена успешно.',
    errorMessage: isTxnEditMode.value ? 'Не удалось обновить транзакцию.' : 'Не удалось сохранить транзакцию.',
  }
);

// ---- Transfer submit ----
const { isSubmitting: isXferSubmitting, handleSubmit: handleXferSubmit } = useFormModal(
  async () => {
    if (isXferEditMode.value && props.transfer) {
      const payload: UpdateTransferPayload = {
        transferId: props.transfer.transferId,
        fromAccountId: fromAccount.value!.id,
        toAccountId: toAccount.value!.id,
        fromAmount: fromAmount.value!,
        toAmount: resolvedToAmount.value!,
        feeAmount: feeAmount.value ?? null,
        occurredAt: toUtcDateOnlyIso(xferDate.value),
        description: xferDescription.value ? xferDescription.value.trim() : null,
      };
      return await store.updateTransfer(payload);
    }

    const payload: CreateTransferPayload = {
      fromAccountId: fromAccount.value!.id,
      toAccountId: toAccount.value!.id,
      fromAmount: fromAmount.value!,
      toAmount: resolvedToAmount.value!,
      feeAmount: feeAmount.value ?? null,
      occurredAt: toUtcDateOnlyIso(xferDate.value),
      description: xferDescription.value ? xferDescription.value.trim() : null,
    };
    return await store.createTransfer(payload);
  },
  {
    successMessage: 'Перевод сохранен.',
    errorMessage: 'Не удалось сохранить перевод.',
  }
);

const isSubmittingAny = computed(() => isTxnSubmitting.value || isXferSubmitting.value);

// ---- Submit handlers ----
const submitTransaction = async (addAnother = false) => {
  if (props.readonly) {
    showWarning('Редактирование недоступно в режиме просмотра.');
    return;
  }

  refreshMaxDate();
  markAllTouched();
  if (txnSubmitDisabled.value) {
    return;
  }

  const success = await handleTxnSubmit();
  if (!success) {
    return;
  }

  if (!isTxnEditMode.value && selectedCategory.value) {
    persistLastUsedCategory(selectedCategory.value);
  }

  if (!addAnother) {
    emit('update:visible', false);
    return;
  }

  const keepAccount = selectedAccount.value;
  const keepCategory = selectedCategory.value;
  const keepType = transactionType.value;
  const keepDate = txnDate.value;
  const keepMandatory = isMandatory.value;
  const keepMandatoryOverride = mandatoryOverridden.value;

  amount.value = null;
  txnDescription.value = '';

  selectedAccount.value = keepAccount;
  selectedCategory.value = keepCategory;
  transactionType.value = keepType;
  txnDate.value = keepDate;

  if (transactionType.value === TRANSACTION_TYPE.Income) {
    mandatoryOverridden.value = false;
    isMandatory.value = false;
  } else if (keepMandatoryOverride) {
    mandatoryOverridden.value = true;
    isMandatory.value = keepMandatory;
  } else {
    mandatoryOverridden.value = false;
    applyMandatorySuggestion();
  }

  resetTouched();
};

const submitTransfer = async () => {
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

  const success = await handleXferSubmit();
  if (success) {
    emit('update:visible', false);
  }
};

const handleFormSubmitEvent = async (event?: SubmitEvent) => {
  event?.preventDefault();
  if (isTransferMode.value) {
    await submitTransfer();
  } else {
    await submitTransaction(false);
  }
};

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value;
};

const handleDelete = () => {
  if (props.readonly) {
    return;
  }

  if (isTransferMode.value && props.transfer) {
    confirmDanger({
      message: 'Удалить этот перевод? Все связанные транзакции будут удалены.',
      header: 'Подтверждение удаления',
      acceptLabel: 'Удалить',
      onAccept: async () => {
        isXferDeleting.value = true;
        const success = await store.deleteTransfer(props.transfer!.transferId);
        isXferDeleting.value = false;

        toast.add({
          severity: success ? 'success' : 'error',
          summary: success ? 'Перевод удален' : 'Не удалось удалить',
          detail: success
            ? 'Перевод больше не отображается в списке.'
            : 'Пожалуйста, попробуйте еще раз.',
          life: 3000,
        });

        if (success) {
          emit('update:visible', false);
        }
      },
    });
    return;
  }

  if (!props.transaction) {
    return;
  }

  confirmDanger({
    message: 'Удалить эту транзакцию? Её можно будет восстановить только вручную.',
    header: 'Подтверждение удаления',
    acceptLabel: 'Удалить',
    onAccept: async () => {
      isTxnDeleting.value = true;
      const success = await store.deleteTransaction(props.transaction!.id);
      isTxnDeleting.value = false;

      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Транзакция удалена' : 'Не удалось удалить',
        detail: success
          ? 'Транзакция больше не отображается в списке.'
          : 'Пожалуйста, попробуйте еще раз.',
        life: 3000,
      });

      if (success) {
        emit('update:visible', false);
      }
    },
  });
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    :modal="true"
    class="txn-dialog"
    :closable="false"
    :dismissable-mask="true"
    append-to="body"
    role="dialog"
    aria-modal="true"
    aria-labelledby="txn-dialog-title"
    @update:visible="value => emit('update:visible', value)"
  >
    <template #header>
      <span />
    </template>

    <form
      class="txn-form"
      @submit.prevent="handleFormSubmitEvent"
    >
      <header class="txn-form__header">
        <h2
          id="txn-dialog-title"
          class="txn-form__title"
        >
          {{ formTitle }}
        </h2>

        <button
          type="button"
          class="txn-form__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>

      <section class="txn-form__type">
        <SelectButton
          v-model="formMode"
          :options="allTypeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          :disabled="props.readonly || isEditMode"
          class="ft-select-button ft-select-button--txn txn-form__type-control"
        />
      </section>

      <!-- ── TRANSACTION FIELDS (Expense / Income) ── -->
      <template v-if="!isTransferMode">
        <section class="txn-form__section txn-form__section--amount">
          <label
            for="amount"
            class="txn-form__field-label"
          >
            Сумма
          </label>

          <div class="txn-form__amount-shell">
            <InputNumber
              id="amount"
              v-model="amount"
              mode="decimal"
              :min-fraction-digits="2"
              :max-fraction-digits="2"
              :min="VALIDATION_RULES.minAmount"
              :max="VALIDATION_RULES.maxAmount"
              autofocus
              placeholder="0.00"
              required
              :disabled="props.readonly"
              class="txn-form__amount-input"
              :invalid="Boolean(amountError)"
              @input="handleAmountInput"
              @blur="markTouched('amount')"
            />

            <span class="txn-form__amount-currency">{{ currencySymbol || currencyCode }}</span>
          </div>

          <small
            v-if="amountError"
            class="txn-form__error"
          >
            {{ amountError }}
          </small>
        </section>

        <section class="txn-form__core-fields">
          <div class="txn-form__field">
            <label
              for="category"
              class="txn-form__field-label"
            >
              Категория
            </label>

            <Select
              id="category"
              v-model="selectedCategory"
              :options="filteredCategories"
              option-label="name"
              placeholder="Выберите категорию"
              append-to="body"
              required
              :disabled="props.readonly"
              class="w-full"
              :invalid="Boolean(categoryError)"
              @change="markTouched('category')"
              @blur="markTouched('category')"
            >
              <template #option="slotProps">
                <div class="txn-form__option-name">
                  <span
                    class="txn-form__cat-dot"
                    :style="{ backgroundColor: slotProps.option.color }"
                  />
                  <span>{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Select>

            <small
              v-if="categoryError"
              class="txn-form__error"
            >
              {{ categoryError }}
            </small>
          </div>

          <div class="txn-form__field">
            <label
              for="account"
              class="txn-form__field-label"
            >
              Счёт
            </label>

            <Select
              id="account"
              v-model="selectedAccount"
              :options="store.accounts"
              option-label="name"
              placeholder="Выберите счёт"
              append-to="body"
              required
              :disabled="props.readonly"
              class="w-full"
              :invalid="Boolean(accountError)"
              @change="markTouched('account')"
              @blur="markTouched('account')"
            >
              <template #option="slotProps">
                <div class="txn-form__option-line">
                  <div class="txn-form__option-name">
                    <i class="pi pi-credit-card" />
                    <span>{{ slotProps.option.name }}</span>
                  </div>
                  <span class="txn-form__option-currency">
                    {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
                  </span>
                </div>
              </template>
            </Select>

            <small
              v-if="accountError"
              class="txn-form__error"
            >
              {{ accountError }}
            </small>
          </div>
        </section>

        <section class="txn-form__quick-row">
          <div class="txn-form__field">
            <label
              for="date"
              class="txn-form__field-label"
            >
              Дата
            </label>

            <DatePicker
              id="date"
              v-model="txnDate"
              date-format="dd.mm.yy"
              :show-icon="true"
              :select-other-months="true"
              :max-date="maxDate"
              append-to="body"
              required
              :disabled="props.readonly"
              class="w-full txn-form__date-picker"
              :invalid="Boolean(dateError)"
              @update:model-value="markTouched('date')"
              @blur="markTouched('date')"
            />

            <small
              v-if="dateError"
              class="txn-form__error"
            >
              {{ dateError }}
            </small>
          </div>
        </section>

        <button
          type="button"
          class="txn-form__advanced-toggle"
          :aria-expanded="showAdvanced"
          aria-controls="txn-form-advanced"
          @click="toggleAdvanced"
        >
          <span>Дополнительно</span>
          <i
            class="pi pi-chevron-down"
            :class="{ 'is-open': showAdvanced }"
            aria-hidden="true"
          />
        </button>

        <Transition name="txn-advanced">
          <section
            v-if="showAdvanced"
            id="txn-form-advanced"
            class="txn-form__advanced-panel"
          >
            <div
              v-if="!isIncome"
              class="txn-form__field"
            >
              <div class="txn-form__field-label-row">
                <label
                  for="mandatory-toggle"
                  class="txn-form__field-label"
                >
                  Тип расхода
                </label>

                <span
                  v-tooltip.bottom="'Расходы, которые нельзя избежать: аренда, коммуналка, кредиты. Влияет на расчёт финансовой устойчивости.'"
                  class="txn-form__hint"
                  aria-hidden="true"
                >
                  <i class="pi pi-info-circle" />
                </span>
              </div>

              <div class="txn-form__mandatory-wrap">
                <button
                  id="mandatory-toggle"
                  type="button"
                  class="txn-form__mandatory-chip"
                  :class="{ 'is-active': isMandatory }"
                  :disabled="props.readonly"
                  :aria-pressed="isMandatory"
                  @click="toggleMandatory"
                >
                  <i
                    :class="isMandatory ? 'pi pi-check-circle' : 'pi pi-circle'"
                    aria-hidden="true"
                  />
                  <span>{{ isMandatory ? 'Обязательный расход' : 'Необязательный расход' }}</span>
                </button>
              </div>
            </div>

            <div class="txn-form__field">
              <label
                for="txn-description"
                class="txn-form__field-label"
              >
                Заметка
              </label>

              <InputText
                id="txn-description"
                v-model="txnDescription"
                :placeholder="isIncome ? 'Например: зарплата' : 'Например: утренний кофе'"
                :disabled="props.readonly"
                class="w-full"
              />
            </div>
          </section>
        </Transition>
      </template>

      <!-- ── TRANSFER FIELDS ── -->
      <template v-else>
        <div class="xfer-flow">
          <!-- From block -->
          <div class="xfer-flow__block">
            <span class="xfer-flow__label">Откуда</span>
            <Select
              id="from-account"
              v-model="fromAccount"
              :options="store.accounts"
              option-label="name"
              placeholder="Выберите счёт"
              append-to="body"
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
            </Select>
            <div class="xfer-flow__amount-row">
              <InputNumber
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
            <Select
              id="to-account"
              v-model="toAccount"
              :options="store.accounts.filter(acc => acc.id !== fromAccount?.id)"
              option-label="name"
              placeholder="Выберите счёт"
              append-to="body"
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
            </Select>
            <div
              v-if="!isSameCurrency"
              class="xfer-flow__amount-row"
            >
              <InputNumber
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
              <span class="xfer-flow__currency">{{ fromCurrencySymbol || fromCurrency }}</span>
            </div>
          </div>

          <div class="xfer-form__field">
            <label for="transfer-date">Дата</label>
            <DatePicker
              id="transfer-date"
              v-model="xferDate"
              date-format="dd.mm.yy"
              :show-icon="true"
              :select-other-months="true"
              :max-date="xferToday"
              append-to="body"
              :disabled="props.readonly"
              class="w-full"
            />
          </div>
        </div>

        <!-- Note -->
        <div class="xfer-form__field xfer-form__field--full">
          <label for="xfer-description">Заметка</label>
          <InputText
            id="xfer-description"
            v-model="xferDescription"
            placeholder="Например: перевод между счетами"
            :disabled="props.readonly"
            class="w-full"
          />
        </div>
      </template>

      <!-- ── FOOTER ── -->
      <footer class="txn-form__footer">
        <div class="txn-form__footer-left">
          <UiButton
            v-if="isEditMode"
            type="button"
            label="Удалить"
            icon="pi pi-trash"
            variant="danger"
            :loading="isDeleting"
            :disabled="props.readonly || isSubmittingAny"
            @click="handleDelete"
          />
        </div>

        <div class="txn-form__footer-right">
          <button
            v-if="!isTransferMode && !isTxnEditMode"
            type="button"
            class="txn-form__add-another"
            :disabled="props.readonly || txnSubmitDisabled || isTxnSubmitting"
            @click="submitTransaction(true)"
          >
            Сохранить и добавить ещё
          </button>

          <UiButton
            type="button"
            label="Отмена"
            variant="secondary"
            :disabled="isDeleting || isSubmittingAny"
            @click="emit('update:visible', false)"
          />

          <UiButton
            type="submit"
            :label="isEditMode ? 'Обновить' : 'Сохранить'"
            icon="pi pi-check"
            :disabled="props.readonly || (isTransferMode ? xferSubmitDisabled : txnSubmitDisabled) || isDeleting"
            :loading="isTransferMode ? isXferSubmitting : isTxnSubmitting"
          />
        </div>
      </footer>
    </form>
  </Dialog>
</template>

<style src="../styles/components/transaction-form.css"></style>
<style src="../styles/components/transfer-form-modal.css"></style>
