<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { useFinanceStore } from '../stores/finance';
import { ACCOUNT_TYPE_OPTIONS } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import type { AccountType } from '../types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

const store = useFinanceStore();

const name = ref('');
const accountType = ref<AccountType>(ACCOUNT_TYPE_OPTIONS[0].value);
const selectedCurrencyCode = ref<string | null>(null);

/**
 * Computed list of available currencies from the store
 */
const availableCurrencies = computed(() => store.currencies);

/**
 * Computed currency options for the select dropdown
 */
const currencyOptions = computed(() =>
  availableCurrencies.value.map(currency => ({
    label: `${currency.symbol} ${currency.code} · ${currency.name}`,
    value: currency.code,
  }))
);

/**
 * Selected currency object based on selected code
 */
const selectedCurrency = computed(() => {
  if (!selectedCurrencyCode.value) return null;
  return availableCurrencies.value.find(currency => currency.code === selectedCurrencyCode.value) ?? null;
});

/**
 * Currency code to use for form submission
 */
const currencyCodeForSubmit = computed(() => selectedCurrency.value?.code ?? selectedCurrencyCode.value ?? '');

/**
 * Form validation state
 */
const isFormReady = computed(() => Boolean(name.value.trim()) && Boolean(currencyCodeForSubmit.value));

/**
 * Display text for selected currency
 */
const currencySummary = computed(() => {
  if (!selectedCurrency.value) return '';
  return `${selectedCurrency.value.symbol} ${selectedCurrency.value.code} · ${selectedCurrency.value.name}`;
});

/**
 * Watch for modal visibility changes
 */
watch(
  () => props.visible,
  visible => {
    if (visible) {
      resetForm();
    }
  }
);

/**
 * Reset form to initial state and set default currency
 */
function resetForm() {
  name.value = '';
  accountType.value = ACCOUNT_TYPE_OPTIONS[0].value;

  // Set first available currency as default
  if (availableCurrencies.value.length > 0 && !selectedCurrencyCode.value) {
    selectedCurrencyCode.value = availableCurrencies.value[0]?.code ?? null;
  }
}

/**
 * Load currencies on component mount
 */
onMounted(async () => {
  await store.fetchCurrencies();

  // Set default currency after loading
  if (availableCurrencies.value.length > 0 && !selectedCurrencyCode.value) {
    selectedCurrencyCode.value = availableCurrencies.value[0]?.code ?? null;
  }
});

const { isSubmitting, handleSubmit: handleFormSubmit, showWarning } = useFormModal(
  async () => {
    return await store.createAccount({
      name: name.value.trim(),
      type: accountType.value,
      currencyCode: currencyCodeForSubmit.value,
    });
  },
  {
    successMessage: 'Новый счет добавлен в список.',
    errorMessage: 'Не удалось создать счет. Проверьте данные и повторите попытку.',
  }
);

const handleSubmit = async () => {
  if (!name.value.trim() || !currencyCodeForSubmit.value) {
    showWarning('Введите название счета и выберите валюту.');
    return;
  }

  const success = await handleFormSubmit();
  if (success) {
    emit('update:visible', false);
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
            :disabled="store.areCurrenciesLoading || !currencyOptions.length"
        />
        <small v-if="store.areCurrenciesLoading" class="helper-text ft-text ft-text--muted">Загружаем список валют…</small>
        <small v-else-if="!currencyOptions.length" class="helper-text error">Не удалось загрузить валюты. Проверьте подключение.</small>
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
