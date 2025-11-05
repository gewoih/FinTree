<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFinanceStore } from '../stores/finance.ts';
import type { Account, Category, NewTransactionPayload, UpdateTransactionPayload, Transaction, TransactionType } from '../types.ts';
import { VALIDATION_RULES } from '../constants';
import { TRANSACTION_TYPE } from '../types.ts';
import { useFormModal } from '../composables/useFormModal';
import { validators } from '../services/validation.service';

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

const props = defineProps<{
  visible: boolean;
  transaction?: Transaction | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>();

const isEditMode = computed(() => !!props.transaction);

// --- Form state ---
const transactionType = ref<TransactionType | null>(null);
const selectedAccount = ref<Account | null>(null);
const amount = ref<number | null>(null);
const description = ref<string>('');
const date = ref<Date>(new Date());
const isMandatory = ref<boolean>(false);
const selectedCategory = ref<Category | null>(null);

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

const sortedCategories = computed(() =>
  [...filteredCategories.value].sort((a, b) => a.name.localeCompare(b.name))
);

const isIncome = computed(() => transactionType.value === TRANSACTION_TYPE.Income);

// --- Flow logic ---

const ensureTransactionType = () => {
  if (isEditMode.value) return;
  if (!transactionType.value) return;

  const hasCurrentType = store.categories.some(category => category.type === transactionType.value);
  if (!hasCurrentType) {
    transactionType.value = null;
  }
};

const ensureCategorySelection = () => {
  if (isEditMode.value) return;

  if (!transactionType.value) {
    selectedCategory.value = null;
    return;
  }

  const categoriesForType = sortedCategories.value;
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
      date.value = new Date(txn.occurredAt);
      isMandatory.value = txn.isMandatory;
      ensureTransactionType();
      ensureCategorySelection();
    } else {
      // Create mode: use defaults
      transactionType.value = null;
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
        occurredAt: date.value.toISOString(),
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
        occurredAt: date.value.toISOString(),
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

const handleSubmit = async () => {
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
    emit('update:visible', false);
  }
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
      :dismissableMask="true"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="isEditMode ? 'transaction-dialog-title-edit' : 'transaction-dialog-title-new'"
      @update:visible="val => emit('update:visible', val)"
  >
    <template #header>
      <h2 :id="isEditMode ? 'transaction-dialog-title-edit' : 'transaction-dialog-title-new'" class="dialog-title">
        {{ isEditMode ? 'Редактировать транзакцию' : 'Новая транзакция' }}
      </h2>
    </template>

    <form class="transaction-form" @submit.prevent="handleSubmit">
      <section class="form-fields">
        <div class="field" v-if="!isEditMode">
          <label for="transaction-type">Тип транзакции *</label>
          <SelectButton
              id="transaction-type"
              v-model="transactionType"
              :options="transactionTypeOptions"
              optionLabel="label"
              optionValue="value"
              :allowEmpty="false"
              class="w-full"
          />
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
              class="w-full"
          >
            <template #option="slotProps">
              <div class="option-line">
                <div class="option-name">
                  <i class="pi pi-credit-card"></i>
                  <span>{{ slotProps.option.name }}</span>
                </div>
                <span class="option-currency">
                  {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
                </span>
              </div>
            </template>
          </Select>
          <small>{{ isIncome ? 'Средства будут зачислены на выбранный счет.' : 'Средства будут сняты с выбранного счета.' }}</small>
        </div>

        <div class="field">
          <label for="category">Категория *</label>
          <Select
              id="category"
              v-model="selectedCategory"
              :options="sortedCategories"
              option-label="name"
              placeholder="Выберите категорию"
              required
              class="w-full"
          >
            <template #option="slotProps">
              <div class="option-name">
                <span class="category-dot" :style="{ backgroundColor: slotProps.option.color }"></span>
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </Select>
          <small>Первая категория в списке используется по умолчанию.</small>
        </div>

        <div class="field">
          <label for="amount">Сумма *</label>
          <div class="amount-input">
            <InputNumber
                id="amount"
                v-model="amount"
                mode="decimal"
                :minFractionDigits="2"
                :maxFractionDigits="2"
                :min="VALIDATION_RULES.minAmount"
                autofocus
                placeholder="0.00"
                required
                :class="{ 'p-invalid': !isAmountValid }"
            />
            <span class="currency-chip ft-pill">{{ currencySymbol || currencyCode }}</span>
          </div>
          <small v-if="!isAmountValid && amount !== null" class="error-text">
            Сумма должна быть между {{ VALIDATION_RULES.minAmount }} и {{ VALIDATION_RULES.maxAmount }}
          </small>
      </div>

      <div class="field">
        <label for="date">Дата транзакции</label>
          <DatePicker
              id="date"
              v-model="date"
              dateFormat="dd.mm.yy"
              :showIcon="true"
              required
              class="w-full"
          />
          <small>По умолчанию сегодня.</small>
      </div>

      <div class="field" v-if="!isIncome">
        <label for="isMandatory">Повторяющийся расход</label>
        <Checkbox id="isMandatory" v-model="isMandatory" binary />
      </div>

      <div class="field full">
        <label for="description">Заметка</label>
        <InputText
            id="description"
            v-model="description"
            :placeholder="isIncome ? 'Например: зарплата' : 'Например: утренний кофе'"
            class="w-full"
        />
      </div>
      </section>

      <footer class="form-actions">
        <Button
            type="button"
            label="Отмена"
            icon="pi pi-times"
            severity="secondary"
            outlined
            @click="emit('update:visible', false)"
        />
        <Button
            type="submit"
            :label="isEditMode ? 'Обновить транзакцию' : 'Сохранить транзакцию'"
            icon="pi pi-check"
            :disabled="submitDisabled"
            :loading="isSubmitting"
        />
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(1rem, 1.4vw, 1.35rem) clamp(1rem, 1.4vw, 1.5rem);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field.full {
  grid-column: 1 / -1;
}

.field label {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--ft-heading);
}

.field small {
  color: var(--ft-text-muted);
  font-size: 0.85rem;
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
  justify-content: flex-end;
  gap: 0.9rem;
}

@media (max-width: 640px) {
  .transaction-form {
    padding: 1.5rem;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions :deep(.p-button) {
    width: 100%;
  }
}
</style>
