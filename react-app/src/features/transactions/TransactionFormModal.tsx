import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import * as transactionsApi from '@/api/transactions';
import { queryKeys } from '@/api/queryKeys';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { AccountDto, TransactionCategoryDto, TransactionDto } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import { DatePopoverField } from './DatePopoverField';
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
  categoryId: z.string().trim().min(1, 'Выберите категорию'),
  accountId: z.string().trim().min(1, 'Выберите счёт'),
  description: z.string().max(100, 'Не более 100 символов').optional(),
  isMandatory: z.boolean(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormModalProps {
  open: boolean;
  mode: Exclude<TransactionModalMode, { type: 'closed' }>;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  readonly?: boolean;
  onDeleteTransaction?: (transaction: TransactionDto) => Promise<void>;
  isDeletePending?: boolean;
  onClose: () => void;
}

const DEFAULT_TRANSACTION_VALUES: TransactionFormValues = {
  transactionType: 'Expense',
  amount: '',
  occurredAt: getTodayDateValue(),
  categoryId: '',
  accountId: '',
  description: '',
  isMandatory: false,
};

export function TransactionFormModal({
  open,
  mode,
  accounts,
  categories,
  readonly = false,
  onDeleteTransaction,
  isDeletePending = false,
  onClose,
}: TransactionFormModalProps) {
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
        accountId: accounts[0]?.id ?? '',
        categoryId:
          categories.find((item) => item.type === 'Expense')?.id ?? '',
      });
      return;
    }

    form.reset({
      transactionType: mode.transaction.type === 'Income' ? 'Income' : 'Expense',
      amount: String(mode.transaction.amount),
      occurredAt: toDateInputValue(mode.transaction.occurredAt),
      categoryId: mode.transaction.categoryId,
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
      if (mode.type === 'edit-transaction') {
        await transactionsApi.updateTransaction({
          id: mode.transaction.id,
          accountId: values.accountId,
          categoryId: values.categoryId,
          amount: Number(values.amount),
          occurredAt: toIsoDateAtNoon(values.occurredAt),
          description: values.description?.trim() || null,
          isMandatory: values.isMandatory,
        });
      } else {
        await transactionsApi.createTransaction({
          type: values.transactionType,
          accountId: values.accountId,
          categoryId: values.categoryId,
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

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Редактирование транзакции' : 'Добавить операцию'}
            </DialogTitle>
            <DialogDescription>
              Сохранение обновит историю операций.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={submitTransaction} noValidate>
            <div className="grid grid-cols-2 gap-2">
              {(['Income', 'Expense'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={transactionType === value ? 'default' : 'outline'}
                  className="min-h-[44px] rounded-xl"
                  disabled={isEditMode}
                  onClick={() => {
                    form.setValue('transactionType', value);
                    form.setValue(
                      'categoryId',
                      categories.find((item) => item.type === value)?.id ?? ''
                    );
                  }}
                >
                  {value === 'Income' ? 'Доход' : 'Расход'}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Сумма"
                required
                error={form.formState.errors.amount?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  {...form.register('amount')}
                />
              </FormField>

              <div className="space-y-1.5">
                <div className="text-sm font-semibold text-muted-foreground">
                  Дата
                </div>
                <Controller
                  control={form.control}
                  name="occurredAt"
                  render={({ field }) => (
                    <DatePopoverField
                      label="Дата"
                      value={field.value}
                      max={getTodayDateValue()}
                      placeholder="Выберите дату"
                      onChange={(nextValue) => field.onChange(nextValue ?? '')}
                    />
                  )}
                />
                {form.formState.errors.occurredAt?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.occurredAt.message}
                  </p>
                ) : null}
              </div>
            </div>

            <FormField
              label="Категория"
              required
              error={form.formState.errors.categoryId?.message}
            >
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label={`Счёт${transactionAccount ? ` · ${transactionAccount.currencyCode}` : ''}`}
              required
              error={form.formState.errors.accountId?.message}
            >
              <Controller
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="Выберите счёт" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} · {account.currencyCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Описание"
              error={form.formState.errors.description?.message}
            >
              <Textarea
                placeholder="Комментарий (необязательно)"
                {...form.register('description')}
              />
            </FormField>

            <label className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-border bg-muted/25 px-3 py-3">
              <Controller
                control={form.control}
                name="isMandatory"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-sm text-muted-foreground">
                Обязательный платёж. Такие расходы отдельно учитываются в аналитике.
              </span>
            </label>

            <DialogFooter>
              {isEditMode ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:mr-auto"
                  disabled={isDeletePending}
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Удалить
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting || isDeletePending}
                onClick={onClose}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={!amount || form.formState.isSubmitting || isDeletePending}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Удалить транзакцию?"
        description="Это действие нельзя отменить."
        confirmLabel="Удалить"
        variant="destructive"
        isLoading={isDeletePending}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </>
  );
}
