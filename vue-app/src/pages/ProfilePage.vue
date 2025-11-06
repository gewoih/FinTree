<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';

const financeStore = useFinanceStore();
const userStore = useUserStore();
const toast = useToast();

const { currencies, areCurrenciesLoading } = storeToRefs(financeStore);
const { currentUser, isLoading: isUserLoading, isSaving: isUserSaving } = storeToRefs(userStore);

const form = reactive({
  baseCurrencyCode: '',
  telegramHandle: '',
});

const isLoading = computed(() => isUserLoading.value || areCurrenciesLoading.value);
const isSaving = computed(() => isUserSaving.value);

const currencyOptions = computed(() =>
  currencies.value.map(currency => ({
    label: `${currency.symbol} ${currency.code} · ${currency.name}`,
    value: currency.code,
  }))
);

const selectedCurrency = computed(() =>
  currencies.value.find(currency => currency.code === form.baseCurrencyCode) ?? null
);

const selectedCurrencySummary = computed(() => {
  if (!selectedCurrency.value) return '';
  return `${selectedCurrency.value.symbol} ${selectedCurrency.value.code} · ${selectedCurrency.value.name}`;
});

function normalizeTelegram(value: string | null | undefined): string {
  // Приводим никнейм к единому виду, чтобы не отправлять на бэк разные форматы.
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed.length) return '';
  return trimmed.startsWith('@') ? trimmed.slice(1).trim() : trimmed;
}

const sanitizedFormTelegram = computed(() => normalizeTelegram(form.telegramHandle));

const hasChanges = computed(() => {
  if (!currentUser.value) return false;
  const currentCurrency = currentUser.value.baseCurrencyCode ?? '';
  const currentTelegram = normalizeTelegram(currentUser.value.telegramUsername);

  return (
    currentCurrency !== (form.baseCurrencyCode || '') ||
    currentTelegram !== sanitizedFormTelegram.value
  );
});

const canSubmit = computed(() => Boolean(form.baseCurrencyCode) && hasChanges.value && !isSaving.value);

function resetForm() {
  if (!currentUser.value) return;
  form.baseCurrencyCode = currentUser.value.baseCurrencyCode ?? '';
  const username = normalizeTelegram(currentUser.value.telegramUsername);
  form.telegramHandle = username ? `@${username}` : '';
}

watch(currentUser, user => {
  if (user) {
    resetForm();
  }
}, { immediate: true });

onMounted(async () => {
  await Promise.all([
    financeStore.fetchCurrencies(),
    userStore.fetchCurrentUser(),
  ]);

  if (currentUser.value) {
    resetForm();
  }
});

async function handleSubmit() {
  if (!form.baseCurrencyCode) {
    toast.add({
      severity: 'warn',
      summary: 'Выберите валюту',
      detail: 'Выберите базовую валюту перед обновлением профиля.',
      life: 2500,
    });
    return;
  }

  const success = await userStore.saveProfileSettings({
    baseCurrencyCode: form.baseCurrencyCode,
    telegramUsername: sanitizedFormTelegram.value,
  });

  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Профиль обновлен',
      detail: 'Ваши изменения применены.',
      life: 2500,
    });
    resetForm();
  } else {
    toast.add({
      severity: 'error',
      summary: 'Ошибка сохранения',
      detail: 'Не удалось обновить профиль. Пожалуйста, попробуйте еще раз.',
      life: 3000,
    });
  }
}

function handleClearTelegram() {
  form.telegramHandle = '';
}
</script>

<template>
  <div class="page profile-page">
    <PageHeader
      title="Профиль"
      subtitle="Обновите базовую валюту и Telegram для более умной аналитики"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Профиль' }
      ]"
    />

    <AppCard class="profile-card" variant="muted" padding="lg">
      <template #header>
        <div class="card-header">
          <div>
            <h3 class="card-title">Детали аккаунта</h3>
            <p class="card-subtitle">Управляйте настройками профиля, не покидая страницу.</p>
          </div>
        </div>
      </template>

      <form class="profile-form" @submit.prevent="handleSubmit">
        <div class="profile-grid">
          <div class="profile-row">
            <span class="profile-label">Имя</span>
            <p>{{ currentUser?.name ?? '—' }}</p>
          </div>

          <div class="profile-row">
            <span class="profile-label">Email</span>
            <p>{{ currentUser?.email ?? '—' }}</p>
          </div>

          <div class="profile-row">
            <span class="profile-label">ID пользователя</span>
            <p class="muted">{{ currentUser?.id ?? '—' }}</p>
          </div>
        </div>

        <div class="profile-divider" aria-hidden="true"></div>

        <div class="profile-grid editable">
          <div class="profile-row">
            <label class="profile-label" for="profileCurrency">Базовая валюта</label>
            <Select
              id="profileCurrency"
              v-model="form.baseCurrencyCode"
              :options="currencyOptions"
              option-label="label"
              option-value="value"
              placeholder="Выберите валюту"
              class="w-full"
              :disabled="isLoading"
            />
            <small v-if="isLoading" class="helper-text">
              Загрузка доступных валют…
            </small>
            <small v-else-if="selectedCurrencySummary" class="helper-text">
              {{ selectedCurrencySummary }}
            </small>
            <small v-else class="helper-text">
              Эта валюта используется для аналитики и отчетов.
            </small>
          </div>

          <div class="profile-row">
            <label class="profile-label" for="profileTelegram">Telegram</label>
            <div class="telegram-input">
              <InputText
                id="profileTelegram"
                v-model="form.telegramHandle"
                placeholder="@username"
                autocomplete="off"
                :disabled="isSaving"
                class="w-full"
              />
              <AppButton
                type="button"
                label="Очистить"
                variant="ghost"
                size="sm"
                :disabled="!form.telegramHandle || isSaving"
                @click="handleClearTelegram"
              />
            </div>
            <small class="helper-text">
              Введите никнейм без пробелов. Оставьте пустым, чтобы отвязать Telegram.
            </small>
          </div>
        </div>

        <div class="actions">
          <AppButton
            type="button"
            label="Сбросить изменения"
            variant="ghost"
            :disabled="!hasChanges || isSaving"
            @click="resetForm"
          />
          <AppButton
            type="submit"
            label="Обновить профиль"
            icon="pi pi-check"
            :loading="isSaving"
            :disabled="!canSubmit"
          />
        </div>
      </form>
    </AppCard>
  </div>
</template>

<style scoped>
.profile-page {
  gap: clamp(2rem, 3vw, 3.25rem);
}

.profile-card {
  gap: clamp(var(--ft-space-4), 3vw, var(--ft-space-6));
}

:deep(.profile-card .app-card__body) {
  gap: clamp(var(--ft-space-4), 3vw, var(--ft-space-6));
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.card-title {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.card-subtitle {
  margin: 0.25rem 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 2.5vw, 2rem);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}

.profile-grid.editable .profile-row {
  align-items: stretch;
}

.profile-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.profile-label {
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ft-text-tertiary);
}

.profile-row p {
  margin: 0;
  font-size: var(--ft-text-base);
  color: var(--ft-text-primary);
  word-break: break-word;
}

.profile-row .muted {
  color: var(--ft-text-tertiary);
  font-family: var(--ft-font-mono, 'Fira Code', monospace);
  font-size: var(--ft-text-sm);
}

.profile-divider {
  width: 100%;
  height: 1px;
  background: var(--ft-border-soft);
  opacity: 0.6;
}

.helper-text {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.telegram-input {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.actions :deep(.app-button) {
  min-width: 180px;
}

@media (max-width: 768px) {
  .telegram-input {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
