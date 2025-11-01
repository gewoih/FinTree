<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { storeToRefs } from 'pinia';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
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
      summary: 'Select a currency',
      detail: 'Choose a base currency before updating your profile.',
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
      summary: 'Profile updated',
      detail: 'Your changes have been applied.',
      life: 2500,
    });
    resetForm();
  } else {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: 'Unable to update the profile. Please try again.',
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
      title="Profile"
      subtitle="Update your base currency and Telegram handle for smarter insights"
      :breadcrumbs="[
        { label: 'Home', to: '/dashboard' },
        { label: 'Profile' }
      ]"
    />

    <Card class="ft-card profile-card">
      <template #title>
        <div class="card-header">
          <div>
            <h3 class="card-title">Account details</h3>
            <p class="card-subtitle">Manage profile preferences without leaving the page.</p>
          </div>
        </div>
      </template>

      <template #content>
        <form class="profile-form" @submit.prevent="handleSubmit">
          <div class="profile-grid">
            <div class="profile-row">
              <label>Name</label>
              <p>{{ currentUser?.name ?? '—' }}</p>
            </div>

            <div class="profile-row">
              <label>Email</label>
              <p>{{ currentUser?.email ?? '—' }}</p>
            </div>

            <div class="profile-row">
              <label>User ID</label>
              <p class="muted">{{ currentUser?.id ?? '—' }}</p>
            </div>
          </div>

          <div class="profile-divider" aria-hidden="true"></div>

          <div class="profile-grid editable">
            <div class="profile-row">
              <label for="profileCurrency">Base currency</label>
              <Select
                id="profileCurrency"
                v-model="form.baseCurrencyCode"
                :options="currencyOptions"
                option-label="label"
                option-value="value"
                placeholder="Select currency"
                class="w-full"
                :disabled="isLoading"
              />
              <small v-if="isLoading" class="helper-text ft-text ft-text--muted">
                Loading available currencies…
              </small>
              <small v-else-if="selectedCurrencySummary" class="helper-text ft-text ft-text--muted">
                {{ selectedCurrencySummary }}
              </small>
              <small v-else class="helper-text ft-text ft-text--muted">
                This currency is used for analytics and reports.
              </small>
            </div>

            <div class="profile-row">
              <label for="profileTelegram">Telegram</label>
              <div class="telegram-input">
                <InputText
                  id="profileTelegram"
                  v-model="form.telegramHandle"
                  placeholder="@username"
                  autocomplete="off"
                  :disabled="isSaving"
                  class="w-full"
                />
                <Button
                  type="button"
                  label="Clear"
                  text
                  severity="secondary"
                  :disabled="!form.telegramHandle || isSaving"
                  @click="handleClearTelegram"
                />
              </div>
              <small class="helper-text ft-text ft-text--muted">
                Enter a handle without spaces. Leave blank to unlink Telegram.
              </small>
            </div>
          </div>

          <div class="actions">
            <Button
              type="button"
              label="Reset changes"
              outlined
              severity="secondary"
              :disabled="!hasChanges || isSaving"
              @click="resetForm"
            />
            <Button
              type="submit"
              label="Update profile"
              icon="pi pi-check"
              :loading="isSaving"
              :disabled="!canSubmit"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.profile-page {
  gap: clamp(2rem, 3vw, 3.25rem);
}

.profile-card {
  padding-bottom: clamp(1.75rem, 3vw, 2.5rem);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.card-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ft-heading);
}

.card-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--ft-text-muted);
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

.profile-row label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ft-text-muted);
}

.profile-row p {
  margin: 0;
  font-size: 1rem;
  color: var(--ft-heading);
  word-break: break-word;
}

.profile-row .muted {
  color: var(--ft-text-muted);
  font-family: var(--ft-font-mono, 'Fira Code', monospace);
  font-size: 0.85rem;
}

.profile-divider {
  width: 100%;
  height: 1px;
  background: var(--ft-border-soft);
  opacity: 0.6;
}

.helper-text {
  font-size: 0.8rem;
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
