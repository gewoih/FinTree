import { VALIDATION_RULES } from '../constants';

/**
 * Validation service for form inputs and business logic
 * Centralizes validation logic for consistency across the application
 */

/**
 * Validation result object
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates transaction amount
 * @param value - Amount to validate
 * @returns Validation result with error message if invalid
 */
export function validateAmount(value: number | null): ValidationResult {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      errorMessage: 'Сумма обязательна для заполнения'
    };
  }

  if (isNaN(value)) {
    return {
      isValid: false,
      errorMessage: 'Сумма должна быть числом'
    };
  }

  if (value < VALIDATION_RULES.minAmount) {
    return {
      isValid: false,
      errorMessage: `Минимальная сумма: ${VALIDATION_RULES.minAmount}`
    };
  }

  if (value > VALIDATION_RULES.maxAmount) {
    return {
      isValid: false,
      errorMessage: `Максимальная сумма: ${VALIDATION_RULES.maxAmount}`
    };
  }

  return { isValid: true };
}

/**
 * Checks if amount is within valid range
 * @param value - Amount to check
 * @returns True if amount is valid
 */
export function isAmountValid(value: number | null): boolean {
  return validateAmount(value).isValid;
}

/**
 * Validates note/description length
 * @param text - Text to validate
 * @returns Validation result with error message if invalid
 */
export function validateNote(text: string): ValidationResult {
  if (text.length > VALIDATION_RULES.maxNoteLength) {
    return {
      isValid: false,
      errorMessage: `Максимальная длина примечания: ${VALIDATION_RULES.maxNoteLength} символов`
    };
  }

  return { isValid: true };
}

/**
 * Validates required string field
 * @param value - String to validate
 * @param fieldName - Name of field for error message
 * @returns Validation result with error message if invalid
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: `${fieldName} обязательно для заполнения`
    };
  }

  return { isValid: true };
}

/**
 * Validates currency code is not empty
 * @param code - Currency code to validate
 * @returns Validation result
 */
export function validateCurrencyCode(code: string | null): ValidationResult {
  if (!code) {
    return {
      isValid: false,
      errorMessage: 'Валюта обязательна для выбора'
    };
  }

  return { isValid: true };
}

/**
 * Validates that a date is not in the future
 * @param date - Date to validate
 * @returns Validation result
 */
export function validateDateNotFuture(date: Date): ValidationResult {
  const now = new Date();
  if (date > now) {
    return {
      isValid: false,
      errorMessage: 'Дата не может быть в будущем'
    };
  }

  return { isValid: true };
}

/**
 * Validators object for easy access to all validators
 */
export const validators = {
  amount: validateAmount,
  isAmountValid,
  note: validateNote,
  required: validateRequired,
  currencyCode: validateCurrencyCode,
  dateNotFuture: validateDateNotFuture
};
