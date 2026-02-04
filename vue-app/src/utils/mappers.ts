import type {
  Account,
  AccountDto,
  AccountType,
  Category,
  CategoryType,
  Currency,
  Transaction,
  TransactionCategoryDto,
  TransactionDto
} from '../types';
import { CATEGORY_TYPE } from '../types';

/**
 * Data mapping utilities for converting DTOs to UI models
 * Centralizes data transformation logic for cleaner store code
 */

/**
 * Maps AccountDto to Account with enriched currency data
 * @param dto - Account DTO from API
 * @param currencies - Map of currency codes to Currency objects
 * @returns Enriched Account object
 */
export function mapAccount(
  dto: AccountDto,
  currencies: Map<string, Currency>
): Account {
  const balance = Number(dto.balance ?? 0);
  const balanceInBaseCurrency = Number(dto.balanceInBaseCurrency ?? balance);
  return {
    ...dto,
    type: normalizeAccountType(dto.type),
    currency: currencies.get(dto.currencyCode) ?? null,
    balance,
    balanceInBaseCurrency,
  };
}

/**
 * Maps TransactionCategoryDto to Category
 * @param dto - Category DTO from API
 * @returns Category object
 */
export function mapCategory(dto: TransactionCategoryDto): Category {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color,
    icon: dto.icon ?? 'pi-tag',
    type: normalizeCategoryType(dto.type),
    isSystem: dto.isSystem,
    isMandatory: dto.isMandatory ?? false,
  };
}

/**
 * Maps TransactionDto to Transaction with enriched account and category data
 * @param dto - Transaction DTO from API
 * @param accounts - Array of available accounts
 * @param categories - Array of available categories
 * @returns Enriched Transaction object
 */
export function mapTransaction(
  dto: any, // Use any to handle API inconsistency with occurredAt/occuredAt
  accounts: Account[],
  categories: Category[]
): Transaction {
  const account = accounts.find(acc => acc.id === dto.accountId) ?? null;
  const category = categories.find(cat => cat.id === dto.categoryId) ?? null;
  const rawType = dto.type ?? category?.type ?? CATEGORY_TYPE.Expense;
  const type = normalizeCategoryType(rawType);

  // Handle API inconsistency: occuredAt (wrong) vs occurredAt (correct)
  const occurredAt = dto.occurredAt || dto.occuredAt;

  return {
    ...dto,
    type,
    occurredAt,
    amount: Number(dto.amount),
    description: dto.description ?? null,
    isMandatory: dto.isMandatory ?? false,
    account: account ?? undefined,
    category,
  };
}

/**
 * Batch maps an array of AccountDto to Account objects
 * @param dtos - Array of account DTOs
 * @param currencies - Map of currency codes to Currency objects
 * @returns Array of enriched Account objects
 */
export function mapAccounts(
  dtos: AccountDto[],
  currencies: Map<string, Currency>
): Account[] {
  return dtos.map(dto => mapAccount(dto, currencies));
}

/**
 * Batch maps an array of TransactionCategoryDto to Category objects
 * @param dtos - Array of category DTOs
 * @returns Array of Category objects
 */
export function mapCategories(dtos: TransactionCategoryDto[]): Category[] {
  return dtos.map(dto => mapCategory(dto));
}

/**
 * Batch maps an array of TransactionDto to Transaction objects
 * @param dtos - Array of transaction DTOs
 * @param accounts - Array of available accounts
 * @param categories - Array of available categories
 * @returns Array of enriched Transaction objects
 */
export function mapTransactions(
  dtos: TransactionDto[],
  accounts: Account[],
  categories: Category[]
): Transaction[] {
  return dtos.map(dto => mapTransaction(dto, accounts, categories));
}

/**
 * Creates a Map of currencies indexed by currency code for quick lookup
 * @param currencies - Array of Currency objects
 * @returns Map with currency codes as keys
 */
export function createCurrencyMap(currencies: Currency[]): Map<string, Currency> {
  const map = new Map<string, Currency>();
  currencies.forEach(currency => {
    map.set(currency.code, currency);
  });
  return map;
}

function normalizeCategoryType(value: unknown): CategoryType {
  if (value === CATEGORY_TYPE.Income || value === CATEGORY_TYPE.Expense) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === CATEGORY_TYPE.Income.toLowerCase()) {
      return CATEGORY_TYPE.Income;
    }
    if (normalized === CATEGORY_TYPE.Expense.toLowerCase()) {
      return CATEGORY_TYPE.Expense;
    }
  }

  if (typeof value === 'number') {
    if (value === 0) return CATEGORY_TYPE.Income;
    if (value === 1) return CATEGORY_TYPE.Expense;
  }

  console.warn('Не удалось распознать тип категории, используем Expense по умолчанию:', value);
  return CATEGORY_TYPE.Expense;
}

/**
 * Normalizes account type from various formats (string/number) to AccountType
 * @param value - Raw account type from API (can be "Bank", "Cash", "Crypto" or 0, 1, 2)
 * @returns Normalized AccountType (0, 1, or 2)
 */
function normalizeAccountType(value: unknown): AccountType {
  // Already correct type
  if (value === 0 || value === 1 || value === 2 || value === 3) {
    return value as AccountType;
  }

  // String values from backend
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'bank') return 0;
    if (normalized === 'cash') return 1;
    if (normalized === 'crypto') return 2;
    if (normalized === 'investment') return 3;
  }

  console.warn('Не удалось распознать тип счета, используем Bank по умолчанию:', value);
  return 0; // Default to Bank
}
