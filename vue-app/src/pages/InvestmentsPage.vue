<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { AccountType, InvestmentAccountOverviewDto, InvestmentsOverviewDto, Account, AccountDto } from '../types';
import { apiService } from '../services/api.service';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import AccountFormModal from '../components/AccountFormModal.vue';
import AccountFilters from '../components/AccountFilters.vue';
import AccountBalanceAdjustmentsModal from '../components/AccountBalanceAdjustmentsModal.vue';
import InvestmentAccountCard from '../components/Investments/InvestmentAccountCard.vue';
import { mapAccount } from '../utils/mappers';
import { formatCurrency, formatDate } from '../utils/formatters';

interface InvestmentAccount extends InvestmentAccountOverviewDto {
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
    const mapped = mapAccount({ ...item, isMain: false } as AccountDto, currencyMap);
    return {
      ...item,
      ...mapped,
      returnPercent: item.returnPercent,
      lastAdjustedAt: item.lastAdjustedAt,
      isMain: false,
    };
  });
});

const periodRangeLabel = computed(() => {
  if (!overview.value) return 'за последние 6 месяцев';
  return `${formatDate(overview.value.periodFrom)} — ${formatDate(overview.value.periodTo)}`;
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

const totalValueLabel = computed(() => formatCurrency(totalValue.value, baseCurrency.value));
const liquidValueLabel = computed(() => formatCurrency(liquidValue.value, baseCurrency.value));
const totalReturnLabel = computed(() => {
  if (!overview.value || overview.value.totalReturnPercent == null) return '—';
  return `${(overview.value.totalReturnPercent * 100).toFixed(1)}%`;
});

const totalReturnVariant = computed(() => {
  const value = overview.value?.totalReturnPercent;
  if (value == null) return 'default';
  if (value > 0) return 'success';
  if (value < 0) return 'danger';
  return 'default';
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

watch(
  () => adjustmentsVisible.value,
  (visible, prev) => {
    if (prev && !visible) {
      void loadOverview();
    }
  }
);

watch(
  () => modalVisible.value,
  (visible, prev) => {
    if (prev && !visible) {
      void loadOverview();
    }
  }
);

onMounted(async () => {
  await userStore.fetchCurrentUser();
  await financeStore.fetchCurrencies();
  await loadOverview();
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
    >
      <template #actions>
        <UiButton
          label="Добавить счет"
          icon="pi pi-plus"
          @click="openModal"
        />
      </template>
    </PageHeader>

    <UiSection class="investments-page__content">
      <UiCard
        class="investments-page__summary"
        variant="muted"
        padding="lg"
      >
        <div class="summary-header">
          <div>
            <h3>Общая картина</h3>
            <p>{{ periodRangeLabel }}</p>
          </div>
        </div>
        <div class="summary-grid">
          <KPICard
            title="Общий объем"
            :value="totalValueLabel"
            icon="pi pi-briefcase"
            :loading="overviewLoading"
          />
          <KPICard
            title="Ликвидные активы"
            :value="liquidValueLabel"
            icon="pi pi-bolt"
            :loading="overviewLoading"
          />
          <KPICard
            title="Доходность портфеля"
            :value="totalReturnLabel"
            icon="pi pi-chart-line"
            :loading="overviewLoading"
            :variant="totalReturnVariant"
          />
        </div>
      </UiCard>

      <UiCard
        v-if="accounts.length > 0"
        class="investments-page__filters"
        variant="muted"
        padding="lg"
      >
        <AccountFilters
          v-model:search-text="searchText"
          v-model:selected-type="selectedType"
          :available-types="[3, 2, 4]"
          @clear-filters="clearFilters"
        />
      </UiCard>

      <div
        v-if="overviewLoading && accounts.length === 0"
        class="investments-page__skeleton"
      >
        <UiSkeleton
          v-for="i in 4"
          :key="i"
          height="220px"
        />
      </div>

      <div
        v-else-if="overviewError"
        class="investments-page__message"
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
        class="investments-grid card-grid card-grid--balanced"
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
    </UiSection>

    <AccountFormModal v-model:visible="modalVisible" />
    <AccountBalanceAdjustmentsModal
      v-model:visible="adjustmentsVisible"
      :account="selectedAccount"
    />
  </PageContainer>
</template>

<style scoped>
.investments-page {
  gap: var(--space-6);
}

.investments-page__content {
  gap: var(--space-5);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}

.summary-header h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--text);
}

.summary-header p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--ft-text-sm);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.investments-page__filters {
  margin-top: var(--space-2);
}

.investments-page__skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
}

.investments-grid {
  gap: var(--space-5);
}

.investments-page__message {
  padding: var(--space-4);
}

@media (max-width: 640px) {
  .summary-header {
    flex-direction: column;
  }
}
</style>
