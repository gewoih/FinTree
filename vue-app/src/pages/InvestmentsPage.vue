<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type {
  AccountType,
  InvestmentAccountOverviewDto,
  Account,
} from '../types';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import AccountFormModal from '../components/AccountFormModal.vue';
import AccountBalanceAdjustmentsModal from '../components/AccountBalanceAdjustmentsModal.vue';
import InvestmentsAccountsSection from '../components/Investments/InvestmentsAccountsSection.vue';
import InvestmentsAllocationPie from '../components/Investments/InvestmentsAllocationPie.vue';
import NetWorthLineCard from '../components/analytics/NetWorthLineCard.vue';
import SummaryStrip from '../components/analytics/SummaryStrip.vue';
import { formatCurrency } from '../utils/formatters';
import { useChartColors } from '../composables/useChartColors';
import { useInvestmentsData } from '../composables/useInvestmentsData';
import PageContainer from '../components/layout/PageContainer.vue';
import PageHeader from '../components/common/PageHeader.vue';

type InvestmentsView = 'active' | 'archived';

interface InvestmentAccount {
  id: string;
  name: string;
  currencyCode: string;
  type: AccountType;
  isLiquid: boolean;
  isArchived: boolean;
  isMain: boolean;
  balance: number;
  balanceInBaseCurrency: number;
  lastAdjustedAt: string | null;
  returnPercent: number | null;
  currency?: Account['currency'];
}

const INVESTMENT_ACCOUNT_TYPES: AccountType[] = [3, 2, 4];

const toast = useToast();
const confirm = useConfirm();
const financeStore = useFinanceStore();
const userStore = useUserStore();
const { colors: chartColors } = useChartColors();
const {
  overview,
  overviewLoading,
  overviewError,
  netWorthSnapshots,
  netWorthLoading,
  netWorthError,
  loadOverview,
  loadNetWorth,
  refreshInvestmentsData,
} = useInvestmentsData();

const modalVisible = ref(false);
const adjustmentsVisible = ref(false);
const selectedAccount = ref<InvestmentAccount | null>(null);
const editingAccount = ref<Account | null>(null);
const pendingLiquidityId = ref<string | null>(null);
const pendingArchiveId = ref<string | null>(null);
const pendingUnarchiveId = ref<string | null>(null);

const view = ref<InvestmentsView>('active');
const searchText = ref('');
const selectedType = ref<AccountType | null>(null);

const isReadOnlyMode = computed(() => userStore.isReadOnlyMode);
const baseCurrency = computed(() => userStore.baseCurrencyCode ?? 'RUB');

const overviewById = computed(() => {
  const map = new Map<string, InvestmentAccountOverviewDto>();
  for (const item of overview.value?.accounts ?? []) {
    map.set(item.id, item);
  }
  return map;
});

const mapInvestmentAccount = (
  account: Account,
  overviewItem?: InvestmentAccountOverviewDto
): InvestmentAccount => ({
  id: account.id,
  name: account.name,
  currencyCode: account.currencyCode,
  type: account.type,
  isLiquid: account.isLiquid,
  isArchived: account.isArchived,
  isMain: account.isMain,
  balance: Number(account.balance ?? 0),
  balanceInBaseCurrency: Number(account.balanceInBaseCurrency ?? account.balance ?? 0),
  lastAdjustedAt: overviewItem?.lastAdjustedAt ?? null,
  returnPercent: overviewItem?.returnPercent ?? null,
  currency: account.currency,
});

const activeAccounts = computed<InvestmentAccount[]>(() =>
  (financeStore.accounts ?? [])
    .filter(account => INVESTMENT_ACCOUNT_TYPES.includes(account.type))
    .map(account => mapInvestmentAccount(account, overviewById.value.get(account.id)))
);

const archivedAccounts = computed<InvestmentAccount[]>(() =>
  (financeStore.archivedAccounts ?? [])
    .filter(account => INVESTMENT_ACCOUNT_TYPES.includes(account.type))
    .map(account => mapInvestmentAccount(account, overviewById.value.get(account.id)))
);

const visibleAccounts = computed(() =>
  view.value === 'active' ? activeAccounts.value : archivedAccounts.value
);

const currentAccountsState = computed(() =>
  view.value === 'active'
    ? financeStore.accountsState
    : financeStore.archivedAccountsState
);

const currentAccountsError = computed(() =>
  view.value === 'active'
    ? financeStore.accountsError ?? overviewError.value
    : financeStore.archivedAccountsError
);

const hasVisibleAccounts = computed(() => visibleAccounts.value.length > 0);

const shouldShowAccountsSkeleton = computed(() => {
  if (hasVisibleAccounts.value) return false;

  const isAccountStateLoading =
    currentAccountsState.value === 'idle' || currentAccountsState.value === 'loading';

  if (view.value === 'active') {
    return isAccountStateLoading || overviewLoading.value;
  }

  return isAccountStateLoading;
});

const shouldShowAccountsErrorState = computed(() => {
  if (hasVisibleAccounts.value) return false;

  if (view.value === 'active') {
    return currentAccountsState.value === 'error' || Boolean(overviewError.value);
  }

  return currentAccountsState.value === 'error';
});

const hasAnyInvestmentAccounts = computed(() =>
  activeAccounts.value.length + archivedAccounts.value.length > 0
);

const totalValue = computed(() =>
  activeAccounts.value.reduce((sum, item) => sum + (item.balanceInBaseCurrency ?? 0), 0)
);

const liquidValue = computed(() =>
  activeAccounts.value
    .filter(item => item.isLiquid)
    .reduce((sum, item) => sum + (item.balanceInBaseCurrency ?? 0), 0)
);

const totalReturnPercent = computed(() =>
  activeAccounts.value.length > 0 ? overview.value?.totalReturnPercent ?? null : null
);

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
      tooltip: 'Общая стоимость активных инвестиционных счетов в базовой валюте',
    },
    {
      key: 'liquid',
      label: 'Ликвидная часть',
      value: formatCurrency(liquidValue.value, baseCurrency.value),
      icon: 'pi pi-bolt',
      accent: (liquidValue.value > 0 ? 'good' : 'neutral') as 'good' | 'neutral',
      tooltip: 'Сумма средств на ликвидных активных счетах: их можно вывести без существенных потерь.',
    },
    {
      key: 'return',
      label: 'Доходность',
      value: returnLabel,
      icon: 'pi pi-chart-line',
      accent: returnAccent,
      tooltip: 'Общая доходность активной части портфеля за период',
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
        backgroundColor: chartColors.primary,
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  };
});

const filteredAccounts = computed(() => {
  let result = [...visibleAccounts.value];

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

const showFilters = computed(() => visibleAccounts.value.length >= 5);

const openModal = () => {
  if (isReadOnlyMode.value) return;
  editingAccount.value = null;
  modalVisible.value = true;
};

const handleEditAccount = (account: InvestmentAccount) => {
  if (isReadOnlyMode.value) return;
  const rawAccount =
    [...(financeStore.accounts ?? []), ...(financeStore.archivedAccounts ?? [])].find(
      a => a.id === account.id,
    ) ?? null;
  editingAccount.value = rawAccount;
  modalVisible.value = true;
};

const openAdjustments = (account: InvestmentAccount) => {
  if (view.value === 'archived' || isReadOnlyMode.value) return;
  selectedAccount.value = account;
  adjustmentsVisible.value = true;
};

const handleLiquidityToggle = async (account: InvestmentAccount, value: boolean) => {
  if (isReadOnlyMode.value || view.value === 'archived') return;
  if (pendingLiquidityId.value) return;

  pendingLiquidityId.value = account.id;
  const previous = account.isLiquid;
  const overviewAccount = overview.value?.accounts.find(item => item.id === account.id);
  if (overviewAccount) {
    overviewAccount.isLiquid = value;
  }

  try {
    const success = await financeStore.updateAccountLiquidity(account.id, value);
    if (!success) {
      if (overviewAccount) {
        overviewAccount.isLiquid = previous;
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

const handleArchiveAccount = (account: InvestmentAccount) => {
  if (isReadOnlyMode.value || pendingArchiveId.value || view.value === 'archived') return;

  confirm.require({
    message: `Архивировать счет "${account.name}"? Он будет исключен из активных метрик, но история сохранится.`,
    header: 'Архивация счета',
    icon: 'pi pi-inbox',
    rejectLabel: 'Отмена',
    acceptLabel: 'Архивировать',
    accept: async () => {
      pendingArchiveId.value = account.id;
      try {
        const success = await financeStore.archiveAccount(account.id);
        if (success) {
          await refreshInvestmentsData();
        }

        toast.add({
          severity: success ? 'success' : 'error',
          summary: success ? 'Счет архивирован' : 'Ошибка архивации',
          detail: success
            ? 'Счет перемещен в архив и исключен из активных метрик.'
            : 'Не удалось архивировать счет. Попробуйте позже.',
          life: 3000,
        });
      } finally {
        pendingArchiveId.value = null;
      }
    },
  });
};

const handleUnarchiveAccount = async (account: InvestmentAccount) => {
  if (isReadOnlyMode.value || pendingUnarchiveId.value) return;

  pendingUnarchiveId.value = account.id;
  try {
    const success = await financeStore.unarchiveAccount(account.id);
    if (success) {
      await refreshInvestmentsData();
    }

    toast.add({
      severity: success ? 'success' : 'error',
      summary: success ? 'Счет разархивирован' : 'Ошибка',
      detail: success
        ? 'Счет снова участвует в активной части портфеля.'
        : 'Не удалось разархивировать счет.',
      life: 3000,
    });
  } finally {
    pendingUnarchiveId.value = null;
  }
};

const clearFilters = () => {
  searchText.value = '';
  selectedType.value = null;
};

const retryCurrentView = async () => {
  if (view.value === 'active') {
    await Promise.all([
      financeStore.fetchAccounts(true),
      refreshInvestmentsData(),
    ]);
    return;
  }

  await financeStore.fetchArchivedAccounts(true);
};

watch(showFilters, isVisible => {
  if (!isVisible) {
    clearFilters();
  }
}, { immediate: true });

watch(
  () => view.value,
  () => {
    clearFilters();
  }
);

// Balance adjustment affects active account cards and summary metrics
watch(
  () => adjustmentsVisible.value,
  (visible, prev) => {
    if (prev && !visible) {
      void Promise.all([
        financeStore.fetchAccounts(true),
        loadOverview(),
      ]);
    }
  }
);

// Account creation/editing may affect active/archived lists and all investment charts
watch(
  () => modalVisible.value,
  (visible, prev) => {
    if (prev && !visible) {
      editingAccount.value = null;
      void Promise.all([
        financeStore.fetchAccounts(true),
        financeStore.fetchArchivedAccounts(true),
        refreshInvestmentsData(),
      ]);
    }
  }
);

onMounted(async () => {
  // User is already loaded by AppShell on mount
  await financeStore.fetchCurrencies();
  await Promise.all([
    financeStore.fetchAccounts(),
    financeStore.fetchArchivedAccounts(),
    refreshInvestmentsData(),
  ]);
});
</script>

<template>
  <PageContainer class="investments-page">
    <PageHeader title="Инвестиции" />
    <div class="investments-grid">
      <SummaryStrip
        class="investments-grid__item investments-grid__item--span-12"
        :loading="overviewLoading"
        :error="overviewError"
        :metrics="summaryMetrics"
        @retry="refreshInvestmentsData"
      />

      <InvestmentsAllocationPie
        v-if="activeAccounts.length > 0"
        class="investments-grid__item investments-grid__item--span-6"
        :accounts="activeAccounts"
        :base-currency-code="baseCurrency"
        :loading="overviewLoading"
      />

      <NetWorthLineCard
        v-if="activeAccounts.length > 0"
        class="investments-grid__item investments-grid__item--span-6"
        :loading="netWorthLoading"
        :error="netWorthError"
        :chart-data="netWorthChartData"
        :currency="baseCurrency"
        chart-type="bar"
        @retry="loadNetWorth(12)"
      />

      <InvestmentsAccountsSection
        class="investments-grid__item investments-grid__item--span-12"
        :active-accounts="activeAccounts"
        :archived-accounts="archivedAccounts"
        :filtered-accounts="filteredAccounts"
        :view="view"
        :is-read-only-mode="isReadOnlyMode"
        :show-filters="showFilters"
        :search-text="searchText"
        :selected-type="selectedType"
        :has-visible-accounts="hasVisibleAccounts"
        :has-any-investment-accounts="hasAnyInvestmentAccounts"
        :has-active-filters="hasActiveFilters"
        :should-show-accounts-skeleton="shouldShowAccountsSkeleton"
        :should-show-accounts-error-state="shouldShowAccountsErrorState"
        :current-accounts-state="currentAccountsState"
        :current-accounts-error="currentAccountsError"
        :pending-liquidity-id="pendingLiquidityId"
        :pending-archive-id="pendingArchiveId"
        :pending-unarchive-id="pendingUnarchiveId"
        :base-currency="baseCurrency"
        @update:view="view = $event"
        @update:search-text="searchText = $event"
        @update:selected-type="selectedType = $event"
        @open-modal="openModal"
        @clear-filters="clearFilters"
        @retry-current-view="retryCurrentView"
        @open-adjustments="openAdjustments"
        @update-liquidity="handleLiquidityToggle($event.account, $event.value)"
        @archive-account="handleArchiveAccount"
        @unarchive-account="handleUnarchiveAccount"
        @rename-account="handleEditAccount"
      />
    </div>

    <AccountFormModal
      v-model:visible="modalVisible"
      :account="editingAccount"
      :allowed-types="[3, 2, 4]"
    />
    <AccountBalanceAdjustmentsModal
      v-model:visible="adjustmentsVisible"
      :account="selectedAccount"
      :readonly="isReadOnlyMode"
    />
  </PageContainer>
</template>

<style scoped src="../styles/pages/investments-page.css"></style>
