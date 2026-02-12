<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import { useFinanceStore } from '../stores/finance'
import { useFormModal } from '../composables/useFormModal'
import type { Account, AccountType } from '../types'

const BANK_ACCOUNT_TYPE: AccountType = 0

const props = defineProps<{
  visible: boolean
  account?: Account | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const store = useFinanceStore()

const name = ref('')
const selectedCurrencyCode = ref<string | null>(null)
const attemptedSubmit = ref(false)
const initialBalance = ref<number | null>(null)
const isLiquid = ref(true)

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
const dialogTitle = computed(() => (isEditing.value ? 'Редактировать счёт' : 'Добавить счёт'))
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
  initialBalance.value = null

  if (props.account) {
    name.value = props.account.name
    selectedCurrencyCode.value = props.account.currencyCode
    isLiquid.value = props.account.isLiquid ?? true
    return
  }

  name.value = ''
  isLiquid.value = true
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
      type: BANK_ACCOUNT_TYPE,
      currencyCode: currencyCodeForSubmit.value,
      initialBalance: initialBalance.value,
      isLiquid: isLiquid.value,
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
  <Dialog
    :visible="props.visible"
    :header="dialogTitle"
    modal
    :style="{ width: '400px' }"
    :breakpoints="{ '640px': 'calc(100vw - 1rem)' }"
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
            class="w-full"
            placeholder="Например, «Основная карта»"
            autocomplete="off"
            :autofocus="props.visible"
          />
        </template>
      </FormField>

      <FormField label="Тип счёта">
        <template #default>
          <div class="static-field">
            <i
              class="pi pi-wallet"
              aria-hidden="true"
            />
            <span>Банковский счёт</span>
          </div>
        </template>
        <template #hint>
          На этой странице доступны только банковские счета.
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

.form-layout :deep(.p-inputtext),
.form-layout :deep(.p-inputnumber),
.form-layout :deep(.p-inputnumber-input),
.form-layout :deep(.p-select) {
  width: 100%;
}

.form-layout :deep(.p-select-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.static-field {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  width: 100%;
  border-radius: var(--ft-radius-lg);
  border: 1px solid var(--ft-border-soft);
  background: var(--ft-surface-soft);
  color: var(--ft-text-primary);
  font-weight: var(--ft-font-medium);
  padding: 0 var(--ft-space-3);
}

.static-field i {
  color: var(--ft-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--ft-space-3);
  margin-top: var(--ft-space-4);
}

.actions :deep(.app-button) {
  min-height: 44px;
  min-width: 148px;
  flex: 0 0 auto;
}

.actions :deep(.p-button-label) {
  white-space: nowrap;
}

.liquidity-toggle {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

:deep(.p-dialog-header-actions .p-dialog-header-icon) {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

:deep(.p-dialog-header-actions .p-button-icon) {
  margin: 0;
}

@media (max-width: 576px) {
  .actions :deep(.app-button) {
    width: 100%;
    min-width: 0;
  }
}
</style>
