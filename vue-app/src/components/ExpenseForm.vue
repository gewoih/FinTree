<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFinanceStore } from '../stores/finance.ts';
import type { Account, Category, NewTransactionPayload } from '../types.ts';
import { VALIDATION_RULES } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import { validators } from '../services/validation.service';

// PrimeVue Components
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';

const store = useFinanceStore();

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

// --- Form state ---
const selectedAccount = ref<Account | null>(null);
const amount = ref<number | null>(null);
const description = ref<string>('');
const date = ref<Date>(new Date());
const isMandatory = ref<boolean>(false);
const selectedCategory = ref<Category | null>(null);

// --- Computed helpers ---
const sortedCategories = computed(() => [...store.categories].sort((a, b) => a.name.localeCompare(b.name)));
const defaultCategory = computed(() => sortedCategories.value[0] ?? null);

// --- Flow logic ---

// Initialise defaults when the modal opens
watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedAccount.value = store.primaryAccount || store.accounts[0] || null;

    // Restore the last used category if available
    const lastCategoryId = localStorage.getItem('lastUsedCategoryId');
    if (lastCategoryId) {
      const lastCategory = store.categories.find(c => c.id === lastCategoryId);
      selectedCategory.value = lastCategory || defaultCategory.value;
    } else {
      selectedCategory.value = defaultCategory.value;
    }

    date.value = new Date();
    amount.value = null;
    description.value = '';
    isMandatory.value = false;
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
const submitDisabled = computed(() => !isAmountValid.value || !selectedCategory.value || !selectedAccount.value);

// --- Submit handler ---
const { isSubmitting, handleSubmit: handleFormSubmit, showWarning } = useFormModal(
  async () => {
    const payload: NewTransactionPayload = {
      accountId: selectedAccount.value!.id,
      categoryId: selectedCategory.value!.id,
      amount: amount.value!,
      occurredAt: date.value.toISOString(),
      description: description.value ? description.value.trim() : null,
      isMandatory: isMandatory.value,
    };

    return await store.addExpense(payload);
  },
  {
    successMessage: 'Transaction added successfully.',
    errorMessage: 'Unable to save the transaction.',
  }
);

const handleSubmit = async () => {
  if (!isAmountValid.value || !selectedAccount.value || !selectedCategory.value) {
    showWarning('Fill in account, category, and amount before saving.');
    return;
  }

  const success = await handleFormSubmit();
  if (success) {
  // Persist the most recently used category
  if (selectedCategory.value) {
    localStorage.setItem('lastUsedCategoryId', selectedCategory.value.id);
  }
    emit('update:visible', false);
  }
};

onMounted(() => {
  // Initialise default category on mount
  selectedCategory.value = defaultCategory.value;
});
</script>

<template>
  <Dialog
      :visible="props.visible"
      :modal="true"
      :style="{ width: '620px' }"
      class="expense-dialog"
      :closable="true"
      :dismissableMask="true"
      @update:visible="val => emit('update:visible', val)"
  >
    <form class="expense-form" @submit.prevent="handleSubmit">
      <section class="form-fields">
        <div class="field">
          <label for="account">Account *</label>
          <Select
              id="account"
              v-model="selectedAccount"
              :options="store.accounts"
              option-label="name"
              placeholder="Select account"
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
          <small>Funds will be withdrawn from the selected account.</small>
        </div>

        <div class="field">
          <label for="category">Category *</label>
          <Select
              id="category"
              v-model="selectedCategory"
              :options="sortedCategories"
              option-label="name"
              placeholder="Select category"
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
          <small>The first category in the list is used by default.</small>
        </div>

        <div class="field">
          <label for="amount">Amount *</label>
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
            Amount must be between {{ VALIDATION_RULES.minAmount }} and {{ VALIDATION_RULES.maxAmount }}
          </small>
      </div>

      <div class="field">
        <label for="date">Transaction date</label>
          <DatePicker
              id="date"
              v-model="date"
              dateFormat="dd.mm.yy"
              :showIcon="true"
              required
              class="w-full"
          />
          <small>Defaults to today.</small>
      </div>

      <div class="field">
        <label for="isMandatory">Recurring expense</label>
        <Checkbox id="isMandatory" v-model="isMandatory" binary />
      </div>

      <div class="field full">
        <label for="description">Note</label>
        <InputText
            id="description"
            v-model="description"
            placeholder="For example: morning coffee"
            class="w-full"
        />
      </div>
      </section>

      <footer class="form-actions">
        <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            outlined
            @click="emit('update:visible', false)"
        />
        <Button
            type="submit"
            label="Save transaction"
            icon="pi pi-check"
            :disabled="submitDisabled"
            :loading="isSubmitting"
        />
      </footer>
    </form>
  </Dialog>
</template>

<style scoped>
.expense-dialog :deep(.p-dialog-content) {
  padding: 0;
  border-radius: var(--ft-radius-xl);
  overflow: hidden;
}

.expense-dialog :deep(.p-dialog-header) {
  display: none;
}

.expense-form {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2vw, 2.1rem);
  padding: clamp(1.8rem, 2.2vw, 2.3rem);
  background: var(--ft-surface-elevated);
}

.form-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: clamp(1.1rem, 1.5vw, 1.6rem);
  flex-wrap: wrap;
  border-radius: var(--ft-radius-xl);
  padding: clamp(1.4rem, 1.8vw, 1.75rem);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(14, 165, 233, 0.08));
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.24);
}

.form-title {
  margin: 0;
  font-size: clamp(1.6rem, 2.2vw, 1.9rem);
  color: var(--ft-heading);
}

.form-hero .ft-text {
  margin: 0.35rem 0 0;
  max-width: 360px;
}

.form-summary {
  border-radius: var(--ft-radius-md);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(14, 165, 233, 0.35));
  color: var(--ft-heading);
  padding: 1rem 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 200px;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.28);
}

.summary-label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  color: var(--ft-accent);
  font-weight: 600;
}

.form-summary strong {
  font-size: clamp(1.65rem, 2vw, 1.85rem);
  font-weight: 600;
  color: var(--ft-heading);
}

.form-summary small {
  color: var(--ft-text-muted);
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
  .expense-form {
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
