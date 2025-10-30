import type {
  Account,
  AccountDto,
  Category,
  Currency,
  Transaction,
  TransactionCategoryDto,
  TransactionDto
} from '../types';

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
  return {
    ...dto,
    currency: currencies.get(dto.currencyCode) ?? null,
  };
}

/**
 * Maps TransactionCategoryDto to Category
 * Currently a passthrough but can be extended with enrichment logic
 * @param dto - Category DTO from API
 * @returns Category object
 */
export function mapCategory(dto: TransactionCategoryDto): Category {
  return {
    ...dto,
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
  dto: TransactionDto,
  accounts: Account[],
  categories: Category[]
): Transaction {
  const account = accounts.find(acc => acc.id === dto.accountId) ?? null;
  const category = categories.find(cat => cat.id === dto.categoryId) ?? null;

  return {
    ...dto,
    amount: Number(dto.amount),
    description: dto.description ?? null,
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
