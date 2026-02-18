import { computed, type ComputedRef } from 'vue'
import type { useFinanceStore } from '../stores/finance'
import { formatCurrency } from '../utils/formatters'
import { formatUtcDateOnly, getUtcDateOnlyKey } from '../utils/dateOnly'
import type { Transaction } from '../types'
import { TRANSACTION_TYPE } from '../types'

export const FALLBACK_CATEGORY_COLOR = 'var(--ft-text-tertiary)'

export interface EnrichedTransaction extends Transaction {
  accountName?: string
  accountCurrency?: string
  accountSymbol?: string
  categoryName?: string
  categoryColor?: string
  dateKey: string
  dateLabel: string
  isDayStart?: boolean
  signedAmount: number
  signedBaseAmount: number
  displayAmount: number
  displayCurrency?: string
  originalAmount: number
  originalCurrency?: string
  showOriginal: boolean
  isTransferSummary?: boolean
  transferFromAccountId?: string
  transferToAccountId?: string
  transferFromAmount?: number
  transferToAmount?: number
  transferFromCurrency?: string
  transferToCurrency?: string
  transferFeeAmount?: number
  transferRate?: number
  transferRateLabel?: string
}

export interface TransactionGroup {
  dateKey: string
  dateLabel: string
  dayTotal: string
  transactions: EnrichedTransaction[]
}

export function useTransactionListModel(
  store: ReturnType<typeof useFinanceStore>,
  baseCurrency: ComputedRef<string>
) {
  const formatRate = (value: number): string =>
    new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)

  const buildRateLabel = (
    rate: number,
    fromCurrency?: string,
    toCurrency?: string,
    feeAmount?: number
  ): string | null => {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
      return null
    }

    const label = feeAmount && feeAmount > 0 ? 'Курс (с комиссией)' : 'Курс'
    return `${label}: 1 ${fromCurrency} = ${formatRate(rate)} ${toCurrency}`
  }

  const formatDateKey = (value?: string): string => {
    return getUtcDateOnlyKey(value)
  }

  const formatDateLabel = (value?: string): string => {
    return formatUtcDateOnly(value, 'ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const enrichedTransactions = computed<EnrichedTransaction[]>(() => {
    const transferGroups = new Map<string, Transaction[]>()
    const transferFees = new Map<string, number>()
    const regularTransactions: Transaction[] = []

    store.transactions.forEach((txn: Transaction) => {
      if (txn.transferId && !txn.isTransfer) {
        const feeAmount = Math.abs(Number(txn.amount ?? 0))
        if (feeAmount > 0) {
          const current = transferFees.get(txn.transferId) ?? 0
          transferFees.set(txn.transferId, current + feeAmount)
        }
      }

      if (txn.isTransfer && txn.transferId) {
        const key = txn.transferId
        const group = transferGroups.get(key) ?? []
        group.push(txn)
        transferGroups.set(key, group)
        return
      }
      regularTransactions.push(txn)
    })

    const transferSummaries: EnrichedTransaction[] = []
    transferGroups.forEach((group, transferId) => {
      const expense = group.find(item => item.type === TRANSACTION_TYPE.Expense)
      const income = group.find(item => item.type === TRANSACTION_TYPE.Income)
      if (!expense || !income) {
        regularTransactions.push(...group)
        return
      }

      const fromAccount = expense.account
      const toAccount = income.account
      const fromCurrency = expense.originalCurrencyCode ?? fromAccount?.currency?.code ?? fromAccount?.currencyCode
      const toCurrency = income.originalCurrencyCode ?? toAccount?.currency?.code ?? toAccount?.currencyCode
      const fromAmount = Number(expense.amount)
      const toAmount = Number(income.amount)
      const feeAmount = transferFees.get(transferId) ?? 0
      const effectiveFromAmount = fromAmount + feeAmount
      const transferRate =
        effectiveFromAmount > 0 &&
        toAmount > 0 &&
        fromCurrency &&
        toCurrency &&
        fromCurrency !== toCurrency
          ? toAmount / effectiveFromAmount
          : undefined
      const transferRateLabel = transferRate
        ? buildRateLabel(transferRate, fromCurrency, toCurrency, feeAmount) ?? undefined
        : undefined

      const dateKey = formatDateKey(expense.occurredAt)
      const dateLabel = formatDateLabel(expense.occurredAt)

      transferSummaries.push({
        ...expense,
        id: transferId,
        isTransferSummary: true,
        transferFromAccountId: expense.accountId,
        transferToAccountId: income.accountId,
        transferFromAmount: fromAmount,
        transferToAmount: toAmount,
        transferFromCurrency: fromCurrency,
        transferToCurrency: toCurrency,
        transferFeeAmount: feeAmount > 0 ? feeAmount : undefined,
        transferRate,
        transferRateLabel,
        accountName: `${fromAccount?.name ?? '—'} → ${toAccount?.name ?? '—'}`,
        accountCurrency: fromAccount?.currency?.code ?? fromAccount?.currencyCode,
        accountSymbol: fromAccount?.currency?.symbol ?? '',
        categoryName: 'Перевод',
        categoryColor: FALLBACK_CATEGORY_COLOR,
        signedAmount: 0,
        signedBaseAmount: 0,
        displayAmount: 0,
        displayCurrency: baseCurrency.value,
        originalAmount: Number(expense.originalAmount ?? expense.amount),
        originalCurrency: fromCurrency,
        showOriginal: false,
        isMandatory: false,
        dateKey,
        dateLabel
      } as EnrichedTransaction)
    })

    const mappedRegular = regularTransactions.map((txn: Transaction) => {
      const account = txn.account
      const category = txn.category

      const accountCurrency = account?.currency?.code ?? account?.currencyCode
      const baseAmount = Number(txn.amountInBaseCurrency ?? txn.amount)
      const isIncome = txn.type === TRANSACTION_TYPE.Income
      const signedAmount = isIncome ? Math.abs(Number(txn.amount)) : -Math.abs(Number(txn.amount))
      const signedBaseAmount = isIncome ? Math.abs(baseAmount) : -Math.abs(baseAmount)
      const originalAmount = Number(txn.originalAmount ?? txn.amount)
      const originalCurrency = txn.originalCurrencyCode ?? accountCurrency
      const displayAmount = isIncome ? signedAmount : signedBaseAmount
      const displayCurrency = isIncome ? accountCurrency : baseCurrency.value
      const showOriginal = !isIncome && originalCurrency != null && originalCurrency !== baseCurrency.value
      const dateKey = formatDateKey(txn.occurredAt)
      const dateLabel = formatDateLabel(txn.occurredAt)

      return {
        ...txn,
        accountName: account?.name,
        accountCurrency,
        accountSymbol: account?.currency?.symbol ?? '',
        categoryName: category?.name,
        categoryColor: category?.color,
        signedAmount,
        signedBaseAmount,
        displayAmount,
        displayCurrency,
        originalAmount,
        originalCurrency,
        showOriginal,
        isMandatory: txn.isMandatory,
        dateKey,
        dateLabel
      } as EnrichedTransaction
    })

    return [...transferSummaries, ...mappedRegular]
  })

  const sortedTransactions = computed(() => {
    const sorted = [...enrichedTransactions.value].sort((a, b) => {
      const timeA = new Date(a.occurredAt).getTime()
      const timeB = new Date(b.occurredAt).getTime()
      return timeB - timeA
    })

    return sorted.map((item, index) => {
      const prev = sorted[index - 1]
      const isDayStart = !prev || prev.dateKey !== item.dateKey
      return {
        ...item,
        isDayStart
      }
    })
  })

  const groupedTransactions = computed<TransactionGroup[]>(() => {
    const groups: TransactionGroup[] = []
    let currentGroup: TransactionGroup | null = null

    for (const txn of sortedTransactions.value) {
      if (!currentGroup || currentGroup.dateKey !== txn.dateKey) {
        const dayTransactions = sortedTransactions.value.filter(t => t.dateKey === txn.dateKey)
        const daySum = dayTransactions.reduce(
          (sum, t) => t.isTransferSummary ? sum : sum + Number(t.signedBaseAmount ?? t.signedAmount ?? 0),
          0
        )
        const sign = daySum < 0 ? '−' : '+'
        const dayTotal = daySum === 0
          ? formatCurrency(0, baseCurrency.value)
          : `${sign}${formatCurrency(Math.abs(daySum), baseCurrency.value)}`

        currentGroup = {
          dateKey: txn.dateKey,
          dateLabel: txn.dateLabel,
          dayTotal,
          transactions: []
        }
        groups.push(currentGroup)
      }
      currentGroup.transactions.push(txn)
    }

    return groups
  })

  const totalAmount = computed(() =>
    sortedTransactions.value.reduce(
      (sum, txn) =>
        txn.isTransferSummary
          ? sum
          : sum + Number(txn.signedBaseAmount ?? txn.signedAmount ?? 0),
      0
    )
  )

  const formattedTotalAmount = computed(() => {
    const total = totalAmount.value
    if (total === 0) {
      return formatCurrency(0, baseCurrency.value)
    }
    const sign = total < 0 ? '−' : '+'
    const formatted = formatCurrency(Math.abs(total), baseCurrency.value)
    return `${sign} ${formatted}`
  })

  return {
    enrichedTransactions,
    sortedTransactions,
    groupedTransactions,
    totalAmount,
    formattedTotalAmount
  }
}
