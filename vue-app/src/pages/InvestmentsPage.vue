<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import type {
  AccountType,
  InvestmentAccountOverviewDto,
  InvestmentsOverviewDto,
  Account,
  AccountDto,
  NetWorthSnapshotDto
} from '../types';
import { apiService } from '../services/api.service';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import AccountFormModal from '../components/AccountFormModal.vue';
import AccountFilters from '../components/AccountFilters.vue';
import AccountBalanceAdjustmentsModal from '../components/AccountBalanceAdjustmentsModal.vue';
import InvestmentAccountCard from '../components/Investments/InvestmentAccountCard.vue';
import InvestmentsAllocationPie from '../components/Investments/InvestmentsAllocationPie.vue';
import NetWorthLineCard from '../components/analytics/NetWorthLineCard.vue';
import SummaryStrip from '../components/analytics/SummaryStrip.vue';
import { mapAccount } from '../utils/mappers';
import { formatCurrency } from '../utils/formatters';

interface InvestmentAccount extends Omit<InvestmentAccountOverviewDto, 'type'> {
  type: AccountType;
  currency?: Account['currency'];
  balance: number;
  balanceInBaseCurrency: number;
  isMain: boolean;
}

const toast = useToast();
const financeStore = useFinanceStore();
const userStore = useUserStore();

const overview = ref<InvestmentsOverviewDto | null>(null);
const overviewLoading = ref(false);
const overviewError = ref<string | null>(null);
const netWorthSnapshots = ref<NetWorthSnapshotDto[]>([]);
const netWorthLoading = ref(false);
const netWorthError = ref<string | null>(null);

const modalVisible = ref(false);
const adjustmentsVisible = ref(false);
const selectedAccount = ref<InvestmentAccount | null>(null);
const pendingLiquidityId = ref<string | null>(null);

const searchText = ref('');
const selectedType = ref<AccountType | null>(null);

const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');

const accounts = computed<InvestmentAccount[]>(() => {
  if (!overview.value) return [];
  const currencyMap = financeStore.currencyByCode;
  return overview.value.accounts.map(item => {
    const mapped = mapAccount({ ...item, isMain: false, isArchived: false } as AccountDto, currencyMap);
    return {
      ...item,
      ...mapped,
      type: mapped.type,
      returnPercent: item.returnPercent,
      lastAdjustedAt: item.lastAdjustedAt,
      isMain: false,
    };
  });
});

const periodShortLabel = computed(() => {
  if (!overview.value) return 'за 6 мес.';
  const from = new Date(overview.value.periodFrom);
  const to = new Date(overview.value.periodTo);
  const diffMonths = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  const months = Math.max(1, diffMonths);
  return `за ${months} мес.`;
});

const totalValue = computed(() =>
  accounts.value.reduce((sum, item) => sum + (item.balanceInBaseCurrency ?? 0), 0)
);
const liquidValue = computed(() =>
  accounts.value.filter(item => item.isLiquid).reduce((sum, item) => sum + (item.balanceInBaseCurrency ?? 0), 0)
);

const totalReturnPercent = computed(() => overview.value?.totalReturnPercent ?? null);

const summaryMetrics = computed(() => {
  const returnValue = totalReturnPercent.value;
  const returnAccent: 'good' | 'poor' | 'neutral' =
    returnValue == null ? 'neutral' : returnValue > 0 ? 'good' : returnValue < 0 ? 'poor' : 'neutral';

  const returnLabel = returnValue == null ? '\u2014' : `${(returnValue * 100).toFixed(1)}%`;

  return [
    {
      key: 'capital',
      label: 'Капитал',
      value: formatCurrency(totalValue.value, baseCurrency.value),
      icon: 'pi pi-wallet',
      accent: 'neutral' as const,
      tooltip: 'Общая стоимость всех инвестиционных счетов в базовой валюте',
    },
    {
      key: 'liquid',
      label: 'Ликвидные',
      value: formatCurrency(liquidValue.value, baseCurrency.value),
      icon: 'pi pi-bolt',
      accent: (liquidValue.value > 0 ? 'good' : 'neutral') as 'good' | 'neutral',
      tooltip: 'Сумма средств на счетах, отмеченных как ликвидные \u2014 те, что можно быстро вывести',
    },
    {
      key: 'return',
      label: 'Доходность',
      value: returnLabel,
      icon: 'pi pi-chart-line',
      accent: returnAccent,
      tooltip: 'Общая доходность портфеля за период',
    },
  ];
});

const sortedNetWorth = computed(() => {
  if (!netWorthSnapshots.value.length) return [];
  return [...netWorthSnapshots.value].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
});

const formatMonthLabel = (year: number, month: number): string => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
};

const netWorthChartData = computed(() => {
  if (!sortedNetWorth.value.length) return null;
  return {
    labels: sortedNetWorth.value.map(item => formatMonthLabel(item.year, item.month)),
    datasets: [
      {
        data: sortedNetWorth.value.map(item => Number(item.netWorth ?? 0)),
        backgroundColor: '#6B82DB',
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  };
});

const filteredAccounts = computed(() => {
  let result = accounts.value;

  if (searchText.value.trim()) {
    const query = searchText.value.trim().toLowerCase();
    result = result.filter(account =>
      account.name.toLowerCase().includes(query) ||
      account.currencyCode.toLowerCase().includes(query) ||
      account.currency?.name?.toLowerCase().includes(query)
    );
  }

  if (selectedType.value !== null) {
    result = result.filter(account => account.type === selectedType.value);
  }

  return result;
});

const hasActiveFilters = computed(() =>
  searchText.value.length > 0 || selectedType.value !== null
);

const showFilters = computed(() => accounts.value.length > 5);

const openModal = () => {
  modalVisible.value = true;
};

const openAdjustments = (account: InvestmentAccount) => {
  selectedAccount.value = account;
  adjustmentsVisible.value = true;
};

const handleLiquidityToggle = async (account: InvestmentAccount, value: boolean) => {
  if (pendingLiquidityId.value) return;
  pendingLiquidityId.value = account.id;
  const previous = account.isLiquid;
  if (overview.value) {
    const target = overview.value.accounts.find(item => item.id === account.id);
    if (target) target.isLiquid = value;
  }
  try {
    const success = await financeStore.updateAccountLiquidity(account.id, value);
    if (!success) {
      if (overview.value) {
        const target = overview.value.accounts.find(item => item.id === account.id);
        if (target) target.isLiquid = previous;
      }
      toast.add({
        severity: 'error',
        summary: 'Не удалось обновить',
        detail: 'Попробуйте еще раз.',
        life: 2500,
      });
    }
  } finally {
    pendingLiquidityId.value = null;
  }
};

const clearFilters = () => {
  searchText.value = '';
  selectedType.value = null;
};

const loadOverview = async () => {
  overviewLoading.value = true;
  overviewError.value = null;
  try {
    overview.value = await apiService.getInvestmentsOverview();
  } catch (error) {
    console.error('Не удалось загрузить инвестиции:', error);
    overviewError.value = 'Не удалось загрузить данные по инвестициям.';
    overview.value = null;
  } finally {
    overviewLoading.value = false;
  }
};

const loadNetWorth = async (months = 12) => {
  netWorthLoading.value = true;
  netWorthError.value = null;
  try {
    netWorthSnapshots.value = await apiService.getNetWorthTrend(months);
  } catch (error) {
    console.error('Не удалось загрузить Net Worth:', error);
    netWorthError.value = 'Не удалось загрузить динамику капитала.';
    netWorthSnapshots.value = [];
  } finally {
    netWorthLoading.value = false;
  }
};

const refreshInvestmentsData = async () => {
  await Promise.all([
    loadOverview(),
    loadNetWorth(12),
  ]);
};

watch(
  () => adjustmentsVisible.value,
  (visible, prev) => {
    if (prev && !visible) {
      void refreshInvestmentsData();
    }
  }
);

watch(
  () => modalVisible.value,
  (visible, prev) => {
    if (prev && !visible) {
      void refreshInvestmentsData();
    }
  }
);

onMounted(async () => {
  await userStore.fetchCurrentUser();
  await financeStore.fetchCurrencies();
  await refreshInvestmentsData();
});
</script>

<template>
  <PageContainer class="investments-page">
    <PageHeader
      title="Инвестиции"
      subtitle="Контролируйте инвестиционные счета без лишней детализации"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Инвестиции' }
      ]"
    />

    <div class="investments-grid">
      <!-- Section 1: Summary Strip -->
      <SummaryStrip
        class="investments-grid__item investments-grid__item--span-12"
        :loading="overviewLoading"
        :error="overviewError"
        :metrics="summaryMetrics"
        @retry="refreshInvestmentsData"
      />

      <!-- Section 2: Charts row -->
      <InvestmentsAllocationPie
        v-if="accounts.length > 0"
        class="investments-grid__item investments-grid__item--span-6"
        :accounts="accounts"
        :base-currency-code="baseCurrency"
        :loading="overviewLoading"
      />

      <NetWorthLineCard
        v-if="accounts.length > 0"
        class="investments-grid__item investments-grid__item--span-6"
        :loading="netWorthLoading"
        :error="netWorthError"
        :chart-data="netWorthChartData"
        :currency="baseCurrency"
        chart-type="bar"
        @retry="loadNetWorth(12)"
      />

      <!-- Section 3: Account Cards -->
      <div class="investments-grid__item investments-grid__item--span-12 investments-accounts">
        <div class="investments-accounts__header">
          <h2 class="investments-accounts__title">Счета</h2>
          <UiButton
            label="Добавить счет"
            icon="pi pi-plus"
            size="sm"
            @click="openModal"
          />
        </div>

        <AccountFilters
          v-if="showFilters"
          v-model:search-text="searchText"
          v-model:selected-type="selectedType"
          :available-types="[3, 2, 4]"
          @clear-filters="clearFilters"
        />

        <div
          v-if="overviewLoading && accounts.length === 0"
          class="investments-accounts__skeleton"
        >
          <UiSkeleton
            v-for="i in 4"
            :key="i"
            height="180px"
          />
        </div>

        <div
          v-else-if="overviewError && accounts.length === 0"
          class="investments-accounts__message"
        >
          <Message
            severity="error"
            icon="pi pi-exclamation-triangle"
            :closable="false"
          >
            {{ overviewError }}
          </Message>
        </div>

        <EmptyState
          v-else-if="accounts.length === 0"
          icon="pi pi-briefcase"
          title="Нет инвестиционных счетов"
          description="Добавьте брокерский счет, вклад или криптовалютный аккаунт, чтобы следить за доходностью."
          action-label="Добавить счет"
          action-icon="pi pi-plus"
          @action="openModal"
        />

        <EmptyState
          v-else-if="filteredAccounts.length === 0 && hasActiveFilters"
          icon="pi pi-filter-slash"
          title="Ничего не найдено"
          description="По выбранным фильтрам нет счетов. Попробуйте изменить параметры."
          action-label="Сбросить фильтры"
          action-icon="pi pi-refresh"
          @action="clearFilters"
        />

        <div
          v-else
          class="investments-accounts__grid"
        >
          <InvestmentAccountCard
            v-for="account in filteredAccounts"
            :key="account.id"
            :account="account"
            :base-currency-code="baseCurrency"
            :period-label="periodShortLabel"
            :is-liquidity-loading="pendingLiquidityId === account.id"
            @open="openAdjustments(account)"
            @update-liquidity="handleLiquidityToggle(account, $event)"
          />
        </div>
      </div>
    </div>

    <AccountFormModal
      v-model:visible="modalVisible"
      :allowed-types="[3, 2, 4]"
    />
    <AccountBalanceAdjustmentsModal
      v-model:visible="adjustmentsVisible"
      :account="selectedAccount"
    />
  </PageContainer>
</template>

<style scoped>
.investments-page {
  display: grid;
  gap: var(--ft-space-6);
}

.investments-grid {
  display: grid;
  gap: var(--ft-space-4);
}

.investments-grid__item {
  grid-column: span 12;
}

.investments-accounts {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.investments-accounts__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--ft-space-4);
}

.investments-accounts__title {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.investments-accounts__skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--ft-space-4);
}

.investments-accounts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--ft-space-4);
}

.investments-accounts__message {
  padding: var(--ft-space-2);
}

@media (min-width: 1024px) {
  .investments-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .investments-grid__item--span-12 {
    grid-column: 1 / -1;
  }

  .investments-grid__item--span-6 {
    grid-column: span 6;
  }
}

@media (min-width: 641px) and (max-width: 1023px) {
  .investments-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .investments-grid__item--span-12 {
    grid-column: 1 / -1;
  }

  .investments-grid__item--span-6 {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .investments-page {
    gap: var(--ft-space-4);
  }

  .investments-grid {
    gap: var(--ft-space-3);
  }

  .investments-accounts__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
