<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { useFinanceStore } from '../stores/finance';
import { ACCOUNT_TYPE_OPTIONS } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import type { AccountType } from '../types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const store = useFinanceStore();

const name = ref('');
const accountType = ref<AccountType>(ACCOUNT_TYPE_OPTIONS[0].value);
const selectedCurrencyCode = ref<string | null>(null);
const attemptedSubmit = ref(false);

const availableCurrencies = computed(() => store.currencies);

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

const defaultCurrencyCode = computed(() => availableCurrencies.value[0]?.code ?? null);

const currencyCodeForSubmit = computed(
  () => selectedCurrency.value?.code ?? selectedCurrencyCode.value ?? ''
);

const isFormReady = computed(
  () => Boolean(name.value.trim()) && Boolean(currencyCodeForSubmit.value)
);

const nameError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return name.value.trim().length ? null : 'Введите название счёта';
});

const currencyError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return currencyCodeForSubmit.value ? null : 'Выберите валюту';
});

const currencySummary = computed(() => {
  if (!selectedCurrency.value) return '';
  return `${selectedCurrency.value.symbol} ${selectedCurrency.value.code} · ${selectedCurrency.value.name}`;
});

function setDefaultCurrency() {
  if (!selectedCurrencyCode.value) {
    selectedCurrencyCode.value = defaultCurrencyCode.value;
  }
}

function resetForm() {
  name.value = '';
  accountType.value = ACCOUNT_TYPE_OPTIONS[0].value;
  attemptedSubmit.value = false;
  setDefaultCurrency();
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      resetForm();
    }
  }
);

watch(availableCurrencies, () => setDefaultCurrency(), { immediate: true });

onMounted(async () => {
  await store.fetchCurrencies();
  setDefaultCurrency();
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
    successMessage: 'Счёт успешно создан.',
    errorMessage: 'Не удалось создать счёт. Проверьте данные и попробуйте снова.',
  }
);

const handleSubmit = async () => {
  attemptedSubmit.value = true;

  if (!isFormReady.value) {
    showWarning('Введите название счёта и выберите валюту.');
    return;
  }

  const success = await handleFormSubmit();
  if (success) {
    attemptedSubmit.value = false;
    emit('update:visible', false);
  }
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    header="Добавить счёт"
    modal
    @update:visible="val => emit('update:visible', val)"
    :style="{ width: '520px' }"
    dismissableMask
  >
    <form @submit.prevent="handleSubmit" class="form-layout" novalidate>
      <FormField label="Название счёта" :error="nameError" required>
        <template #default="{ fieldAttrs }">
          <InputText
            v-bind="fieldAttrs"
            v-model="name"
            placeholder="Например, «Основная карта»"
            class="w-full"
            autocomplete="off"
            :autofocus="props.visible"
          />
        </template>
      </FormField>

      <FormField label="Тип счёта">
        <template #default="{ fieldAttrs }">
          <Select
            v-model="accountType"
            :options="ACCOUNT_TYPE_OPTIONS"
            option-label="label"
            option-value="value"
            class="w-full"
            :input-id="fieldAttrs.id"
            :aria-describedby="fieldAttrs['aria-describedby']"
            :aria-invalid="fieldAttrs['aria-invalid']"
          />
        </template>
      </FormField>

      <FormField label="Валюта" :error="currencyError" required>
        <template #default="{ fieldAttrs }">
          <Select
            v-model="selectedCurrencyCode"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            placeholder="Выберите валюту"
            class="w-full"
            :disabled="store.areCurrenciesLoading || !currencyOptions.length"
            :input-id="fieldAttrs.id"
            :aria-describedby="fieldAttrs['aria-describedby']"
            :aria-invalid="fieldAttrs['aria-invalid']"
          />
        </template>

        <template #hint>
          <span v-if="store.areCurrenciesLoading">Загрузка валют…</span>
          <span v-else-if="!currencyOptions.length">Не удалось загрузить валюты. Проверьте соединение.</span>
          <span v-else-if="currencySummary">{{ currencySummary }}</span>
          <span v-else>Выберите валюту для нового счёта.</span>
        </template>
      </FormField>

      <div class="actions">
        <AppButton type="button" variant="ghost" @click="emit('update:visible', false)">
          Отмена
        </AppButton>
        <AppButton
          type="submit"
          icon="pi pi-plus"
          :loading="isSubmitting"
          :disabled="!isFormReady || isSubmitting"
        >
          Создать
        </AppButton>
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.form-layout {
  display: grid;
  gap: var(--ft-space-4);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ft-space-3);
  margin-top: var(--ft-space-4);
}

@media (max-width: 576px) {
  .actions {
    flex-direction: column;
  }

  .actions :deep(.app-button) {
    width: 100%;
  }
}
</style>
