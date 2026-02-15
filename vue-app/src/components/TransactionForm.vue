<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFinanceStore } from '../stores/finance.ts';
import type { Account, Category, NewTransactionPayload, UpdateTransactionPayload, Transaction, TransactionType } from '../types.ts';
import { VALIDATION_RULES } from '../constants';
import { TRANSACTION_TYPE } from '../types.ts';
import { useFormModal } from '../composables/useFormModal';
import { validators } from '../services/validation.service';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { parseUtcDateOnlyToLocalDate, toUtcDateOnlyIso } from '../utils/dateOnly';

// PrimeVue Components
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import UiButton from '../ui/UiButton.vue';

const store = useFinanceStore();
const confirm = useConfirm();
const toast = useToast();

const props = defineProps<{
  visible: boolean;
  transaction?: Transaction | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>();

const isEditMode = computed(() => !!props.transaction);

// --- Form state ---
const transactionType = ref<TransactionType>(TRANSACTION_TYPE.Expense); // Default to Expense
const selectedAccount = ref<Account | null>(null);
const amount = ref<number | null>(null);
const description = ref<string>('');
const today = new Date();
const date = ref<Date>(new Date());
const isMandatory = ref<boolean>(false);
const selectedCategory = ref<Category | null>(null);
const isDeleting = ref(false);

const transactionTypeOptions = [
  { label: 'Расход', value: TRANSACTION_TYPE.Expense },
  { label: 'Доход', value: TRANSACTION_TYPE.Income },
];

// --- Computed helpers ---
const filteredCategories = computed(() =>
  transactionType.value
    ? store.categories.filter(cat => cat.type === transactionType.value)
    : []
);

const isIncome = computed(() => transactionType.value === TRANSACTION_TYPE.Income);

// --- Flow logic ---

const ensureTransactionType = () => {
  if (isEditMode.value) return;

  const current = transactionType.value ?? TRANSACTION_TYPE.Expense;
  const hasCurrentType = store.categories.some(category => category.type === current);
  if (hasCurrentType) {
    transactionType.value = current;
    return;
  }

  const fallback = store.categories[0]?.type ?? TRANSACTION_TYPE.Expense;
  transactionType.value = fallback;
};

const ensureCategorySelection = () => {
  if (isEditMode.value) return;

  if (!transactionType.value) {
    selectedCategory.value = null;
    return;
  }

  const categoriesForType = filteredCategories.value;
  if (!categoriesForType.length) {
    selectedCategory.value = null;
    return;
  }

  if (!selectedCategory.value || selectedCategory.value.type !== transactionType.value) {
    const [firstCategory] = categoriesForType;
    selectedCategory.value = firstCategory ?? null;
  }
};

const syncMandatoryWithCategory = () => {
  if (isEditMode.value) return;

  if (transactionType.value === TRANSACTION_TYPE.Income) {
    isMandatory.value = false;
    return;
  }

  isMandatory.value = selectedCategory.value?.isMandatory ?? false;
};

// When transaction type changes, reset category to first available in new type
watch(transactionType, (newType) => {
  if (!isEditMode.value) {
    ensureCategorySelection();
    syncMandatoryWithCategory();
    return;
  }

  if (newType === TRANSACTION_TYPE.Income) {
    isMandatory.value = false;
  }
});

watch(selectedCategory, () => {
  syncMandatoryWithCategory();
});

// Initialise defaults when the modal opens
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (isEditMode.value && props.transaction) {
      // Edit mode: populate with existing transaction data
      const txn = props.transaction;
      selectedAccount.value = txn.account || store.accounts.find(a => a.id === txn.accountId) || null;
      selectedCategory.value = txn.category || store.categories.find(c => c.id === txn.categoryId) || null;
      transactionType.value = selectedCategory.value?.type ?? txn.type ?? TRANSACTION_TYPE.Expense;
      amount.value = Math.abs(Number(txn.amount));
      description.value = txn.description || '';
      date.value = parseUtcDateOnlyToLocalDate(txn.occurredAt) ?? new Date(txn.occurredAt);
      isMandatory.value = txn.isMandatory;
      ensureTransactionType();
      ensureCategorySelection();
    } else {
      // Create mode: use defaults
      transactionType.value = TRANSACTION_TYPE.Expense; // Default to Expense
      selectedAccount.value = store.primaryAccount || store.accounts[0] || null;

      selectedCategory.value = null;
      date.value = new Date();
      amount.value = null;
      description.value = '';
      isMandatory.value = false;
      ensureTransactionType();
      ensureCategorySelection();
      syncMandatoryWithCategory();
    }
  }
});

watch(
  () => store.accounts,
  accounts => {
    if (!selectedAccount.value && accounts.length) {
      selectedAccount.value = store.primaryAccount || accounts[0] || null;
    }
  }
);

// Validate amount and format currency helpers
const currencyCode = computed(
  () => selectedAccount.value?.currency?.code ?? selectedAccount.value?.currencyCode ?? 'KZT'
);
const currencySymbol = computed(() => selectedAccount.value?.currency?.symbol ?? '');
const isAmountValid = computed(() => validators.isAmountValid(amount.value));
const submitDisabled = computed(() => !transactionType.value || !isAmountValid.value || !selectedCategory.value || !selectedAccount.value);

// --- Submit handler ---
const { isSubmitting, handleSubmit: handleFormSubmit, showWarning } = useFormModal(
  async () => {
    if (isEditMode.value && props.transaction) {
      // Update existing transaction
      const payload: UpdateTransactionPayload = {
        id: props.transaction.id,
        type: transactionType.value!,
        accountId: selectedAccount.value!.id,
        categoryId: selectedCategory.value!.id,
        amount: amount.value!,
        occurredAt: toUtcDateOnlyIso(date.value),
        description: description.value ? description.value.trim() : null,
        isMandatory: isMandatory.value,
      };

      return await store.updateTransaction(payload);
    } else {
      // Create new transaction
      const payload: NewTransactionPayload = {
        type: transactionType.value!,
        accountId: selectedAccount.value!.id,
        categoryId: selectedCategory.value!.id,
        amount: amount.value!,
        occurredAt: toUtcDateOnlyIso(date.value),
        description: description.value ? description.value.trim() : null,
        isMandatory: isMandatory.value,
      };

      return await store.addTransaction(payload);
    }
  },
  {
    successMessage: isEditMode.value ? 'Транзакция обновлена успешно.' : 'Транзакция добавлена успешно.',
    errorMessage: isEditMode.value ? 'Не удалось обновить транзакцию.' : 'Не удалось сохранить транзакцию.',
  }
);

const submitTransaction = async (addAnother = false) => {
  if (props.readonly) {
    showWarning('Редактирование недоступно в режиме просмотра.');
    return;
  }

  if (!transactionType.value || !isAmountValid.value || !selectedAccount.value || !selectedCategory.value) {
    showWarning('Выберите тип, счет, категорию и сумму перед сохранением.');
    return;
  }

  const success = await handleFormSubmit();
  if (success) {
    // Persist the most recently used category (only in create mode)
    if (!isEditMode.value && selectedCategory.value) {
      localStorage.setItem('lastUsedCategoryId', selectedCategory.value.id);
    }

    if (addAnother) {
      // Reset form for next transaction, but keep type, account, category
      const keepAccount = selectedAccount.value;
      const keepCategory = selectedCategory.value;
      const keepType = transactionType.value;

      amount.value = null;
      description.value = '';
      date.value = new Date();
      isMandatory.value = false;

      // Restore preserved values
      selectedAccount.value = keepAccount;
      selectedCategory.value = keepCategory;
      transactionType.value = keepType;
      syncMandatoryWithCategory();
    } else {
      emit('update:visible', false);
    }
  }
};

const handleDelete = () => {
  if (props.readonly) return;
  if (!props.transaction) return;

  confirm.require({
    message: 'Удалить эту транзакцию? Её можно будет восстановить только вручную.',
    header: 'Подтверждение удаления',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    acceptClass: 'p-button-danger',
    accept: async () => {
      isDeleting.value = true;
      const success = await store.deleteTransaction(props.transaction!.id);
      isDeleting.value = false;

      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Транзакция удалена' : 'Не удалось удалить',
        detail: success
          ? 'Транзакция больше не отображается в списке.'
          : 'Пожалуйста, попробуйте еще раз.',
        life: 3000
      });

      if (success) {
        emit('update:visible', false);
      }
    }
  });
};

const handleFormSubmitEvent = async (event?: SubmitEvent) => {
  event?.preventDefault();
  await submitTransaction(false);
};

onMounted(() => {
  ensureTransactionType();
  ensureCategorySelection();
  syncMandatoryWithCategory();
});

watch(
  () => store.categories,
  () => {
    ensureTransactionType();
    ensureCategorySelection();
    syncMandatoryWithCategory();
  },
  { immediate: true }
);

watch(filteredCategories, () => {
  ensureCategorySelection();
  syncMandatoryWithCategory();
});
</script>

<template>
  <Dialog
    :visible="props.visible"
    :modal="true"
    class="txn-dialog"
    :closable="false"
    :dismissable-mask="true"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="isEditMode ? 'txn-dialog-title-edit' : 'txn-dialog-title-new'"
    @update:visible="val => emit('update:visible', val)"
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
          :id="isEditMode ? 'txn-dialog-title-edit' : 'txn-dialog-title-new'"
          class="txn-form__title"
        >
          {{ isEditMode ? 'Редактирование' : 'Новая транзакция' }}
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

      <!-- Type toggle (create mode only) -->
      <div
        v-if="!isEditMode"
        class="txn-form__type"
      >
        <SelectButton
          v-model="transactionType"
          :options="transactionTypeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          :disabled="props.readonly"
          class="w-full"
        />
      </div>

      <!-- Hero amount -->
      <div class="txn-form__amount">
        <div class="txn-form__amount-row">
          <InputNumber
            id="amount"
            v-model="amount"
            mode="decimal"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :min="VALIDATION_RULES.minAmount"
            autofocus
            placeholder="0.00"
            required
            :disabled="props.readonly"
            class="txn-form__amount-input"
            :class="{ 'p-invalid': !isAmountValid && amount !== null }"
          />
          <span class="txn-form__currency">{{ currencySymbol || currencyCode }}</span>
        </div>
        <small
          v-if="!isAmountValid && amount !== null"
          class="txn-form__error"
        >
          Сумма от {{ VALIDATION_RULES.minAmount }} до {{ VALIDATION_RULES.maxAmount }}
        </small>
      </div>

      <!-- Fields grid -->
      <div class="txn-form__fields">
        <div class="txn-form__field">
          <label for="category">Категория</label>
          <Select
            id="category"
            v-model="selectedCategory"
            :options="filteredCategories"
            option-label="name"
            placeholder="Выберите категорию"
            required
            :disabled="props.readonly"
            class="w-full"
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
        </div>

        <div class="txn-form__field">
          <label for="account">Счёт</label>
          <Select
            id="account"
            v-model="selectedAccount"
            :options="store.accounts"
            option-label="name"
            placeholder="Выберите счёт"
            required
            :disabled="props.readonly"
            class="w-full"
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
        </div>

        <div class="txn-form__field">
          <label for="date">Дата</label>
          <DatePicker
            id="date"
            v-model="date"
            date-format="dd.mm.yy"
            :show-icon="true"
            :select-other-months="true"
            :max-date="today"
            required
            :disabled="props.readonly"
            class="w-full"
          />
        </div>

        <div
          v-if="!isIncome"
          class="txn-form__field txn-form__field--checkbox"
        >
          <label class="txn-form__field-label-spacer">Тип расхода</label>
          <label
            for="isMandatory"
            class="txn-form__checkbox-label"
          >
            <Checkbox
              id="isMandatory"
              v-model="isMandatory"
              binary
              :disabled="props.readonly"
            />
            <span
              v-tooltip.bottom="'Расходы, которые нельзя избежать: аренда, коммуналка, кредиты. Влияет на расчёт финансовой устойчивости.'"
              style="cursor: help"
            >
              Обязательный расход
            </span>
          </label>
        </div>

        <div class="txn-form__field txn-form__field--full">
          <label for="description">Заметка</label>
          <InputText
            id="description"
            v-model="description"
            :placeholder="isIncome ? 'Например: зарплата' : 'Например: утренний кофе'"
            :disabled="props.readonly"
            class="w-full"
          />
        </div>
      </div>

      <!-- Footer actions -->
      <footer class="txn-form__footer">
        <div class="txn-form__footer-left">
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
        <div class="txn-form__footer-right">
          <button
            v-if="!isEditMode"
            type="button"
            class="txn-form__add-another"
            :disabled="props.readonly || submitDisabled || isSubmitting"
            @click="submitTransaction(true)"
          >
            Сохранить и добавить ещё
          </button>
          <UiButton
            type="button"
            label="Отмена"
            variant="secondary"
            :disabled="isDeleting"
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
  </Dialog>
</template>

<style scoped>
.txn-dialog {
  width: 540px;
  max-width: 95vw;
}

.txn-dialog :deep(.p-dialog-header) {
  display: none;
}

.txn-dialog :deep(.p-dialog-content) {
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0;
}

.txn-form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);
  padding: var(--ft-space-6, 1.5rem);
  background: var(--ft-surface-raised);
}

/* --- Header --- */
.txn-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.txn-form__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: 700;
  color: var(--ft-text-primary);
}

.txn-form__close {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 36px;
  height: 36px;
  padding: 0;

  color: var(--ft-text-tertiary);

  background: none;
  border: none;
  border-radius: var(--ft-radius-md);

  transition: color 0.15s, background-color 0.15s;
}

.txn-form__close:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

/* --- Type toggle --- */
.txn-form__type {
  display: flex;
  justify-content: center;
}

/* --- Hero amount --- */
.txn-form__amount {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  align-items: center;
}

.txn-form__amount-row {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: center;
}

.txn-form__amount-input :deep(.p-inputnumber-input.p-inputtext) {
  font-size: var(--ft-text-3xl);
  font-weight: 700;
  text-align: center;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid var(--ft-border-default, var(--ft-border-soft));
  border-radius: 0;
  box-shadow: none;
}

.txn-form__amount-input :deep(.p-inputnumber-input.p-inputtext:focus) {
  border-color: transparent;
  border-bottom-color: var(--ft-primary-400);
  box-shadow: none;
}

.txn-form__amount-input :deep(.p-inputnumber) {
  border: none;
  background: transparent;
  box-shadow: none;
}

.txn-form__amount-input :deep(.p-inputnumber:focus-within) {
  border-color: transparent;
  box-shadow: none;
}

.txn-form__currency {
  padding: 0.35rem 0.65rem;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.txn-form__error {
  font-size: var(--ft-text-xs);
  color: var(--ft-danger-400);
}

/* --- Fields grid --- */
.txn-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ft-space-4);
}

.txn-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.txn-form__field--full {
  grid-column: 1 / -1;
}

.txn-form__field--checkbox {
  justify-content: flex-end;
}

.txn-form__field label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
}

.txn-form__checkbox-label {
  cursor: pointer;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  min-height: 44px;
  padding: 0 var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: 500;
  color: var(--ft-text-primary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);

  transition: border-color 0.15s;
}

.txn-form__checkbox-label:hover {
  border-color: var(--ft-primary-400);
}

.txn-form__cat-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.txn-form__option-line {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.txn-form__option-name {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.txn-form__option-name i {
  color: var(--ft-accent);
}

.txn-form__option-currency {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

/* --- Footer --- */
.txn-form__footer {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.txn-form__footer-left {
  display: flex;
  gap: var(--ft-space-2);
}

.txn-form__footer-right {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.txn-form__add-another {
  cursor: pointer;

  padding: 0;

  font-size: var(--ft-text-sm);
  font-weight: 500;
  color: var(--ft-primary-400);
  text-decoration: none;

  background: none;
  border: none;

  transition: color 0.15s;
}

.txn-form__add-another:hover:not(:disabled) {
  text-decoration: underline;
}

.txn-form__add-another:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (width <= 640px) {
  .txn-form {
    padding: var(--ft-space-5, 1.25rem);
  }

  .txn-form__fields {
    grid-template-columns: 1fr;
  }

  .txn-form__footer {
    flex-direction: column;
    gap: var(--ft-space-3);
  }

  .txn-form__footer-left,
  .txn-form__footer-right {
    flex-direction: column;
    width: 100%;
  }

  .txn-form__footer-right {
    flex-direction: column-reverse;
  }

  .txn-form__footer :deep(.p-button) {
    width: 100%;
  }

  .txn-form__add-another {
    order: -1;
    padding: var(--ft-space-2);
    text-align: center;
  }
}
</style>
