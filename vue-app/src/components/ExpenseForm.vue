<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFinanceStore } from '../stores/finance.ts';
import type { Account, Category, NewTransactionPayload } from '../types.ts';
import { formatCurrency } from '../utils/formatters';
import { VALIDATION_RULES, TOAST_CONFIG } from '../constants';

// PrimeVue Components
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

const store = useFinanceStore();
const toast = useToast();

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

// --- Состояние формы ---
const selectedAccount = ref<Account | null>(null);
const amount = ref<number | null>(null);
const description = ref<string>('');
const date = ref<Date>(new Date());
const selectedCategory = ref<Category | null>(null);

// --- Вычисляемые значения ---
const sortedCategories = computed(() => [...store.categories].sort((a, b) => a.name.localeCompare(b.name)));
const defaultCategory = computed(() => sortedCategories.value[0] ?? null);

// --- Логика флоу ---

// 2. Устанавливаем значения по умолчанию при открытии формы
watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedAccount.value = store.primaryAccount || store.accounts[0] || null;
    selectedCategory.value = defaultCategory.value;
    date.value = new Date();
    amount.value = null;
    description.value = '';
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

// 4. Валидация суммы и форматирование валюты
const currencyCode = computed(() => selectedAccount.value?.currency?.code ?? 'KZT');
const currencySymbol = computed(() => selectedAccount.value?.currency?.symbol ?? '');
const isAmountValid = computed(() => 
  amount.value !== null && 
  amount.value >= VALIDATION_RULES.minAmount && 
  amount.value <= VALIDATION_RULES.maxAmount
);
const formattedAmount = computed(() => formatCurrency(Math.abs(amount.value ?? 0), currencyCode.value));
const submitDisabled = computed(() => !isAmountValid.value || !selectedCategory.value || !selectedAccount.value);

// --- Отправка формы ---
const handleSubmit = async () => {
  if (!isAmountValid.value || !selectedAccount.value || !selectedCategory.value) {
    toast.add({ 
      severity: 'error', 
      summary: 'Ошибка', 
      detail: 'Проверьте все обязательные поля: счет, категорию и сумму.', 
      life: TOAST_CONFIG.duration 
    });
    return;
  }

  const payload: NewTransactionPayload = {
    accountId: selectedAccount.value.id,
    categoryId: selectedCategory.value.id,
    amount: amount.value!, // Валидация гарантирует, что это число
    occurredAt: date.value.toISOString(),
    description: description.value ? description.value.trim() : null,
  };

  const success = await store.addExpense(payload);

  if (success) {
    // 6. Уведомление об успехе
    toast.add({ 
      severity: 'success', 
      summary: 'Успех', 
      detail: 'Расход успешно добавлен!', 
      life: TOAST_CONFIG.duration 
    });

    // Закрываем форму
    emit('update:visible', false);
  } else {
    toast.add({ 
      severity: 'error', 
      summary: 'Ошибка API', 
      detail: 'Не удалось сохранить расход.', 
      life: TOAST_CONFIG.duration 
    });
  }
};

onMounted(() => {
  // Инициализация популярной категории при первом монтировании
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
      <header class="form-hero">
        <div>
          <span class="ft-kicker">Быстрый расход</span>
          <h3 class="form-title ft-display ft-display--section">Фиксируем операцию</h3>
          <p class="ft-text ft-text--muted">
            Укажите счет, категорию и сумму. Мы автоматически применим валюту и сохранём операцию в ленте.
          </p>
        </div>
        <div class="form-summary">
          <span class="summary-label">Списание</span>
          <strong>{{ formattedAmount }}</strong>
          <small>{{ selectedAccount?.name || 'Счет не выбран' }}</small>
        </div>
      </header>

      <section class="form-fields">
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
                  {{ slotProps.option.currency?.symbol ?? '' }}
                  {{ slotProps.option.currency?.code ?? '—' }}
                </span>
              </div>
            </template>
          </Select>
          <small>Средства будут списаны с указанного счета.</small>
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
          <small>По умолчанию используется первая категория в списке.</small>
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
            Сумма должна быть от {{ VALIDATION_RULES.minAmount }} до {{ VALIDATION_RULES.maxAmount }}
          </small>
        </div>

        <div class="field">
          <label for="date">Дата операции</label>
          <DatePicker
              id="date"
              v-model="date"
              dateFormat="dd.mm.yy"
              :showIcon="true"
              required
              class="w-full"
          />
          <small>По умолчанию — текущая дата.</small>
        </div>

        <div class="field full">
          <label for="description">Примечание</label>
          <InputText
              id="description"
              v-model="description"
              placeholder="Например: кофе с собой"
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
            label="Сохранить расход"
            icon="pi pi-check"
            :disabled="submitDisabled"
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
