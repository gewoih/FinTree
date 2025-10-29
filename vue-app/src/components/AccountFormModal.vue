<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useFinanceStore } from '../stores/finance';
import { ACCOUNT_TYPE_OPTIONS, CURRENCY_CONFIG } from '../constants';
import { apiService } from '../services/api.service.ts';
import type { AccountType, Currency } from '../types';

const FALLBACK_CURRENCY_MAP: Record<string, { name: string; symbol: string }> = {
  USD: { name: 'Доллар США', symbol: '$' },
  KZT: { name: 'Тенге', symbol: '₸' },
  RUB: { name: 'Российский рубль', symbol: '₽' },
  EUR: { name: 'Евро', symbol: '€' },
};

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

const store = useFinanceStore();
const toast = useToast();

const name = ref('');
const accountType = ref<AccountType>(ACCOUNT_TYPE_OPTIONS[0].value);
const selectedCurrencyCode = ref<string | null>(CURRENCY_CONFIG.default);
const currencies = ref<Currency[]>([]);
const isCurrencyLoading = ref(false);
const currencyLoadError = ref('');
const isSubmitting = ref(false);

const availableCurrencies = computed<Currency[]>(() => {
  if (currencies.value.length) return currencies.value;

  return CURRENCY_CONFIG.supported.map(code => {
    const meta = FALLBACK_CURRENCY_MAP[code] ?? { name: code, symbol: code };
    return {
      code,
      name: meta.name,
      symbol: meta.symbol,
    };
  });
});

const currencyOptions = computed(() =>
  availableCurrencies.value.map(currency => ({
    label: `${currency.symbol} ${currency.code} · ${currency.name}`,
    value: currency.code,
  }))
);

const selectedCurrency = computed(() => {
  if (!selectedCurrencyCode.value) return null;
  return availableCurrencies.value.find(currency => currency.code === selectedCurrencyCode.value) ?? null;
});

const currencyCodeForSubmit = computed(() => selectedCurrency.value?.code ?? selectedCurrencyCode.value ?? '');

const isFormReady = computed(() => Boolean(name.value.trim()) && Boolean(currencyCodeForSubmit.value));

const currencySummary = computed(() => {
  if (!selectedCurrency.value) return '';
  return `${selectedCurrency.value.symbol} ${selectedCurrency.value.code} · ${selectedCurrency.value.name}`;
});

watch(
  () => props.visible,
  visible => {
    if (!visible) return;
    resetForm();
    ensureCurrenciesLoaded();
  }
);

function getDefaultCurrencyCode(list: Currency[]): string {
  if (!list.length) return CURRENCY_CONFIG.default;
  const preferred = list.find(currency => currency.code === CURRENCY_CONFIG.default);
  const fallback = list[0]!;
  return (preferred ?? fallback).code;
}

async function ensureCurrenciesLoaded() {
  if (currencies.value.length || isCurrencyLoading.value) return;

  isCurrencyLoading.value = true;
  currencyLoadError.value = '';
  try {
    const data = await apiService.getCurrencies();
    currencies.value = data;
    const previousCode = selectedCurrencyCode.value;
    const nextCode =
      previousCode && data.some(currency => currency.code === previousCode)
        ? previousCode
        : getDefaultCurrencyCode(data);
    selectedCurrencyCode.value = nextCode;
  } catch (error) {
    console.error('Не удалось загрузить справочник валют', error);
    currencyLoadError.value = 'Не удалось загрузить список валют. Доступен локальный список.';
    toast.add({
      severity: 'error',
      summary: 'Ошибка загрузки',
      detail: 'Не удалось загрузить список валют. Попробуйте позже.',
      life: 3000,
    });
  } finally {
    isCurrencyLoading.value = false;
  }
}

function resetForm() {
  name.value = '';
  accountType.value = ACCOUNT_TYPE_OPTIONS[0].value;
  selectedCurrencyCode.value = getDefaultCurrencyCode(availableCurrencies.value);
}

const handleSubmit = async () => {
  if (!name.value.trim() || !currencyCodeForSubmit.value) {
    toast.add({
      severity: 'warn',
      summary: 'Поля обязательны',
      detail: 'Введите название счета и выберите валюту.',
      life: 3000,
    });
    return;
  }

  isSubmitting.value = true;
  const success = await store.createAccount({
    name: name.value.trim(),
    type: accountType.value,
    currencyCode: currencyCodeForSubmit.value,
  });
  isSubmitting.value = false;

  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Счет создан',
      detail: 'Новый счет добавлен в список.',
      life: 3000,
    });
    emit('update:visible', false);
  } else {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось создать счет. Проверьте данные и повторите попытку.',
      life: 3000,
    });
  }
};
</script>

<template>
  <Dialog
      :visible="props.visible"
      header="Новый счет"
      :modal="true"
      @update:visible="val => emit('update:visible', val)"
      :style="{ width: '480px' }"
  >
    <form @submit.prevent="handleSubmit" class="form-grid">
      <div class="field">
        <label for="name">Название</label>
        <InputText
            id="name"
            v-model="name"
            placeholder="Например, «Основная карта»"
            required
            class="w-full"
        />
      </div>

      <div class="field">
        <label for="type">Тип счета</label>
        <Select
            id="type"
            v-model="accountType"
            :options="[...ACCOUNT_TYPE_OPTIONS]"
            option-label="label"
            option-value="value"
            class="w-full"
        />
      </div>

      <div class="field">
        <label for="currency">Валюта</label>
        <Select
            id="currency"
            v-model="selectedCurrencyCode"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            placeholder="Выберите валюту"
            class="w-full"
            :disabled="isCurrencyLoading && !currencyOptions.length"
        />
        <small v-if="isCurrencyLoading" class="helper-text ft-text ft-text--muted">Загружаем список валют…</small>
        <small v-else-if="currencyLoadError" class="helper-text error">{{ currencyLoadError }}</small>
        <small v-else-if="currencySummary" class="helper-text ft-text ft-text--muted">{{ currencySummary }}</small>
        <small v-else class="helper-text ft-text ft-text--muted">Выберите валюту для нового счета.</small>
      </div>

      <div class="actions">
        <Button
            type="button"
            label="Отмена"
            severity="secondary"
            outlined
            @click="emit('update:visible', false)"
        />
        <Button
            type="submit"
            label="Создать"
            icon="pi pi-plus"
            :loading="isSubmitting"
            :disabled="!isFormReady || isSubmitting"
        />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: clamp(0.85rem, 1vw, 1.1rem);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

label {
  font-weight: 600;
  color: var(--ft-heading);
}

.helper-text {
  font-size: 0.85rem;
}

.error {
  color: #dc2626;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
</style>
