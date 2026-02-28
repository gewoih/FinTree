import { computed, reactive, ref, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'
import type { Account, Category, Transaction, TransactionType } from '../types'
import { TRANSACTION_TYPE } from '../types'
import { VALIDATION_RULES } from '../constants'
import { validators } from '../services/validation.service'
import { parseUtcDateOnlyToLocalDate } from '../utils/dateOnly'

const LAST_USED_CATEGORY_KEY = 'lastUsedCategoryId'

type FieldKey = 'amount' | 'category' | 'account' | 'date'

export type InputNumberEventPayload = {
  value?: string | number | null
  formattedValue?: string
  originalEvent?: Event
}

type TransactionFormStateProps = {
  visible: boolean
  transaction?: Transaction | null
  readonly?: boolean
}

export function useTransactionFormState(props: TransactionFormStateProps) {
  const store = useFinanceStore()

  const isEditMode = computed(() => !!props.transaction)

  const createMaxDate = () => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    return now
  }

  const maxDate = ref<Date>(createMaxDate())

  const transactionType = ref<TransactionType>(TRANSACTION_TYPE.Expense)
  const selectedAccount = ref<Account | null>(null)
  const selectedCategory = ref<Category | null>(null)
  const amount = ref<number | null>(null)
  const description = ref<string>('')
  const date = ref<Date>(new Date())
  const isMandatory = ref<boolean>(false)
  const mandatoryOverridden = ref(false)
  const showAdvanced = ref(false)
  const isDeleting = ref(false)

  const touched = reactive<Record<FieldKey, boolean>>({
    amount: false,
    category: false,
    account: false,
    date: false
  })

  const transactionTypeOptions = [
    { label: 'Расход', value: TRANSACTION_TYPE.Expense },
    { label: 'Доход', value: TRANSACTION_TYPE.Income }
  ]

  const markTouched = (field: FieldKey) => {
    touched[field] = true
  }

  const resetTouched = () => {
    touched.amount = false
    touched.category = false
    touched.account = false
    touched.date = false
  }

  const markAllTouched = () => {
    touched.amount = true
    touched.category = true
    touched.account = true
    touched.date = true
  }

  const getCategoriesForType = (type: TransactionType) =>
    store.categories.filter(category => category.type === type)

  const resolveAvailableType = (preferred: TransactionType) => {
    if (store.categories.some(category => category.type === preferred)) {
      return preferred
    }

    return store.categories[0]?.type ?? preferred
  }

  const getLastUsedCategory = (type: TransactionType) => {
    try {
      const lastCategoryId = localStorage.getItem(LAST_USED_CATEGORY_KEY)
      if (!lastCategoryId) {
        return null
      }

      const lastCategory = store.categories.find(category => category.id === lastCategoryId) ?? null
      if (!lastCategory || lastCategory.type !== type) {
        return null
      }

      return lastCategory
    } catch {
      return null
    }
  }

  const persistLastUsedCategory = (category: Category | null) => {
    if (!category) {
      return
    }

    try {
      localStorage.setItem(LAST_USED_CATEGORY_KEY, category.id)
    } catch {
      // Ignore localStorage failures (e.g. private mode restrictions).
    }
  }

  const resolveCategoryForType = (
    type: TransactionType,
    options: {
      current?: Category | null
      useLastUsed?: boolean
    } = {}
  ) => {
    const categoriesForType = getCategoriesForType(type)
    if (!categoriesForType.length) {
      return null
    }

    const currentCategory = options.current
    if (currentCategory && currentCategory.type === type && categoriesForType.some(category => category.id === currentCategory.id)) {
      return currentCategory
    }

    if (options.useLastUsed) {
      const lastUsedCategory = getLastUsedCategory(type)
      if (lastUsedCategory && categoriesForType.some(category => category.id === lastUsedCategory.id)) {
        return lastUsedCategory
      }
    }

    return categoriesForType[0] ?? null
  }

  const applyMandatorySuggestion = () => {
    if (transactionType.value === TRANSACTION_TYPE.Income) {
      isMandatory.value = false
      return
    }

    if (mandatoryOverridden.value) {
      return
    }

    isMandatory.value = selectedCategory.value?.isMandatory ?? false
  }

  const toggleMandatory = () => {
    if (props.readonly || transactionType.value === TRANSACTION_TYPE.Income) {
      return
    }

    mandatoryOverridden.value = true
    isMandatory.value = !isMandatory.value
  }

  const parseAmountValue = (value: string | number | null | undefined) => {
    if (value === undefined || value === null || value === '') {
      return null
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }

    const normalized = value.replace(/\s/g, '').replace(',', '.')
    const parsed = Number(normalized)

    return Number.isFinite(parsed) ? parsed : null
  }

  const handleAmountInput = (event: InputNumberEventPayload) => {
    const parsedValue = parseAmountValue(event.value)
    if (parsedValue != null) {
      amount.value = parsedValue
      return
    }

    const parsedFormatted = parseAmountValue(event.formattedValue)
    if (parsedFormatted != null) {
      amount.value = parsedFormatted
      return
    }

    const originalTarget = event.originalEvent?.target as HTMLInputElement | null
    amount.value = parseAmountValue(originalTarget?.value)
  }

  const refreshMaxDate = () => {
    maxDate.value = createMaxDate()
  }

  const initializeCreateMode = () => {
    transactionType.value = resolveAvailableType(TRANSACTION_TYPE.Expense)
    selectedAccount.value = store.primaryAccount || store.accounts[0] || null
    selectedCategory.value = resolveCategoryForType(transactionType.value, {
      useLastUsed: true
    })

    amount.value = null
    description.value = ''
    date.value = new Date()

    mandatoryOverridden.value = false
    applyMandatorySuggestion()

    showAdvanced.value = false
    resetTouched()
  }

  const initializeEditMode = (transaction: Transaction) => {
    selectedAccount.value = transaction.account || store.accounts.find(account => account.id === transaction.accountId) || null

    const transactionCategory = transaction.category || store.categories.find(category => category.id === transaction.categoryId) || null
    const preferredType = transactionCategory?.type ?? transaction.type ?? TRANSACTION_TYPE.Expense
    transactionType.value = resolveAvailableType(preferredType)
    selectedCategory.value = resolveCategoryForType(transactionType.value, {
      current: transactionCategory,
      useLastUsed: false
    })

    amount.value = Math.abs(Number(transaction.amount))
    description.value = transaction.description || ''
    date.value = parseUtcDateOnlyToLocalDate(transaction.occurredAt) ?? new Date(transaction.occurredAt)

    if (transactionType.value === TRANSACTION_TYPE.Income) {
      isMandatory.value = false
      mandatoryOverridden.value = false
    } else {
      isMandatory.value = transaction.isMandatory
      mandatoryOverridden.value = true
    }

    showAdvanced.value = true
    resetTouched()
  }

  watch(
    () => props.visible,
    visible => {
      if (!visible) {
        return
      }

      refreshMaxDate()

      if (isEditMode.value && props.transaction) {
        initializeEditMode(props.transaction)
        return
      }

      initializeCreateMode()
    },
    { immediate: true }
  )

  watch(
    () => props.transaction,
    transaction => {
      if (!props.visible || !transaction) {
        return
      }

      initializeEditMode(transaction)
    }
  )

  watch(
    () => store.accounts,
    accounts => {
      if (!props.visible || selectedAccount.value || !accounts.length) {
        return
      }

      selectedAccount.value = store.primaryAccount || accounts[0] || null
    }
  )

  watch(
    () => store.categories,
    () => {
      if (!props.visible) {
        return
      }

      transactionType.value = resolveAvailableType(transactionType.value)
      selectedCategory.value = resolveCategoryForType(transactionType.value, {
        current: selectedCategory.value,
        useLastUsed: !isEditMode.value
      })

      applyMandatorySuggestion()
    }
  )

  watch(transactionType, nextType => {
    selectedCategory.value = resolveCategoryForType(nextType, {
      current: selectedCategory.value,
      useLastUsed: !isEditMode.value
    })

    if (nextType === TRANSACTION_TYPE.Income) {
      isMandatory.value = false
      return
    }

    applyMandatorySuggestion()
  })

  watch(selectedCategory, (nextCategory, previousCategory) => {
    if (nextCategory?.id === previousCategory?.id) {
      return
    }

    applyMandatorySuggestion()
  })

  const filteredCategories = computed(() => getCategoriesForType(transactionType.value))
  const isIncome = computed(() => transactionType.value === TRANSACTION_TYPE.Income)
  const currencyCode = computed(
    () => selectedAccount.value?.currency?.code ?? selectedAccount.value?.currencyCode ?? 'KZT'
  )
  const currencySymbol = computed(() => selectedAccount.value?.currency?.symbol ?? '')

  const isTypeValid = computed(() => !!transactionType.value)
  const isAmountValid = computed(() => validators.isAmountValid(amount.value))
  const isCategoryValid = computed(() => !!selectedCategory.value)
  const isAccountValid = computed(() => !!selectedAccount.value)
  const isDateValid = computed(() => {
    if (!(date.value instanceof Date)) {
      return false
    }

    if (Number.isNaN(date.value.getTime())) {
      return false
    }

    return date.value <= maxDate.value
  })

  const submitDisabled = computed(
    () => !isTypeValid.value || !isAmountValid.value || !isCategoryValid.value || !isAccountValid.value || !isDateValid.value
  )

  const amountError = computed(() => {
    if (!touched.amount || isAmountValid.value) {
      return ''
    }

    if (amount.value == null) {
      return 'Введите сумму'
    }

    return `Сумма от ${VALIDATION_RULES.minAmount} до ${VALIDATION_RULES.maxAmount}`
  })

  const categoryError = computed(() => (touched.category && !isCategoryValid.value ? 'Выберите категорию' : ''))
  const accountError = computed(() => (touched.account && !isAccountValid.value ? 'Выберите счёт' : ''))
  const dateError = computed(() => (touched.date && !isDateValid.value ? 'Введите корректную дату' : ''))

  return {
    store,
    isEditMode,
    maxDate,
    transactionType,
    selectedAccount,
    selectedCategory,
    amount,
    description,
    date,
    isMandatory,
    mandatoryOverridden,
    showAdvanced,
    isDeleting,
    transactionTypeOptions,
    markTouched,
    resetTouched,
    markAllTouched,
    persistLastUsedCategory,
    applyMandatorySuggestion,
    toggleMandatory,
    handleAmountInput,
    refreshMaxDate,
    filteredCategories,
    isIncome,
    currencyCode,
    currencySymbol,
    submitDisabled,
    amountError,
    categoryError,
    accountError,
    dateError
  }
}
