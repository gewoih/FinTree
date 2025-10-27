<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { useFinanceStore } from '../stores/finance';
import AccountFormModal from './AccountFormModal.vue';

const store = useFinanceStore();
const toast = useToast();

const modalVisible = ref(false);
const loadingAccountId = ref<string | null>(null);

const accounts = computed(() => store.accounts);
const isLoading = computed(() => store.isLoading);

const openModal = () => {
  modalVisible.value = true;
};

const handleSetPrimary = async (accountId: string) => {
  loadingAccountId.value = accountId;
  const success = await store.setPrimaryAccount(accountId);
  loadingAccountId.value = null;

  toast.add({
    severity: success ? 'success' : 'error',
    summary: success ? 'Основной счет обновлен' : 'Не удалось обновить счет',
    life: 3000,
  });
};
</script>

<template>
  <section class="manager-card">
    <header class="manager-head">
      <div>
        <p class="section-kicker">Счета</p>
        <h3>Управление счетами</h3>
        <p class="muted">Создавайте новые счета и отмечайте основной для аналитики.</p>
      </div>
      <Button label="Новый счет" icon="pi pi-plus" size="small" @click="openModal" />
    </header>

    <div v-if="isLoading" class="empty-state">
      <p>Загружаем счета...</p>
    </div>

    <div v-else-if="accounts.length === 0" class="empty-state">
      <p>Счета не найдены. Создайте первый, чтобы начать учет.</p>
    </div>

    <ul v-else class="account-list">
      <li v-for="account in accounts" :key="account.id" class="account-item">
        <div class="account-info">
          <div>
            <p class="account-name">
              {{ account.name }}
              <Tag v-if="account.isMain" value="Основной" severity="success" rounded />
            </p>
            <small class="muted">Тип: {{ account.type === 0 ? 'Банк' : 'Наличные' }}</small>
          </div>
          <div class="account-meta">
            <span class="currency-chip">
              {{ account.currency?.symbol ?? '' }}
              {{ account.currency?.code ?? '—' }}
            </span>
          </div>
        </div>

        <Button
            v-if="!account.isMain"
            label="Сделать основным"
            icon="pi pi-star"
            size="small"
            text
            @click="handleSetPrimary(account.id)"
            :loading="loadingAccountId === account.id"
        />
      </li>
    </ul>
    <AccountFormModal v-model:visible="modalVisible" />
  </section>
</template>

<style scoped>
.manager-card {
  border-radius: 22px;
  background: var(--ft-surface-elevated);
  padding: 1.75rem;
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.manager-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.section-kicker {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ft-text-muted);
  font-weight: 600;
}

.muted {
  color: var(--ft-text-muted);
}

.account-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.account-item {
  border: 1px solid var(--ft-border-soft);
  border-radius: 18px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: rgba(248, 250, 252, 0.65);
}

.account-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.account-name {
  margin: 0 0 0.3rem;
  font-weight: 600;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--ft-heading);
}

.account-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.currency-chip {
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: var(--ft-accent-soft);
  font-weight: 600;
  color: var(--ft-accent);
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
}

.empty-state {
  padding: 1.25rem;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.7);
  border: 1px dashed var(--ft-border-soft);
  text-align: center;
  color: var(--ft-text-muted);
}
</style>
