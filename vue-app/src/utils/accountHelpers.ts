// Account helpers for better UX

import type { AccountType } from '../types'

export interface AccountTypeInfo {
  label: string
  icon: string
  color: string
  description: string
}

/**
 * Get account type information (icon, label, color, description)
 */
export function getAccountTypeInfo(type: AccountType): AccountTypeInfo {
  switch (type) {
    case 0: // Bank Account
      return {
        label: 'Банковский счет',
        icon: 'pi-building',
        color: 'var(--ft-primary-500)',
        description: 'Дебетовые карты и банковские счета'
      }
    case 2: // Crypto
      return {
        label: 'Криптовалютный счет',
        icon: 'pi-bitcoin',
        color: 'var(--ft-warning-500)',
        description: 'Криптовалютные кошельки и биржи'
      }
    case 3: // Brokerage
      return {
        label: 'Брокерский счет',
        icon: 'pi-chart-line',
        color: 'var(--ft-chart-1)',
        description: 'Брокерские счета и инвестиционные портфели'
      }
    case 4: // Deposit
      return {
        label: 'Вклад',
        icon: 'pi-lock',
        color: 'var(--ft-info-500)',
        description: 'Депозиты и накопительные счета'
      }
    default:
      return {
        label: 'Неизвестный тип',
        icon: 'pi-question-circle',
        color: 'var(--ft-text-tertiary)',
        description: ''
      }
  }
}

/**
 * Get currency flag emoji based on currency code
 * Falls back to currency symbol if flag not available
 */
export function getCurrencyFlag(currencyCode: string): string {
  const flagMap: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
    CNY: '🇨🇳',
    RUB: '🇷🇺',
    KRW: '🇰🇷',
    INR: '🇮🇳',
    BRL: '🇧🇷',
    CAD: '🇨🇦',
    AUD: '🇦🇺',
    CHF: '🇨🇭',
    SEK: '🇸🇪',
    NZD: '🇳🇿',
    MXN: '🇲🇽',
    SGD: '🇸🇬',
    HKD: '🇭🇰',
    NOK: '🇳🇴',
    TRY: '🇹🇷',
    ZAR: '🇿🇦',
    PLN: '🇵🇱',
    THB: '🇹🇭',
    MYR: '🇲🇾',
    IDR: '🇮🇩',
    PHP: '🇵🇭',
    CZK: '🇨🇿',
    ILS: '🇮🇱',
    AED: '🇦🇪',
    SAR: '🇸🇦',
    KWD: '🇰🇼',
    UAH: '🇺🇦',
    KZT: '🇰🇿',
    BYN: '🇧🇾',
    AZN: '🇦🇿',
    AMD: '🇦🇲',
    GEL: '🇬🇪',
    UZS: '🇺🇿',
  }

  return flagMap[currencyCode.toUpperCase()] || ''
}
