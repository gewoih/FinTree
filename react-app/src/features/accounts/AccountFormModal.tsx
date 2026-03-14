import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AccountType, Currency } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import type { ManagedAccount } from './accountModels';
import {
  ACCOUNT_TYPE_OPTIONS,
  getCurrencyOptionLabel,
} from './accountUtils';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Введите название счёта').max(100),
  type: z.enum(['0', '2', '3', '4']),
  currencyCode: z.string().trim().min(1, 'Выберите валюту'),
});

type AccountFormValues = z.infer<typeof createSchema>;

interface AccountFormModalProps {
  open: boolean;
  account: ManagedAccount | null;
  currencies: Currency[];
  allowedTypes?: readonly AccountType[];
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function AccountFormModal({
  open,
  account,
  currencies,
  allowedTypes = [0, 2, 3, 4],
  onClose,
  onSuccess,
}: AccountFormModalProps) {
  const isEditMode = account !== null;
  const queryClient = useQueryClient();
  const availableTypeOptions = ACCOUNT_TYPE_OPTIONS.filter((option) =>
    allowedTypes.includes(option.value)
  );
  const defaultCreateType = String(
    availableTypeOptions[0]?.value ?? 0
  ) as AccountFormValues['type'];

  const defaultValues = useMemo<AccountFormValues>(() => {
    if (isEditMode) {
      return {
        name: account.name,
        type: String(account.type) as AccountFormValues['type'],
        currencyCode: account.currencyCode,
      };
    }

    return {
      name: '',
      type: defaultCreateType,
      currencyCode: currencies[0]?.code ?? '',
    };
  }, [account, currencies, defaultCreateType, isEditMode]);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(defaultValues);
  }, [defaultValues, form, open]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEditMode) {
        await accountsApi.updateAccount({
          id: account.id,
          name: values.name.trim(),
        });
      } else {
        await accountsApi.createAccount({
          name: values.name.trim(),
          type: Number(values.type) as 0 | 2 | 3 | 4,
          currencyCode: values.currencyCode,
        });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() });
      await onSuccess();
      onClose();
      toast.success(isEditMode ? 'Счёт переименован' : 'Счёт создан');
    } catch (error) {
      toast.error(
        resolveApiErrorMessage(
          error,
          isEditMode ? 'Не удалось сохранить изменения.' : 'Не удалось создать счёт.'
        )
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Переименование счета' : 'Добавить счёт'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Измените название, чтобы счёт было проще узнавать в списках.'
              : 'Укажите название, тип и валюту нового счёта.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Название"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              autoFocus
              placeholder="Например, «Основная карта»"
              {...form.register('name')}
            />
          </FormField>

          {isEditMode ? (
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Валюту и тип нельзя изменить после создания счёта.
            </p>
          ) : (
            <>
              <FormField
                label="Тип счёта"
                required
                error={'type' in form.formState.errors ? form.formState.errors.type?.message : null}
              >
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 w-full rounded-xl">
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Валюта"
                required
                error={
                  'currencyCode' in form.formState.errors
                    ? form.formState.errors.currencyCode?.message
                    : null
                }
              >
                <Controller
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 w-full rounded-xl">
                        <SelectValue placeholder="Выберите валюту" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {getCurrencyOptionLabel(currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {isEditMode ? <Check className="size-4" /> : <Plus className="size-4" />}
              {isEditMode ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
