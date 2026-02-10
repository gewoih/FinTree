<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import CategoryManager from '../components/CategoryManager.vue';

const financeStore = useFinanceStore();
const userStore = useUserStore();
const toast = useToast();
const router = useRouter();
const route = useRoute();

const { currencies, areCurrenciesLoading } = storeToRefs(financeStore);
const { currentUser, isLoading: isUserLoading, isSaving: isUserSaving } = storeToRefs(userStore);

const form = reactive({
  baseCurrencyCode: '',
  telegramUserId: '',
});

const isLoading = computed(() => isUserLoading.value || areCurrenciesLoading.value);
const isSaving = computed(() => isUserSaving.value);

const activeTab = ref<'profile' | 'categories'>('profile');

const resolveTabFromHash = (hash: string) =>
  hash === '#categories' ? 'categories' : 'profile';

const setActiveTab = (tab: 'profile' | 'categories') => {
  activeTab.value = tab;
  const nextHash = tab === 'categories' ? '#categories' : '';
  if (route.hash !== nextHash) {
    router.replace({ hash: nextHash });
  }
};

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

function normalizeTelegramId(value: string | null | undefined): string {
  // Приводим ID к единому виду и убираем пробелы.
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed.length) return '';
  return trimmed.replace(/\s+/g, '');
}

const sanitizedFormTelegramId = computed(() => normalizeTelegramId(form.telegramUserId));
const isTelegramIdValid = computed(() =>
  !sanitizedFormTelegramId.value || /^\d+$/.test(sanitizedFormTelegramId.value)
);

const hasChanges = computed(() => {
  if (!currentUser.value) return false;
  const currentCurrency = currentUser.value.baseCurrencyCode ?? '';
  const currentTelegram = currentUser.value.telegramUserId?.toString() ?? '';

  return (
    currentCurrency !== (form.baseCurrencyCode || '') ||
    currentTelegram !== sanitizedFormTelegramId.value
  );
});

const canSubmit = computed(() => Boolean(form.baseCurrencyCode) && hasChanges.value && !isSaving.value);

function resetForm() {
  if (!currentUser.value) return;
  form.baseCurrencyCode = currentUser.value.baseCurrencyCode ?? '';
  form.telegramUserId = currentUser.value.telegramUserId?.toString() ?? '';
}

watch(currentUser, user => {
  if (user) {
    resetForm();
  }
}, { immediate: true });

watch(
  () => route.hash,
  hash => {
    activeTab.value = resolveTabFromHash(hash);
  },
  { immediate: true }
);

onMounted(async () => {
  await Promise.all([
    financeStore.fetchCurrencies(),
    financeStore.fetchCategories(),
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

  if (!isTelegramIdValid.value) {
    toast.add({
      severity: 'warn',
      summary: 'Некорректный Telegram ID',
      detail: 'Введите только цифры или оставьте поле пустым.',
      life: 3000,
    });
    return;
  }

  const parsedTelegramId = sanitizedFormTelegramId.value
    ? Number(sanitizedFormTelegramId.value)
    : null;

  const success = await userStore.saveProfileSettings({
    baseCurrencyCode: form.baseCurrencyCode,
    telegramUserId: parsedTelegramId,
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
  form.telegramUserId = '';
}
</script>

<template>
  <PageContainer class="profile-page">
    <PageHeader
      title="Профиль"
      subtitle="Обновите базовую валюту и Telegram для более умной аналитики"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Профиль' }
      ]"
    />

    <div class="profile-tabs">
      <div
        class="profile-tabs__bar"
        role="tablist"
        aria-label="Разделы профиля"
      >
        <button
          id="profile-tab"
          class="profile-tab"
          type="button"
          role="tab"
          :class="{ 'is-active': activeTab === 'profile' }"
          :aria-selected="activeTab === 'profile'"
          :tabindex="activeTab === 'profile' ? 0 : -1"
          aria-controls="profile-panel"
          @click="setActiveTab('profile')"
        >
          <i
            class="pi pi-user"
            aria-hidden="true"
          />
          <span>Профиль</span>
        </button>
        <button
          id="categories-tab"
          class="profile-tab"
          type="button"
          role="tab"
          :class="{ 'is-active': activeTab === 'categories' }"
          :aria-selected="activeTab === 'categories'"
          :tabindex="activeTab === 'categories' ? 0 : -1"
          aria-controls="categories"
          @click="setActiveTab('categories')"
        >
          <i
            class="pi pi-tags"
            aria-hidden="true"
          />
          <span>Категории</span>
        </button>
      </div>

      <section
        v-show="activeTab === 'profile'"
        id="profile-panel"
        class="profile-tab-panel"
        role="tabpanel"
        aria-labelledby="profile-tab"
      >
        <UiCard
          class="profile-card"
          variant="muted"
          padding="lg"
        >
          <template #header>
            <div class="card-header">
              <div>
                <h3 class="card-title">
                  Детали аккаунта
                </h3>
                <p class="card-subtitle">
                  Управляйте настройками профиля, не покидая страницу.
                </p>
              </div>
            </div>
          </template>

          <form
            class="profile-form"
            @submit.prevent="handleSubmit"
          >
            <div class="profile-grid">
              <div
                id="telegram"
                class="profile-row"
              >
                <span class="profile-label">Имя</span>
                <p>{{ currentUser?.name ?? '—' }}</p>
              </div>

              <div class="profile-row">
                <span class="profile-label">Email</span>
                <p>{{ currentUser?.email ?? '—' }}</p>
              </div>

              <div class="profile-row">
                <span class="profile-label">ID пользователя</span>
                <p class="muted">
                  {{ currentUser?.id ?? '—' }}
                </p>
              </div>
            </div>

            <div
              class="profile-divider"
              aria-hidden="true"
            />

            <div class="profile-grid editable">
              <div class="profile-row">
                <label
                  class="profile-label"
                  for="profileCurrency"
                >Базовая валюта</label>
                <UiSelect
                  id="profileCurrency"
                  v-model="form.baseCurrencyCode"
                  :options="currencyOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Выберите валюту"
                  :disabled="isLoading"
                />
                <small
                  v-if="isLoading"
                  class="helper-text"
                >
                  Загрузка доступных валют…
                </small>
                <small
                  v-else-if="selectedCurrencySummary"
                  class="helper-text"
                >
                  {{ selectedCurrencySummary }}
                </small>
                <small
                  v-else
                  class="helper-text"
                >
                  Эта валюта используется для аналитики и отчетов.
                </small>
              </div>

              <div class="profile-row">
                <label
                  class="profile-label"
                  for="profileTelegram"
                >Telegram ID</label>
                <div class="telegram-input">
                  <UiInputText
                    id="profileTelegram"
                    v-model="form.telegramUserId"
                    placeholder="123456789"
                    autocomplete="off"
                    :disabled="isSaving"
                  />
                  <UiButton
                    type="button"
                    label="Очистить"
                    variant="ghost"
                    size="sm"
                    :disabled="!form.telegramUserId || isSaving"
                    @click="handleClearTelegram"
                  />
                </div>
                <small class="helper-text">
                  Отправьте `/id` боту
                  <a
                    href="https://t.me/financetree_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                  >@financetree_bot</a>
                  и вставьте цифры. Оставьте пустым, чтобы отвязать Telegram.
                </small>
              </div>
            </div>

            <div class="actions">
              <UiButton
                type="button"
                label="Сбросить изменения"
                variant="ghost"
                :disabled="!hasChanges || isSaving"
                @click="resetForm"
              />
              <UiButton
                type="submit"
                label="Обновить профиль"
                icon="pi pi-check"
                :loading="isSaving"
                :disabled="!canSubmit"
              />
            </div>
          </form>
        </UiCard>
      </section>

      <section
        v-show="activeTab === 'categories'"
        id="categories"
        class="profile-tab-panel profile-tab-panel--categories"
        role="tabpanel"
        aria-labelledby="categories-tab"
      >
        <CategoryManager />
      </section>
    </div>
  </PageContainer>
</template>

<style scoped>
.profile-page {
  gap: var(--space-6);
}

.profile-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.profile-tabs__bar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 70%, transparent), var(--surface-1));
  box-shadow: var(--shadow-soft);
}

.profile-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border: none;
  background: transparent;
  color: var(--text);
  font-size: var(--ft-text-base);
  font-weight: 600;
  padding: 0.6rem 1.4rem;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    background-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.profile-tab.is-active {
  background: color-mix(in srgb, var(--accent) 75%, transparent);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
}

.profile-tab i {
  font-size: 1rem;
}

.profile-tab:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent);
  outline-offset: 2px;
}

.profile-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.profile-tab-panel--categories {
  scroll-margin-top: 120px;
}

.profile-card {
  gap: var(--space-5);
}

:deep(.profile-card .ui-card__body) {
  gap: var(--space-5);
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
  color: var(--text);
}

.card-subtitle {
  margin: 0.25rem 0 0;
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.profile-grid.editable .profile-row {
  align-items: stretch;
}

.profile-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.profile-label {
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-muted);
}

.profile-row p {
  margin: 0;
  font-size: var(--ft-text-base);
  color: var(--text);
  word-break: break-word;
}

.profile-row .muted {
  color: var(--text-muted);
  font-family: var(--ft-font-mono, 'Fira Code', monospace);
  font-size: var(--ft-text-sm);
}

.profile-divider {
  width: 100%;
  height: 1px;
  background: var(--border);
  opacity: 0.6;
}

.helper-text {
  font-size: var(--ft-text-xs);
  color: var(--text-muted);
}

.telegram-input {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.actions :deep(.ui-button) {
  min-width: 180px;
}

@media (max-width: 768px) {
  .profile-tabs__bar {
    width: 100%;
    justify-content: space-between;
  }

  .profile-tab {
    flex: 1;
    text-align: center;
  }

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
