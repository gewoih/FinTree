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

    <div v-if="accounts.length === 0" class="empty-state">
      <p>Счета не найдены. Добавьте первый, чтобы начать учет.</p>
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
            <span class="currency-chip">{{ account.currency }}</span>
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
  border-radius: 20px;
  background: var(--surface-card);
  padding: 1.5rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.manager-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.section-kicker {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-color-secondary);
}

.muted {
  color: var(--text-color-secondary);
}

.account-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.account-item {
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 0.9rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.account-name {
  margin: 0 0 0.25rem;
  font-weight: 600;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.account-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.currency-chip {
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--surface-100);
  font-weight: 600;
}

.empty-state {
  padding: 1rem;
  border-radius: 12px;
  background: var(--surface-100);
  text-align: center;
}
</style>
