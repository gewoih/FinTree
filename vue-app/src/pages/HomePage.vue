<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFinanceStore } from '../stores/finance'
import type { Transaction } from '../types'
import { formatCurrency } from '../utils/formatters'

const router = useRouter()
const financeStore = useFinanceStore()

const isLoading = ref(true)

const transactions = computed(() => financeStore.transactions ?? [])
const accounts = computed(() => financeStore.accounts ?? [])

const baseCurrencyCode = computed(() => {
  return (
    financeStore.primaryAccount?.currency?.code ??
    financeStore.primaryAccount?.currencyCode ??
    accounts.value[0]?.currency?.code ??
    accounts.value[0]?.currencyCode ??
    'KZT'
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
  <div class="dashboard page">
    <PageHeader
      title="Dashboard"
      subtitle="Overview of your balances, spending, and recent activity"
      :breadcrumbs="[
        { label: 'Home', to: '/dashboard' },
        { label: 'Dashboard' }
      ]"
    >
      <template #actions>
        <Button
          label="Add Transaction"
          icon="pi pi-plus"
          @click="router.push('/expenses')"
        />
      </template>
    </PageHeader>

    <section class="dashboard__kpis">
      <KPICard
        title="Total Balance"
        :value="formattedBalance"
        icon="pi-wallet"
        :trend="balanceTrend ?? undefined"
        trend-label="vs last month"
        variant="success"
        :loading="isLoading"
      />

      <KPICard
        title="Monthly Expenses"
        :value="formattedMonthlyExpenses"
        icon="pi-chart-line"
        :trend="expensesTrend ?? undefined"
        trend-label="vs last month"
        :variant="expensesTrend && expensesTrend > 0 ? 'danger' : 'success'"
        :loading="isLoading"
      />

      <KPICard
        title="Active Accounts"
        :value="accountCount.toString()"
        icon="pi-credit-card"
        :loading="isLoading"
      />
    </section>

    <section class="dashboard__content">
      <Card class="dashboard__quick-actions">
        <template #title>
          <div class="card-title-with-icon">
            <i class="pi pi-bolt" />
            <span>Quick Actions</span>
          </div>
        </template>
        <template #content>
          <div class="quick-actions-grid">
            <Button
              label="Add Expense"
              icon="pi pi-plus-circle"
              severity="success"
              @click="router.push('/expenses')"
            />
            <Button
              label="View Accounts"
              icon="pi pi-wallet"
              severity="info"
              outlined
              @click="router.push('/accounts')"
            />
            <Button
              label="Analytics"
              icon="pi pi-chart-bar"
              severity="secondary"
              outlined
              @click="router.push('/analytics')"
            />
            <Button
              label="Manage Categories"
              icon="pi pi-tags"
              severity="help"
              outlined
              @click="router.push('/categories')"
            />
          </div>
        </template>
      </Card>

      <Card class="dashboard__recent">
        <template #title>
          <div class="card-title-with-icon">
            <i class="pi pi-history" />
            <span>Recent Transactions</span>
          </div>
        </template>

        <template #subtitle>
          <p class="card-subtitle">
            Latest activity across all accounts · {{ trendLabel }}
          </p>
        </template>

        <template #content>
          <div v-if="isLoading" class="transactions-skeleton">
            <Skeleton v-for="i in 4" :key="i" height="60px" />
          </div>

          <EmptyState
            v-else-if="recentTransactions.length === 0"
            icon="pi-receipt"
            title="No transactions yet"
            description="Start tracking your spending to see insights and analytics."
            action-label="Add your first transaction"
            action-icon="pi pi-plus"
            @action="router.push('/expenses')"
          />

          <ul v-else class="transactions-list">
            <li
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="transaction-item"
            >
              <div class="transaction-icon">
                <i class="pi pi-shopping-bag" />
              </div>

              <div class="transaction-details">
                <div class="transaction-primary">
                  <span class="transaction-category">
                    {{ transaction.category?.name ?? 'Uncategorized' }}
                  </span>
                  <span class="transaction-date">
                    {{ formatShortDate(transaction.occurredAt) }}
                  </span>
                </div>
                <span class="transaction-note">
                  {{ transaction.description ?? 'No description provided' }}
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

          <Button
            label="View all transactions"
            icon="pi pi-arrow-right"
            iconPos="right"
            text
            class="view-all-btn"
            @click="router.push('/expenses')"
          />
        </template>
      </Card>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  gap: var(--ft-space-8);
}

.dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ft-space-5);
}

.dashboard__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ft-space-5);
}

@media (min-width: 1024px) {
  .dashboard__content {
    grid-template-columns: 1.1fr 1fr;
  }
}

.card-title-with-icon {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  color: var(--ft-heading);
}

.card-title-with-icon i {
  color: var(--ft-primary-600);
  font-size: 1.25rem;
}

.card-subtitle {
  margin: 0;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--ft-space-3);
}

.transactions-skeleton {
  display: grid;
  gap: var(--ft-space-3);
}

.transactions-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  margin: 0;
  padding: 0;
}

.transaction-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  border: 1px solid rgba(37, 99, 235, 0.08);
  transition: background-color var(--ft-transition-fast), transform var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.transaction-item:hover {
  background: rgba(37, 99, 235, 0.05);
  border-color: rgba(37, 99, 235, 0.16);
  transform: translateY(-2px);
}

.transaction-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--ft-radius-md);
  background: rgba(37, 99, 235, 0.12);
  display: grid;
  place-items: center;
  color: var(--ft-primary-600);
}

.transaction-details {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.transaction-primary {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-weight: var(--ft-font-medium);
  color: var(--ft-heading);
}

.transaction-date {
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.transaction-note {
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.transaction-amount {
  display: flex;
  gap: var(--ft-space-1);
  align-items: center;
  font-weight: var(--ft-font-bold);
  color: var(--ft-danger-600);
}

.transaction-amount--positive {
  color: var(--ft-success-600);
}

.view-all-btn {
  margin-top: var(--ft-space-4);
  width: 100%;
  justify-content: center;
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
