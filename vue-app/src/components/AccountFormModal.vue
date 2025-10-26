<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useFinanceStore } from '../stores/finance';
import { ACCOUNT_TYPE_OPTIONS, CURRENCY_CONFIG } from '../constants';
import type { AccountType } from '../types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(['update:visible']);

const store = useFinanceStore();
const toast = useToast();

const name = ref('');
const accountType = ref<AccountType>(ACCOUNT_TYPE_OPTIONS[0].value);
const currencyId = ref('');
const currencyCode = ref<string>(CURRENCY_CONFIG.default);
const isSubmitting = ref(false);

watch(
  () => props.visible,
  visible => {
    if (visible) resetForm();
  }
);

function resetForm() {
  name.value = '';
  accountType.value = ACCOUNT_TYPE_OPTIONS[0].value;
  currencyId.value = '';
  currencyCode.value = CURRENCY_CONFIG.default;
}

const handleSubmit = async () => {
  if (!name.value || !currencyId.value) {
    toast.add({
      severity: 'warn',
      summary: 'Поля обязательны',
      detail: 'Введите название счета и идентификатор валюты.',
      life: 3000,
    });
    return;
  }

  isSubmitting.value = true;
  const success = await store.createAccount({
    name: name.value.trim(),
    type: accountType.value,
    currencyId: currencyId.value.trim(),
    currencyCode: currencyCode.value.trim() || CURRENCY_CONFIG.default,
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
        <label for="currencyId">Идентификатор валюты</label>
        <InputText
            id="currencyId"
            v-model="currencyId"
            placeholder="GUID валюты из бэкенда"
            required
            class="w-full"
        />
        <small class="muted">
          Временно требуется указать GUID валюты. Его можно получить из БД или API.
        </small>
      </div>

      <div class="field">
        <label for="currencyCode">Код валюты (отображение)</label>
        <InputText
            id="currencyCode"
            v-model="currencyCode"
            placeholder="KZT"
            class="w-full"
        />
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
            :disabled="!name || !currencyId"
        />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

label {
  font-weight: 600;
}

.muted {
  color: var(--text-color-secondary);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
