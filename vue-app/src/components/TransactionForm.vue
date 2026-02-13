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
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

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

// When transaction type changes, reset category to first available in new type
watch(transactionType, (newType) => {
  if (!isEditMode.value) {
    ensureCategorySelection();
  }

  if (newType === TRANSACTION_TYPE.Income) {
    isMandatory.value = false;
  }
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
});

watch(
  () => store.categories,
  () => {
    ensureTransactionType();
    ensureCategorySelection();
  },
  { immediate: true }
);

watch(filteredCategories, () => {
  ensureCategorySelection();
});
</script>

<template>
  <Dialog
    :visible="props.visible"
    :modal="true"
    :style="{ width: '620px' }"
    class="transaction-dialog"
    :closable="true"
    :dismissable-mask="true"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="isEditMode ? 'transaction-dialog-title-edit' : 'transaction-dialog-title-new'"
    @update:visible="val => emit('update:visible', val)"
  >
    <template #header>
      <h2
        :id="isEditMode ? 'transaction-dialog-title-edit' : 'transaction-dialog-title-new'"
        class="dialog-title"
      >
        {{ isEditMode ? 'Редактирование' : 'Новая транзакция' }}
      </h2>
    </template>

    <form
      class="transaction-form"
      @submit.prevent="handleFormSubmitEvent"
    >
      <section class="form-fields">
        <!-- Type selector - only in create mode -->
        <div
          v-if="!isEditMode"
          class="field field--type"
        >
          <label
            for="transaction-type"
            class="sr-only"
          >Тип</label>
          <SelectButton
            id="transaction-type"
            v-model="transactionType"
            :options="transactionTypeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            :disabled="props.readonly"
            class="w-full"
          />
        </div>

        <!-- Row 1: Amount + Currency -->
        <div class="field field--amount">
          <label for="amount">Сумма *</label>
          <div class="amount-input">
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
              :class="{ 'p-invalid': !isAmountValid }"
            />
            <span class="currency-chip">{{ currencySymbol || currencyCode }}</span>
          </div>
          <small
            v-if="!isAmountValid && amount !== null"
            class="error-text"
          >
            Сумма от {{ VALIDATION_RULES.minAmount }} до {{ VALIDATION_RULES.maxAmount }}
          </small>
        </div>

        <!-- Row 2: Category + Account -->
        <div class="field">
          <label for="category">Категория *</label>
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
              <div class="option-name">
                <span
                  class="category-dot"
                  :style="{ backgroundColor: slotProps.option.color }"
                />
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </Select>
        </div>

        <div class="field">
          <label for="account">Счет *</label>
          <Select
            id="account"
            v-model="selectedAccount"
            :options="store.accounts"
            option-label="name"
            placeholder="Выберите счет"
            required
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

        <!-- Row 3: Date + Mandatory checkbox (optional) -->
        <div class="field">
          <label for="date">Дата</label>
          <DatePicker
            id="date"
            v-model="date"
            date-format="dd.mm.yy"
            :show-icon="true"
            required
            :disabled="props.readonly"
            class="w-full"
          />
        </div>

        <div
          v-if="!isIncome"
          class="field field--checkbox"
        >
          <label
            for="isMandatory"
            class="checkbox-label"
          >
            <Checkbox
              id="isMandatory"
              v-model="isMandatory"
              binary
              :disabled="props.readonly"
            />
            <span>Обязательный расход</span>
          </label>
        </div>

        <!-- Row 4: Description (full width) -->
        <div class="field field--full">
          <label for="description">Заметка</label>
          <InputText
            id="description"
            v-model="description"
            :placeholder="isIncome ? 'Например: зарплата' : 'Например: утренний кофе'"
            :disabled="props.readonly"
            class="w-full"
          />
        </div>
      </section>

      <footer class="form-actions">
        <div class="action-secondary">
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
          <Button
            type="button"
            label="Отмена"
            icon="pi pi-times"
            severity="secondary"
            outlined
            :disabled="isDeleting"
            @click="emit('update:visible', false)"
          />
        </div>
        <div class="action-buttons">
          <Button
            v-if="!isEditMode"
            type="button"
            label="Сохранить и добавить еще"
            icon="pi pi-plus"
            severity="secondary"
            :disabled="props.readonly || submitDisabled"
            :loading="isSubmitting"
            @click="submitTransaction(true)"
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
.transaction-dialog :deep(.p-dialog-content) {
  padding: 0;
  border-radius: var(--ft-radius-xl);
  overflow: hidden;
}

.transaction-dialog :deep(.p-dialog-header) {
  display: none;
}

.transaction-form {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2vw, 2.1rem);
  padding: clamp(1.8rem, 2.2vw, 2.3rem);
  background: var(--ft-surface-elevated);
}

.form-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ft-space-5) var(--ft-space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.field--type {
  grid-column: 1 / -1;
  margin-bottom: var(--ft-space-2);
}

.field--amount {
  grid-column: 1 / -1;
}

.field--full {
  grid-column: 1 / -1;
}

.field--checkbox {
  display: flex;
  align-items: flex-end;
  padding-bottom: var(--ft-space-1);
}

.field label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ft-heading);
}

.field small {
  color: var(--ft-text-muted);
  font-size: 0.8rem;
  margin-top: var(--ft-space-1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  cursor: pointer;
  font-weight: 500 !important;
  font-size: 0.9rem !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.amount-input {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.amount-input :deep(.p-inputnumber) {
  flex: 1;
}

.currency-chip {
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.24);
}

.option-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.option-name {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.option-name i {
  color: var(--ft-accent);
}

.option-currency {
  font-size: 0.85rem;
  color: var(--ft-text-muted);
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.error-text {
  color: #dc2626;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.9rem;
}

.action-secondary {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

@media (max-width: 640px) {
  .transaction-form {
    padding: 1.5rem;
  }

  .form-fields {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .action-secondary {
    width: 100%;
    flex-direction: column;
  }

  .action-buttons {
    width: 100%;
    flex-direction: column-reverse;
  }

  .form-actions :deep(.p-button) {
    width: 100%;
  }
}
</style>
