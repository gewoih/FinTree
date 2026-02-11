<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import { useFinanceStore } from '../stores/finance';
import { ACCOUNT_TYPE_OPTIONS } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import type { Account, AccountType } from '../types';

const props = defineProps<{
  visible: boolean;
  account?: Account | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const store = useFinanceStore();

const name = ref('');
const accountType = ref<AccountType>(ACCOUNT_TYPE_OPTIONS[0].value);
const accountTypeSelectOptions = computed(() =>
  ACCOUNT_TYPE_OPTIONS.map(option => ({ ...option }))
);
const selectedCurrencyCode = ref<string | null>(null);
const attemptedSubmit = ref(false);
const initialBalance = ref<number | null>(null);
const isLiquid = ref(true);
const isLiquidTouched = ref(false);

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
  () => Boolean(name.value.trim()) && (isEditing.value || Boolean(currencyCodeForSubmit.value))
);

const nameError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return name.value.trim().length ? null : 'Введите название счёта';
});

const currencyError = computed(() => {
  if (isEditing.value) return null;
  if (!attemptedSubmit.value) return null;
  return currencyCodeForSubmit.value ? null : 'Выберите валюту';
});

const currencySummary = computed(() => {
  if (!selectedCurrency.value) return '';
  return `${selectedCurrency.value.symbol} ${selectedCurrency.value.code} · ${selectedCurrency.value.name}`;
});

const isEditing = computed(() => Boolean(props.account));
const editingAccountId = computed(() => props.account?.id ?? null);
const dialogTitle = computed(() => (isEditing.value ? 'Редактировать счёт' : 'Добавить счёт'));
const submitLabel = computed(() => (isEditing.value ? 'Сохранить' : 'Создать'));
const submitIcon = computed(() => (isEditing.value ? 'pi pi-check' : 'pi pi-plus'));
const currencyHint = computed(() => {
  if (isEditing.value) return 'Валюту нельзя изменить после создания.';
  if (store.areCurrenciesLoading) return 'Загрузка валют…';
  if (!currencyOptions.value.length) return 'Не удалось загрузить валюты. Проверьте соединение.';
  if (currencySummary.value) return currencySummary.value;
  return 'Выберите валюту для нового счёта.';
});

function setDefaultCurrency() {
  if (!selectedCurrencyCode.value) {
    selectedCurrencyCode.value = defaultCurrencyCode.value;
  }
}

function resetForm() {
  attemptedSubmit.value = false;
  initialBalance.value = null;
  isLiquidTouched.value = false;

  if (props.account) {
    name.value = props.account.name;
    accountType.value = props.account.type as AccountType;
    selectedCurrencyCode.value = props.account.currencyCode;
    isLiquid.value = props.account.isLiquid ?? accountType.value === 0;
    return;
  }

  name.value = '';
  accountType.value = ACCOUNT_TYPE_OPTIONS[0].value;
  isLiquid.value = accountType.value === 0;
  setDefaultCurrency();
}

watch(accountType, (newType) => {
  if (isEditing.value) return;
  if (!isLiquidTouched.value) {
    isLiquid.value = newType === 0;
  }
});

watch(
  () => props.visible,
  visible => {
    if (visible) {
      resetForm();
    }
  }
);

watch(
  () => props.account,
  () => {
    if (props.visible) {
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
    if (isEditing.value && editingAccountId.value) {
      return await store.updateAccount({
        id: editingAccountId.value,
        name: name.value.trim(),
      });
    }

    return await store.createAccount({
      name: name.value.trim(),
      type: accountType.value,
      currencyCode: currencyCodeForSubmit.value,
      initialBalance: initialBalance.value,
      isLiquid: isLiquid.value,
    });
  },
  {
    successMessage: 'Счёт сохранён.',
    errorMessage: 'Не удалось сохранить счёт. Проверьте данные и попробуйте снова.',
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
    :header="dialogTitle"
    modal
    :style="{ width: '520px' }"
    dismissable-mask
    @update:visible="val => emit('update:visible', val)"
  >
    <form
      class="form-layout"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <FormField
        label="Название счёта"
        :error="nameError"
        required
      >
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
            :options="accountTypeSelectOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isEditing"
            :input-id="fieldAttrs.id"
            :aria-describedby="fieldAttrs['aria-describedby']"
            :aria-invalid="fieldAttrs['aria-invalid']"
          />
        </template>
        <template
          v-if="isEditing"
          #hint
        >
          Тип счёта нельзя изменить после создания.
        </template>
      </FormField>

      <FormField
        label="Валюта"
        :error="currencyError"
        required
      >
        <template #default="{ fieldAttrs }">
          <Select
            v-model="selectedCurrencyCode"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            placeholder="Выберите валюту"
            class="w-full"
            :disabled="isEditing || store.areCurrenciesLoading || !currencyOptions.length"
            :input-id="fieldAttrs.id"
            :aria-describedby="fieldAttrs['aria-describedby']"
            :aria-invalid="fieldAttrs['aria-invalid']"
          />
        </template>

        <template #hint>
          <span>{{ currencyHint }}</span>
        </template>
      </FormField>

      <FormField
        v-if="!isEditing"
        label="Начальный остаток"
      >
        <template #default="{ fieldAttrs }">
          <InputNumber
            v-model="initialBalance"
            :input-id="fieldAttrs.id"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :use-grouping="true"
            class="w-full"
            placeholder="0.00"
          />
        </template>
        <template #hint>
          Можно оставить пустым и скорректировать позже.
        </template>
      </FormField>

      <FormField
        v-if="!isEditing"
        label="Ликвидный счет"
      >
        <template #default="{ fieldAttrs }">
          <div class="liquidity-toggle">
            <ToggleSwitch
              v-bind="fieldAttrs"
              v-model="isLiquid"
              @update:model-value="isLiquidTouched = true"
            />
            <span>{{ isLiquid ? 'Учитывать в ликвидных' : 'Не учитывать в ликвидных' }}</span>
          </div>
        </template>
        <template #hint>
          Учитывается при расчете «ликвидных месяцев» в аналитике.
        </template>
      </FormField>

      <div class="actions">
        <AppButton
          type="button"
          variant="ghost"
          @click="emit('update:visible', false)"
        >
          Отмена
        </AppButton>
        <AppButton
          type="submit"
          :icon="submitIcon"
          :loading="isSubmitting"
          :disabled="!isFormReady || isSubmitting"
        >
          {{ submitLabel }}
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

.liquidity-toggle {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
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
