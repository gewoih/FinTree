import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';

import * as userApi from '@/api/user';
import { queryKeys } from '@/api/queryKeys';
import { setCurrentUserSnapshot, useCurrentUserQuery } from '@/features/auth/session';
import { useHydrateFormValues } from '@/hooks/useHydrateFormValues';
import type { SubscriptionPlan } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';

const profileSchema = z.object({
  baseCurrencyCode: z.string().trim().min(1, 'Выберите базовую валюту'),
  telegramUserId: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), 'Введите только цифры'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

function getPlanHint(plan: SubscriptionPlan): string {
  return plan === 'Year'
    ? 'Подходит, если хотите зафиксировать цену и не продлевать вручную.'
    : 'Базовый вариант для быстрого доступа ко всем разделам.';
}

export function useProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUserQuery();
  const currentUser = currentUserQuery.data ?? null;
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const hydratedFormValues = useMemo(
    () => ({
      baseCurrencyCode: currentUser?.baseCurrencyCode ?? '',
      telegramUserId:
        currentUser?.telegramUserId != null ? String(currentUser.telegramUserId) : '',
    }),
    [currentUser?.baseCurrencyCode, currentUser?.telegramUserId],
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: hydratedFormValues,
  });

  const telegramUserIdValue = useWatch({ control: form.control, name: 'telegramUserId' });

  useHydrateFormValues({ form, values: hydratedFormValues, identityKey: currentUser?.id });

  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(),
    queryFn: userApi.getCurrencies,
    staleTime: Infinity,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.subscription.payments(),
    queryFn: userApi.getSubscriptionPayments,
    staleTime: 60_000,
    enabled: currentUser !== null,
  });

  const saveProfileMutation = useMutation({
    mutationFn: userApi.updateUserProfile,
    onSuccess: (updatedUser) => {
      setCurrentUserSnapshot(updatedUser);
      setSubscriptionError(null);
      form.reset({
        baseCurrencyCode: updatedUser.baseCurrencyCode,
        telegramUserId:
          updatedUser.telegramUserId != null ? String(updatedUser.telegramUserId) : '',
      });
      toast.success('Настройки сохранены');
    },
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: userApi.simulateSubscriptionPayment,
    onSuccess: async (updatedUser) => {
      setCurrentUserSnapshot(updatedUser);
      setSubscriptionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscription.payments() });
      toast.success('Подписка активирована');
    },
  });

  const handleProfileSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      await saveProfileMutation.mutateAsync({
        baseCurrencyCode: values.baseCurrencyCode,
        telegramUserId: values.telegramUserId.trim() ? Number(values.telegramUserId.trim()) : null,
      });
    } catch (error) {
      form.setError('root', {
        message: resolveApiErrorMessage(error, 'Не удалось сохранить настройки.'),
      });
    }
  });

  const handlePay = async (plan: SubscriptionPlan) => {
    setSubscriptionError(null);
    try {
      await simulatePaymentMutation.mutateAsync(plan);
    } catch (error) {
      setSubscriptionError(resolveApiErrorMessage(error, 'Не удалось активировать подписку.'));
    }
  };

  const isReadOnlyMode = currentUser?.subscription.isReadOnlyMode ?? false;
  const isSubscriptionActive = currentUser?.subscription.isActive ?? false;
  const initials = currentUser
    ? (currentUser.name || currentUser.email || 'FT').trim().slice(0, 2).toUpperCase()
    : 'FT';

  const paymentPlans: Array<{ plan: SubscriptionPlan; title: string; price: number; hint: string }> =
    currentUser
      ? [
          {
            plan: 'Month' as SubscriptionPlan,
            title: '1 месяц',
            price: currentUser.subscription.monthPriceRub,
            hint: getPlanHint('Month'),
          },
          {
            plan: 'Year' as SubscriptionPlan,
            title: '12 месяцев',
            price: currentUser.subscription.yearPriceRub,
            hint: getPlanHint('Year'),
          },
        ]
      : [];

  return {
    navigate,
    currentUserQuery,
    currentUser,
    form,
    telegramUserIdValue,
    currenciesQuery,
    paymentsQuery,
    saveProfileMutation,
    simulatePaymentMutation,
    handleProfileSubmit,
    handlePay,
    subscriptionError,
    isReadOnlyMode,
    isSubscriptionActive,
    initials,
    paymentPlans,
  };
}
