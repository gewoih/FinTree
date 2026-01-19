<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '../stores/finance'
import { useUserStore } from '../stores/user'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

const router = useRouter()
const financeStore = useFinanceStore()
const userStore = useUserStore()

const isLoading = ref(true)

const transactions = computed(() => financeStore.transactions ?? [])
const accounts = computed(() => financeStore.accounts ?? [])

const quickActions = [
  { label: 'Добавить расход', icon: 'pi pi-plus-circle', variant: 'primary', to: '/expenses' },
  { label: 'Счета', icon: 'pi pi-wallet', variant: 'secondary', to: '/accounts' },
  { label: 'Аналитика', icon: 'pi pi-chart-bar', variant: 'secondary', to: '/analytics' },
  { label: 'Категории', icon: 'pi pi-tags', variant: 'ghost', to: '/categories' }
]

const baseCurrencyCode = computed(() => {
  // Используем цепочку fallback-значений, чтобы всегда вернуть разумную валюту,
  // даже если профиль или хранилище ещё не прогружены.
  return (
    userStore.baseCurrencyCode ??
    financeStore.primaryAccount?.currency?.code ??
    financeStore.primaryAccount?.currencyCode ??
    accounts.value[0]?.currency?.code ??
    accounts.value[0]?.currencyCode ??
    'USD'
  )
})

const computeBalance = (items: Transaction[]) =>
  items.reduce((sum, transaction) => sum + Number(transaction.amount), 0)

const sumExpensesForPeriod = (items: Transaction[], month: number, year: number) =>
  items
    .filter(tx => {
      const date = new Date(tx.occurredAt)
      return (
        date.getMonth() === month &&
        date.getFullYear() === year &&
        Number(tx.amount) < 0
      )
    })
    .reduce((total, tx) => total + Math.abs(Number(tx.amount)), 0)

const totalBalance = computed(() => computeBalance(transactions.value))

const previousBalance = computed(() => {
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousTransactions = transactions.value.filter(tx => {
    const txDate = new Date(tx.occurredAt)
    return txDate < startOfCurrentMonth
  })
  return computeBalance(previousTransactions)
})

const balanceTrend = computed(() => {
  if (!previousBalance.value) return null
  const delta = totalBalance.value - previousBalance.value
  if (delta === 0) return 0
  return Number(((delta / Math.abs(previousBalance.value)) * 100).toFixed(1))
})

const monthlyExpenses = computed(() => {
  const today = new Date()
  return sumExpensesForPeriod(transactions.value, today.getMonth(), today.getFullYear())
})

const previousMonthExpenses = computed(() => {
  const today = new Date()
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return sumExpensesForPeriod(transactions.value, prev.getMonth(), prev.getFullYear())
})

const expensesTrend = computed(() => {
  if (!previousMonthExpenses.value) return null
  const delta = monthlyExpenses.value - previousMonthExpenses.value
  if (delta === 0) return 0
  return Number(((delta / previousMonthExpenses.value) * 100).toFixed(1))
})

const accountCount = computed(() => accounts.value.length)

const formattedBalance = computed(() => formatCurrency(totalBalance.value, baseCurrencyCode.value))
const formattedMonthlyExpenses = computed(() =>
  formatCurrency(monthlyExpenses.value, baseCurrencyCode.value)
)

const recentTransactions = computed(() =>
  [...transactions.value]
    .sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, 5)
)

const trendLabel = computed(() => {
  const today = new Date()
  return today.toLocaleString('en-US', { month: 'long' })
})

const formatShortDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

const formatAmount = (amount: number) => formatCurrency(Math.abs(amount), baseCurrencyCode.value)

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([
      userStore.fetchCurrentUser(),
      financeStore.fetchCurrencies(),
      financeStore.fetchAccounts(),
      financeStore.fetchCategories(),
      financeStore.fetchTransactions()
    ])
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <PageContainer class="dashboard">
    <PageHeader
      title="Дашборд"
      subtitle="Обзор ваших балансов, расходов и последних транзакций"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Дашборд' }
      ]"
    >
      <template #actions>
        <UiButton
          label="Добавить транзакцию"
          icon="pi pi-plus"
          @click="router.push('/expenses')"
        />
      </template>
    </PageHeader>

    <UiSection>
      <div class="card-grid card-grid--auto card-grid--dense dashboard__kpis">
        <KPICard
          title="Общий баланс"
          :value="formattedBalance"
          icon="pi-wallet"
          :trend="balanceTrend ?? undefined"
          trend-label="по сравнению с прошлым месяцем"
          variant="success"
          :loading="isLoading"
        />

        <KPICard
          title="Расходы за месяц"
          :value="formattedMonthlyExpenses"
          icon="pi-chart-line"
          :trend="expensesTrend ?? undefined"
          trend-label="по сравнению с прошлым месяцем"
          :variant="expensesTrend && expensesTrend > 0 ? 'danger' : 'success'"
          :loading="isLoading"
        />

        <KPICard
          title="Активные счета"
          :value="accountCount.toString()"
          icon="pi-credit-card"
          :loading="isLoading"
        />
      </div>
    </UiSection>

    <UiSection>
      <div class="card-grid dashboard__content">
        <UiCard
          class="dashboard__quick-actions"
          variant="muted"
          padding="lg"
        >
          <template #header>
            <div class="card-title-with-icon">
              <i
                class="pi pi-bolt"
                aria-hidden="true"
              />
              <span>Быстрые действия</span>
            </div>
          </template>
          <div class="quick-actions-grid">
            <UiButton
              v-for="action in quickActions"
              :key="action.label"
              :label="action.label"
              :icon="action.icon"
              :variant="action.variant"
              block
              @click="router.push(action.to)"
            />
          </div>
        </UiCard>

        <UiCard
          class="dashboard__recent"
          variant="muted"
          padding="lg"
        >
          <template #header>
            <div class="dashboard__recent-header">
              <div class="card-title-with-icon">
                <i
                  class="pi pi-history"
                  aria-hidden="true"
                />
                <span>Последние транзакции</span>
              </div>
              <p class="card-subtitle">
                Последняя активность · {{ trendLabel }}
              </p>
            </div>
          </template>

          <div
            v-if="isLoading"
            class="transactions-skeleton"
          >
            <UiSkeleton
              v-for="i in 4"
              :key="i"
              height="60px"
            />
          </div>

          <EmptyState
            v-else-if="recentTransactions.length === 0"
            icon="pi-receipt"
            title="Нет транзакций"
            description="Начните отслеживать расходы, чтобы увидеть аналитику и статистику."
            action-label="Добавить первую транзакцию"
            action-icon="pi pi-plus"
            @action="router.push('/expenses')"
          />

          <ul
            v-else
            class="transactions-list"
          >
            <li
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="transaction-item"
            >
              <div class="transaction-icon">
                <i
                  class="pi pi-shopping-bag"
                  aria-hidden="true"
                />
              </div>

              <div class="transaction-details">
                <div class="transaction-primary">
                  <span class="transaction-category">
                    {{ transaction.category?.name ?? 'Без категории' }}
                  </span>
                  <span class="transaction-date">
                    {{ formatShortDate(transaction.occurredAt) }}
                  </span>
                </div>
                <span class="transaction-note">
                  {{ transaction.description ?? 'Описание отсутствует' }}
                </span>
              </div>

              <div
                class="transaction-amount"
                :class="{ 'transaction-amount--positive': Number(transaction.amount) > 0 }"
              >
                <span>{{ Number(transaction.amount) > 0 ? '+' : '−' }}</span>
                <span>{{ formatAmount(Number(transaction.amount)) }}</span>
              </div>
            </li>
          </ul>

          <UiButton
            label="Все транзакции"
            icon="pi pi-arrow-right"
            variant="ghost"
            icon-pos="right"
            block
            @click="router.push('/expenses')"
          />
        </UiCard>
      </div>
    </UiSection>
  </PageContainer>
</template>

<style scoped>
.dashboard {
  gap: var(--space-6);
}

.dashboard__kpis {
  align-items: stretch;
}

.dashboard__content {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: stretch;
  grid-auto-rows: minmax(0, 1fr);
}

.dashboard__content > .ui-card {
  height: 100%;
}

.card-title-with-icon {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text);
}

.card-title-with-icon i {
  color: var(--accent);
  font-size: 1.25rem;
}

.card-subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--ft-text-sm);
}

.dashboard__recent-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
}

.transactions-skeleton {
  display: grid;
  gap: var(--space-3);
}

.transactions-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
}

.transaction-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-1);
  transition: background-color var(--ft-transition-fast), transform var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.transaction-item:hover {
  background: var(--surface-2);
  border-color: var(--border);
  transform: translateY(-2px);
}

.transaction-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: rgba(37, 99, 235, 0.16);
  display: grid;
  place-items: center;
  color: var(--accent);
}

.transaction-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.transaction-primary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-weight: var(--ft-font-medium);
  color: var(--text);
}

.transaction-date {
  color: var(--text-muted);
  font-size: var(--ft-text-sm);
}

.transaction-note {
  color: var(--text-muted);
  font-size: var(--ft-text-sm);
}

.transaction-amount {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  font-weight: var(--ft-font-bold);
  color: var(--danger);
}

.transaction-amount--positive {
  color: var(--success);
}

@media (max-width: 768px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }

  .transaction-item {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }

  .transaction-icon {
    width: 40px;
    height: 40px;
  }

  .transaction-amount {
    justify-content: flex-start;
  }
}
</style>
