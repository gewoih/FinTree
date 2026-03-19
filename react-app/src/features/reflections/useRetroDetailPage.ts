import { useEffect, useMemo } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import * as analyticsApi from '@/api/analytics';
import { queryKeys } from '@/api/queryKeys';
import * as retrospectivesApi from '@/api/retrospectives';
import { useCurrentUser } from '@/features/auth/session';
import { PATHS } from '@/router/paths';
import type { RetrospectiveDto, UpsertRetrospectivePayload } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import { useHydrateFormValues } from '@/hooks/useHydrateFormValues';
import {
  upsertRetrospectiveSchema,
  type UpsertRetrospectiveFormValues,
} from '@/utils/schemas';
import {
  hasMeaningfulRetrospectivePayload,
  normalizeRetrospectivePayload,
  parseReflectionMonth,
} from '@/features/reflections/reflectionModels';

const EMPTY_RETROSPECTIVE_FORM: Omit<RetrospectiveDto, 'bannerDismissedAt'> = {
  month: '',
  conclusion: '',
  nextMonthPlan: '',
  wins: '',
  savingsOpportunities: '',
  disciplineRating: null,
  impulseControlRating: null,
  confidenceRating: null,
};

function buildFormDefaults(month: string, data: RetrospectiveDto | null): UpsertRetrospectiveFormValues {
  return {
    month,
    conclusion: data?.conclusion ?? EMPTY_RETROSPECTIVE_FORM.conclusion,
    nextMonthPlan: data?.nextMonthPlan ?? EMPTY_RETROSPECTIVE_FORM.nextMonthPlan,
    wins: data?.wins ?? EMPTY_RETROSPECTIVE_FORM.wins,
    savingsOpportunities: data?.savingsOpportunities ?? EMPTY_RETROSPECTIVE_FORM.savingsOpportunities,
    disciplineRating: data?.disciplineRating ?? EMPTY_RETROSPECTIVE_FORM.disciplineRating,
    impulseControlRating: data?.impulseControlRating ?? EMPTY_RETROSPECTIVE_FORM.impulseControlRating,
    confidenceRating: data?.confidenceRating ?? EMPTY_RETROSPECTIVE_FORM.confidenceRating,
  };
}

export function useRetroDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routeParams = useParams({ strict: false });
  const month = typeof routeParams.month === 'string' ? routeParams.month : '';
  const currentUser = useCurrentUser();
  const currencyCode = currentUser?.baseCurrencyCode ?? 'RUB';
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const parsedMonth = useMemo(() => parseReflectionMonth(month), [month]);

  const initialFormValues = useMemo(() => buildFormDefaults(month, null), [month]);

  const form = useForm<UpsertRetrospectiveFormValues>({
    resolver: zodResolver(upsertRetrospectiveSchema),
    defaultValues: initialFormValues,
  });

  const watchedValues = useWatch({ control: form.control, defaultValue: initialFormValues }) ?? initialFormValues;

  const detailQuery = useQuery({
    queryKey: queryKeys.retrospectives.detail(month),
    enabled: parsedMonth !== null,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        return await retrospectivesApi.getRetrospective(month);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.retrospectives.summary(month),
    enabled: parsedMonth !== null,
    staleTime: 30_000,
    queryFn: async () => {
      if (!parsedMonth) throw new Error('Некорректный месяц для загрузки итогов.');
      return analyticsApi.getAnalyticsDashboard(parsedMonth.year, parsedMonth.month);
    },
  });

  useHydrateFormValues({
    form,
    values: buildFormDefaults(month, detailQuery.data ?? null),
    identityKey: month,
  });

  useEffect(() => {
    const payload = normalizeRetrospectivePayload({ month, ...watchedValues });
    if (hasMeaningfulRetrospectivePayload(payload)) {
      form.clearErrors('root');
    }
  }, [form, month, watchedValues]);

  const saveMutation = useMutation({
    mutationFn: retrospectivesApi.upsertRetrospective,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.retrospectives.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.retrospectives.summary(month) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.retrospectives.availableMonths() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
      ]);
      toast.success('Рефлексия сохранена');
      await navigate({ to: PATHS.REFLECTIONS });
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сохранить рефлексию.'));
    },
  });

  const normalizedPayload = normalizeRetrospectivePayload({
    ...watchedValues,
    month,
  } satisfies UpsertRetrospectivePayload);
  const hasMeaningfulContent = hasMeaningfulRetrospectivePayload(normalizedPayload);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload = normalizeRetrospectivePayload({ ...values, month });

    if (!hasMeaningfulRetrospectivePayload(payload)) {
      form.setError('root', { message: 'Заполните хотя бы одну оценку или текстовый блок.' });
      return;
    }

    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // Error state is already surfaced via toast and root-level query state.
    }
  });

  const isInitialLoading =
    detailQuery.isLoading && detailQuery.data === undefined && !detailQuery.isError;

  return {
    navigate,
    month,
    parsedMonth,
    currencyCode,
    isReadOnlyMode,
    form,
    watchedValues,
    detailQuery,
    summaryQuery,
    saveMutation,
    handleSubmit,
    isInitialLoading,
    hasMeaningfulContent,
  };
}
