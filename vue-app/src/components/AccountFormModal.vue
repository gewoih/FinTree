<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UiDialog from '../ui/UiDialog.vue'
import UiInputText from '../ui/UiInputText.vue'
import UiSelect from '../ui/UiSelect.vue'
import { useFinanceStore } from '../stores/finance'
import { useFormModal } from '../composables/useFormModal'
import type { Account, AccountType } from '../types'
import { getAccountTypeInfo } from '../utils/accountHelpers'
import UiButton from '../ui/UiButton.vue'
import FormField from './common/FormField.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    account?: Account | null
    allowedTypes?: AccountType[]
  }>(),
  {
    account: null,
    allowedTypes: () => [0],
  },
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const store = useFinanceStore()




const name = ref('')
const selectedCurrencyCode = ref<string | null>(null)
const selectedType = ref<AccountType>(props.allowedTypes[0] ?? 0)
const attemptedSubmit = ref(false)

const showTypeSelector = computed(() => !props.account && props.allowedTypes.length > 1)

const typeOptions = computed(() =>
  props.allowedTypes.map(type => {
    const info = getAccountTypeInfo(type)
    return { label: info.label, value: type, icon: info.icon }
  })
)




const availableCurrencies = computed(() => store.currencies)

const currencyOptions = computed(() =>
  availableCurrencies.value.map(currency => ({
    label: `${currency.symbol} ${currency.code} · ${currency.name}`,
    value: currency.code,
  }))
)

const selectedCurrency = computed(() => {
  if (!selectedCurrencyCode.value) return null
  return availableCurrencies.value.find(currency => currency.code === selectedCurrencyCode.value) ?? null
})

const defaultCurrencyCode = computed(() => availableCurrencies.value[0]?.code ?? null)

const currencyCodeForSubmit = computed(
  () => selectedCurrency.value?.code ?? selectedCurrencyCode.value ?? ''
)

const isEditing = computed(() => Boolean(props.account))
const editingAccountId = computed(() => props.account?.id ?? null)
const dialogTitle = computed(() => (isEditing.value ? 'Переименование счета' : 'Добавить счёт'))
const submitLabel = computed(() => (isEditing.value ? 'Сохранить' : 'Создать'))
const submitIcon = computed(() => (isEditing.value ? 'pi pi-check' : 'pi pi-plus'))

const isFormReady = computed(
  () => Boolean(name.value.trim()) && (isEditing.value || Boolean(currencyCodeForSubmit.value))
)

const nameError = computed(() => {
  if (!attemptedSubmit.value) return null
  return name.value.trim().length ? null : 'Введите название счёта'
})

const currencyError = computed(() => {
  if (isEditing.value) return null
  if (!attemptedSubmit.value) return null
  return currencyCodeForSubmit.value ? null : 'Выберите валюту'
})

const currencyHint = computed(() => {
  if (isEditing.value) return 'Валюту нельзя изменить после создания.'
  if (store.areCurrenciesLoading) return 'Загрузка валют…'
  if (!currencyOptions.value.length) return 'Не удалось загрузить валюты. Проверьте соединение.'
  if (selectedCurrency.value) {
    return `${selectedCurrency.value.symbol} ${selectedCurrency.value.code} · ${selectedCurrency.value.name}`
  }
  return 'Выберите валюту для нового счёта.'
})

function setDefaultCurrency() {
  if (!selectedCurrencyCode.value) {
    selectedCurrencyCode.value = defaultCurrencyCode.value
  }
}

function resetForm() {
  attemptedSubmit.value = false
  selectedType.value = props.allowedTypes[0] ?? 0

  if (props.account) {
    name.value = props.account.name
    selectedCurrencyCode.value = props.account.currencyCode
    return
  }

  name.value = ''
  setDefaultCurrency()
}

watch(
  () => props.visible,
  visible => {
    if (visible) resetForm()
  }
)

watch(
  () => props.account,
  () => {
    if (props.visible) resetForm()
  }
)

watch(availableCurrencies, () => setDefaultCurrency(), { immediate: true })

onMounted(async () => {
  await store.fetchCurrencies()
  setDefaultCurrency()
})

const { isSubmitting, handleSubmit: handleFormSubmit, showWarning } = useFormModal(
  async () => {
    if (isEditing.value && editingAccountId.value) {
      return await store.updateAccount({
        id: editingAccountId.value,
        name: name.value.trim(),
      })
    }

    return await store.createAccount({
      name: name.value.trim(),
      type: selectedType.value,
      currencyCode: currencyCodeForSubmit.value,
    })
  },
  {
    successMessage: 'Счёт сохранён.',
    errorMessage: 'Не удалось сохранить счёт. Проверьте данные и попробуйте снова.',
  }
)

const handleSubmit = async () => {
  attemptedSubmit.value = true

  if (!isFormReady.value) {
    showWarning('Введите название счёта и выберите валюту.')
    return
  }

  const success = await handleFormSubmit()
  if (success) {
    attemptedSubmit.value = false
    emit('update:visible', false)
  }
}
</script>

<template>
  <UiDialog
    :visible="props.visible"
    :closable="false"
    modal
    class="account-dialog"
    :style="{ width: '400px' }"
    :breakpoints="{ '640px': 'calc(100vw - 1rem)' }"
    dismissable-mask
    @update:visible="val => emit('update:visible', val)"
  >
    <div class="account-form__container">
      <header class="account-form__header">
        <h2 class="account-form__title">
          {{ dialogTitle }}
        </h2>
        <button
          type="button"
          class="account-form__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>

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
            <UiInputText
              v-bind="fieldAttrs"
              v-model="name"
              class="w-full"
              placeholder="Например, «Основная карта»"
              autocomplete="off"
              :autofocus="props.visible"
            />
          </template>
        </FormField>



        <FormField
          v-if="showTypeSelector"
          label="Тип счета"
          required
        >
          <template #default="{ fieldAttrs }">
            <UiSelect
              v-model="selectedType"
              :options="typeOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              :input-id="fieldAttrs.id"
              :aria-describedby="fieldAttrs['aria-describedby']"
            >
              <template #option="{ option }">
                <span class="type-option">
                  <i :class="`pi ${option.icon}`" />
                  {{ option.label }}
                </span>
              </template>
            </UiSelect>
          </template>
        </FormField>

        <FormField
          v-if="!isEditing"
          label="Валюта"
          :error="currencyError"
          required
        >
          <template #default="{ fieldAttrs }">
            <UiSelect
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

        <div class="actions">
          <UiButton
            type="submit"
            :icon="submitIcon"
            :loading="isSubmitting"
            :disabled="!isFormReady || isSubmitting"
          >
            {{ submitLabel }}
          </UiButton>
        </div>
      </form>
    </div>
  </UiDialog>
</template>

<style scoped>
.account-form__container {
  padding: var(--ft-space-6);
}

.account-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--ft-space-5);
}

.account-form__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: 700;
  color: var(--ft-text-primary);
}

.account-form__close {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 36px;
  height: 36px;
  padding: 0;

  color: var(--ft-text-tertiary);

  background: none;
  border: none;
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast);
}

.account-form__close:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

.form-layout {
  display: grid;
  gap: var(--ft-space-4);
}

.form-layout :deep(.ui-input),
.form-layout :deep(.ui-input-number__root),
.form-layout :deep(.ui-input-number__input),
.form-layout :deep(.ui-select__root),
.form-layout :deep(.p-inputtext),
.form-layout :deep(.p-inputnumber),
.form-layout :deep(.p-inputnumber-input),
.form-layout :deep(.p-select) {
  width: 100%;
}

.form-layout :deep(.ui-select__label),
.form-layout :deep(.p-select-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.static-field {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  width: 100%;
  min-height: 44px;
  padding: 0 var(--ft-space-3);

  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);
}

.static-field i {
  color: var(--ft-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  justify-content: flex-end;

  margin-top: var(--ft-space-4);
}

.actions :deep(.ui-button) {
  flex: 0 0 auto;
  min-width: 148px;
  min-height: 44px;
}

.actions :deep(.p-button-label) {
  white-space: nowrap;
}

.type-option {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.type-option i {
  color: var(--ft-text-muted);
}

@media (width <= 640px) {
  .actions :deep(.ui-button) {
    width: 100%;
    min-width: 0;
  }
}
</style>
