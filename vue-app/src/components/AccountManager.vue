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
const areAccountsLoading = computed(() => store.areAccountsLoading);

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
  <section class="manager-card ft-card ft-card--muted">
    <header class="manager-head">
      <div class="ft-section__head">
        <span class="ft-kicker">Счета</span>
        <h3>Управление счетами</h3>
        <p class="ft-text ft-text--muted">Создавайте новые счета и отмечайте основной для аналитики.</p>
      </div>
      <Button label="Новый счет" icon="pi pi-plus" size="small" @click="openModal" />
    </header>

    <div v-if="areAccountsLoading" class="ft-empty">
      <p class="ft-text ft-text--muted">Загружаем счета...</p>
    </div>

    <div v-else-if="accounts.length === 0" class="ft-empty">
      <p class="ft-text ft-text--muted">Счета не найдены. Создайте первый, чтобы начать учет.</p>
    </div>

    <ul v-else class="account-list">
      <li v-for="account in accounts" :key="account.id" class="account-item">
        <div class="account-info">
          <div>
            <p class="account-name">
              {{ account.name }}
              <Tag v-if="account.isMain" value="Основной" severity="success" rounded />
            </p>
            <small class="ft-text ft-text--muted">Тип: {{ account.type === 0 ? 'Банк' : 'Наличные' }}</small>
          </div>
          <div class="account-meta">
            <span class="currency-chip ft-pill">
              {{ account.currency?.symbol ?? '' }} {{ account.currency?.code ?? account.currencyCode ?? '—' }}
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
  gap: clamp(1.5rem, 2vw, 2rem);
}

.manager-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.account-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.85rem, 1.2vw, 1.2rem);
}

.account-item {
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);
  padding: clamp(0.95rem, 1.2vw, 1.2rem) clamp(1.1rem, 1.6vw, 1.4rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: clamp(0.75rem, 1vw, 1rem);
  background: rgba(13, 22, 43, 0.8);
  box-shadow: 0 18px 40px rgba(8, 15, 34, 0.4);
}

.account-info {
  display: flex;
  align-items: center;
  gap: clamp(0.9rem, 1.2vw, 1.1rem);
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
  font-size: 0.95rem;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.28);
}
</style>
