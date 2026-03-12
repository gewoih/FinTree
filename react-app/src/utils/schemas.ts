import { z } from 'zod';

// ━━━ AUTH ━━━

export const loginSchema = z.object({
  email: z.string().min(1, 'Введите email').email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль').min(6, 'Минимум 6 символов'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().min(1, 'Введите email').email('Некорректный email'),
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(/[a-z]/, 'Добавьте строчную букву')
      .regex(/[A-Z]/, 'Добавьте заглавную букву')
      .regex(/\d/, 'Добавьте цифру')
      .regex(/[^a-zA-Z0-9]/, 'Добавьте спецсимвол'),
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ━━━ ACCOUNTS ━━━

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Введите название').max(100, 'Максимум 100 символов'),
  type: z.union([z.literal(0), z.literal(2), z.literal(3), z.literal(4)], {
    error: 'Выберите тип счёта',
  }),
  currencyCode: z.string().min(1, 'Выберите валюту'),
  isLiquid: z.boolean().optional(),
});

export type CreateAccountFormValues = z.infer<typeof createAccountSchema>;

// ━━━ TRANSACTIONS ━━━

export const newTransactionSchema = z.object({
  type: z.enum(['Income', 'Expense'], { error: 'Выберите тип' }),
  accountId: z.string().min(1, 'Выберите счёт'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  amount: z.number({ error: 'Введите сумму' }).positive('Сумма должна быть больше 0'),
  occurredAt: z.string().min(1, 'Укажите дату'),
  description: z.string().nullable().optional(),
  isMandatory: z.boolean(),
});

export type NewTransactionFormValues = z.infer<typeof newTransactionSchema>;

// ━━━ CATEGORIES ━━━

export const createCategorySchema = z.object({
  categoryType: z.enum(['Income', 'Expense'], {
    error: 'Выберите тип категории',
  }),
  name: z.string().min(1, 'Введите название').max(100, 'Максимум 100 символов'),
  color: z
    .string()
    .min(1, 'Выберите цвет')
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Некорректный HEX'),
  icon: z.string().min(1, 'Выберите иконку'),
  isMandatory: z.boolean().optional(),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;

// ━━━ USER PROFILE ━━━

export const updateProfileSchema = z.object({
  baseCurrencyCode: z.string().min(1, 'Выберите базовую валюту'),
  telegramUserId: z.number().nullable().optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

// ━━━ GOALS ━━━

export const goalSimulationSchema = z.object({
  targetAmount: z.number({ error: 'Введите цель' }).positive('Должно быть больше 0'),
  initialCapital: z.number().nonnegative('Не может быть отрицательным').nullable().optional(),
  monthlyIncome: z.number().nonnegative('Не может быть отрицательным').nullable().optional(),
  monthlyExpenses: z
    .number()
    .nonnegative('Не может быть отрицательным')
    .nullable()
    .optional(),
  annualReturnRate: z
    .number()
    .min(0, 'Минимум 0%')
    .max(100, 'Максимум 100%')
    .nullable()
    .optional(),
});

export type GoalSimulationFormValues = z.infer<typeof goalSimulationSchema>;

// ━━━ FREEDOM CALCULATOR ━━━

export const freedomCalculatorSchema = z.object({
  capital: z.number({ error: 'Введите капитал' }).nonnegative('Не может быть отрицательным'),
  monthlyExpenses: z
    .number({ error: 'Введите расходы' })
    .positive('Должно быть больше 0'),
  swrPercent: z.number().min(0.1, 'Минимум 0.1%').max(20, 'Максимум 20%'),
  inflationRatePercent: z.number().min(0, 'Минимум 0%').max(50, 'Максимум 50%'),
  inflationEnabled: z.boolean(),
});

export type FreedomCalculatorFormValues = z.infer<typeof freedomCalculatorSchema>;

// ━━━ RETROSPECTIVE ━━━

export const upsertRetrospectiveSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Формат: YYYY-MM'),
  conclusion: z.string().max(5000).nullable().optional(),
  nextMonthPlan: z.string().max(5000).nullable().optional(),
  wins: z.string().max(5000).nullable().optional(),
  savingsOpportunities: z.string().max(5000).nullable().optional(),
  disciplineRating: z.number().min(1).max(5).nullable().optional(),
  impulseControlRating: z.number().min(1).max(5).nullable().optional(),
  confidenceRating: z.number().min(1).max(5).nullable().optional(),
});

export type UpsertRetrospectiveFormValues = z.infer<
  typeof upsertRetrospectiveSchema
>;
