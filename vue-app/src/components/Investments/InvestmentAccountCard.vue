<script setup lang="ts">
import { computed } from 'vue';
import InputSwitch from 'primevue/inputswitch';
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

const accountTypeInfo = computed(() => getAccountTypeInfo(props.account.type as AccountType));
const currencyFlag = computed(() => getCurrencyFlag(props.account.currencyCode));
const currencyDisplay = computed(() => {
  const flag = currencyFlag.value;
  const symbol = props.account.currency?.symbol || '';
  const code = props.account.currency?.code || props.account.currencyCode;
  return flag ? `${flag} ${symbol} ${code}` : `${symbol} ${code}`;
});

const balanceInBase = computed(() => Number(props.account.balanceInBaseCurrency ?? 0));
const balanceInAccount = computed(() => Number(props.account.balance ?? 0));
const showSecondaryBalance = computed(() =>
  props.baseCurrencyCode.toUpperCase() !== props.account.currencyCode.toUpperCase()
);

const formattedBaseBalance = computed(() =>
  formatCurrency(balanceInBase.value, props.baseCurrencyCode)
);
const formattedAccountBalance = computed(() =>
  formatCurrency(balanceInAccount.value, props.account.currencyCode)
);

const lastUpdatedLabel = computed(() => {
  if (!props.account.lastAdjustedAt) return 'Нет корректировок';
  return `Обновлено ${formatDate(props.account.lastAdjustedAt)}`;
});

const returnLabel = computed(() => {
  if (props.account.returnPercent == null) return '—';
  return `${(props.account.returnPercent * 100).toFixed(1)}%`;
});

const returnClass = computed(() => {
  if (props.account.returnPercent == null) return 'investment-card__return--neutral';
  if (props.account.returnPercent > 0) return 'investment-card__return--positive';
  if (props.account.returnPercent < 0) return 'investment-card__return--negative';
  return 'investment-card__return--neutral';
});

const liquidityModel = computed({
  get: () => props.account.isLiquid,
  set: (value: boolean) => emit('updateLiquidity', value),
});
</script>

<template>
  <article
    class="investment-card ft-card"
    @click="emit('open')"
  >
    <header class="investment-card__header">
      <div
        class="investment-card__icon"
        :style="{ color: accountTypeInfo.color }"
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

      <div
        class="investment-card__liquidity"
        @click.stop
      >
        <span>{{ account.isLiquid ? 'Ликвидный' : 'Неликвидный' }}</span>
        <InputSwitch
          v-model="liquidityModel"
          :disabled="isLiquidityLoading"
        />
      </div>
    </header>

    <div class="investment-card__meta">
      <div class="investment-card__meta-row">
        <span class="investment-card__label">Валюта</span>
        <span class="investment-card__value">{{ currencyDisplay }}</span>
      </div>

      <div class="investment-card__meta-row">
        <span class="investment-card__label">Баланс</span>
        <div class="investment-card__value-block">
          <span class="investment-card__value investment-card__value--main">{{ formattedBaseBalance }}</span>
          <span
            v-if="showSecondaryBalance"
            class="investment-card__value investment-card__value--secondary"
          >
            {{ formattedAccountBalance }}
          </span>
        </div>
      </div>

      <div class="investment-card__meta-row">
        <span class="investment-card__label">Доходность</span>
        <div class="investment-card__value-block">
          <span
            class="investment-card__value investment-card__value--main"
            :class="returnClass"
          >
            {{ returnLabel }}
          </span>
          <span class="investment-card__value investment-card__value--secondary">
            {{ periodLabel }}
          </span>
        </div>
      </div>
    </div>

    <footer class="investment-card__footer">
      <span class="investment-card__updated">
        <i class="pi pi-history" />
        {{ lastUpdatedLabel }}
      </span>
      <UiButton
        variant="ghost"
        size="sm"
        icon="pi pi-sliders-h"
        label="Корректировать баланс"
        @click.stop="emit('open')"
      />
    </footer>
  </article>
</template>

<style scoped>
.investment-card {
  gap: var(--ft-space-4);
  border: 1px solid var(--ft-border-soft);
  background: var(--ft-surface-soft);
  transition: border-color var(--ft-transition-base), box-shadow var(--ft-transition-base);
  cursor: pointer;
}

.investment-card:hover {
  border-color: var(--ft-primary-200);
  box-shadow: var(--ft-shadow-md);
}

.investment-card__header {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.investment-card__icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--ft-radius-lg);
  background: linear-gradient(135deg, currentColor 0%, currentColor 100%);
  opacity: 0.12;
  display: grid;
  place-items: center;
  position: relative;
}

.investment-card__icon i {
  position: absolute;
  color: inherit;
  font-size: 22px;
  opacity: 1;
}

.investment-card__title {
  flex: 1;
  min-width: 0;
}

.investment-card__title h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.investment-card__title p {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.investment-card__liquidity {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.investment-card__meta {
  display: grid;
  gap: var(--ft-space-3);
}

.investment-card__meta-row {
  display: flex;
  justify-content: space-between;
  gap: var(--ft-space-4);
}

.investment-card__label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.investment-card__value-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.investment-card__value {
  color: var(--ft-heading);
  font-weight: var(--ft-font-semibold);
}

.investment-card__value--main {
  font-size: var(--ft-text-base);
}

.investment-card__value--secondary {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
  font-weight: var(--ft-font-medium);
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
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-3);
  border-top: 1px solid var(--ft-border-soft);
  padding-top: var(--ft-space-3);
}

.investment-card__updated {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

@media (max-width: 720px) {
  .investment-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .investment-card__liquidity {
    width: 100%;
    justify-content: space-between;
  }

  .investment-card__meta-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .investment-card__value-block {
    align-items: flex-start;
  }

  .investment-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
