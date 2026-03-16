import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import * as accountsApi from '@/api/accounts';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { resolveApiErrorMessage } from '@/utils/errors';
import { DatePopoverField } from '@/features/transactions/DatePopoverField';
import {
  getTodayDateValue,
  toIsoDateAtNoon,
} from '@/features/transactions/transactionUtils';

const cashFlowSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Введите сумму')
    .refine((value) => Number(value) > 0, 'Сумма должна быть больше 0'),
  occurredAt: z.string().min(1, 'Выберите дату'),
  description: z.string().max(100, 'Не более 100 символов').optional(),
});

type CashFlowFormValues = z.infer<typeof cashFlowSchema>;

interface InvestmentCashFlowModalProps {
  open: boolean;
  accountId: string;
  type: 'deposit' | 'withdrawal';
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

const TITLES = {
  deposit: 'Пополнение счёта',
  withdrawal: 'Вывод средств',
} as const;

const DESCRIPTIONS = {
  deposit: 'Зафиксирует поступление средств на счёт.',
  withdrawal: 'Зафиксирует вывод средств со счёта.',
} as const;

export function InvestmentCashFlowModal({
  open,
  accountId,
  type,
  onClose,
  onSuccess,
}: InvestmentCashFlowModalProps) {
  const form = useForm<CashFlowFormValues>({
    resolver: zodResolver(cashFlowSchema),
    defaultValues: {
      amount: '',
      occurredAt: getTodayDateValue(),
      description: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const transactionType = type === 'deposit' ? 'Income' : 'Expense';
      await accountsApi.createInvestmentCashFlow(
        accountId,
        transactionType,
        Number(values.amount),
        toIsoDateAtNoon(values.occurredAt),
        values.description?.trim() || null
      );
      toast.success(type === 'deposit' ? 'Пополнение зафиксировано' : 'Вывод зафиксирован');
      form.reset();
      await onSuccess();
      onClose();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сохранить операцию.'));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{TITLES[type]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[type]}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
              <div className="text-sm font-semibold text-muted-foreground">Дата</div>
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
            label="Описание"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              placeholder="Комментарий (необязательно)"
              {...form.register('description')}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => {
                form.reset();
                onClose();
              }}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
