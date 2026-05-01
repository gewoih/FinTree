import { Loader2, Trash2 } from 'lucide-react';
import { Controller } from 'react-hook-form';
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
import type { AccountDto, TransactionCategoryDto, TransactionDto } from '@/types';
import { DatePopoverField } from './DatePopoverField';
import type { TransactionModalMode } from './transactionModels';
import { getTodayDateValue } from './transactionUtils';
import { useTransactionForm } from './useTransactionForm';
import { UNCATEGORIZED_SELECT_VALUE } from '@/constants/uncategorized';

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
  const {
    form,
    transactionType,
    transactionAccount,
    filteredCategories,
    isEditMode,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    submitTransaction,
    handleDelete,
    amount,
  } = useTransactionForm({
    open,
    mode,
    accounts,
    categories,
    readonly,
    onDeleteTransaction,
    onClose,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col max-w-[calc(100vw-1rem)] sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Редактирование транзакции' : 'Добавить операцию'}
            </DialogTitle>
            <DialogDescription>
              Сохранение обновит историю операций.
            </DialogDescription>
          </DialogHeader>

          <form className="flex min-h-0 flex-1 flex-col" onSubmit={submitTransaction} noValidate>
            <div className="flex-1 space-y-4 overflow-y-auto pb-1">
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
                    form.setValue('categoryId', '');
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
              error={form.formState.errors.categoryId?.message}
            >
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? UNCATEGORIZED_SELECT_VALUE}
                    onValueChange={(v) =>
                      field.onChange(v === UNCATEGORIZED_SELECT_VALUE ? undefined : v)
                    }
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="Без категории" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNCATEGORIZED_SELECT_VALUE}>Без категории</SelectItem>
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
            </div>

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
