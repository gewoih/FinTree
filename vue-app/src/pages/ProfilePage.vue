<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import CategoryManager from '../components/CategoryManager.vue';
import type { SubscriptionPlan } from '../types';

const financeStore = useFinanceStore();
const userStore = useUserStore();
const toast = useToast();
const router = useRouter();
const route = useRoute();

const { currencies, areCurrenciesLoading } = storeToRefs(financeStore);
const {
  currentUser,
  isLoading: isUserLoading,
  isSaving: isUserSaving,
  isReadOnlyMode,
  hasActiveSubscription,
  isSubscriptionProcessing,
  subscriptionPayments,
  areSubscriptionPaymentsLoading,
} = storeToRefs(userStore);

const form = reactive({
  baseCurrencyCode: '',
  telegramUserId: '',
});

const isLoading = computed(() => isUserLoading.value || areCurrenciesLoading.value);
const isSaving = computed(() => isUserSaving.value);
const isSubscriptionActive = computed(() => hasActiveSubscription.value);
const subscriptionExpiresAtLabel = computed(() => {
  const raw = currentUser.value?.subscription?.expiresAtUtc;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU');
});

const subscriptionPlans = computed(() => {
  const monthPrice = currentUser.value?.subscription?.monthPriceRub ?? 390;
  const yearPrice = currentUser.value?.subscription?.yearPriceRub ?? 3900;

  return [
    {
      plan: 'Month' as SubscriptionPlan,
      title: '1 месяц',
      price: monthPrice,
      hint: 'Стандартная цена 390 ₽',
    },
    {
      plan: 'Year' as SubscriptionPlan,
      title: '1 год',
      price: yearPrice,
      hint: 'Стандартная цена 3 900 ₽',
    },
  ];
});

const formattedSubscriptionPayments = computed(() =>
  subscriptionPayments.value.map(payment => {
    const paidAt = new Date(payment.paidAtUtc);
    const periodStart = new Date(payment.subscriptionStartsAtUtc);
    const periodEnd = new Date(payment.subscriptionEndsAtUtc);

    return {
      ...payment,
      paidAtLabel: Number.isNaN(paidAt.getTime()) ? '—' : paidAt.toLocaleString('ru-RU'),
      periodLabel:
        Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())
          ? '—'
          : `${periodStart.toLocaleDateString('ru-RU')} - ${periodEnd.toLocaleDateString('ru-RU')}`,
      planLabel: payment.plan === 'Year' ? '1 год' : '1 месяц',
      chargedLabel: `${Math.round(payment.chargedPriceRub)} ₽`,
      listedLabel: `${Math.round(payment.listedPriceRub)} ₽`,
      statusLabel: payment.status === 'Succeeded'
        ? 'Успешно'
        : payment.status === 'Failed'
          ? 'Ошибка'
          : payment.status === 'Refunded'
            ? 'Возврат'
            : 'Отменено',
    };
  })
);

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

const canSubmit = computed(() =>
  Boolean(form.baseCurrencyCode) && hasChanges.value && !isSaving.value && !isReadOnlyMode.value
);

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
  await userStore.fetchSubscriptionPayments();

  if (currentUser.value) {
    resetForm();
  }
});

async function handleSubmit() {
  if (isReadOnlyMode.value) {
    toast.add({
      severity: 'warn',
      summary: 'Режим просмотра',
      detail: 'Изменение профиля доступно только при активной подписке.',
      life: 3000,
    });
    return;
  }

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

async function handlePay(plan: SubscriptionPlan) {
  const success = await userStore.simulateSubscriptionPayment(plan);
  if (success) {
    toast.add({
      severity: 'success',
      summary: 'Подписка активирована',
      detail: 'Оплата имитирована успешно. Выдан бесплатный доступ на 1 месяц.',
      life: 3500,
    });
    return;
  }

  toast.add({
    severity: 'error',
    summary: 'Не удалось активировать подписку',
    detail: 'Пожалуйста, попробуйте еще раз.',
    life: 3000,
  });
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
          id="subscription"
          class="profile-card profile-card--subscription"
          variant="outlined"
          padding="lg"
        >
          <template #header>
            <div class="card-header">
              <div>
                <h3 class="card-title">
                  Подписка
                </h3>
                <p class="card-subtitle">
                  Полный доступ к функциям доступен только при активной подписке.
                </p>
              </div>
              <StatusBadge
                :label="isSubscriptionActive ? 'Активна' : 'Только просмотр'"
                :severity="isSubscriptionActive ? 'success' : 'warning'"
                :icon="isSubscriptionActive ? 'pi-check-circle' : 'pi-lock'"
              />
            </div>
          </template>

          <div class="subscription-status">
            <p v-if="isSubscriptionActive">
              Подписка активна до <strong>{{ subscriptionExpiresAtLabel ?? '—' }}</strong>.
            </p>
            <p v-else>
              Подписка неактивна. Доступ только на просмотр, пока не нажмете «Оплатить».
            </p>
            <p class="subscription-status__note">
              Сейчас оплата имитируется: при нажатии «Оплатить» выдается бесплатный доступ на 1 месяц.
            </p>
          </div>

          <div class="subscription-plans">
            <article
              v-for="plan in subscriptionPlans"
              :key="plan.plan"
              class="subscription-plan"
            >
              <h4>{{ plan.title }}</h4>
              <p class="subscription-plan__price">
                {{ plan.price }} ₽
              </p>
              <p class="subscription-plan__hint">
                {{ plan.hint }}
              </p>
              <UiButton
                label="Оплатить"
                icon="pi pi-credit-card"
                :loading="isSubscriptionProcessing"
                :disabled="isSubscriptionProcessing || isSubscriptionActive"
                @click="handlePay(plan.plan)"
              />
            </article>
          </div>

          <div class="subscription-history">
            <h4>История оплат</h4>

            <div
              v-if="areSubscriptionPaymentsLoading"
              class="subscription-history__skeleton"
            >
              <UiSkeleton
                v-for="i in 3"
                :key="i"
                height="52px"
              />
            </div>

            <div
              v-else-if="formattedSubscriptionPayments.length === 0"
              class="subscription-history__empty"
            >
              Оплат пока нет. Когда вы нажмете «Оплатить», запись появится здесь.
            </div>

            <ul
              v-else
              class="subscription-history__list"
            >
              <li
                v-for="payment in formattedSubscriptionPayments"
                :key="payment.id"
                class="subscription-history__item"
              >
                <div>
                  <p class="subscription-history__title">
                    {{ payment.planLabel }} · {{ payment.statusLabel }}
                  </p>
                  <p class="subscription-history__meta">
                    {{ payment.paidAtLabel }} · Период: {{ payment.periodLabel }}
                  </p>
                </div>
                <div class="subscription-history__amounts">
                  <span>Списано: {{ payment.chargedLabel }}</span>
                  <small>Тариф: {{ payment.listedLabel }}</small>
                </div>
              </li>
            </ul>
          </div>
        </UiCard>

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
                  :disabled="isLoading || isReadOnlyMode"
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
                    :disabled="isSaving || isReadOnlyMode"
                  />
                  <UiButton
                    type="button"
                    label="Очистить"
                    variant="ghost"
                    size="sm"
                    :disabled="!form.telegramUserId || isSaving || isReadOnlyMode"
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
                :disabled="!hasChanges || isSaving || isReadOnlyMode"
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
        <CategoryManager :readonly="isReadOnlyMode" />
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
  gap: var(--space-2);
  align-items: center;

  padding: var(--space-2);

  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 70%, transparent), var(--surface-1));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
}

.profile-tab {
  cursor: pointer;

  display: inline-flex;
  gap: var(--space-2);
  align-items: center;

  padding: 0.6rem 1.4rem;

  font-size: var(--ft-text-base);
  font-weight: 600;
  color: var(--text);

  background: transparent;
  border: none;
  border-radius: var(--radius-lg);

  transition:
    background-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.profile-tab.is-active {
  color: var(--ft-text-inverse);
  background: color-mix(in srgb, var(--accent) 75%, transparent);
  box-shadow: var(--ft-shadow-md);
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

.profile-card--subscription {
  scroll-margin-top: 120px;
}

:deep(.profile-card .ui-card__body) {
  gap: var(--space-5);
}

.card-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
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
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.profile-row p {
  margin: 0;

  font-size: var(--ft-text-base);
  color: var(--text);
  word-break: normal;
  overflow-wrap: anywhere;
}

.profile-row .muted {
  font-family: var(--ft-font-mono, 'Fira Code', monospace);
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.profile-divider {
  width: 100%;
  height: 1px;
  opacity: 0.6;
  background: var(--border);
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
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: flex-end;
}

.actions :deep(.ui-button) {
  min-width: 180px;
}

.subscription-status p {
  margin: 0;
  color: var(--text);
}

.subscription-status__note {
  margin-top: var(--space-2) !important;
  font-size: var(--ft-text-sm);
  color: var(--text-muted) !important;
}

.subscription-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.subscription-plan {
  display: grid;
  gap: var(--space-2);

  padding: var(--space-3);

  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.subscription-plan h4 {
  margin: 0;
}

.subscription-plan__price {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: 700;
}

.subscription-plan__hint {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.subscription-history {
  display: grid;
  gap: var(--space-3);
}

.subscription-history h4 {
  margin: 0;
}

.subscription-history__skeleton {
  display: grid;
  gap: var(--space-2);
}

.subscription-history__empty {
  padding: var(--space-3);

  color: var(--text-muted);

  background: var(--surface-1);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}

.subscription-history__list {
  display: grid;
  gap: var(--space-2);

  margin: 0;
  padding: 0;

  list-style: none;
}

.subscription-history__item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  justify-content: space-between;

  padding: var(--space-3);

  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.subscription-history__title {
  margin: 0;
  font-weight: 600;
}

.subscription-history__meta {
  margin: var(--space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
}

.subscription-history__amounts {
  display: grid;
  gap: 2px;
  text-align: right;
}

.subscription-history__amounts small {
  color: var(--text-muted);
}

@media (width <= 768px) {
  .profile-tabs__bar {
    justify-content: space-between;
    width: 100%;
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

  .subscription-history__item {
    flex-direction: column;
  }

  .subscription-history__amounts {
    text-align: left;
  }
}
</style>
