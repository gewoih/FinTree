import { computed, ref, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'
import type { Account, UpdateTransferPayload } from '../types'
import { validators } from '../services/validation.service'
import { parseUtcDateOnlyToLocalDate } from '../utils/dateOnly'

type TransferFormProps = {
  visible: boolean
  transfer?: UpdateTransferPayload | null
  readonly?: boolean
}

export function useTransferFormState(props: TransferFormProps) {
  const store = useFinanceStore()

  const fromAccount = ref<Account | null>(null)
  const toAccount = ref<Account | null>(null)
  const fromAmount = ref<number | null>(null)
  const toAmount = ref<number | null>(null)
  const feeAmount = ref<number | null>(null)
  const description = ref<string>('')
  const today = new Date()
  const date = ref<Date>(new Date())
  const isDeleting = ref(false)

  const isEditMode = computed(() => !!props.transfer)

  const resetForm = () => {
    fromAccount.value = store.primaryAccount ?? store.accounts[0] ?? null
    toAccount.value = store.accounts.find(a => a.id !== fromAccount.value?.id) ?? null
    fromAmount.value = null
    toAmount.value = null
    feeAmount.value = null
    description.value = ''
    date.value = new Date()
  }

  const applyTransfer = (transfer: UpdateTransferPayload) => {
    fromAccount.value = store.accounts.find(a => a.id === transfer.fromAccountId) ?? null
    toAccount.value = store.accounts.find(a => a.id === transfer.toAccountId) ?? null
    fromAmount.value = transfer.fromAmount
    toAmount.value = transfer.toAmount
    feeAmount.value = transfer.feeAmount ?? null
    description.value = transfer.description ?? ''
    date.value = parseUtcDateOnlyToLocalDate(transfer.occurredAt) ?? new Date(transfer.occurredAt)
  }

  watch(
    () => props.visible,
    visible => {
      if (visible) {
        if (isEditMode.value && props.transfer) {
          applyTransfer(props.transfer)
        } else {
          resetForm()
        }
      }
    }
  )

  watch(
    () => props.transfer,
    transfer => {
      if (props.visible && transfer) {
        applyTransfer(transfer)
      }
    }
  )

  watch(fromAccount, account => {
    if (account && toAccount.value?.id === account.id) {
      toAccount.value = store.accounts.find(a => a.id !== account.id) ?? null
    }
  })

  watch(
    () => store.accounts,
    accounts => {
      if (isEditMode.value && props.transfer) {
        applyTransfer(props.transfer)
        return
      }
      if (!fromAccount.value && accounts.length) {
        fromAccount.value = store.primaryAccount ?? accounts[0] ?? null
      }
      if (!toAccount.value && accounts.length) {
        toAccount.value = accounts.find(a => a.id !== fromAccount.value?.id) ?? null
      }
    }
  )

  const fromCurrency = computed(() => fromAccount.value?.currency?.code ?? fromAccount.value?.currencyCode ?? '—')
  const fromCurrencySymbol = computed(() => fromAccount.value?.currency?.symbol ?? '')
  const toCurrency = computed(() => toAccount.value?.currency?.code ?? toAccount.value?.currencyCode ?? '—')
  const toCurrencySymbol = computed(() => toAccount.value?.currency?.symbol ?? '')

  const isSameCurrency = computed(() => {
    const from = fromCurrency.value
    const to = toCurrency.value
    return !!from && !!to && from !== '—' && from === to
  })

  const resolvedToAmount = computed(() => (isSameCurrency.value ? fromAmount.value : toAmount.value))

  const isFromAmountValid = computed(() => validators.isAmountValid(fromAmount.value))
  const isToAmountValid = computed(() =>
    isSameCurrency.value
      ? validators.isAmountValid(fromAmount.value)
      : validators.isAmountValid(toAmount.value)
  )
  const isFeeValid = computed(() => feeAmount.value == null || feeAmount.value >= 0)
  const isAccountsValid = computed(
    () => fromAccount.value && toAccount.value && fromAccount.value.id !== toAccount.value.id
  )

  const formatRate = (value: number) =>
    new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)

  const exchangeRate = computed(() => {
    if (isSameCurrency.value) {
      return null
    }
    if (!isAccountsValid.value || !isFromAmountValid.value || !isToAmountValid.value || !isFeeValid.value) {
      return null
    }

    const fromValue = fromAmount.value ?? 0
    const toValue = resolvedToAmount.value ?? 0
    const feeValue = feeAmount.value ?? 0

    if (fromValue <= 0 || toValue <= 0 || feeValue < 0) {
      return null
    }

    const fromCode = fromCurrency.value
    const toCode = toCurrency.value
    if (!fromCode || !toCode || fromCode === '—' || toCode === '—') {
      return null
    }

    if (fromCode === toCode) {
      return null
    }

    const effectiveFrom = fromValue + feeValue
    if (effectiveFrom <= 0) {
      return null
    }

    return toValue / effectiveFrom
  })

  const exchangeRateLabel = computed(() => {
    if (!exchangeRate.value) {
      return null
    }

    const feeValue = feeAmount.value ?? 0
    const label = feeValue > 0 ? 'Курс (с комиссией)' : 'Курс'
    return `${label}: 1 ${fromCurrency.value} = ${formatRate(exchangeRate.value)} ${toCurrency.value}`
  })

  const submitDisabled = computed(
    () => !isAccountsValid.value || !isFromAmountValid.value || !isToAmountValid.value || !isFeeValid.value
  )

  return {
    store,
    fromAccount,
    toAccount,
    fromAmount,
    toAmount,
    feeAmount,
    description,
    today,
    date,
    isDeleting,
    isEditMode,
    fromCurrency,
    fromCurrencySymbol,
    toCurrency,
    toCurrencySymbol,
    isSameCurrency,
    resolvedToAmount,
    isFromAmountValid,
    isToAmountValid,
    isFeeValid,
    isAccountsValid,
    exchangeRate,
    exchangeRateLabel,
    submitDisabled
  }
}
