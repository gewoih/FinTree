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
const sortedCategories = computed(() => {
  // Сортировка категорий в алфавитном порядке
  return [...store.categories].sort((a, b) => a.name.localeCompare(b.name));
});

const mostFrequentCategory = computed(() => {
  // Находим категорию с максимальной частотой
  if (store.categories.length === 0) return null;
  return store.categories.reduce((prev, current) =>
      (prev.frequency > current.frequency) ? prev : current
  );
});

// --- Логика флоу ---

// 2. Устанавливаем значения по умолчанию при открытии формы
watch(() => props.visible, (newVal) => {
  if (newVal) {
    selectedAccount.value = store.primaryAccount || store.accounts[0] || null;
    selectedCategory.value = mostFrequentCategory.value;
    date.value = new Date();
    amount.value = null;
    description.value = '';
  }
});

// 4. Валидация суммы и форматирование валюты
const currency = computed(() => selectedAccount.value?.currency || 'KZT');
const isAmountValid = computed(() => 
  amount.value !== null && 
  amount.value >= VALIDATION_RULES.minAmount && 
  amount.value <= VALIDATION_RULES.maxAmount
);
const formattedAmount = computed(() => formatCurrency(Math.abs(amount.value ?? 0), currency.value));
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
  selectedCategory.value = mostFrequentCategory.value;
});
</script>

<template>
  <Dialog
      :visible="props.visible"
      header="Быстрый расход"
      :modal="true"
      @update:visible="val => emit('update:visible', val)"
      :style="{ width: '560px' }"
      :closable="true"
      :dismissableMask="true"
      class="expense-dialog"
  >
    <form @submit.prevent="handleSubmit" class="expense-form">
      <div class="form-header">
        <div>
          <p class="dialog-kicker">Запишите покупку за минуту</p>
          <h3>Новый расход</h3>
          <p class="helper-text">Выберите счет и категорию — остальное мы подскажем.</p>
        </div>
        <div class="amount-preview">
          <span>Списываем</span>
          <strong>{{ formattedAmount }}</strong>
          <small>{{ selectedAccount?.name || 'Счет не выбран' }}</small>
        </div>
      </div>

      <div class="field-grid">
        <div class="field-block">
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
                <div class="option-balance">
                  {{ formatCurrency(slotProps.option.balance, slotProps.option.currency) }}
                </div>
              </div>
            </template>
          </Select>
          <small>Списываемые средства будут учтены сразу.</small>
        </div>

        <div class="field-block">
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
          <small>Часто используемая категория подсвечена автоматически.</small>
        </div>

        <div class="field-block">
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
            <span class="currency-chip">{{ currency }}</span>
          </div>
          <small v-if="!isAmountValid && amount !== null" class="text-red-500">
            Сумма должна быть от {{ VALIDATION_RULES.minAmount }} до {{ VALIDATION_RULES.maxAmount }}
          </small>
        </div>

        <div class="field-block">
          <label for="date">Дата операции</label>
          <DatePicker
              id="date"
              v-model="date"
              dateFormat="dd.mm.yy"
              :showIcon="true"
              required
              class="w-full"
          />
          <small>По умолчанию — сегодняшняя дата.</small>
        </div>

        <div class="field-block full">
          <label for="description">Примечание</label>
          <InputText 
            id="description" 
            v-model="description" 
            placeholder="Например: кофе с собой" 
            class="w-full"
          />
        </div>
      </div>

      <div class="form-actions">
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
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.expense-dialog :deep(.p-dialog-content) {
  padding: 0;
}

.expense-form {
  padding: 1.5rem 1.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 1rem;
}

.dialog-kicker {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-color-secondary);
}

.helper-text {
  margin: 0.35rem 0 0;
  color: var(--text-color-secondary);
  font-size: 0.95rem;
}

.amount-preview {
  background: var(--surface-100);
  border-radius: 16px;
  padding: 0.85rem 1.2rem;
  min-width: 180px;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.amount-preview strong {
  font-size: 1.4rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem 1.25rem;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-block.full {
  grid-column: 1 / -1;
}

.field-block label {
  font-weight: 600;
  font-size: 0.95rem;
}

.field-block small {
  color: var(--text-color-secondary);
}

.amount-input {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.amount-input :deep(.p-inputnumber) {
  flex: 1;
}

.currency-chip {
  border-radius: 12px;
  background: var(--surface-100);
  padding: 0.5rem 0.9rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.option-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.option-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-balance {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
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
  gap: 0.75rem;
  border-top: 1px solid var(--surface-border);
  padding-top: 1rem;
}

@media (max-width: 600px) {
  .expense-dialog :deep(.p-dialog-content) {
    padding: 0;
  }

  .form-header {
    flex-direction: column;
  }

  .amount-preview {
    text-align: left;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions :deep(.p-button) {
    width: 100%;
  }
}
</style>
