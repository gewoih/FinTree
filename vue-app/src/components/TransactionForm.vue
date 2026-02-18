<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import UiDialog from '../ui/UiDialog.vue';
import UiButton from '../ui/UiButton.vue';
import UiDatePicker from '../ui/UiDatePicker.vue';
import UiInputNumber from '../ui/UiInputNumber.vue';
import UiInputText from '../ui/UiInputText.vue';
import UiSelect from '../ui/UiSelect.vue';
import UiSelectButton from '../ui/UiSelectButton.vue';
import type {
  NewTransactionPayload,
  Transaction,
  UpdateTransactionPayload,
} from '../types.ts';
import { TRANSACTION_TYPE } from '../types.ts';
import { VALIDATION_RULES } from '../constants';
import { useFormModal } from '../composables/useFormModal';
import { useTransactionFormState } from '../composables/useTransactionFormState';
import { toUtcDateOnlyIso } from '../utils/dateOnly';

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

const {
  store,
  isEditMode,
  maxDate,
  transactionType,
  selectedAccount,
  selectedCategory,
  amount,
  description,
  date,
  isMandatory,
  mandatoryOverridden,
  showAdvanced,
  isDeleting,
  transactionTypeOptions,
  markTouched,
  resetTouched,
  markAllTouched,
  persistLastUsedCategory,
  applyMandatorySuggestion,
  toggleMandatory,
  handleAmountInput,
  refreshMaxDate,
  filteredCategories,
  isIncome,
  currencyCode,
  currencySymbol,
  submitDisabled,
  amountError,
  categoryError,
  accountError,
  dateError
} = useTransactionFormState(props);

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
  <UiDialog
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
            :invalid="Boolean(amountError)"
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
            :invalid="Boolean(categoryError)"
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
            :invalid="Boolean(accountError)"
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
            :invalid="Boolean(dateError)"
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
  </UiDialog>
</template>

<style src="../styles/components/transaction-form.css"></style>
