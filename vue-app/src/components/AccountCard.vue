<script setup lang="ts">
import { computed, ref } from 'vue'
import UiToggleSwitch from '@/ui/UiToggleSwitch.vue'
import UiMenu from '@/ui/UiMenu.vue'
import type { MenuItem } from 'primevue/menuitem'
import type { Account } from '../types'
import { formatCurrency } from '../utils/formatters'
import { useUserStore } from '../stores/user'
import UiButton from '../ui/UiButton.vue'

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

const currencyDisplay = computed(() => {
  const symbol = props.account.currency?.symbol || ''
  const code = props.account.currency?.code || props.account.currencyCode
  return `${symbol} ${code}`
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
  if (props.interactionLocked) return []

  const items: MenuItem[] = []

  // Only add these items if not in readonly mode (i.e., not viewing archived accounts)
  if (!props.readonly) {
    items.push(
      {
        label: 'Корректировать баланс',
        icon: 'pi pi-sliders-h',
        command: () => emit('open'),
      },
      {
        label: 'Переименовать',
        icon: 'pi pi-pencil',
        command: () => emit('edit')
      },
    )

    if (!props.account.isMain) {
      items.push({
        label: 'Сделать основным',
        icon: 'pi pi-star',
        command: () => emit('setPrimary'),
      })
    }
  }

  // Unarchive should be available if the account is archived, regardless of readonly status
  if (props.account.isArchived) {
    items.push({
      label: 'Разархивировать',
      icon: 'pi pi-box',
      command: () => emit('unarchive'),
    })
  } else if (!props.readonly) { // Archive should only be available if not archived and not in readonly mode
    items.push({
      label: 'Архивировать',
      icon: 'pi pi-inbox',
      command: () => emit('archive'),
    })
  }

  return items
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
          v-if="menuItems.length > 0"
          class="account-card__icon-button"
          variant="ghost"
          size="sm"
          icon="pi pi-ellipsis-v"
          :aria-label="`Действия для счета ${account.name}`"
          @click.stop="toggleMenu"
        />
        <UiMenu
          ref="menuRef"
          :model="menuItems"
          :popup="true"
          :pt="{
            root: { class: 'account-menu' },
          }"
        />
      </div>
    </header>

    <div class="account-card__current-balance">
      <p class="account-card__current-balance-main">
        {{ formattedBaseBalance }}
      </p>
      <p
        v-if="showSecondaryBalance"
        class="account-card__current-balance-secondary"
      >
        {{ formattedAccountBalance }}
      </p>
    </div>

    <div class="account-card__footer-compact">
      <div class="currency-display-compact">
        {{ currencyDisplay }}
      </div>
      <div
        class="liquidity-control-compact"
        @click.stop
      >
        <UiToggleSwitch
          v-if="!readonly && !interactionLocked"
          v-model="liquidityModel"
          :disabled="isLiquidityLoading"
        />
        <span
          v-else
          class="account-card__readonly-value"
        >
          {{ liquidityLabel }}
        </span>
        <span
          v-if="!readonly && !interactionLocked"
          class="liquidity-label-compact"
        >
          {{ liquidityLabel }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.account-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);

  min-height: 180px;

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
  width: 44px;
  min-width: 44px;
  height: 44px;
  border-radius: var(--ft-radius-lg);
}

.account-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;


}

.account-card__current-balance {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: var(--ft-space-1);
}

.account-card__current-balance-main {
  margin: 0;

  font-size: clamp(1.1rem, 1.5vw, 1.4rem);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--ft-heading);
}

.account-card__current-balance-secondary {
  margin: 0;
  font-size: var(--ft-text-sm); /* Smaller font */
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-muted);
}

.account-card__footer-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: var(--ft-space-2);
  border-top: 1px solid var(--ft-border-soft);
}

.currency-display-compact {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-500);
}

.liquidity-control-compact {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.liquidity-label-compact {
  font-weight: var(--ft-font-medium);
}
</style>
