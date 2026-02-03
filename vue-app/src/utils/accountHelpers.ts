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
        color: '#2563EB', // Primary blue
        description: 'Дебетовые карты и банковские счета'
      }
    case 1: // Cash
      return {
        label: 'Наличные',
        icon: 'pi-wallet',
        color: '#22C55E', // Success green
        description: 'Наличные деньги в кошельке'
      }
    case 2: // Crypto
      return {
        label: 'Криптовалюта',
        icon: 'pi-bitcoin',
        color: '#F59E0B', // Warning/Orange
        description: 'Криптовалютные кошельки и биржи'
      }
    case 3: // Investment
      return {
        label: 'Инвестиции',
        icon: 'pi-chart-line',
        color: '#8B5CF6', // Violet
        description: 'Брокерские счета и инвестиционные портфели'
      }
    default:
      return {
        label: 'Неизвестный тип',
        icon: 'pi-question-circle',
        color: '#6B7280', // Gray
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

/**
 * Format account balance with currency
 */
export function formatAccountBalance(balance: number, currencySymbol: string): string {
  return `${currencySymbol} ${balance.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Get account status badge info
 */
export interface AccountStatusInfo {
  label: string
  severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary'
  icon?: string
}

export function getAccountStatus(isMain: boolean, isArchived: boolean = false): AccountStatusInfo | null {
  if (isArchived) {
    return {
      label: 'Архивный',
      severity: 'secondary',
      icon: 'pi-archive'
    }
  }

  if (isMain) {
    return {
      label: 'Основной',
      severity: 'success',
      icon: 'pi-star-fill'
    }
  }

  return null
}
