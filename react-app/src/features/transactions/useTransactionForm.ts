import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import * as transactionsApi from '@/api/transactions';
import { queryKeys } from '@/api/queryKeys';
import { toast } from 'sonner';
import type { AccountDto, TransactionCategoryDto, TransactionDto } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import type { TransactionModalMode } from './transactionModels';
import {
  getTodayDateValue,
  toDateInputValue,
  toIsoDateAtNoon,
} from './transactionUtils';

const transactionSchema = z.object({
  transactionType: z.enum(['Income', 'Expense']),
  amount: z
    .string()
    .trim()
    .min(1, 'Введите сумму')
    .refine((value) => Number(value) > 0, 'Сумма должна быть больше 0'),
  occurredAt: z.string().min(1, 'Выберите дату'),
  categoryId: z.string().trim().optional(),
  accountId: z.string().trim().min(1, 'Выберите счёт'),
  description: z.string().max(100, 'Не более 100 символов').optional(),
  isMandatory: z.boolean(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

const DEFAULT_TRANSACTION_VALUES: TransactionFormValues = {
  transactionType: 'Expense',
  amount: '',
  occurredAt: getTodayDateValue(),
  categoryId: '',
  accountId: '',
  description: '',
  isMandatory: false,
};

interface UseTransactionFormParams {
  open: boolean;
  mode: Exclude<TransactionModalMode, { type: 'closed' }>;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  readonly?: boolean;
  onDeleteTransaction?: (transaction: TransactionDto) => Promise<void>;
  onClose: () => void;
}

export function useTransactionForm({
  open,
  mode,
  accounts,
  categories,
  readonly = false,
  onDeleteTransaction,
  onClose,
}: UseTransactionFormParams) {
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: DEFAULT_TRANSACTION_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode.type === 'create') {
      form.reset({
        ...DEFAULT_TRANSACTION_VALUES,
        occurredAt: getTodayDateValue(),
        accountId: accounts[0]?.id ?? '',
      });
      return;
    }

    form.reset({
      transactionType: mode.transaction.type === 'Income' ? 'Income' : 'Expense',
      amount: String(mode.transaction.amount),
      occurredAt: toDateInputValue(mode.transaction.occurredAt),
      categoryId: mode.transaction.categoryId ?? '',
      accountId: mode.transaction.accountId,
      description: mode.transaction.description ?? '',
      isMandatory: mode.transaction.isMandatory,
    });
  }, [accounts, categories, mode, open, form]);

  const [transactionType, selectedAccountId, amount] = useWatch({
    control: form.control,
    name: ['transactionType', 'accountId', 'amount'],
  });

  const transactionAccount = accounts.find((item) => item.id === selectedAccountId);
  const filteredCategories = categories.filter(
    (item) => item.type === transactionType
  );

  const isEditMode = mode.type === 'edit-transaction';

  const persistSuccess = async (message: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
    ]);
    toast.success(message);
    onClose();
  };

  const submitTransaction = form.handleSubmit(async (values) => {
    if (readonly) {
      toast.error('Изменение транзакций недоступно без активной подписки.');
      return;
    }

    try {
      const categoryId = values.categoryId?.trim() || null;

      if (mode.type === 'edit-transaction') {
        await transactionsApi.updateTransaction({
          id: mode.transaction.id,
          accountId: values.accountId,
          categoryId,
          amount: Number(values.amount),
          occurredAt: toIsoDateAtNoon(values.occurredAt),
          description: values.description?.trim() || null,
          isMandatory: values.isMandatory,
        });
      } else {
        await transactionsApi.createTransaction({
          type: values.transactionType,
          accountId: values.accountId,
          categoryId,
          amount: Number(values.amount),
          occurredAt: toIsoDateAtNoon(values.occurredAt),
          description: values.description?.trim() || null,
          isMandatory: values.isMandatory,
        });
      }

      await persistSuccess('Транзакция сохранена');
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сохранить транзакцию.'));
    }
  });

  const handleDelete = async () => {
    try {
      if (mode.type === 'edit-transaction') {
        await onDeleteTransaction?.(mode.transaction);
      }

      setIsDeleteDialogOpen(false);
      onClose();
    } catch {
      // Error toast is handled by the page hook; keep the dialog open for a retry.
    }
  };

  return {
    form,
    transactionType,
    selectedAccountId,
    amount,
    transactionAccount,
    filteredCategories,
    isEditMode,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    submitTransaction,
    handleDelete,
  };
}
