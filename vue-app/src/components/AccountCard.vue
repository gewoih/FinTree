<script setup lang="ts">
import { ref, computed } from 'vue'
import InputSwitch from 'primevue/inputswitch'
import type { Account, AccountType } from '../types'
import { getAccountTypeInfo, getCurrencyFlag } from '../utils/accountHelpers'
import { formatCurrency } from '../utils/formatters'
import { useUserStore } from '../stores/user'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'

const props = defineProps<{
  account: Account
  isPrimaryLoading?: boolean
  isLiquidityLoading?: boolean
}>()

const emit = defineEmits<{
  setPrimary: []
  edit: []
  delete: []
  open: []
  updateLiquidity: [value: boolean]
}>()

const menuRef = ref()
const isMenuOpen = ref(false)
const userStore = useUserStore()

const accountTypeInfo = computed(() => getAccountTypeInfo(props.account.type as AccountType))
const currencyFlag = computed(() => getCurrencyFlag(props.account.currencyCode))
const currencyDisplay = computed(() => {
  const flag = currencyFlag.value
  const symbol = props.account.currency?.symbol || ''
  const code = props.account.currency?.code || props.account.currencyCode

  return flag ? `${flag} ${symbol} ${code}` : `${symbol} ${code}`
})

const baseCurrencyCode = computed(() => userStore.baseCurrencyCode ?? props.account.currencyCode)

const liquidityModel = computed({
  get: () => props.account.isLiquid,
  set: (value: boolean) => emit('updateLiquidity', value),
})

const liquidityLabel = computed(() => (props.account.isLiquid ? 'Ликвидный' : 'Неликвидный'))

const balanceInBase = computed(() => props.account.balanceInBaseCurrency ?? 0)
const balanceInAccount = computed(() => props.account.balance ?? 0)

const showSecondaryBalance = computed(() => {
  if (!baseCurrencyCode.value) return false
  return baseCurrencyCode.value.toUpperCase() !== props.account.currencyCode.toUpperCase()
})

const formattedBaseBalance = computed(() =>
  formatCurrency(balanceInBase.value, baseCurrencyCode.value)
)

const formattedAccountBalance = computed(() =>
  formatCurrency(balanceInAccount.value, props.account.currencyCode)
)

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []

  items.push(
    {
      label: 'Редактировать',
      icon: 'pi pi-pencil',
      command: () => emit('edit')
    },
    {
      label: 'Удалить',
      icon: 'pi pi-trash',
      command: () => emit('delete'),
      class: 'menu-item-danger'
    }
  )

  return items
})

const toggleMenu = (event: Event) => {
  menuRef.value.toggle(event)
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <article
    class="account-card ft-card"
    :class="{ 'account-card--primary': account.isMain }"
    @click="emit('open')"
  >
    <!-- Header with icon, name, and menu -->
    <header class="account-card__header">
      <div
        class="account-card__icon"
        :style="{ color: accountTypeInfo.color }"
      >
        <i
          :class="`pi ${accountTypeInfo.icon}`"
          aria-hidden="true"
        />
      </div>

      <div class="account-card__title-section">
        <h3 class="account-card__name">
          {{ account.name }}
        </h3>
        <p class="account-card__type">
          {{ accountTypeInfo.label }}
        </p>
      </div>

      <UiButton
        class="account-card__menu-button"
        icon="pi pi-ellipsis-v"
        variant="ghost"
        size="sm"
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
    </header>

    <!-- Status badges -->
    <div
      v-if="account.isMain"
      class="account-card__badges"
    >
      <StatusBadge
        label="Основной счет"
        severity="success"
        icon="pi-star-fill"
        size="sm"
      />
    </div>

    <!-- Account details -->
    <dl class="account-card__meta">
      <div class="meta-row">
        <dt>
          <i
            class="pi pi-globe"
            aria-hidden="true"
          />
          Валюта
        </dt>
        <dd>
          <span class="currency-chip">
            {{ currencyDisplay }}
          </span>
        </dd>
      </div>

      <div class="meta-row">
        <dt>
          <i
            class="pi pi-wallet"
            aria-hidden="true"
          />
          Баланс
        </dt>
        <dd>
          <div class="balance-summary">
            <span class="balance-summary__main">
              {{ formattedBaseBalance }}
            </span>
            <span
              v-if="showSecondaryBalance"
              class="balance-summary__secondary"
            >
              {{ formattedAccountBalance }}
            </span>
          </div>
        </dd>
      </div>

      <div class="meta-row">
        <dt>
          <i
            class="pi pi-bolt"
            aria-hidden="true"
          />
          Ликвидность
        </dt>
        <dd>
          <div
            class="liquidity-control"
            @click.stop
          >
            <InputSwitch
              v-model="liquidityModel"
              :disabled="isLiquidityLoading"
            />
            <span>{{ liquidityLabel }}</span>
          </div>
        </dd>
      </div>
    </dl>

    <!-- Quick actions footer -->
    <footer
      v-if="!account.isMain"
      class="account-card__footer"
    >
      <UiButton
        label="Сделать основным"
        icon="pi pi-star"
        variant="ghost"
        size="sm"
        block
        :loading="isPrimaryLoading"
        @click.stop="emit('setPrimary')"
      />
    </footer>

    <!-- Primary account indicator -->
    <div
      v-if="account.isMain"
      class="account-card__primary-indicator"
      aria-hidden="true"
    />
  </article>
</template>

<style scoped>
.account-card {
  position: relative;
  gap: var(--ft-space-4);
  border: 2px solid var(--ft-border-soft);
  transition:
    box-shadow var(--ft-transition-base),
    border-color var(--ft-transition-base);
  overflow: hidden;
  cursor: pointer;
}

.account-card:hover {
  box-shadow: var(--ft-shadow-md);
  border-color: var(--ft-primary-200);
}

.account-card--primary {
  border-color: var(--ft-primary-300);
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.02) 0%,
    rgba(37, 99, 235, 0.05) 100%
  );
}

.account-card--primary:hover {
  border-color: var(--ft-primary-400);
}

.account-card__header {
  display: flex;
  align-items: flex-start;
  gap: var(--ft-space-3);
}

.account-card__icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: currentColor;
  background: linear-gradient(135deg, currentColor 0%, currentColor 100%);
  border-radius: var(--ft-radius-lg);
  opacity: 0.1;
  position: relative;
}

.account-card__icon i {
  position: absolute;
  font-size: 24px;
  opacity: 10;
  color: inherit;
}

.account-card__title-section {
  flex: 1;
  min-width: 0;
}

.account-card__name {
  margin: 0;
  font-size: var(--ft-text-lg);
  color: var(--ft-heading);
  font-weight: var(--ft-font-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-card__type {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.account-card__menu-button {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--ft-transition-fast);
}

.account-card:hover .account-card__menu-button,
.account-card:focus-within .account-card__menu-button {
  opacity: 1;
}

.account-card__badges {
  display: flex;
  gap: var(--ft-space-2);
  flex-wrap: wrap;
}

.account-card__meta {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  margin: 0;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-3);
}

.meta-row dt {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.meta-row dt i {
  font-size: var(--ft-text-xs);
}

.meta-row dd {
  margin: 0;
  font-weight: var(--ft-font-medium);
  color: var(--ft-heading);
}

.currency-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  border-radius: var(--ft-radius-full);
  background: rgba(37, 99, 235, 0.1);
  color: var(--ft-primary-700);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  padding: var(--ft-space-1) var(--ft-space-3);
}

.dark-mode .currency-chip {
  background: rgba(37, 99, 235, 0.2);
  color: var(--ft-primary-400);
}

.balance-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.balance-summary__main {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.balance-summary__secondary {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}

.liquidity-control {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.liquidity-control :deep(.p-inputswitch) {
  transform: scale(0.9);
}

.account-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-2);
  padding-top: var(--ft-space-2);
  border-top: 1px solid var(--ft-border-soft);
}

.account-card__primary-indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 40px 40px 0;
  border-color: transparent var(--ft-primary-500) transparent transparent;
}

.account-card__primary-indicator::after {
  content: '★';
  position: absolute;
  top: 4px;
  right: -36px;
  color: white;
  font-size: 12px;
}

/* Menu styling */
:deep(.account-menu .menu-item-danger) {
  color: var(--ft-danger-600);
}

:deep(.account-menu .menu-item-danger:hover) {
  background: rgba(239, 68, 68, 0.1);
}

.dark-mode :deep(.account-menu .menu-item-danger) {
  color: var(--ft-danger-400);
}

/* Animation */
@media (prefers-reduced-motion: no-preference) {
  .account-card {
    transition:
      transform var(--ft-transition-base),
      box-shadow var(--ft-transition-base),
      border-color var(--ft-transition-base);
  }
}

@media (prefers-reduced-motion: reduce) {
  .account-card {
    transition: none;
  }

  .account-card:hover {
    transform: none;
  }
}

/* Responsive */
@media (max-width: 640px) {
  .account-card__footer {
    flex-direction: column;
  }

  .account-card__footer :deep(.ui-button) {
    width: 100%;
  }
}
</style>
