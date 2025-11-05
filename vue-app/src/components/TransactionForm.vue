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

const emit = defineEmits(['update:visible']);

const isEditMode = computed(() => !!props.transaction);

// --- Form state ---
const transactionType = ref<TransactionType | null>(null);
const selectedAccount = ref<Account | null>(null);
const amount = ref<number | null>(null);
const description = ref<string>('');
const date = ref<Date>(new Date());
const isMandatory = ref<boolean>(false);
const selectedCategory = ref<Category | null>(null);
const attemptedSubmit = ref(false);

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
    attemptedSubmit.value = false;
  } else {
    attemptedSubmit.value = false;
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
const isFormValid = computed(() => !submitDisabled.value);
const typeError = computed(() => {
  if (isEditMode.value || !attemptedSubmit.value) return null;
  return transactionType.value ? null : 'Выберите тип транзакции.';
});
const accountError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return selectedAccount.value ? null : 'Выберите счёт.';
});
const categoryError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return selectedCategory.value ? null : 'Выберите категорию.';
});
const amountError = computed(() => {
  if (!attemptedSubmit.value) return null;
  if (amount.value === null) {
    return 'Введите сумму транзакции.';
  }
  if (!isAmountValid.value) {
    return `Сумма должна быть между ${VALIDATION_RULES.minAmount} и ${VALIDATION_RULES.maxAmount}`;
  }
  return null;
});
const currencyBadgeLabel = computed(() => currencySymbol.value || currencyCode.value);

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
  attemptedSubmit.value = true;

  if (!isFormValid.value || !transactionType.value || !selectedAccount.value || !selectedCategory.value) {
    showWarning('Проверьте обязательные поля перед сохранением.');
    return;
  }

  const success = await handleFormSubmit();
  if (success) {
    attemptedSubmit.value = false;
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
    modal
    :style="{ width: '640px' }"
    class="transaction-dialog"
    :closable="true"
    :dismissable-mask="true"
    @update:visible="val => emit('update:visible', val)"
  >
    <form class="transaction-form" @submit.prevent="handleSubmit" novalidate>
      <section class="transaction-form__grid">
        <FormField
          v-if="!isEditMode"
          class="transaction-form__field"
          label="Тип транзакции"
          :error="typeError"
          required
        >
          <template #default="{ fieldAttrs }">
            <SelectButton
              v-model="transactionType"
              :options="transactionTypeOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              class="w-full"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
            />
          </template>
        </FormField>

        <FormField
          class="transaction-form__field"
          label="Счёт"
          :error="accountError"
          required
        >
          <template #default="{ fieldAttrs }">
            <Select
              v-model="selectedAccount"
              :options="store.accounts"
              option-label="name"
              placeholder="Выберите счёт"
              class="w-full"
              :input-id="fieldAttrs.id"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
            >
              <template #option="slotProps">
                <div class="option-line">
                  <div class="option-name">
                    <i class="pi pi-credit-card" />
                    <span>{{ slotProps.option.name }}</span>
                  </div>
                  <span class="option-currency">
                    {{ slotProps.option.currency?.symbol ?? '' }}
                    {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
                  </span>
                </div>
              </template>
            </Select>
          </template>

          <template #hint>
            <span v-if="isIncome">Средства будут зачислены на выбранный счёт.</span>
            <span v-else>Средства будут списаны с выбранного счёта.</span>
          </template>
        </FormField>

        <FormField
          class="transaction-form__field"
          label="Категория"
          :error="categoryError"
          required
        >
          <template #default="{ fieldAttrs }">
            <Select
              v-model="selectedCategory"
              :options="sortedCategories"
              option-label="name"
              placeholder="Выберите категорию"
              class="w-full"
              :input-id="fieldAttrs.id"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
            >
              <template #option="slotProps">
                <div class="option-name">
                  <span class="category-dot" :style="{ backgroundColor: slotProps.option.color }" />
                  <span>{{ slotProps.option.name }}</span>
                </div>
              </template>
            </Select>
          </template>

          <template #hint>
            Первая категория в списке подставляется по умолчанию.
          </template>
        </FormField>

        <FormField
          class="transaction-form__field"
          label="Сумма"
          :error="amountError"
          required
        >
          <template #default="{ fieldAttrs }">
            <div class="transaction-form__amount">
              <InputNumber
                v-model="amount"
                mode="decimal"
                :min-fraction-digits="2"
                :max-fraction-digits="2"
                :min="VALIDATION_RULES.minAmount"
                placeholder="0.00"
                class="w-full"
                :input-id="fieldAttrs.id"
                :aria-describedby="fieldAttrs['aria-describedby']"
                :aria-invalid="fieldAttrs['aria-invalid']"
              />
              <span class="transaction-form__currency ft-pill" aria-hidden="true">
                {{ currencyBadgeLabel }}
              </span>
            </div>
          </template>

          <template #hint>
            Валюта подтягивается из выбранного счёта.
          </template>
        </FormField>

        <FormField class="transaction-form__field" label="Дата транзакции">
          <template #default="{ fieldAttrs }">
            <DatePicker
              v-model="date"
              date-format="dd.mm.yy"
              show-icon
              class="w-full"
              :input-id="fieldAttrs.id"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
            />
          </template>

          <template #hint>
            По умолчанию используется сегодняшняя дата.
          </template>
        </FormField>

        <FormField
          v-if="!isIncome"
          class="transaction-form__field transaction-form__field--inline"
          label="Обязательный расход"
          direction="horizontal"
        >
          <template #default="{ fieldAttrs }">
            <Checkbox
              v-model="isMandatory"
              binary
              :input-id="fieldAttrs.id"
              :aria-describedby="fieldAttrs['aria-describedby']"
            />
          </template>

          <template #hint>
            Помечайте регулярные платежи, чтобы отслеживать обязательные расходы.
          </template>
        </FormField>

        <FormField
          class="transaction-form__field transaction-form__field--full"
          label="Заметка (необязательно)"
        >
          <template #default="{ fieldAttrs }">
            <InputText
              v-bind="fieldAttrs"
              v-model="description"
              :placeholder="isIncome ? 'Например: зарплата' : 'Например: утренний кофе'"
              class="w-full"
              autocomplete="off"
            />
          </template>
        </FormField>
      </section>

      <footer class="form-actions">
        <AppButton
          type="button"
          variant="ghost"
          icon="pi pi-times"
          @click="emit('update:visible', false)"
        >
          Отмена
        </AppButton>
        <AppButton
          type="submit"
          icon="pi pi-check"
          :loading="isSubmitting"
          :disabled="!isFormValid || isSubmitting"
        >
          {{ isEditMode ? 'Обновить транзакцию' : 'Сохранить транзакцию' }}
        </AppButton>
      </footer>
    </form>
  </Dialog>
</template>

<style scoped>
.transaction-dialog :deep(.p-dialog-content) {
  padding: 0;
  border-radius: var(--ft-radius-xl);
  background: var(--ft-surface-elevated);
  overflow: hidden;
}

.transaction-dialog :deep(.p-dialog-header) {
  display: none;
}

.transaction-form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
  padding: clamp(var(--ft-space-6), 3vw, var(--ft-space-7));
  background: var(--ft-surface-elevated);
}

.transaction-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--ft-space-4) var(--ft-space-5);
}

.transaction-form__field--full {
  grid-column: 1 / -1;
}

.transaction-form__field--inline :deep(.form-field__control) {
  align-items: center;
}

.transaction-form__amount {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.transaction-form__amount :deep(.p-inputnumber) {
  flex: 1;
}

.transaction-form__currency {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--ft-space-2) var(--ft-space-3);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-600);
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.option-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ft-space-3);
}

.option-name {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.option-name i {
  color: var(--ft-primary-500);
}

.option-currency {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ft-space-3);
}

@media (max-width: 640px) {
  .transaction-form {
    padding: var(--ft-space-5);
  }

  .transaction-form__grid {
    gap: var(--ft-space-3);
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions :deep(.app-button) {
    width: 100%;
  }
}
</style>
