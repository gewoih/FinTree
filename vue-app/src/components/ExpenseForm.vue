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
      header="Добавить расход"
      :modal="true"
      @update:visible="val => emit('update:visible', val)"
      :style="{ width: '500px' }"
      :closable="true"
      :dismissableMask="true"
  >
    <form @submit.prevent="handleSubmit" class="p-fluid">
      <!-- Выбор счета -->
      <div class="field">
        <label for="account" class="font-medium">Счет *</label>
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
            <div class="flex align-items-center justify-content-between w-full">
              <div class="flex align-items-center">
                <i class="pi pi-credit-card mr-2 text-primary"></i>
                <span>{{ slotProps.option.name }}</span>
              </div>
              <div class="text-sm text-500">
                {{ formatCurrency(slotProps.option.balance, slotProps.option.currency) }}
              </div>
            </div>
          </template>
        </Select>
        <small class="text-500">Выберите счет для списания средств</small>
      </div>

      <!-- Категория -->
      <div class="field">
        <label for="category" class="font-medium">Категория *</label>
        <Select
            id="category"
            v-model="selectedCategory"
            :options="sortedCategories"
            option-label="name"
            placeholder="Выбрать категорию"
            required
            class="w-full"
        >
          <template #option="slotProps">
            <div class="flex align-items-center">
              <div 
                class="category-color-indicator mr-2" 
                :style="{ backgroundColor: slotProps.option.color }"
              ></div>
              {{ slotProps.option.name }}
            </div>
          </template>
        </Select>
        <small class="text-500">Автоматически выбрана самая популярная категория</small>
      </div>

      <!-- Сумма -->
      <div class="field">
        <label for="amount" class="font-medium">Сумма расхода *</label>
        <div class="p-inputgroup">
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
              class="w-full"
          />
          <span class="p-inputgroup-addon font-semibold">{{ currency }}</span>
        </div>
        <small v-if="!isAmountValid && amount !== null" class="text-red-500">
          Сумма должна быть от {{ VALIDATION_RULES.minAmount }} до {{ VALIDATION_RULES.maxAmount }}
        </small>
      </div>

      <!-- Дата -->
      <div class="field">
        <label for="date" class="font-medium">Дата</label>
        <DatePicker
            id="date"
            v-model="date"
            dateFormat="dd.mm.yy"
            :showIcon="true"
            required
            class="w-full"
        />
        <small class="text-500">По умолчанию установлена сегодняшняя дата</small>
      </div>

      <!-- Примечание -->
      <div class="field">
        <label for="description" class="font-medium">Примечание</label>
        <InputText 
          id="description" 
          v-model="description" 
          placeholder="Описание покупки (необязательно)" 
          class="w-full"
        />
      </div>

      <!-- Кнопки -->
      <div class="flex gap-2 mt-4">
        <Button
            type="button"
            label="Отмена"
            icon="pi pi-times"
            severity="secondary"
            @click="emit('update:visible', false)"
            class="flex-1"
        />
        <Button
            type="submit"
            label="Добавить Расход"
            icon="pi pi-check"
            :disabled="!isAmountValid || !selectedCategory || !selectedAccount"
            class="flex-1"
        />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
/* ExpenseForm specific styles */
.account-info {
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
}

.category-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
</style>
