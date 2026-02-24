<script setup lang="ts">
import { computed, onMounted } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import KPICard from '../components/common/KPICard.vue';
import PageHeader from '../components/common/PageHeader.vue';
import PageContainer from '../components/layout/PageContainer.vue';
import { useAdminOverviewData } from '../composables/useAdminOverviewData';
import UiButton from '../ui/UiButton.vue';

const {
  overview,
  error,
  isLoading,
  isEmpty,
  isError,
  isSuccess,
  loadOverview,
  retry,
} = useAdminOverviewData();

const kpis = computed(() => overview.value?.kpis ?? {
  totalUsers: 0,
  activeSubscriptions: 0,
  activeSubscriptionsRatePercent: 0,
  onboardingCompletedUsers: 0,
  onboardingCompletionRatePercent: 0,
  totalAccounts: 0,
  totalTransactions: 0,
  transactionsLast30Days: 0,
});

const kpiCards = computed(() => ([
  {
    key: 'total-users',
    title: 'Пользователи',
    value: formatNumber(kpis.value.totalUsers),
    icon: 'pi-users',
    trend: null,
    trendLabel: '',
    variant: 'default' as const,
  },
  {
    key: 'active-subscriptions',
    title: 'Активные подписки',
    value: formatNumber(kpis.value.activeSubscriptions),
    icon: 'pi-credit-card',
    trend: kpis.value.activeSubscriptionsRatePercent,
    trendLabel: 'от всех пользователей',
    variant: 'success' as const,
  },
  {
    key: 'onboarding-completed',
    title: 'Прошли онбординг',
    value: formatNumber(kpis.value.onboardingCompletedUsers),
    icon: 'pi-check-circle',
    trend: kpis.value.onboardingCompletionRatePercent,
    trendLabel: 'от всех пользователей',
    variant: 'success' as const,
  },
  {
    key: 'total-accounts',
    title: 'Счета',
    value: formatNumber(kpis.value.totalAccounts),
    icon: 'pi-wallet',
    trend: null,
    trendLabel: '',
    variant: 'default' as const,
  },
  {
    key: 'total-transactions',
    title: 'Транзакции (всего)',
    value: formatNumber(kpis.value.totalTransactions),
    icon: 'pi-chart-bar',
    trend: null,
    trendLabel: '',
    variant: 'default' as const,
  },
  {
    key: 'transactions-30d',
    title: 'Транзакции (30 дней)',
    value: formatNumber(kpis.value.transactionsLast30Days),
    icon: 'pi-clock',
    trend: null,
    trendLabel: '',
    variant: 'warning' as const,
  },
]));

const users = computed(() => overview.value?.users ?? []);

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

function resolveUserLabel(name: string, email: string | null): string {
  if (name && name.trim().length > 0) return name;
  if (email && email.trim().length > 0) return email;
  return 'Без имени';
}

function subscriptionStatusSeverity(isActive: boolean) {
  return isActive ? 'success' : 'warning';
}

function onboardingStatusSeverity(isCompleted: boolean) {
  return isCompleted ? 'success' : 'secondary';
}

function ownerStatusSeverity(isOwner: boolean) {
  return isOwner ? 'info' : 'secondary';
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <PageContainer class="admin-page">
    <PageHeader
      title="Админ-панель"
      subtitle="Сводка по пользователям, транзакциям и активности сервиса"
    >
      <template #actions>
        <UiButton
          label="Обновить"
          icon="pi pi-refresh"
          :loading="isLoading"
          @click="retry"
        />
      </template>
    </PageHeader>

    <Message
      v-if="isError"
      severity="error"
      :closable="false"
      icon="pi pi-exclamation-triangle"
    >
      <div class="admin-page__error-content">
        <span>{{ error ?? 'Не удалось загрузить админ-панель.' }}</span>
        <UiButton
          label="Повторить"
          icon="pi pi-refresh"
          size="sm"
          @click="retry"
        />
      </div>
    </Message>

    <section class="admin-page__kpis">
      <KPICard
        v-for="card in kpiCards"
        :key="card.key"
        :title="card.title"
        :value="card.value"
        :icon="card.icon"
        :variant="card.variant"
        :trend="card.trend"
        :trend-label="card.trendLabel"
        :loading="isLoading"
      />
    </section>

    <Message
      v-if="isEmpty && !isLoading"
      severity="info"
      :closable="false"
      icon="pi pi-inbox"
    >
      Данных для админ-панели пока нет.
    </Message>

    <section
      v-if="isSuccess && !isLoading"
      class="admin-page__section"
    >
      <header class="admin-page__section-header">
        <h2 class="admin-page__section-title">
          Пользователи (срез)
        </h2>
        <span class="admin-page__section-hint">Первые 20 по последней активности</span>
      </header>

      <DataTable
        :value="users"
        data-key="userId"
        class="admin-page__table"
        scrollable
      >
        <Column
          field="email"
          header="Email"
        />
        <Column header="Имя">
          <template #body="{ data }">
            {{ resolveUserLabel(data.name, data.email) }}
          </template>
        </Column>
        <Column header="Роль">
          <template #body="{ data }">
            <Tag
              :value="data.isOwner ? 'Owner' : 'User'"
              :severity="ownerStatusSeverity(data.isOwner)"
            />
          </template>
        </Column>
        <Column header="Подписка">
          <template #body="{ data }">
            <Tag
              :value="data.hasActiveSubscription ? 'Активна' : 'Неактивна'"
              :severity="subscriptionStatusSeverity(data.hasActiveSubscription)"
            />
          </template>
        </Column>
        <Column header="Онбординг">
          <template #body="{ data }">
            <Tag
              :value="data.isOnboardingCompleted ? 'Пройден' : 'Не пройден'"
              :severity="onboardingStatusSeverity(data.isOnboardingCompleted)"
            />
          </template>
        </Column>
        <Column header="Telegram">
          <template #body="{ data }">
            {{ data.isTelegramLinked ? 'Привязан' : 'Не привязан' }}
          </template>
        </Column>
        <Column header="Транзакции">
          <template #body="{ data }">
            {{ formatNumber(data.transactionsCount) }}
          </template>
        </Column>
        <Column header="Последняя активность">
          <template #body="{ data }">
            {{ formatDateTime(data.lastTransactionAtUtc) }}
          </template>
        </Column>
      </DataTable>
    </section>

    <section
      v-if="isLoading"
      class="admin-page__loading-tables"
    >
      <Skeleton
        height="260px"
        width="100%"
      />
    </section>
  </PageContainer>
</template>

<style scoped>
.admin-page {
  gap: var(--ft-space-6);
}

.admin-page__error-content {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
}

.admin-page__kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ft-space-4);
}

.admin-page__section {
  display: grid;
  gap: var(--ft-space-3);
}

.admin-page__section-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: baseline;
  justify-content: space-between;
}

.admin-page__section-title {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.admin-page__section-hint {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.admin-page__table {
  overflow: hidden;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-xl);
}

.admin-page__loading-tables {
  display: grid;
  gap: var(--ft-space-4);
}

/* stylelint-disable selector-pseudo-class-no-unknown */
.admin-page__table :deep(.p-datatable-table-container) {
  border-radius: var(--ft-radius-xl);
}

.admin-page__table :deep(.p-datatable-thead > tr > th) {
  white-space: nowrap;
}

@media (width <= 1024px) {
  .admin-page__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 768px) {
  .admin-page__kpis {
    grid-template-columns: 1fr;
  }
}
</style>
