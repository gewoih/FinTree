<script setup lang="ts">
import type { Account, AccountType } from '../../types';
import type { ViewState } from '../../types/view-state';
import InvestmentAccountCard from './InvestmentAccountCard.vue';
import UiButton from '@/ui/UiButton.vue';
import UiMessage from '@/ui/UiMessage.vue';
import UiSkeleton from '@/ui/UiSkeleton.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ListToolbar from '@/components/common/ListToolbar.vue';

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

defineProps<{
  activeAccounts: InvestmentAccount[];
  archivedAccounts: InvestmentAccount[];
  filteredAccounts: InvestmentAccount[];
  view: InvestmentsView;
  isReadOnlyMode: boolean;
  showSearch: boolean;
  searchText: string;
  hasVisibleAccounts: boolean;
  hasAnyInvestmentAccounts: boolean;
  hasActiveFilters: boolean;
  shouldShowAccountsSkeleton: boolean;
  shouldShowAccountsErrorState: boolean;
  currentAccountsState: ViewState;
  currentAccountsError: string | null;
  pendingLiquidityId: string | null;
  pendingArchiveId: string | null;
  pendingUnarchiveId: string | null;
  baseCurrency: string;
}>();

const emit = defineEmits<{
  (e: 'update:view', value: InvestmentsView): void;
  (e: 'update:searchText', value: string): void;
  (e: 'openModal'): void;
  (e: 'clearFilters'): void;
  (e: 'retryCurrentView'): void;
  (e: 'openAdjustments', account: InvestmentAccount): void;
  (e: 'updateLiquidity', payload: { account: InvestmentAccount; value: boolean }): void;
  (e: 'archiveAccount', account: InvestmentAccount): void;
  (e: 'unarchiveAccount', account: InvestmentAccount): void;
  (e: 'renameAccount', account: InvestmentAccount): void;
}>();

const setView = (value: InvestmentsView) => {
  emit('update:view', value);
};
</script>

<template>
  <div class="investments-accounts">
    <div class="investments-accounts__header">
      <h2 class="investments-accounts__title">
        Счета
      </h2>
      <UiButton
        label="Добавить счет"
        icon="pi pi-plus"
        size="sm"
        :disabled="isReadOnlyMode"
        @click="emit('openModal')"
      />
    </div>

    <ListToolbar
      :model-value="view"
      :search-text="searchText"
      :active-count="activeAccounts.length"
      :archived-count="archivedAccounts.length"
      :show-search="showSearch"
      search-placeholder="Название, валюта..."
      @update:model-value="emit('update:view', $event)"
      @update:search-text="emit('update:searchText', $event)"
    />

    <div
      v-if="currentAccountsState === 'error' && hasVisibleAccounts"
      class="investments-accounts__message investments-accounts__message--inline"
    >
      <UiMessage
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        {{ currentAccountsError || 'Не удалось загрузить счета.' }}
      </UiMessage>
      <UiButton
        label="Повторить"
        icon="pi pi-refresh"
        variant="secondary"
        @click="emit('retryCurrentView')"
      />
    </div>

    <div
      v-if="shouldShowAccountsSkeleton"
      class="investments-accounts__skeleton"
    >
      <UiSkeleton
        v-for="i in 4"
        :key="i"
        height="180px"
      />
    </div>

    <div
      v-else-if="shouldShowAccountsErrorState"
      class="investments-accounts__message"
    >
      <UiMessage
        severity="error"
        icon="pi pi-exclamation-triangle"
        :closable="false"
      >
        {{ currentAccountsError || 'Не удалось загрузить счета.' }}
      </UiMessage>
      <UiButton
        label="Повторить"
        icon="pi pi-refresh"
        variant="secondary"
        @click="emit('retryCurrentView')"
      />
    </div>

    <EmptyState
      v-else-if="!hasAnyInvestmentAccounts"
      icon="pi pi-briefcase"
      title="Нет инвестиционных счетов"
      description="Добавьте брокерский счет, вклад или криптовалютный аккаунт, чтобы следить за доходностью."
      :action-label="isReadOnlyMode ? '' : 'Добавить счет'"
      action-icon="pi pi-plus"
      @action="emit('openModal')"
    />

    <EmptyState
      v-else-if="view === 'active' && activeAccounts.length === 0"
      icon="pi pi-chart-line"
      title="Нет активных инвестиционных счетов"
      description="Все инвестиционные счета находятся в архиве. Разархивируйте нужные счета, чтобы вернуть их в метрики."
      action-label="Открыть архив"
      action-icon="pi pi-inbox"
      @action="setView('archived')"
    />

    <EmptyState
      v-else-if="view === 'archived' && archivedAccounts.length === 0"
      icon="pi pi-inbox"
      title="Архив инвестиций пуст"
      description="Здесь появятся инвестиционные счета после архивации."
      action-label="К активным счетам"
      action-icon="pi pi-arrow-left"
      @action="setView('active')"
    />

    <EmptyState
      v-else-if="filteredAccounts.length === 0 && hasActiveFilters"
      icon="pi pi-filter-slash"
      title="Ничего не найдено"
      description="По выбранным фильтрам нет счетов. Попробуйте изменить параметры."
      action-label="Сбросить фильтры"
      action-icon="pi pi-refresh"
      @action="emit('clearFilters')"
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
        :readonly="view === 'archived'"
        :interaction-locked="isReadOnlyMode"
        :is-liquidity-loading="pendingLiquidityId === account.id"
        :is-archive-loading="pendingArchiveId === account.id || pendingUnarchiveId === account.id"
        @open="emit('openAdjustments', account)"
        @update-liquidity="emit('updateLiquidity', { account, value: $event })"
        @archive="emit('archiveAccount', account)"
        @unarchive="emit('unarchiveAccount', account)"
        @rename="emit('renameAccount', account)"
      />
    </div>
  </div>
</template>

<style scoped>
.investments-accounts {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.investments-accounts__header {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
  justify-content: space-between;
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
  display: grid;
  gap: var(--ft-space-3);
  justify-items: start;
}

.investments-accounts__message--inline {
  margin-bottom: var(--ft-space-2);
}

@media (width <= 640px) {
  .investments-accounts__header {
    flex-direction: column;
    align-items: stretch;
  }

  .investments-accounts__grid,
  .investments-accounts__skeleton {
    grid-template-columns: 1fr;
  }
}
</style>
