import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import * as transactionsApi from '@/api/transactions';
import * as transfersApi from '@/api/transfers';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const transferSchema = z
  .object({
    fromAccountId: z.string().trim().min(1, 'Выберите счёт списания'),
    toAccountId: z.string().trim().min(1, 'Выберите счёт зачисления'),
    fromAmount: z
      .string()
      .trim()
      .min(1, 'Введите сумму списания')
      .refine((value) => Number(value) > 0, 'Сумма должна быть больше 0'),
    toAmount: z
      .string()
      .trim()
      .min(1, 'Введите сумму зачисления')
      .refine((value) => Number(value) > 0, 'Сумма должна быть больше 0'),
    occurredAt: z.string().min(1, 'Выберите дату'),
    feeAmount: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || Number(value) >= 0, 'Комиссия не может быть отрицательной'),
    description: z.string().max(100, 'Не более 100 символов').optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Счета должны различаться',
    path: ['toAccountId'],
  });

type TransactionFormValues = z.infer<typeof transactionSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;
type ModalTab = 'transaction' | 'transfer';

interface TransactionFormModalProps {
  open: boolean;
  mode: Exclude<TransactionModalMode, { type: 'closed' }>;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  readonly?: boolean;
  onDeleteTransaction?: (transaction: TransactionDto) => Promise<void>;
  onDeleteTransfer?: (transferId: string) => Promise<void>;
  isDeletePending?: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const DEFAULT_TRANSFER_VALUES: TransferFormValues = {
  fromAccountId: '',
  toAccountId: '',
  fromAmount: '',
  toAmount: '',
  occurredAt: getTodayDateValue(),
  feeAmount: '',
  description: '',
};

export function TransactionFormModal({
  open,
  mode,
  accounts,
  categories,
  readonly = false,
  onDeleteTransaction,
  onDeleteTransfer,
  isDeletePending = false,
  onClose,
  onSuccess,
}: TransactionFormModalProps) {
  const queryClient = useQueryClient();
  const [createTab, setCreateTab] = useState<ModalTab>('transaction');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const transactionForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: DEFAULT_TRANSACTION_VALUES,
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: DEFAULT_TRANSFER_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode.type === 'create') {
      transactionForm.reset({
        ...DEFAULT_TRANSACTION_VALUES,
        accountId: accounts[0]?.id ?? '',
        categoryId:
          categories.find((item) => item.type === 'Expense')?.id ?? '',
      });
      transferForm.reset({
        ...DEFAULT_TRANSFER_VALUES,
        fromAccountId: accounts[0]?.id ?? '',
        toAccountId: accounts[1]?.id ?? '',
      });
      return;
    }

    if (mode.type === 'edit-transaction') {
      transactionForm.reset({
        transactionType: mode.transaction.type === 'Income' ? 'Income' : 'Expense',
        amount: String(mode.transaction.amount),
        occurredAt: toDateInputValue(mode.transaction.occurredAt),
        categoryId: mode.transaction.categoryId,
        accountId: mode.transaction.accountId,
        description: mode.transaction.description ?? '',
        isMandatory: mode.transaction.isMandatory,
      });
      return;
    }

    transferForm.reset({
      fromAccountId: mode.payload.fromAccountId,
      toAccountId: mode.payload.toAccountId,
      fromAmount: String(mode.payload.fromAmount),
      toAmount: String(mode.payload.toAmount),
      occurredAt: toDateInputValue(mode.payload.occurredAt),
      feeAmount:
        mode.payload.feeAmount != null ? String(mode.payload.feeAmount) : '',
      description: mode.payload.description ?? '',
    });
  }, [accounts, categories, mode, open, transactionForm, transferForm]);

  const [transactionType, selectedAccountId] = useWatch({
    control: transactionForm.control,
    name: ['transactionType', 'accountId'],
  });
  const [fromAccountId, toAccountId, fromAmount] = useWatch({
    control: transferForm.control,
    name: ['fromAccountId', 'toAccountId', 'fromAmount'],
  });
  const activeTab =
    mode.type === 'edit-transfer'
      ? 'transfer'
      : mode.type === 'edit-transaction'
        ? 'transaction'
        : createTab;

  const transactionAccount = accounts.find((item) => item.id === selectedAccountId);
  const fromAccount = accounts.find((item) => item.id === fromAccountId);
  const toAccount = accounts.find((item) => item.id === toAccountId);
  const filteredCategories = categories.filter(
    (item) => item.type === transactionType
  );

  useEffect(() => {
    if (!fromAccount || !toAccount) {
      return;
    }

    if (fromAccount.currencyCode === toAccount.currencyCode && fromAmount) {
      transferForm.setValue('toAmount', fromAmount, { shouldValidate: true });
    }
  }, [fromAccount, fromAmount, toAccount, transferForm]);

  const persistSuccess = async (message: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
    ]);
    toast.success(message);
    onSuccess();
    onClose();
  };

  const submitTransaction = transactionForm.handleSubmit(async (values) => {
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

  const submitTransfer = transferForm.handleSubmit(async (values) => {
    if (readonly) {
      toast.error('Изменение переводов недоступно без активной подписки.');
      return;
    }

    try {
      const payload = {
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        fromAmount: Number(values.fromAmount),
        toAmount: Number(values.toAmount),
        occurredAt: toIsoDateAtNoon(values.occurredAt),
        feeAmount: values.feeAmount ? Number(values.feeAmount) : null,
        description: values.description?.trim() || null,
      };

      if (mode.type === 'edit-transfer') {
        await transfersApi.updateTransfer({
          transferId: mode.payload.transferId,
          ...payload,
        });
      } else {
        await transfersApi.createTransfer(payload);
      }

      await persistSuccess('Перевод сохранён');
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сохранить перевод.'));
    }
  });

  const isCreateMode = mode.type === 'create';
  const isTransactionEdit = mode.type === 'edit-transaction';
  const isTransferEdit = mode.type === 'edit-transfer';
  const deleteDialogTitle = isTransferEdit
    ? 'Удалить перевод?'
    : 'Удалить транзакцию?';

  const handleDelete = async () => {
    try {
      if (mode.type === 'edit-transfer') {
        await onDeleteTransfer?.(mode.payload.transferId);
      } else if (mode.type === 'edit-transaction') {
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
              {isTransferEdit
                ? 'Редактирование перевода'
                : isTransactionEdit
                  ? 'Редактирование транзакции'
                  : 'Добавить операцию'}
            </DialogTitle>
            <DialogDescription>
              Сохранение обновит историю операций и пересчитает балансы счетов.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (isCreateMode) {
                setCreateTab(value as ModalTab);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="transaction" disabled={isTransferEdit}>
                Транзакция
              </TabsTrigger>
              <TabsTrigger value="transfer" disabled={isTransactionEdit}>
                Перевод
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'transaction' ? (
            <form className="space-y-4" onSubmit={submitTransaction} noValidate>
              <div className="grid grid-cols-2 gap-2">
                {(['Income', 'Expense'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={transactionType === value ? 'default' : 'outline'}
                    className="min-h-[44px] rounded-xl"
                    disabled={isTransactionEdit}
                    onClick={() => {
                      transactionForm.setValue('transactionType', value);
                      transactionForm.setValue(
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
                  error={transactionForm.formState.errors.amount?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    {...transactionForm.register('amount')}
                  />
                </FormField>

                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Дата
                  </div>
                  <Controller
                    control={transactionForm.control}
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
                  {transactionForm.formState.errors.occurredAt?.message ? (
                    <p className="text-sm text-destructive">
                      {transactionForm.formState.errors.occurredAt.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <FormField
                label="Категория"
                required
                error={transactionForm.formState.errors.categoryId?.message}
              >
                <Controller
                  control={transactionForm.control}
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
                error={transactionForm.formState.errors.accountId?.message}
              >
                <Controller
                  control={transactionForm.control}
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
                error={transactionForm.formState.errors.description?.message}
              >
                <Textarea
                  placeholder="Комментарий (необязательно)"
                  {...transactionForm.register('description')}
                />
              </FormField>

              <label className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-border bg-muted/25 px-3 py-3">
                <Controller
                  control={transactionForm.control}
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
                {isTransactionEdit ? (
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
                  disabled={transactionForm.formState.isSubmitting || isDeletePending}
                  onClick={onClose}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={transactionForm.formState.isSubmitting || isDeletePending}
                >
                  {transactionForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Сохранить
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitTransfer} noValidate>
              <FormField
                label="Счёт списания"
                required
                error={transferForm.formState.errors.fromAccountId?.message}
              >
                <Controller
                  control={transferForm.control}
                  name="fromAccountId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 w-full rounded-xl">
                        <SelectValue placeholder="Выберите счёт списания" />
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

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label={`Сумма списания${fromAccount ? ` · ${fromAccount.currencyCode}` : ''}`}
                  required
                  error={transferForm.formState.errors.fromAmount?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    {...transferForm.register('fromAmount')}
                  />
                </FormField>

                <FormField
                  label={`Счёт зачисления${toAccount ? ` · ${toAccount.currencyCode}` : ''}`}
                  required
                  error={transferForm.formState.errors.toAccountId?.message}
                >
                  <Controller
                    control={transferForm.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 w-full rounded-xl">
                          <SelectValue placeholder="Выберите счёт зачисления" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((account) => account.id !== fromAccountId)
                            .map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} · {account.currencyCode}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label={`Сумма зачисления${toAccount ? ` · ${toAccount.currencyCode}` : ''}`}
                  required
                  error={transferForm.formState.errors.toAmount?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    {...transferForm.register('toAmount')}
                  />
                </FormField>

                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Дата
                  </div>
                  <Controller
                    control={transferForm.control}
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
                  {transferForm.formState.errors.occurredAt?.message ? (
                    <p className="text-sm text-destructive">
                      {transferForm.formState.errors.occurredAt.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <FormField
                label="Комиссия"
                error={transferForm.formState.errors.feeAmount?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  {...transferForm.register('feeAmount')}
                />
              </FormField>

              <FormField
                label="Описание"
                error={transferForm.formState.errors.description?.message}
              >
                <Textarea
                  placeholder="Комментарий (необязательно)"
                  {...transferForm.register('description')}
                />
              </FormField>

              <DialogFooter>
                {isTransferEdit ? (
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
                  disabled={transferForm.formState.isSubmitting || isDeletePending}
                  onClick={onClose}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={transferForm.formState.isSubmitting || isDeletePending}
                >
                  {transferForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Сохранить
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={deleteDialogTitle}
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
