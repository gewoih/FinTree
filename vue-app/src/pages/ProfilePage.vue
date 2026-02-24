<script setup lang="ts">
import CategoryManager from '../components/CategoryManager.vue';
import StatusBadge from '../components/common/StatusBadge.vue';
import PageHeader from '../components/common/PageHeader.vue';
import PageContainer from '../components/layout/PageContainer.vue';
import { useProfilePage } from '../composables/useProfilePage';
import UiButton from '../ui/UiButton.vue';
import UiCard from '../ui/UiCard.vue';
import UiInputText from '../ui/UiInputText.vue';
import UiSelect from '../ui/UiSelect.vue';
import Skeleton from 'primevue/skeleton';

const {
  activeTab,
  areSubscriptionPaymentsLoading,
  canSubmit,
  currentUser,
  currencyOptions,
  form,
  formattedSubscriptionPayments,
  hasChanges,
  isLoading,
  isPaymentHistoryOpen,
  isReadOnlyMode,
  isSaving,
  isSubscriptionActive,
  isSubscriptionProcessing,
  subscriptionExpiresAtLabel,
  subscriptionPlans,
  userInitials,
  handleClearTelegram,
  handlePay,
  handleSubmit,
  resetForm,
  setActiveTab,
} = useProfilePage();
</script>

<template>
  <PageContainer class="profile-page">
    <PageHeader title="Настройки" />
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
            v-show="isPaymentHistoryOpen"
            id="payment-history-content"
            class="payment-history-body"
          >
            <div
              v-if="areSubscriptionPaymentsLoading"
              class="payment-history__skeleton"
            >
              <Skeleton
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

<style scoped src="../styles/pages/profile-page.css"></style>
