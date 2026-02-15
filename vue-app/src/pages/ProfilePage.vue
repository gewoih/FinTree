<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import CategoryManager from '../components/CategoryManager.vue';
import type { SubscriptionPlan } from '../types';
import UiButton from '../ui/UiButton.vue';
import UiCard from '../ui/UiCard.vue';
import UiInputText from '../ui/UiInputText.vue';
import UiSelect from '../ui/UiSelect.vue';
import UiSkeleton from '../ui/UiSkeleton.vue';
import StatusBadge from '../components/common/StatusBadge.vue';
import PageContainer from '../components/layout/PageContainer.vue';
import PageHeader from '../components/common/PageHeader.vue';

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

const isPaymentHistoryOpen = ref(false);

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

const userInitials = computed(() => {
  const name = currentUser.value?.name;
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const second = parts[1];
  if (second) {
    return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase();
  }
  return first.slice(0, 2).toUpperCase();
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

function normalizeTelegramId(value: string | null | undefined): string {
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
      title="Настройки"
      subtitle="Управляйте профилем и подпиской"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Настройки' }
      ]"
    />

    <div class="profile-tabs">
      <div
        class="profile-tabs__bar"
        role="tablist"
        aria-label="Разделы настроек"
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
            class="pi pi-cog"
            aria-hidden="true"
          />
          <span>Настройки</span>
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
        <!-- Card 1: Profile (read-only, muted) -->
        <UiCard
          class="profile-card"
          variant="muted"
          padding="lg"
        >
          <div class="profile-identity">
            <div
              class="profile-avatar"
              aria-hidden="true"
            >
              {{ userInitials }}
            </div>
            <div class="profile-identity__info">
              <p class="profile-identity__name">
                {{ currentUser?.name ?? '—' }}
              </p>
              <p class="profile-identity__email">
                {{ currentUser?.email ?? '—' }}
              </p>
            </div>
          </div>
        </UiCard>

        <!-- Card 2: App settings (editable) -->
        <UiCard
          id="telegram"
          class="profile-card"
          padding="lg"
        >
          <template #header>
            <div class="card-header">
              <div>
                <h3 class="card-title">
                  Основные настройки
                </h3>
              </div>
            </div>
          </template>

          <form
            class="settings-form"
            @submit.prevent="handleSubmit"
          >
            <div class="settings-grid">
              <div class="settings-field">
                <label
                  class="settings-label"
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
                <small class="helper-text">
                  <template v-if="isLoading">Загрузка доступных валют…</template>
                  <template v-else>В этой валюте считается вся аналитика и отчёты</template>
                </small>
              </div>

              <div class="settings-field">
                <label
                  class="settings-label"
                  for="profileTelegram"
                >Telegram-бот</label>
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
                  Отправьте <code>/id</code> боту
                  <a
                    href="https://t.me/financetree_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                  >@financetree_bot</a>
                  и вставьте цифры сюда. Оставьте пустым, чтобы отвязать.
                </small>
              </div>
            </div>

            <div class="settings-actions">
              <UiButton
                type="button"
                label="Сбросить"
                variant="ghost"
                :disabled="!hasChanges || isSaving || isReadOnlyMode"
                @click="resetForm"
              />
              <UiButton
                type="submit"
                label="Сохранить"
                icon="pi pi-check"
                :loading="isSaving"
                :disabled="!canSubmit"
              />
            </div>
          </form>
        </UiCard>

        <!-- Card 3: Subscription (outlined) -->
        <UiCard
          id="subscription"
          class="profile-card"
          variant="outlined"
          padding="lg"
        >
          <template #header>
            <div class="card-header">
              <h3 class="card-title">
                Подписка
              </h3>
              <StatusBadge
                :label="isSubscriptionActive ? 'Активна' : 'Только просмотр'"
                :severity="isSubscriptionActive ? 'success' : 'warning'"
                :icon="isSubscriptionActive ? 'pi-check-circle' : 'pi-lock'"
              />
            </div>
          </template>

          <p
            v-if="isSubscriptionActive"
            class="subscription-status-line"
          >
            Активна до <strong>{{ subscriptionExpiresAtLabel ?? '—' }}</strong>
          </p>
          <p
            v-else
            class="subscription-status-line"
          >
            Доступен только просмотр
          </p>

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

          <p class="subscription-sim-note">
            Сейчас оплата имитируется: при нажатии «Оплатить» выдается бесплатный доступ на 1 месяц.
          </p>
        </UiCard>

        <!-- Card 4: Payment history (muted, collapsible) -->
        <UiCard
          class="profile-card"
          variant="muted"
          padding="lg"
        >
          <button
            type="button"
            class="collapsible-header"
            :aria-expanded="isPaymentHistoryOpen"
            aria-controls="payment-history-content"
            @click="isPaymentHistoryOpen = !isPaymentHistoryOpen"
          >
            <h3 class="card-title">
              История оплат
            </h3>
            <span
              v-if="formattedSubscriptionPayments.length > 0"
              class="payment-count-badge"
            >
              {{ formattedSubscriptionPayments.length }}
            </span>
            <i
              class="pi collapsible-chevron"
              :class="isPaymentHistoryOpen ? 'pi-chevron-up' : 'pi-chevron-down'"
              aria-hidden="true"
            />
          </button>

          <div
            id="payment-history-content"
            v-show="isPaymentHistoryOpen"
            class="payment-history-body"
          >
            <div
              v-if="areSubscriptionPaymentsLoading"
              class="payment-history__skeleton"
            >
              <UiSkeleton
                v-for="i in 3"
                :key="i"
                height="52px"
              />
            </div>

            <div
              v-else-if="formattedSubscriptionPayments.length === 0"
              class="payment-history__empty"
            >
              Оплат пока нет. Когда вы нажмете «Оплатить», запись появится здесь.
            </div>

            <ul
              v-else
              class="payment-history__list"
            >
              <li
                v-for="payment in formattedSubscriptionPayments"
                :key="payment.id"
                class="payment-history__item"
              >
                <div>
                  <p class="payment-history__title">
                    {{ payment.planLabel }} · {{ payment.statusLabel }}
                  </p>
                  <p class="payment-history__meta">
                    {{ payment.paidAtLabel }} · Период: {{ payment.periodLabel }}
                  </p>
                </div>
                <div class="payment-history__amounts">
                  <span>Списано: {{ payment.chargedLabel }}</span>
                  <small>Тариф: {{ payment.listedLabel }}</small>
                </div>
              </li>
            </ul>
          </div>
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
  gap: var(--ft-space-6);
}

.profile-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);
}

.profile-tabs__bar {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2);

  background: linear-gradient(135deg, color-mix(in srgb, var(--ft-surface-raised) 70%, transparent), var(--ft-surface-base));
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg, var(--ft-radius-xl));
  box-shadow: var(--ft-shadow-md);
}

.profile-tab {
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: 0.6rem 1.4rem;

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-lg, var(--ft-radius-xl));

  transition:
    background-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.profile-tab.is-active {
  color: var(--ft-text-inverse);
  background: color-mix(in srgb, var(--ft-primary-500) 75%, transparent);
  box-shadow: var(--ft-shadow-md);
}

.profile-tab i {
  font-size: 1rem;
}

.profile-tab:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 60%, transparent);
  outline-offset: 2px;
}

.profile-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);
}

.profile-tab-panel--categories {
  scroll-margin-top: 120px;
}

.profile-card {
  gap: var(--ft-space-5);
}

:deep(.profile-card .ui-card__body) {
  gap: var(--ft-space-5);
}

/* Card 1: Profile identity */
.profile-identity {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
}

.profile-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  width: 48px;
  height: 48px;

  font-size: var(--ft-text-base);
  font-weight: 700;
  color: var(--ft-text-inverse);
  letter-spacing: 0.04em;

  background: linear-gradient(135deg, var(--ft-primary-500), color-mix(in srgb, var(--ft-primary-500) 70%, #000));
  border-radius: 50%;
}

.profile-identity__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profile-identity__name {
  margin: 0;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.profile-identity__email {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

/* Card 2: Settings form */
.card-header {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-5);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ft-space-4);
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.settings-label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.helper-text {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

.helper-text code {
  padding: 0.1em 0.35em;

  font-family: var(--ft-font-mono, 'JetBrains Mono', monospace);
  font-size: 0.9em;

  background: var(--ft-surface-raised);
  border-radius: var(--ft-radius-sm, var(--ft-radius-md));
}

.telegram-input {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  justify-content: flex-end;
}

.settings-actions :deep(.ui-button) {
  min-width: 140px;
}

/* Card 3: Subscription */
.subscription-status-line {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.subscription-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--ft-space-3);
}

.subscription-plan {
  display: grid;
  gap: var(--ft-space-2);

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md, var(--ft-radius-lg));
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
  color: var(--ft-text-secondary);
}

.subscription-sim-note {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
}

/* Card 4: Collapsible payment history */
.collapsible-header {
  cursor: pointer;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  width: 100%;
  padding: 0;

  color: inherit;

  background: none;
  border: none;
}

.collapsible-header:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 60%, transparent);
  outline-offset: 2px;
  border-radius: var(--ft-radius-sm, var(--ft-radius-md));
}

.payment-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: 22px;
  height: 22px;
  padding: 0 6px;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-inverse);

  background: color-mix(in srgb, var(--ft-primary-500) 80%, transparent);
  border-radius: 11px;
}

.collapsible-chevron {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--ft-text-secondary);
  transition: transform var(--ft-transition-fast);
}

.payment-history-body {
  margin-top: var(--ft-space-4);
}

.payment-history__skeleton {
  display: grid;
  gap: var(--ft-space-2);
}

.payment-history__empty {
  padding: var(--ft-space-3);

  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px dashed var(--ft-border-default);
  border-radius: var(--ft-radius-md, var(--ft-radius-lg));
}

.payment-history__list {
  display: grid;
  gap: var(--ft-space-2);

  margin: 0;
  padding: 0;

  list-style: none;
}

.payment-history__item {
  display: flex;
  gap: var(--ft-space-3);
  align-items: flex-start;
  justify-content: space-between;

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-md, var(--ft-radius-lg));
}

.payment-history__title {
  margin: 0;
  font-weight: var(--ft-font-semibold);
}

.payment-history__meta {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.payment-history__amounts {
  display: grid;
  gap: 2px;
  text-align: right;
}

.payment-history__amounts small {
  color: var(--ft-text-secondary);
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

  .settings-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .payment-history__item {
    flex-direction: column;
  }

  .payment-history__amounts {
    text-align: left;
  }
}
</style>
