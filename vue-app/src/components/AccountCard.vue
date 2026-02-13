<script setup lang="ts">
import { computed, ref } from 'vue'
import ToggleSwitch from 'primevue/toggleswitch'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import type { Account } from '../types'
import { getCurrencyFlag } from '../utils/accountHelpers'
import { formatCurrency } from '../utils/formatters'
import { useUserStore } from '../stores/user'

const props = withDefaults(defineProps<{
  account: Account
  readonly?: boolean
  interactionLocked?: boolean
  isPrimaryLoading?: boolean
  isLiquidityLoading?: boolean
  isArchiveLoading?: boolean
}>(), {
  readonly: false,
  interactionLocked: false,
  isPrimaryLoading: false,
  isLiquidityLoading: false,
  isArchiveLoading: false,
})

const emit = defineEmits<{
  setPrimary: []
  edit: []
  archive: []
  unarchive: []
  open: []
  updateLiquidity: [value: boolean]
}>()

const menuRef = ref()
const userStore = useUserStore()

const currencyFlag = computed(() => getCurrencyFlag(props.account.currencyCode))
const currencyDisplay = computed(() => {
  const flag = currencyFlag.value
  const symbol = props.account.currency?.symbol || ''
  const code = props.account.currency?.code || props.account.currencyCode
  return flag ? `${flag} ${symbol} ${code}` : `${symbol} ${code}`
})

const baseCurrencyCode = computed(() => userStore.baseCurrencyCode ?? props.account.currencyCode)
const balanceInBase = computed(() => props.account.balanceInBaseCurrency ?? 0)
const balanceInAccount = computed(() => props.account.balance ?? 0)

const showSecondaryBalance = computed(() =>
  baseCurrencyCode.value.toUpperCase() !== props.account.currencyCode.toUpperCase()
)

const formattedBaseBalance = computed(() =>
  formatCurrency(balanceInBase.value, baseCurrencyCode.value)
)

const formattedAccountBalance = computed(() =>
  formatCurrency(balanceInAccount.value, props.account.currencyCode)
)

const liquidityModel = computed({
  get: () => props.account.isLiquid,
  set: (value: boolean) => emit('updateLiquidity', value),
})

const liquidityLabel = computed(() => (props.account.isLiquid ? 'Ликвидный' : 'Неликвидный'))

const menuItems = computed<MenuItem[]>(() => {
  if (props.readonly || props.interactionLocked) return []

  return [
    {
      label: 'Редактировать',
      icon: 'pi pi-pencil',
      command: () => emit('edit')
    },
    {
      label: 'Архивировать',
      icon: 'pi pi-inbox',
      command: () => emit('archive')
    }
  ]
})

const toggleMenu = (event: Event) => {
  menuRef.value.toggle(event)
}
</script>

<template>
  <article
    class="account-card ft-card"
    :class="{
      'account-card--primary': account.isMain && !readonly,
      'account-card--readonly': readonly
    }"
  >
    <header class="account-card__header">
      <div class="account-card__title">
        <h3>{{ account.name }}</h3>
        <p>Банковский счет</p>
      </div>

      <div class="account-card__header-actions">
        <UiButton
          v-if="!readonly && !interactionLocked && !account.isMain"
          class="account-card__icon-button"
          variant="ghost"
          size="sm"
          icon="pi pi-star"
          :loading="isPrimaryLoading"
          aria-label="Сделать основным"
          @click.stop="emit('setPrimary')"
        />
        <UiButton
          v-if="menuItems.length > 0"
          class="account-card__icon-button"
          variant="ghost"
          size="sm"
          icon="pi pi-ellipsis-v"
          :aria-label="`Действия для счета ${account.name}`"
          @click.stop="toggleMenu"
        />
        <Menu
          ref="menuRef"
          :model="menuItems"
          :popup="true"
          :pt="{
            root: { class: 'account-menu' },
          }"
        />
      </div>
    </header>

    <div class="account-card__badges">
      <StatusBadge
        v-if="account.isMain && !readonly"
        label="Основной счет"
        severity="success"
        icon="pi-star-fill"
        size="sm"
      />
      <StatusBadge
        v-if="readonly"
        label="В архиве"
        severity="warning"
        icon="pi-inbox"
        size="sm"
      />
      <StatusBadge
        v-if="interactionLocked && !readonly"
        label="Только просмотр"
        severity="warning"
        icon="pi-lock"
        size="sm"
      />
    </div>

    <div class="account-card__balance">
      <p class="account-card__balance-label">
        Баланс
      </p>
      <p class="account-card__balance-main">
        {{ formattedBaseBalance }}
      </p>
      <p
        v-if="showSecondaryBalance"
        class="account-card__balance-secondary"
      >
        {{ formattedAccountBalance }}
      </p>
    </div>

    <dl class="account-card__meta">
      <div class="meta-row">
        <dt>Валюта</dt>
        <dd class="currency-chip">
          {{ currencyDisplay }}
        </dd>
      </div>
      <div class="meta-row">
        <dt>Ликвидность</dt>
        <dd>
          <div
            v-if="!readonly && !interactionLocked"
            class="liquidity-control"
            @click.stop
          >
            <ToggleSwitch
              v-model="liquidityModel"
              :disabled="isLiquidityLoading"
            />
            <span>{{ liquidityLabel }}</span>
          </div>
          <span
            v-else
            class="account-card__readonly-value"
          >
            {{ liquidityLabel }}
          </span>
        </dd>
      </div>
    </dl>

    <footer class="account-card__footer">
      <UiButton
        v-if="readonly"
        variant="ghost"
        size="sm"
        icon="pi pi-box"
        label="Разархивировать"
        :loading="isArchiveLoading"
        :disabled="interactionLocked"
        @click.stop="emit('unarchive')"
      />
      <UiButton
        v-else
        variant="ghost"
        size="sm"
        icon="pi pi-sliders-h"
        label="Корректировать баланс"
        :disabled="interactionLocked"
        @click.stop="emit('open')"
      />
    </footer>
  </article>
</template>

<style scoped>
.account-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);

  min-height: 250px;

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-soft);

  transition:
    border-color var(--ft-transition-base),
    box-shadow var(--ft-transition-base);
}

.account-card:hover {
  border-color: var(--ft-primary-200);
  box-shadow: var(--ft-shadow-md);
}

.account-card--primary {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 5%, transparent) 0%,
    color-mix(in srgb, var(--ft-primary-500) 10%, transparent) 100%
  );
  border-color: var(--ft-primary-300);
}

.account-card--readonly {
  cursor: default;
}

.account-card--readonly:hover {
  border-color: var(--ft-border-soft);
  box-shadow: none;
}

.account-card__header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.account-card__title {
  flex: 1;
  min-width: 0;
}

.account-card__title h3 {
  overflow: hidden;

  margin: 0;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-card__title p {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.account-card__header-actions {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.account-card__icon-button {
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;

  border-radius: 12px;
}

.account-card__icon-button :deep(.p-button-icon) {
  margin: 0;
}

.account-card__icon-button :deep(.p-button-label) {
  display: none;
}

.account-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: 24px;
}

.account-card__balance {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  min-height: 104px;
  padding: var(--ft-space-2) var(--ft-space-3);

  background: color-mix(in srgb, var(--ft-primary-500) 6%, transparent);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);
}

.account-card__balance-label {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}

.account-card__balance-main {
  margin: var(--ft-space-1) 0 0;
  font-size: clamp(1.1rem, 1.5vw, 1.4rem);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.account-card__balance-secondary {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.account-card__meta {
  display: grid;
  gap: var(--ft-space-2);
  margin: 0;
}

.meta-row {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;
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
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-1) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-500);

  background: color-mix(in srgb, var(--ft-primary-500) 16%, transparent);
  border-radius: var(--ft-radius-full);
}

.liquidity-control {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.account-card__readonly-value {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.account-card__footer {
  display: flex;
  justify-content: flex-end;

  margin-top: auto;
  padding-top: var(--ft-space-2);

  border-top: 1px solid var(--ft-border-soft);
}

.account-card__footer :deep(.ui-button) {
  justify-content: center;
  width: 100%;
}

@media (width <= 640px) {
  .account-card__footer :deep(.ui-button) {
    width: 100%;
  }
}
</style>
