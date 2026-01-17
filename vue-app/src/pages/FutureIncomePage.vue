<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import PageHeader from '../components/common/PageHeader.vue';
import { apiService } from '../services/api.service';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import type {
  CreateIncomeInstrumentPayload,
  FutureIncomeOverviewDto,
  IncomeInstrumentProjectionDto,
  IncomeInstrumentType,
  IncomeBreakdownDto,
} from '../types';
import { formatCurrency } from '../utils/formatters';

interface InstrumentFormState {
  name: string;
  type: IncomeInstrumentType;
  currencyCode: string;
  principalAmount: number | null;
  expectedAnnualYieldRate: number | null;
  monthlyContribution: number | null;
  notes: string;
}

const financeStore = useFinanceStore();
const userStore = useUserStore();
const toast = useToast();

const overview = ref<FutureIncomeOverviewDto | null>(null);
const overviewLoading = ref(false);
const overviewError = ref<string | null>(null);
const selectedSalaryWindow = ref<number>(6);
const instrumentDialogVisible = ref(false);
const instrumentSubmitting = ref(false);

const salaryWindowOptions = [
  { label: '3 месяца', value: 3 },
  { label: '6 месяцев', value: 6 },
  { label: '12 месяцев', value: 12 },
] as const;

const instrumentTypeOptions = [
  { label: 'Зарплата', value: 'Salary' },
  { label: 'Вклад', value: 'Deposit' },
  { label: 'Инвестиции', value: 'Investment' },
  { label: 'Другое', value: 'Other' },
] satisfies ReadonlyArray<{ label: string; value: IncomeInstrumentType }>;

const instrumentTypeLabels: Record<IncomeInstrumentType, string> = {
  Salary: 'Зарплата',
  Deposit: 'Вклад',
  Investment: 'Инвестиции',
  Other: 'Другое',
};

const instrumentForm = reactive<InstrumentFormState>({
  name: '',
  type: 'Deposit',
  currencyCode: '',
  principalAmount: null,
  expectedAnnualYieldRate: 8,
  monthlyContribution: null,
  notes: '',
});

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');
const currencyOptions = computed(() =>
  financeStore.currencies.map((currency) => ({
    label: `${currency.code} · ${currency.name}`,
    value: currency.code,
  })),
);

const instruments = computed<IncomeInstrumentProjectionDto[]>(() => overview.value?.instruments ?? []);
const salaryProjection = computed(() => overview.value?.salary ?? null);
const salarySources = computed<IncomeBreakdownDto[]>(() => salaryProjection.value?.sources ?? []);

const totalMonthlyIncome = computed(() => overview.value?.totalExpectedMonthlyIncome ?? 0);
const totalAnnualIncome = computed(() => overview.value?.totalExpectedAnnualIncome ?? 0);

const hasInstruments = computed(() => instruments.value.length > 0);
const hasSalaryProjection = computed(() => salaryProjection.value !== null);

const currenciesLoading = computed(() => financeStore.areCurrenciesLoading);

function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const message = (error as { userMessage?: string }).userMessage;
    if (typeof message === 'string' && message.trim().length) {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function resetInstrumentForm() {
  instrumentForm.name = '';
  instrumentForm.type = 'Deposit';
  instrumentForm.currencyCode = baseCurrency.value;
  instrumentForm.principalAmount = null;
  instrumentForm.expectedAnnualYieldRate = 8;
  instrumentForm.monthlyContribution = null;
  instrumentForm.notes = '';
}

async function loadOverview(force = false) {
  if (overviewLoading.value && !force) return;
  overviewLoading.value = true;
  overviewError.value = null;
  try {
    const data = await apiService.getFutureIncomeOverview(selectedSalaryWindow.value);
    overview.value = data;
  } catch (error) {
    overviewError.value = resolveErrorMessage(error, 'Не удалось получить прогноз доходов.');
    overview.value = null;
  } finally {
    overviewLoading.value = false;
  }
}

function openInstrumentDialog() {
  if (!instrumentDialogVisible.value) {
    resetInstrumentForm();
  }
  instrumentDialogVisible.value = true;
}

function closeInstrumentDialog() {
  instrumentDialogVisible.value = false;
}

async function handleInstrumentSubmit() {
  if (!instrumentForm.name.trim()) {
    toast.add({ severity: 'warn', summary: 'Введите название инструмента', life: 2500 });
    return;
  }

  if (!instrumentForm.currencyCode) {
    toast.add({ severity: 'warn', summary: 'Выберите валюту инструмента', life: 2500 });
    return;
  }

  if (!instrumentForm.principalAmount || instrumentForm.principalAmount <= 0) {
    toast.add({ severity: 'warn', summary: 'Укажите сумму вклада или портфеля', life: 2500 });
    return;
  }

  if (instrumentForm.expectedAnnualYieldRate == null || instrumentForm.expectedAnnualYieldRate < 0) {
    toast.add({ severity: 'warn', summary: 'Укажите ожидаемую доходность', life: 2500 });
    return;
  }

  const payload: CreateIncomeInstrumentPayload = {
    name: instrumentForm.name.trim(),
    currencyCode: instrumentForm.currencyCode,
    type: instrumentForm.type,
    principalAmount: Number(instrumentForm.principalAmount),
    expectedAnnualYieldRate: Number(instrumentForm.expectedAnnualYieldRate) / 100,
    monthlyContribution:
      instrumentForm.monthlyContribution && instrumentForm.monthlyContribution > 0
        ? Number(instrumentForm.monthlyContribution)
        : null,
    notes: instrumentForm.notes.trim() ? instrumentForm.notes.trim() : null,
  };

  instrumentSubmitting.value = true;
  try {
    await apiService.createIncomeInstrument(payload);
    toast.add({
      severity: 'success',
      summary: 'Инструмент добавлен',
      detail: 'Доход будет учтен в прогнозе после обновления.',
      life: 3000,
    });
    instrumentDialogVisible.value = false;
    await loadOverview(true);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Не удалось сохранить инструмент',
      detail: resolveErrorMessage(error, 'Попробуйте повторить попытку позже.'),
      life: 4000,
    });
  } finally {
    instrumentSubmitting.value = false;
  }
}

watch(selectedSalaryWindow, () => {
  void loadOverview(true);
});

watch(baseCurrency, (code) => {
  if (!instrumentDialogVisible.value) {
    instrumentForm.currencyCode = code;
  }
});

onMounted(async () => {
  await Promise.all([
    userStore.fetchCurrentUser(),
    financeStore.fetchCurrencies(),
  ]);

  if (!instrumentForm.currencyCode) {
    instrumentForm.currencyCode = baseCurrency.value;
  }

  await loadOverview();
});
</script>

<template>
  <PageContainer class="future-income-page">
    <PageHeader
      title="План будущих доходов"
      description="Отслеживайте зарплату, вклады и инвестиции с прогнозом по базовой валюте"
    >
      <template #actions>
        <UiButton
          label="Добавить инструмент"
          icon="pi pi-plus"
          @click="openInstrumentDialog"
        />
      </template>
    </PageHeader>

    <div class="future-income-grid">
      <Card class="future-income-grid__summary">
        <template #title>
          Общий прогноз доходов
        </template>
        <template #content>
          <div v-if="overviewLoading" class="future-income-summary__skeleton">
            <Skeleton height="28px" width="70%" class="mb-3" />
            <Skeleton height="18px" width="50%" class="mb-2" />
            <Skeleton height="18px" width="40%" />
          </div>

          <Message
            v-else-if="overviewError"
            severity="error"
            :closable="false"
            class="mb-0"
          >
            <div class="future-income-summary__error">
              <span>{{ overviewError }}</span>
              <Button
                label="Повторить"
                icon="pi pi-refresh"
                text
                size="small"
                @click="loadOverview(true)"
              />
            </div>
          </Message>

          <div v-else class="future-income-summary__content">
            <p class="future-income-summary__lead">
              {{ formatCurrency(totalMonthlyIncome, baseCurrency) }} в месяц
            </p>
            <p class="future-income-summary__support">
              ≈ {{ formatCurrency(totalAnnualIncome, baseCurrency) }} в год
            </p>
            <ul class="future-income-summary__insights">
              <li>
                <i class="pi pi-briefcase" aria-hidden="true" />
                Зарплата: <strong>{{
                  salaryProjection
                    ? formatCurrency(salaryProjection.monthlyAverage, baseCurrency)
                    : '—'
                }}</strong>
              </li>
              <li>
                <i class="pi pi-chart-line" aria-hidden="true" />
                Инструменты: <strong>{{
                  formatCurrency(
                    instruments.reduce(
                      (sum, item) => sum + item.expectedMonthlyIncomeInBaseCurrency,
                      0,
                    ),
                    baseCurrency,
                  )
                }}</strong>
              </li>
            </ul>
          </div>
        </template>
      </Card>

      <Card class="future-income-grid__salary">
        <template #title>
          Динамика зарплаты
        </template>
        <template #subtitle>
          Среднее по выбранному периоду и вклад источников дохода
        </template>
        <template #content>
          <div class="future-income-salary__controls">
            <SelectButton
              v-model="selectedSalaryWindow"
              :options="salaryWindowOptions"
              option-label="label"
              option-value="value"
              size="small"
            />
          </div>

          <div v-if="overviewLoading" class="future-income-salary__skeleton">
            <Skeleton height="48px" width="80%" class="mb-4" />
            <Skeleton height="18px" width="60%" class="mb-2" v-for="i in 3" :key="i" />
          </div>

          <EmptyState
            v-else-if="!hasSalaryProjection"
            icon="pi-briefcase"
            title="Недостаточно данных"
            description="Добавьте доходы в транзакциях или создайте инструмент типа 'Зарплата'."
          />

          <div v-else class="future-income-salary__content">
            <p class="future-income-salary__lead">
              {{ formatCurrency(salaryProjection?.monthlyAverage ?? 0, baseCurrency) }} в месяц
            </p>
            <p class="future-income-salary__support">
              ≈ {{ formatCurrency(salaryProjection?.annualProjection ?? 0, baseCurrency) }} в год
            </p>

            <ul class="future-income-salary__breakdown">
              <li v-for="source in salarySources" :key="source.label" class="future-income-salary__item">
                <div class="future-income-salary__item-header">
                  <span class="future-income-salary__item-label">{{ source.label }}</span>
                  <Tag
                    :value="formatPercent(source.share, 0)"
                    severity="info"
                    rounded
                    class="future-income-salary__tag"
                  />
                </div>
                <p class="future-income-salary__item-amount">
                  {{ formatCurrency(source.monthlyAmount, baseCurrency) }} / мес
                </p>
              </li>
            </ul>
          </div>
        </template>
      </Card>

      <Card class="future-income-grid__instruments">
        <template #title>
          Инвестиционные инструменты
        </template>
        <template #subtitle>
          Отслеживайте вклады, брокерские счета и другие источники дохода
        </template>
        <template #content>
          <div v-if="overviewLoading" class="future-income-instruments__skeleton">
            <Skeleton height="48px" class="mb-3" />
            <Skeleton height="48px" class="mb-3" />
            <Skeleton height="48px" />
          </div>

          <EmptyState
            v-else-if="!hasInstruments"
            icon="pi-chart-line"
            title="Инструменты не добавлены"
            description="Добавьте вклад или инвестиционный счёт, чтобы увидеть прогноз доходности."
            action-label="Добавить инструмент"
            action-icon="pi pi-plus"
            @action="openInstrumentDialog"
          />

          <div v-else class="future-income-instruments__table">
            <DataTable
              :value="instruments"
              data-key="id"
              class="future-income-instruments__datatable"
              size="small"
              striped-rows
            >
              <Column field="name" header="Название" sortable />
              <Column header="Тип">
                <template #body="slotProps">
                  {{ instrumentTypeLabels[slotProps.data.type as IncomeInstrumentType] ?? slotProps.data.type }}
                </template>
              </Column>
              <Column header="Основная сумма">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.principalAmountInBaseCurrency, baseCurrency) }}
                </template>
              </Column>
              <Column header="Доходность">
                <template #body="slotProps">
                  {{ formatPercent(slotProps.data.expectedAnnualYieldRate, 1) }} / год
                </template>
              </Column>
              <Column header="Взнос">
                <template #body="slotProps">
                  <span v-if="slotProps.data.monthlyContributionInBaseCurrency">
                    {{ formatCurrency(slotProps.data.monthlyContributionInBaseCurrency, baseCurrency) }}
                  </span>
                  <span v-else>—</span>
                </template>
              </Column>
              <Column header="Ожидаемо / мес">
                <template #body="slotProps">
                  {{ formatCurrency(slotProps.data.expectedMonthlyIncomeInBaseCurrency, baseCurrency) }}
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>
    </div>

    <Dialog
      v-model:visible="instrumentDialogVisible"
      header="Новый инвестиционный инструмент"
      modal
      class="future-income-dialog"
      :breakpoints="{ '768px': '95vw' }"
      :closable="!instrumentSubmitting"
    >
      <div class="future-income-dialog__content">
        <FormField label="Название" required>
          <InputText v-model="instrumentForm.name" autocomplete="off" maxlength="120" />
        </FormField>

        <FormField label="Тип" required>
          <Select
            v-model="instrumentForm.type"
            :options="instrumentTypeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </FormField>

        <FormField label="Валюта" required>
          <Select
            v-model="instrumentForm.currencyCode"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :loading="currenciesLoading"
            placeholder="Выберите валюту"
          />
        </FormField>

        <FormField label="Основная сумма" helper="Текущий размер вклада или портфеля" required>
          <InputNumber
            v-model="instrumentForm.principalAmount"
            mode="currency"
            :currency="instrumentForm.currencyCode || baseCurrency"
            locale="ru-RU"
            :min="0"
            :step="1000"
            class="w-full"
          />
        </FormField>

        <FormField label="Ожидаемая доходность, % годовых" required>
          <InputNumber
            v-model="instrumentForm.expectedAnnualYieldRate"
            mode="decimal"
            locale="ru-RU"
            :min="0"
            :max="500"
            :step="0.1"
            suffix=" %"
            class="w-full"
          />
        </FormField>

        <FormField label="Ежемесячный взнос" helper="Необязательно">
          <InputNumber
            v-model="instrumentForm.monthlyContribution"
            mode="currency"
            :currency="instrumentForm.currencyCode || baseCurrency"
            locale="ru-RU"
            :min="0"
            :step="100"
            class="w-full"
          />
        </FormField>

        <FormField label="Комментарий">
          <Textarea v-model="instrumentForm.notes" auto-resize rows="3" maxlength="500" />
        </FormField>
      </div>

      <template #footer>
        <Button
          label="Отмена"
          text
          :disabled="instrumentSubmitting"
          @click="closeInstrumentDialog"
        />
        <Button
          label="Сохранить"
          icon="pi pi-check"
          :loading="instrumentSubmitting"
          @click="handleInstrumentSubmit"
        />
      </template>
    </Dialog>
  </PageContainer>
</template>

<style scoped>
.future-income-page {
  display: grid;
  gap: var(--ft-space-6);
}

.future-income-grid {
  display: grid;
  gap: var(--ft-space-4);
}

.future-income-grid__summary,
.future-income-grid__salary,
.future-income-grid__instruments {
  grid-column: 1 / -1;
}

@media (min-width: 1024px) {
  .future-income-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .future-income-grid__summary {
    grid-column: 1 / span 5;
  }

  .future-income-grid__salary {
    grid-column: 6 / -1;
  }

  .future-income-grid__instruments {
    grid-column: 1 / -1;
  }
}

.future-income-summary__content {
  display: grid;
  gap: var(--ft-space-3);
}

.future-income-summary__lead {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--ft-text-strong);
}

.future-income-summary__support {
  margin: 0;
  color: var(--ft-text-muted);
}

.future-income-summary__insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--ft-space-2);
}

.future-income-summary__insights li {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  color: var(--ft-text-secondary);
}

.future-income-summary__insights i {
  color: var(--ft-primary-500);
}

.future-income-summary__skeleton,
.future-income-instruments__skeleton,
.future-income-salary__skeleton {
  display: grid;
  gap: var(--ft-space-3);
}

.future-income-summary__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-3);
}

.future-income-salary__controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--ft-space-3);
}

.future-income-salary__content {
  display: grid;
  gap: var(--ft-space-3);
}

.future-income-salary__lead {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.future-income-salary__support {
  margin: 0;
  color: var(--ft-text-muted);
}

.future-income-salary__breakdown {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--ft-space-3);
}

.future-income-salary__item {
  display: grid;
  gap: var(--ft-space-1);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-subtle);
}

.future-income-salary__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-2);
}

.future-income-salary__item-label {
  font-weight: 600;
}

.future-income-salary__item-amount {
  margin: 0;
  color: var(--ft-text-secondary);
}

.future-income-instruments__datatable {
  width: 100%;
}

.future-income-dialog__content {
  display: grid;
  gap: var(--ft-space-3);
}

.future-income-dialog {
  width: 540px;
}

.future-income-dialog :deep(.p-select),
.future-income-dialog :deep(.p-inputtext),
.future-income-dialog :deep(.p-inputnumber-input) {
  width: 100%;
}

.future-income-dialog :deep(.p-dialog-content) {
  padding-top: var(--ft-space-4);
}
</style>
