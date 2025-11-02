<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useFinanceStore } from '../stores/finance'
import AccountFormModal from '../components/AccountFormModal.vue'

const financeStore = useFinanceStore()
const toast = useToast()

const modalVisible = ref(false)
const pendingPrimaryId = ref<string | null>(null)

const accounts = computed(() => financeStore.accounts ?? [])
const loadingAccounts = computed(() => financeStore.areAccountsLoading)
const loadingCurrencies = computed(() => financeStore.areCurrenciesLoading)

const openModal = () => {
  modalVisible.value = true
}

const handleSetPrimary = async (accountId: string) => {
  pendingPrimaryId.value = accountId
  try {
    const success = await financeStore.setPrimaryAccount(accountId)
    toast.add({
      severity: success ? 'success' : 'error',
      summary: success ? 'Основной счет обновлен' : 'Не удалось обновить счет',
      detail: success
        ? 'Этот счет теперь используется по умолчанию для аналитики.'
        : 'Пожалуйста, попробуйте еще раз.',
      life: 3000
    })
  } finally {
    pendingPrimaryId.value = null
  }
}

const accountTypeLabel = (type: number) =>
  type === 0 ? 'Банковский счет' : 'Наличные'

onMounted(async () => {
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchAccounts()
  ])
})
</script>

<template>
  <div class="accounts page">
    <PageHeader
      title="Счета"
      subtitle="Управляйте всеми банковскими счетами и кошельками в одном месте"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Счета' }
      ]"
    >
      <template #actions>
        <Button
          label="Добавить счет"
          icon="pi pi-plus"
          @click="openModal"
        />
      </template>
    </PageHeader>

    <section class="accounts__content">
      <div
        v-if="loadingAccounts && accounts.length === 0"
        class="accounts__skeleton"
      >
        <Skeleton v-for="i in 4" :key="i" height="160px" />
      </div>

      <EmptyState
        v-else-if="accounts.length === 0"
        icon="pi-wallet"
        title="Нет подключенных счетов"
        description="Добавьте банковский счет или кошелек, чтобы начать отслеживать ваши финансы."
        action-label="Добавить счет"
        action-icon="pi pi-plus"
        @action="openModal"
      />

      <div v-else class="accounts-grid">
        <article
          v-for="account in accounts"
          :key="account.id"
          class="account-card ft-card"
        >
          <header class="account-card__header">
            <div>
              <h3>{{ account.name }}</h3>
              <p>{{ accountTypeLabel(account.type) }}</p>
            </div>
            <StatusBadge
              v-if="account.isMain"
              label="Основной"
              severity="success"
              dot
            />
          </header>

          <dl class="account-card__meta">
            <div class="meta-row">
              <dt>Валюта</dt>
              <dd>
                <span class="currency-chip">
                  {{ account.currency?.symbol ?? '' }} {{ account.currency?.code ?? account.currencyCode }}
                </span>
              </dd>
            </div>

            <div class="meta-row">
              <dt>ID счета</dt>
              <dd>
                <code>{{ account.id.slice(0, 8) }}…</code>
              </dd>
            </div>
          </dl>

          <footer class="account-card__actions">
            <Button
              v-if="!account.isMain"
              label="Сделать основным"
              icon="pi pi-star"
              text
              :loading="pendingPrimaryId === account.id"
              @click="handleSetPrimary(account.id)"
            />
            <StatusBadge
              v-else
              label="Основной счет для аналитики"
              severity="info"
              size="sm"
            />
          </footer>
        </article>
      </div>
    </section>

    <AccountFormModal v-model:visible="modalVisible" />
    <Skeleton
      v-if="loadingCurrencies"
      class="visually-hidden"
      height="0"
    />
  </div>
</template>

<style scoped>
.accounts {
  gap: var(--ft-space-8);
}

.accounts__content {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}

.accounts__skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--ft-space-4);
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ft-space-4);
}

.account-card {
  gap: var(--ft-space-4);
  border: 1px solid var(--ft-border-soft);
}

.account-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ft-space-3);
}

.account-card__header h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  color: var(--ft-heading);
  font-weight: var(--ft-font-semibold);
}

.account-card__header p {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.account-card__meta {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  margin: 0;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-3);
}

.meta-row dt {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.meta-row dd {
  margin: 0;
  font-weight: var(--ft-font-medium);
  color: var(--ft-heading);
}

.currency-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-1);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: var(--ft-primary-600);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  padding: var(--ft-space-1) var(--ft-space-3);
}

.account-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-2);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
</style>
