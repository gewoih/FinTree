import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import * as accountsApi from '@/api/accounts';
import { queryKeys } from '@/api/queryKeys';
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
import { toast } from 'sonner';
import { resolveApiErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import type { ManagedAccount } from './accountModels';

const balanceAdjustmentSchema = z.object({
  newBalance: z
    .string()
    .trim()
    .min(1, 'Введите баланс')
    .refine((value) => !Number.isNaN(Number(value)), 'Введите корректный баланс'),
});

type BalanceAdjustmentFormValues = z.infer<typeof balanceAdjustmentSchema>;

interface AccountBalanceAdjustmentsModalProps {
  open: boolean;
  account: ManagedAccount | null;
  readonly?: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
}

export function AccountBalanceAdjustmentsModal({
  open,
  account,
  readonly = false,
  onClose,
  onSuccess,
}: AccountBalanceAdjustmentsModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<BalanceAdjustmentFormValues>({
    resolver: zodResolver(balanceAdjustmentSchema),
    defaultValues: {
      newBalance: account ? String(account.balance) : '',
    },
  });

  useEffect(() => {
    if (!open || !account) {
      return;
    }

    form.reset({ newBalance: String(account.balance) });
  }, [account, form, open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!account) {
      return;
    }

    if (readonly) {
      toast.error('Корректировка баланса недоступна без активной подписки.');
      return;
    }

    try {
      await accountsApi.createAccountBalanceAdjustment(
        account.id,
        Number(values.newBalance)
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.adjustments(account.id),
      });
      await onSuccess?.();
      toast.success('Баланс скорректирован');
      onClose();
    } catch (error) {
      toast.error(
        resolveApiErrorMessage(error, 'Не удалось скорректировать баланс.')
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {account
              ? `Корректировка баланса — ${account.name}`
              : 'Корректировка баланса'}
          </DialogTitle>
          <DialogDescription>
            Укажите фактический остаток, если он расходится с рассчитанным по
            транзакциям.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="text-sm text-muted-foreground">Текущий баланс</div>
            <div className="mt-1 text-xl font-semibold [font-variant-numeric:tabular-nums]">
              {account ? formatCurrency(account.balance, account.currencyCode) : '—'}
            </div>
          </div>

          <FormField
            label="Фактический баланс"
            required
            error={form.formState.errors.newBalance?.message}
          >
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="Введите текущий баланс"
              disabled={readonly}
              {...form.register('newBalance')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
