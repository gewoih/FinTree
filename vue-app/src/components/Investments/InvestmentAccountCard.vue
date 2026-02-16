<script setup lang="ts">
import { computed, ref } from 'vue';
import Menu from 'primevue/menu';
import type { AccountType, Currency, InvestmentAccountOverviewDto } from '../../types';
import { getAccountTypeInfo, getCurrencyFlag } from '../../utils/accountHelpers';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface InvestmentAccount extends InvestmentAccountOverviewDto {
  type: AccountType;
  currency?: Currency | null;
}

const props = defineProps<{
  account: InvestmentAccount;
  baseCurrencyCode: string;
  periodLabel: string;
  isLiquidityLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open'): void;
  (e: 'updateLiquidity', value: boolean): void;
}>();

const menuRef = ref<InstanceType<typeof Menu> | null>(null);

const accountTypeInfo = computed(() => getAccountTypeInfo(props.account.type as AccountType));
const currencyFlag = computed(() => getCurrencyFlag(props.account.currencyCode));
const currencyCode = computed(() => props.account.currency?.code || props.account.currencyCode);

const balanceInBase = computed(() => Number(props.account.balanceInBaseCurrency ?? 0));
const formattedBaseBalance = computed(() =>
  formatCurrency(balanceInBase.value, props.baseCurrencyCode)
);

const originalBalance = computed(() => Number(props.account.balance ?? 0));
const formattedOriginalBalance = computed(() =>
  formatCurrency(originalBalance.value, currencyCode.value)
);

const showOriginalCurrency = computed(() =>
  currencyCode.value !== props.baseCurrencyCode
);

const returnLabel = computed(() => {
  if (props.account.returnPercent == null) return '\u2014';
  const sign = props.account.returnPercent > 0 ? '+' : '';
  return `${sign}${(props.account.returnPercent * 100).toFixed(1)}%`;
});

const returnClass = computed(() => {
  if (props.account.returnPercent == null) return 'investment-card__return--neutral';
  if (props.account.returnPercent > 0) return 'investment-card__return--positive';
  if (props.account.returnPercent < 0) return 'investment-card__return--negative';
  return 'investment-card__return--neutral';
});

const lastUpdatedLabel = computed(() => {
  if (!props.account.lastAdjustedAt) return 'Нет корректировок';
  return `Обновлено ${formatDate(props.account.lastAdjustedAt)}`;
});

const menuItems = computed(() => [
  {
    label: 'Корректировать баланс',
    icon: 'pi pi-sliders-h',
    command: () => emit('open'),
  },
  {
    label: props.account.isLiquid ? 'Сделать долгосрочным' : 'Быстрый доступ',
    icon: props.account.isLiquid ? 'pi pi-lock' : 'pi pi-bolt',
    disabled: props.isLiquidityLoading,
    command: () => emit('updateLiquidity', !props.account.isLiquid),
  },
]);

const toggleMenu = (event: Event) => {
  menuRef.value?.toggle(event);
};
</script>

<template>
  <article class="investment-card">
    <header class="investment-card__header">
      <div
        class="investment-card__icon"
        :style="{ '--icon-color': accountTypeInfo.color }"
      >
        <i
          :class="`pi ${accountTypeInfo.icon}`"
          aria-hidden="true"
        />
      </div>

      <div class="investment-card__title">
        <h3>{{ account.name }}</h3>
        <p>{{ accountTypeInfo.label }}</p>
      </div>

      <button
        class="investment-card__menu-trigger"
        aria-label="Действия"
        @click.stop="toggleMenu"
      >
        <i class="pi pi-ellipsis-v" />
      </button>
      <Menu
        ref="menuRef"
        :model="menuItems"
        :popup="true"
      />
    </header>

    <div class="investment-card__body">
      <div class="investment-card__balance-group">
        <span class="investment-card__balance">{{ formattedBaseBalance }}</span>
        <span
          v-if="showOriginalCurrency"
          v-tooltip.bottom="`Оригинальный баланс в ${currencyCode}`"
          class="investment-card__balance-original"
        >
          {{ formattedOriginalBalance }}
        </span>
      </div>
      <span
        v-tooltip.bottom="'Сколько вы заработали или потеряли на этой инвестиции в процентах.'"
        class="investment-card__return"
        :class="returnClass"
        style="cursor: help"
      >
        {{ returnLabel }}
      </span>
    </div>

    <footer class="investment-card__footer">
      <span class="investment-card__meta-line">
        <template v-if="currencyFlag">{{ currencyFlag }}&nbsp;</template>{{ currencyCode }}
        <span class="investment-card__separator">&middot;</span>
        <span
          v-tooltip.bottom="'Можно ли быстро вывести деньги без потерь'"
          class="investment-card__liquidity-badge"
          :class="{ 'investment-card__liquidity-badge--liquid': account.isLiquid }"
        >
          {{ account.isLiquid ? 'Быстрый доступ' : 'Долгосрочный' }}
        </span>
      </span>
      <span class="investment-card__updated">
        {{ lastUpdatedLabel }}
      </span>
    </footer>
  </article>
</template>

<style scoped>
.investment-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);

  padding: var(--ft-space-4);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
  box-shadow: var(--ft-shadow-sm);

  transition: transform var(--ft-transition-fast), box-shadow var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.investment-card:hover {
  transform: translateY(-2px);
  border-color: var(--ft-border-default);
  box-shadow: var(--ft-shadow-md);
}

.investment-card__header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.investment-card__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;

  width: 40px;
  height: 40px;

  background: color-mix(in srgb, var(--icon-color) 15%, transparent);
  border-radius: var(--ft-radius-lg);
}

.investment-card__icon i {
  font-size: 18px;
  color: var(--icon-color);
}

.investment-card__title {
  flex: 1;
  min-width: 0;
}

.investment-card__title h3 {
  overflow: hidden;

  margin: 0;

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.investment-card__title p {
  margin: 2px 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.investment-card__menu-trigger {
  cursor: pointer;

  display: grid;
  flex-shrink: 0;
  place-items: center;

  width: 44px;
  height: 44px;

  color: var(--ft-text-secondary);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-lg);

  transition: background var(--ft-transition-fast), color var(--ft-transition-fast);
}

.investment-card__menu-trigger:hover {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-surface-raised) 80%, transparent);
}

.investment-card__body {
  display: flex;
  gap: var(--ft-space-3);
  align-items: baseline;
  justify-content: space-between;

  padding: var(--ft-space-1) 0;
}

.investment-card__balance-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.investment-card__balance {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--ft-text-primary);
}

.investment-card__balance-original {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-secondary);
}

.investment-card__return {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.investment-card__return--positive {
  color: var(--ft-success-500);
}

.investment-card__return--negative {
  color: var(--ft-danger-500);
}

.investment-card__return--neutral {
  color: var(--ft-text-muted);
}

.investment-card__footer {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);

  padding-top: var(--ft-space-3);

  border-top: 1px solid var(--ft-border-subtle);
}

.investment-card__meta-line {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--ft-space-1);
  align-items: center;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.investment-card__separator {
  margin: 0 2px;
  color: var(--ft-text-muted);
}

.investment-card__liquidity-badge {
  cursor: help;

  padding: 1px 6px;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-muted);

  background: color-mix(in srgb, var(--ft-text-muted) 12%, transparent);
  border-radius: var(--ft-radius-full);
}

.investment-card__liquidity-badge--liquid {
  color: var(--ft-success-500);
  background: color-mix(in srgb, var(--ft-success-400) 15%, transparent);
}

.investment-card__updated {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}
</style>
