<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { Account, AccountBalanceAdjustmentDto } from '../types';
import { apiService } from '../services/api.service';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useFinanceStore } from '../stores/finance';

const props = defineProps<{
  visible: boolean;
  account: Account | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const toast = useToast();
const financeStore = useFinanceStore();

const adjustments = ref<AccountBalanceAdjustmentDto[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const newBalance = ref<number | null>(null);
const saving = ref(false);

const accountCurrency = computed(
  () => props.account?.currency?.code ?? props.account?.currencyCode ?? 'RUB'
);

const currentBalanceLabel = computed(() => {
  if (!props.account) return '—';
  return formatCurrency(props.account.balance ?? 0, accountCurrency.value);
});

const formattedAdjustments = computed(() =>
  adjustments.value.map(adj => ({
    ...adj,
    dateLabel: formatDate(adj.occurredAt),
    amountLabel: formatCurrency(Number(adj.amount ?? 0), accountCurrency.value),
  }))
);

const loadAdjustments = async () => {
  if (!props.account) return;
  loading.value = true;
  error.value = null;
  try {
    const data = await apiService.getAccountBalanceAdjustments(props.account.id);
    adjustments.value = data ?? [];
  } catch (err) {
    console.error('Не удалось загрузить корректировки:', err);
    error.value = 'Не удалось загрузить корректировки.';
    adjustments.value = [];
  } finally {
    loading.value = false;
  }
};

const submitAdjustment = async () => {
  if (!props.account) return;
  if (newBalance.value == null) {
    toast.add({
      severity: 'warn',
      summary: 'Введите баланс',
      detail: 'Укажите текущий баланс для корректировки.',
      life: 2500,
    });
    return;
  }

  saving.value = true;
  try {
    await apiService.createAccountBalanceAdjustment(props.account.id, newBalance.value);
    await loadAdjustments();
    await financeStore.fetchAccounts(true);
    toast.add({
      severity: 'success',
      summary: 'Баланс обновлен',
      detail: 'Корректировка сохранена.',
      life: 2500,
    });
    newBalance.value = null;
  } catch (err) {
    console.error('Не удалось сохранить корректировку:', err);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось сохранить корректировку.',
      life: 2500,
    });
  } finally {
    saving.value = false;
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      newBalance.value = props.account?.balance ?? null;
      void loadAdjustments();
    }
  }
);

watch(
  () => props.account?.id,
  () => {
    if (props.visible) {
      newBalance.value = props.account?.balance ?? null;
      void loadAdjustments();
    }
  }
);
</script>

<template>
  <Dialog
    :visible="props.visible"
    header="Корректировки баланса"
    modal
    :style="{ width: '560px' }"
    dismissable-mask
    @update:visible="val => emit('update:visible', val)"
  >
    <div class="adjustments-modal">
      <div class="adjustments-modal__header">
        <div>
          <h4>{{ props.account?.name ?? 'Счет' }}</h4>
          <p>Текущий баланс: <strong>{{ currentBalanceLabel }}</strong></p>
        </div>
      </div>

      <div class="adjustments-modal__form">
        <FormField label="Новый баланс" required>
          <template #default="{ fieldAttrs }">
            <InputNumber
              v-model="newBalance"
              :input-id="fieldAttrs.id"
              :min-fraction-digits="2"
              :max-fraction-digits="2"
              :use-grouping="true"
              class="w-full"
              placeholder="Введите текущий баланс"
            />
          </template>
          <template #hint>
            Баланс указывается в валюте счёта ({{ accountCurrency }}).
          </template>
        </FormField>

        <div class="adjustments-modal__actions">
          <AppButton
            variant="ghost"
            type="button"
            @click="emit('update:visible', false)"
          >
            Закрыть
          </AppButton>
          <AppButton
            type="button"
            icon="pi pi-check"
            :loading="saving"
            :disabled="saving"
            @click="submitAdjustment"
          >
            Сохранить корректировку
          </AppButton>
        </div>
      </div>

      <div class="adjustments-modal__list">
        <h5>История корректировок</h5>

        <div
          v-if="loading"
          class="adjustments-modal__skeleton"
        >
          <UiSkeleton
            v-for="i in 3"
            :key="i"
            height="44px"
          />
        </div>

        <div
          v-else-if="error"
          class="adjustments-modal__error"
        >
          <Message
            severity="error"
            icon="pi pi-exclamation-triangle"
            :closable="false"
          >
            {{ error }}
          </Message>
        </div>

        <EmptyState
          v-else-if="formattedAdjustments.length === 0"
          icon="pi pi-history"
          title="Нет корректировок"
          description="Добавьте первую корректировку, чтобы зафиксировать актуальный баланс."
        />

        <ul
          v-else
          class="adjustments-list"
        >
          <li
            v-for="adjustment in formattedAdjustments"
            :key="adjustment.id"
            class="adjustments-list__item"
          >
            <div>
              <div class="adjustments-list__amount">
                {{ adjustment.amountLabel }}
              </div>
              <div class="adjustments-list__date">
                {{ adjustment.dateLabel }}
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.adjustments-modal {
  display: grid;
  gap: var(--ft-space-4);
}

.adjustments-modal__header h4 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
}

.adjustments-modal__header p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
}

.adjustments-modal__form {
  display: grid;
  gap: var(--ft-space-3);
}

.adjustments-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ft-space-3);
}

.adjustments-modal__list h5 {
  margin: 0 0 var(--ft-space-2);
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
}

.adjustments-modal__skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

.adjustments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--ft-space-2);
}

.adjustments-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ft-space-2) var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
}

.adjustments-list__amount {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.adjustments-list__date {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}
</style>
