<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import UiButton from '../ui/UiButton.vue';
import UiDatePicker from '../ui/UiDatePicker.vue';
import UiInputNumber from '../ui/UiInputNumber.vue';
import UiInputText from '../ui/UiInputText.vue';
import UiSelect from '../ui/UiSelect.vue';
import UiSelectButton from '../ui/UiSelectButton.vue';
import { useFinanceStore } from '../stores/finance.ts';
import type {
  Account,
  Category,
  NewTransactionPayload,
  Transaction,
  TransactionType,
  UpdateTransactionPayload,
} from '../types.ts';
import { TRANSACTION_TYPE } from '../types.ts';
import { VALIDATION_RULES } from '../constants';
import { validators } from '../services/validation.service';
import { useFormModal } from '../composables/useFormModal';
import { parseUtcDateOnlyToLocalDate, toUtcDateOnlyIso } from '../utils/dateOnly';

const LAST_USED_CATEGORY_KEY = 'lastUsedCategoryId';

const store = useFinanceStore();
const confirm = useConfirm();
const toast = useToast();

const props = defineProps<{
  visible: boolean;
  transaction?: Transaction | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

type FieldKey = 'amount' | 'category' | 'account' | 'date';
type InputNumberEventPayload = {
  value?: string | number | null;
  formattedValue?: string;
  originalEvent?: Event;
};

const isEditMode = computed(() => !!props.transaction);

const createMaxDate = () => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
};

const maxDate = ref<Date>(createMaxDate());

const transactionType = ref<TransactionType>(TRANSACTION_TYPE.Expense);
const selectedAccount = ref<Account | null>(null);
const selectedCategory = ref<Category | null>(null);
const amount = ref<number | null>(null);
const description = ref<string>('');
const date = ref<Date>(new Date());
const isMandatory = ref<boolean>(false);
const mandatoryOverridden = ref(false);
const showAdvanced = ref(false);
const isDeleting = ref(false);

const touched = reactive<Record<FieldKey, boolean>>({
  amount: false,
  category: false,
  account: false,
  date: false,
});

const transactionTypeOptions = [
  { label: 'Расход', value: TRANSACTION_TYPE.Expense },
  { label: 'Доход', value: TRANSACTION_TYPE.Income },
];

const markTouched = (field: FieldKey) => {
  touched[field] = true;
};

const resetTouched = () => {
  touched.amount = false;
  touched.category = false;
  touched.account = false;
  touched.date = false;
};

const markAllTouched = () => {
  touched.amount = true;
  touched.category = true;
  touched.account = true;
  touched.date = true;
};

const getCategoriesForType = (type: TransactionType) =>
  store.categories.filter(category => category.type === type);

const resolveAvailableType = (preferred: TransactionType) => {
  if (store.categories.some(category => category.type === preferred)) {
    return preferred;
  }

  return store.categories[0]?.type ?? preferred;
};

const getLastUsedCategory = (type: TransactionType) => {
  try {
    const lastCategoryId = localStorage.getItem(LAST_USED_CATEGORY_KEY);
    if (!lastCategoryId) {
      return null;
    }

    const lastCategory = store.categories.find(category => category.id === lastCategoryId) ?? null;
    if (!lastCategory || lastCategory.type !== type) {
      return null;
    }

    return lastCategory;
  } catch {
    return null;
  }
};

const persistLastUsedCategory = (category: Category | null) => {
  if (!category) {
    return;
  }

  try {
    localStorage.setItem(LAST_USED_CATEGORY_KEY, category.id);
  } catch {
    // Ignore localStorage failures (e.g. private mode restrictions).
  }
};

const resolveCategoryForType = (
  type: TransactionType,
  options: {
    current?: Category | null;
    useLastUsed?: boolean;
  } = {}
) => {
  const categoriesForType = getCategoriesForType(type);
  if (!categoriesForType.length) {
    return null;
  }

  const currentCategory = options.current;
  if (currentCategory && currentCategory.type === type && categoriesForType.some(category => category.id === currentCategory.id)) {
    return currentCategory;
  }

  if (options.useLastUsed) {
    const lastUsedCategory = getLastUsedCategory(type);
    if (lastUsedCategory && categoriesForType.some(category => category.id === lastUsedCategory.id)) {
      return lastUsedCategory;
    }
  }

  return categoriesForType[0] ?? null;
};

const applyMandatorySuggestion = () => {
  if (transactionType.value === TRANSACTION_TYPE.Income) {
    isMandatory.value = false;
    return;
  }

  if (mandatoryOverridden.value) {
    return;
  }

  isMandatory.value = selectedCategory.value?.isMandatory ?? false;
};

const toggleMandatory = () => {
  if (props.readonly || transactionType.value === TRANSACTION_TYPE.Income) {
    return;
  }

  mandatoryOverridden.value = true;
  isMandatory.value = !isMandatory.value;
};

const parseAmountValue = (value: string | number | null | undefined) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
};

const handleAmountInput = (event: InputNumberEventPayload) => {
  const parsedValue = parseAmountValue(event.value);
  if (parsedValue != null) {
    amount.value = parsedValue;
    return;
  }

  const parsedFormatted = parseAmountValue(event.formattedValue);
  if (parsedFormatted != null) {
    amount.value = parsedFormatted;
    return;
  }

  const originalTarget = event.originalEvent?.target as HTMLInputElement | null;
  amount.value = parseAmountValue(originalTarget?.value);
};

const refreshMaxDate = () => {
  maxDate.value = createMaxDate();
};

const initializeCreateMode = () => {
  transactionType.value = resolveAvailableType(TRANSACTION_TYPE.Expense);
  selectedAccount.value = store.primaryAccount || store.accounts[0] || null;
  selectedCategory.value = resolveCategoryForType(transactionType.value, {
    useLastUsed: true,
  });

  amount.value = null;
  description.value = '';
  date.value = new Date();

  mandatoryOverridden.value = false;
  applyMandatorySuggestion();

  showAdvanced.value = false;
  resetTouched();
};

const initializeEditMode = (transaction: Transaction) => {
  selectedAccount.value = transaction.account || store.accounts.find(account => account.id === transaction.accountId) || null;

  const transactionCategory = transaction.category || store.categories.find(category => category.id === transaction.categoryId) || null;
  const preferredType = transactionCategory?.type ?? transaction.type ?? TRANSACTION_TYPE.Expense;
  transactionType.value = resolveAvailableType(preferredType);
  selectedCategory.value = resolveCategoryForType(transactionType.value, {
    current: transactionCategory,
    useLastUsed: false,
  });

  amount.value = Math.abs(Number(transaction.amount));
  description.value = transaction.description || '';
  date.value = parseUtcDateOnlyToLocalDate(transaction.occurredAt) ?? new Date(transaction.occurredAt);

  mandatoryOverridden.value = false;
  if (transactionType.value === TRANSACTION_TYPE.Income) {
    isMandatory.value = false;
  } else {
    isMandatory.value = transaction.isMandatory;
  }

  showAdvanced.value = true;
  resetTouched();
};

watch(
  () => props.visible,
  visible => {
    if (!visible) {
      return;
    }

    refreshMaxDate();

    if (isEditMode.value && props.transaction) {
      initializeEditMode(props.transaction);
      return;
    }

    initializeCreateMode();
  },
  { immediate: true }
);

watch(
  () => props.transaction,
  transaction => {
    if (!props.visible || !transaction) {
      return;
    }

    initializeEditMode(transaction);
  }
);

watch(
  () => store.accounts,
  accounts => {
    if (!props.visible || selectedAccount.value || !accounts.length) {
      return;
    }

    selectedAccount.value = store.primaryAccount || accounts[0] || null;
  }
);

watch(
  () => store.categories,
  () => {
    if (!props.visible) {
      return;
    }

    transactionType.value = resolveAvailableType(transactionType.value);
    selectedCategory.value = resolveCategoryForType(transactionType.value, {
      current: selectedCategory.value,
      useLastUsed: !isEditMode.value,
    });

    applyMandatorySuggestion();
  }
);

watch(transactionType, nextType => {
  selectedCategory.value = resolveCategoryForType(nextType, {
    current: selectedCategory.value,
    useLastUsed: !isEditMode.value,
  });

  if (nextType === TRANSACTION_TYPE.Income) {
    isMandatory.value = false;
    return;
  }

  applyMandatorySuggestion();
});

watch(selectedCategory, (nextCategory, previousCategory) => {
  if (nextCategory?.id === previousCategory?.id) {
    return;
  }

  applyMandatorySuggestion();
});

const filteredCategories = computed(() => getCategoriesForType(transactionType.value));
const isIncome = computed(() => transactionType.value === TRANSACTION_TYPE.Income);
const currencyCode = computed(
  () => selectedAccount.value?.currency?.code ?? selectedAccount.value?.currencyCode ?? 'KZT'
);
const currencySymbol = computed(() => selectedAccount.value?.currency?.symbol ?? '');

const isTypeValid = computed(() => !!transactionType.value);
const isAmountValid = computed(() => validators.isAmountValid(amount.value));
const isCategoryValid = computed(() => !!selectedCategory.value);
const isAccountValid = computed(() => !!selectedAccount.value);
const isDateValid = computed(() => {
  if (!(date.value instanceof Date)) {
    return false;
  }

  if (Number.isNaN(date.value.getTime())) {
    return false;
  }

  return date.value <= maxDate.value;
});

const submitDisabled = computed(
  () => !isTypeValid.value || !isAmountValid.value || !isCategoryValid.value || !isAccountValid.value || !isDateValid.value
);

const amountError = computed(() => {
  if (!touched.amount || isAmountValid.value) {
    return '';
  }

  if (amount.value == null) {
    return 'Введите сумму';
  }

  return `Сумма от ${VALIDATION_RULES.minAmount} до ${VALIDATION_RULES.maxAmount}`;
});

const categoryError = computed(() => (touched.category && !isCategoryValid.value ? 'Выберите категорию' : ''));
const accountError = computed(() => (touched.account && !isAccountValid.value ? 'Выберите счёт' : ''));
const dateError = computed(() => (touched.date && !isDateValid.value ? 'Введите корректную дату' : ''));

const { isSubmitting, handleSubmit: handleFormSubmit, showWarning } = useFormModal(
  async () => {
    if (isEditMode.value && props.transaction) {
      const payload: UpdateTransactionPayload = {
        id: props.transaction.id,
        type: transactionType.value,
        accountId: selectedAccount.value!.id,
        categoryId: selectedCategory.value!.id,
        amount: amount.value!,
        occurredAt: toUtcDateOnlyIso(date.value),
        description: description.value ? description.value.trim() : null,
        isMandatory: isMandatory.value,
      };

      return await store.updateTransaction(payload);
    }

    const payload: NewTransactionPayload = {
      type: transactionType.value,
      accountId: selectedAccount.value!.id,
      categoryId: selectedCategory.value!.id,
      amount: amount.value!,
      occurredAt: toUtcDateOnlyIso(date.value),
      description: description.value ? description.value.trim() : null,
      isMandatory: isMandatory.value,
    };

    return await store.addTransaction(payload);
  },
  {
    successMessage: isEditMode.value ? 'Транзакция обновлена успешно.' : 'Транзакция добавлена успешно.',
    errorMessage: isEditMode.value ? 'Не удалось обновить транзакцию.' : 'Не удалось сохранить транзакцию.',
  }
);

const submitTransaction = async (addAnother = false) => {
  if (props.readonly) {
    showWarning('Редактирование недоступно в режиме просмотра.');
    return;
  }

  refreshMaxDate();
  markAllTouched();
  if (submitDisabled.value) {
    return;
  }

  const success = await handleFormSubmit();
  if (!success) {
    return;
  }

  if (!isEditMode.value && selectedCategory.value) {
    persistLastUsedCategory(selectedCategory.value);
  }

  if (!addAnother) {
    emit('update:visible', false);
    return;
  }

  const keepAccount = selectedAccount.value;
  const keepCategory = selectedCategory.value;
  const keepType = transactionType.value;
  const keepDate = date.value;
  const keepMandatory = isMandatory.value;
  const keepMandatoryOverride = mandatoryOverridden.value;

  amount.value = null;
  description.value = '';

  selectedAccount.value = keepAccount;
  selectedCategory.value = keepCategory;
  transactionType.value = keepType;
  date.value = keepDate;

  if (transactionType.value === TRANSACTION_TYPE.Income) {
    mandatoryOverridden.value = false;
    isMandatory.value = false;
  } else if (keepMandatoryOverride) {
    mandatoryOverridden.value = true;
    isMandatory.value = keepMandatory;
  } else {
    mandatoryOverridden.value = false;
    applyMandatorySuggestion();
  }

  resetTouched();
};

const handleFormSubmitEvent = async (event?: SubmitEvent) => {
  event?.preventDefault();
  await submitTransaction(false);
};

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value;
};

const handleDelete = () => {
  if (props.readonly) {
    return;
  }

  if (!props.transaction) {
    return;
  }

  confirm.require({
    message: 'Удалить эту транзакцию? Её можно будет восстановить только вручную.',
    header: 'Подтверждение удаления',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Отмена',
    acceptLabel: 'Удалить',
    acceptClass: 'p-button-danger',
    accept: async () => {
      isDeleting.value = true;
      const success = await store.deleteTransaction(props.transaction!.id);
      isDeleting.value = false;

      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Транзакция удалена' : 'Не удалось удалить',
        detail: success
          ? 'Транзакция больше не отображается в списке.'
          : 'Пожалуйста, попробуйте еще раз.',
        life: 3000,
      });

      if (success) {
        emit('update:visible', false);
      }
    },
  });
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    :modal="true"
    class="txn-dialog"
    :closable="false"
    :dismissable-mask="true"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="isEditMode ? 'txn-dialog-title-edit' : 'txn-dialog-title-new'"
    @update:visible="value => emit('update:visible', value)"
  >
    <template #header>
      <span />
    </template>

    <form
      class="txn-form"
      @submit.prevent="handleFormSubmitEvent"
    >
      <header class="txn-form__header">
        <h2
          :id="isEditMode ? 'txn-dialog-title-edit' : 'txn-dialog-title-new'"
          class="txn-form__title"
        >
          {{ isEditMode ? 'Редактирование транзакции' : 'Новая транзакция' }}
        </h2>

        <button
          type="button"
          class="txn-form__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>

      <section class="txn-form__type">
        <UiSelectButton
          v-model="transactionType"
          :options="transactionTypeOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          :disabled="props.readonly"
          class="txn-form__type-control"
        />
      </section>

      <section class="txn-form__section txn-form__section--amount">
        <label
          for="amount"
          class="txn-form__field-label"
        >
          Сумма
        </label>

        <div
          class="txn-form__amount-shell"
          :class="{ 'is-invalid': !!amountError }"
        >
          <UiInputNumber
            id="amount"
            v-model="amount"
            mode="decimal"
            :min-fraction-digits="2"
            :max-fraction-digits="2"
            :min="VALIDATION_RULES.minAmount"
            :max="VALIDATION_RULES.maxAmount"
            autofocus
            placeholder="0.00"
            required
            :disabled="props.readonly"
            class="txn-form__amount-input"
            :class="{ 'p-invalid': !!amountError }"
            @input="handleAmountInput"
            @blur="markTouched('amount')"
          />

          <span class="txn-form__amount-currency">{{ currencySymbol || currencyCode }}</span>
        </div>

        <small
          v-if="amountError"
          class="txn-form__error"
        >
          {{ amountError }}
        </small>
      </section>

      <section class="txn-form__core-fields">
        <div class="txn-form__field">
          <label
            for="category"
            class="txn-form__field-label"
          >
            Категория
          </label>

          <UiSelect
            id="category"
            v-model="selectedCategory"
            :options="filteredCategories"
            option-label="name"
            placeholder="Выберите категорию"
            required
            :disabled="props.readonly"
            class="w-full"
            :class="{ 'p-invalid': !!categoryError }"
            @change="markTouched('category')"
            @blur="markTouched('category')"
          >
            <template #option="slotProps">
              <div class="txn-form__option-name">
                <span
                  class="txn-form__cat-dot"
                  :style="{ backgroundColor: slotProps.option.color }"
                />
                <span>{{ slotProps.option.name }}</span>
              </div>
            </template>
          </UiSelect>

          <small
            v-if="categoryError"
            class="txn-form__error"
          >
            {{ categoryError }}
          </small>
        </div>

        <div class="txn-form__field">
          <label
            for="account"
            class="txn-form__field-label"
          >
            Счёт
          </label>

          <UiSelect
            id="account"
            v-model="selectedAccount"
            :options="store.accounts"
            option-label="name"
            placeholder="Выберите счёт"
            required
            :disabled="props.readonly"
            class="w-full"
            :class="{ 'p-invalid': !!accountError }"
            @change="markTouched('account')"
            @blur="markTouched('account')"
          >
            <template #option="slotProps">
              <div class="txn-form__option-line">
                <div class="txn-form__option-name">
                  <i class="pi pi-credit-card" />
                  <span>{{ slotProps.option.name }}</span>
                </div>
                <span class="txn-form__option-currency">
                  {{ slotProps.option.currency?.symbol ?? '' }} {{ slotProps.option.currency?.code ?? slotProps.option.currencyCode ?? '—' }}
                </span>
              </div>
            </template>
          </UiSelect>

          <small
            v-if="accountError"
            class="txn-form__error"
          >
            {{ accountError }}
          </small>
        </div>
      </section>

      <section class="txn-form__quick-row">
        <div class="txn-form__field">
          <label
            for="date"
            class="txn-form__field-label"
          >
            Дата
          </label>

          <UiDatePicker
            id="date"
            v-model="date"
            date-format="dd.mm.yy"
            :show-icon="true"
            :select-other-months="true"
            :max-date="maxDate"
            required
            :disabled="props.readonly"
            class="w-full txn-form__date-picker"
            :class="{ 'p-invalid': !!dateError }"
            @update:model-value="markTouched('date')"
            @blur="markTouched('date')"
          />

          <small
            v-if="dateError"
            class="txn-form__error"
          >
            {{ dateError }}
          </small>
        </div>
      </section>

      <button
        type="button"
        class="txn-form__advanced-toggle"
        :aria-expanded="showAdvanced"
        aria-controls="txn-form-advanced"
        @click="toggleAdvanced"
      >
        <span>Дополнительно</span>
        <i
          class="pi pi-chevron-down"
          :class="{ 'is-open': showAdvanced }"
          aria-hidden="true"
        />
      </button>

      <Transition name="txn-advanced">
        <section
          v-if="showAdvanced"
          id="txn-form-advanced"
          class="txn-form__advanced-panel"
        >
          <div
            v-if="!isIncome"
            class="txn-form__field"
          >
            <div class="txn-form__field-label-row">
              <label
                for="mandatory-toggle"
                class="txn-form__field-label"
              >
                Тип расхода
              </label>

              <span
                v-tooltip.bottom="'Расходы, которые нельзя избежать: аренда, коммуналка, кредиты. Влияет на расчёт финансовой устойчивости.'"
                class="txn-form__hint"
                aria-hidden="true"
              >
                <i class="pi pi-info-circle" />
              </span>
            </div>

            <div class="txn-form__mandatory-wrap">
              <button
                id="mandatory-toggle"
                type="button"
                class="txn-form__mandatory-chip"
                :class="{ 'is-active': isMandatory }"
                :disabled="props.readonly"
                :aria-pressed="isMandatory"
                @click="toggleMandatory"
              >
                <i
                  :class="isMandatory ? 'pi pi-check-circle' : 'pi pi-circle'"
                  aria-hidden="true"
                />
                <span>{{ isMandatory ? 'Обязательный расход' : 'Необязательный расход' }}</span>
              </button>
            </div>
          </div>

          <div class="txn-form__field">
            <label
              for="description"
              class="txn-form__field-label"
            >
              Заметка
            </label>

            <UiInputText
              id="description"
              v-model="description"
              :placeholder="isIncome ? 'Например: зарплата' : 'Например: утренний кофе'"
              :disabled="props.readonly"
              class="w-full"
            />
          </div>
        </section>
      </Transition>

      <footer class="txn-form__footer">
        <div class="txn-form__footer-left">
          <UiButton
            v-if="isEditMode"
            type="button"
            label="Удалить"
            icon="pi pi-trash"
            variant="danger"
            :loading="isDeleting"
            :disabled="props.readonly || isSubmitting"
            @click="handleDelete"
          />
        </div>

        <div class="txn-form__footer-right">
          <button
            v-if="!isEditMode"
            type="button"
            class="txn-form__add-another"
            :disabled="props.readonly || submitDisabled || isSubmitting"
            @click="submitTransaction(true)"
          >
            Сохранить и добавить ещё
          </button>

          <UiButton
            type="button"
            label="Отмена"
            variant="secondary"
            :disabled="isDeleting || isSubmitting"
            @click="emit('update:visible', false)"
          />

          <UiButton
            type="submit"
            :label="isEditMode ? 'Обновить' : 'Сохранить'"
            icon="pi pi-check"
            :disabled="props.readonly || submitDisabled || isDeleting"
            :loading="isSubmitting"
          />
        </div>
      </footer>
    </form>
  </Dialog>
</template>

<style scoped>
.txn-dialog {
  width: var(--ft-container-sm);
  max-width: min(95vw, var(--ft-container-sm));
}

.txn-dialog :deep(.p-dialog-header) {
  display: none;
}

.txn-dialog :deep(.p-dialog-content) {
  overflow: hidden auto;
  padding: 0;
}

.txn-form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: var(--ft-space-6);

  background: var(--ft-surface-raised);
}

.txn-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.txn-form__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: 700;
  color: var(--ft-text-primary);
}

.txn-form__close {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  width: var(--ft-control-height);
  height: var(--ft-control-height);
  padding: 0;

  color: var(--ft-text-tertiary);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-md);

  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.txn-form__close:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-muted);
}

.txn-form__type {
  display: flex;
}

.txn-form__type-control {
  display: flex;
  gap: var(--ft-space-1);

  width: 100%;
  padding: var(--ft-space-1);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition: border-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
}

.txn-form__type-control:focus-within {
  border-color: var(--ft-border-strong);
  box-shadow: 0 0 0 2px var(--ft-focus-ring);
}

.txn-form__type-control :deep(.p-togglebutton) {
  flex: 1;

  min-height: var(--ft-control-height);

  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);
}

.txn-form__type-control :deep(.p-togglebutton:focus-visible) {
  outline: none;
}

.txn-form__type-control :deep(.p-togglebutton.p-togglebutton-checked) {
  color: var(--ft-text-primary);
  box-shadow: none;
}

.txn-form__type-control :deep(.p-togglebutton:nth-of-type(1).p-togglebutton-checked) {
  background: color-mix(in srgb, var(--ft-danger-500) 14%, var(--ft-surface-base));
  border-color: color-mix(in srgb, var(--ft-danger-400) 45%, transparent);
}

.txn-form__type-control :deep(.p-togglebutton:nth-of-type(2).p-togglebutton-checked) {
  background: color-mix(in srgb, var(--ft-success-500) 14%, var(--ft-surface-base));
  border-color: color-mix(in srgb, var(--ft-success-400) 45%, transparent);
}

.txn-form__section {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.txn-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  min-width: 0;
}

.txn-form__field-label {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
}

.txn-form__field-label-row {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.txn-form__hint {
  display: inline-flex;
  align-items: center;
  color: var(--ft-text-tertiary);
}

.txn-form__amount-shell {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition: border-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
}

.txn-form__amount-shell:focus-within {
  border-color: var(--ft-border-strong);
  box-shadow: 0 0 0 3px var(--ft-focus-ring);
}

.txn-form__amount-shell.is-invalid {
  border-color: var(--ft-danger-500);
}

.txn-form__amount-input {
  flex: 1;
  min-width: 0;
}

.txn-form__amount-input :deep(.p-inputnumber) {
  width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
}

.txn-form__amount-input :deep(.p-inputnumber-input.p-inputtext) {
  width: 100%;
  min-width: 0;
  padding: 0;

  font-family: var(--ft-font-mono);
  font-size: var(--ft-text-3xl);
  font-weight: var(--ft-font-semibold);
  text-align: center;

  background: transparent;
  border: none;
  box-shadow: none;
}

.txn-form__amount-input :deep(.p-inputnumber-input.p-inputtext:focus) {
  box-shadow: none;
}

.txn-form__amount-currency {
  padding: var(--ft-space-1) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  white-space: nowrap;

  background: color-mix(in srgb, var(--ft-surface-raised) 84%, var(--ft-surface-base));
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md);
}

.txn-form__core-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ft-space-4);
}

.txn-form__quick-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ft-space-4);
  align-items: start;
}

.txn-form__mandatory-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.txn-form__mandatory-chip {
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: flex-start;

  min-height: var(--ft-control-height);
  padding: var(--ft-space-2) var(--ft-space-3);

  color: var(--ft-text-secondary);
  text-align: left;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition: border-color var(--ft-transition-fast), color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.txn-form__mandatory-chip i {
  font-size: var(--ft-text-base);
}

.txn-form__mandatory-chip.is-active {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-success-500) 14%, var(--ft-surface-base));
  border-color: color-mix(in srgb, var(--ft-success-500) 55%, transparent);
}

.txn-form__mandatory-chip:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.txn-form__advanced-toggle {
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;

  min-height: var(--ft-control-height);
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: color-mix(in srgb, var(--ft-surface-base) 92%, transparent);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition: border-color var(--ft-transition-fast), color var(--ft-transition-fast);
}

.txn-form__advanced-toggle:hover {
  color: var(--ft-text-primary);
  border-color: var(--ft-border-strong);
}

.txn-form__advanced-toggle i {
  transition: transform var(--ft-transition-fast);
}

.txn-form__advanced-toggle i.is-open {
  transform: rotate(180deg);
}

.txn-form__advanced-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
}

.txn-form__date-picker :deep(.p-datepicker) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  width: 100%;
}

.txn-form__date-picker :deep(.p-datepicker-input),
.txn-form__date-picker :deep(.p-datepicker input.p-inputtext) {
  width: 100%;
  min-width: 0;
}

.txn-form__date-picker :deep(.p-datepicker-dropdown) {
  width: var(--ft-control-height);
  min-width: var(--ft-control-height);
}

.txn-form__date-picker :deep(.p-datepicker-input:focus-visible),
.txn-form__date-picker :deep(.p-datepicker-dropdown:focus-visible) {
  outline: none;
}

.txn-form__option-line {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.txn-form__option-name {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.txn-form__cat-dot {
  width: var(--ft-space-3);
  height: var(--ft-space-3);
  border-radius: 50%;
}

.txn-form__option-currency {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.txn-form__error {
  font-size: var(--ft-text-sm);
  color: var(--ft-danger-500);
}

.txn-form__footer {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;

  padding-top: var(--ft-space-3);

  border-top: 1px solid var(--ft-border-soft);
}

.txn-form__footer-left,
.txn-form__footer-right {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.txn-form__footer-right {
  justify-content: flex-end;
}

.txn-form__add-another {
  cursor: pointer;

  min-height: var(--ft-control-height);
  padding: 0 var(--ft-space-2);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-link);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-md);

  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.txn-form__add-another:hover:not(:disabled) {
  color: var(--ft-text-link-hover);
  background: color-mix(in srgb, var(--ft-primary-500) 14%, transparent);
}

.txn-form__add-another:disabled {
  cursor: not-allowed;
  color: var(--ft-text-disabled);
  background: transparent;
}

.txn-form__close:focus-visible,
.txn-form__mandatory-chip:focus-visible,
.txn-form__advanced-toggle:focus-visible,
.txn-form__add-another:focus-visible {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.txn-advanced-enter-active,
.txn-advanced-leave-active {
  transition: opacity var(--ft-transition-fast), transform var(--ft-transition-fast);
}

.txn-advanced-enter-from,
.txn-advanced-leave-to {
  transform: translateY(calc(var(--ft-space-2) * -1));
  opacity: 0;
}

@media (width <= 640px) {
  :deep(.p-dialog-mask:has(.txn-dialog)) {
    align-items: flex-end;
  }

  .txn-dialog {
    width: 100vw;
    max-width: 100vw;
    margin: 0;
    border-radius: var(--ft-radius-xl) var(--ft-radius-xl) 0 0;
  }

  .txn-dialog :deep(.p-dialog-content) {
    max-height: 92vh;
    border-radius: inherit;
  }

  .txn-form {
    gap: var(--ft-space-3);
    padding: var(--ft-space-4);
  }

  .txn-form__core-fields,
  .txn-form__quick-row {
    grid-template-columns: 1fr;
    gap: var(--ft-space-3);
  }

  .txn-form__footer {
    position: sticky;
    bottom: calc(env(safe-area-inset-bottom) * -1);

    flex-direction: column;
    align-items: stretch;

    margin: 0 calc(var(--ft-space-4) * -1) calc(var(--ft-space-4) * -1);
    padding: var(--ft-space-3) var(--ft-space-4) calc(var(--ft-space-4) + env(safe-area-inset-bottom));

    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ft-surface-raised) 80%, transparent) 0%,
      var(--ft-surface-raised) 26%
    );
  }

  .txn-form__footer-left,
  .txn-form__footer-right {
    flex-direction: column;
    width: 100%;
  }

  .txn-form__footer-right {
    flex-direction: column;
  }

  .txn-form__footer :deep(.p-button) {
    width: 100%;
  }

  .txn-form__add-another {
    width: 100%;
    text-align: center;
  }
}
</style>
