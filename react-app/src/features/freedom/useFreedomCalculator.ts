import { useEffect, useMemo, useRef, useState } from 'react';
import * as freedomApi from '@/api/freedom';
import { queryKeys } from '@/api/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { resolveApiErrorMessage } from '@/utils/errors';
import { getFreedomRequestKey, normalizeFreedomRequest } from './freedomUtils';
import type { FreedomFormState } from './freedomModels';

const DEFAULT_FORM_STATE: FreedomFormState = {
  capital: 0,
  monthlyExpenses: 0,
  swrPercent: 4,
  inflationRatePercent: 5,
  inflationEnabled: true,
};

export function useFreedomCalculator() {
  const [params, setParams] = useState<FreedomFormState>(DEFAULT_FORM_STATE);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof freedomApi.calculateFreedom>
  > | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const requestIdRef = useRef(0);
  const lastCompletedRequestKeyRef = useRef<string | null>(null);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const seededDefaultsRef = useRef(false);

  const defaultsQuery = useQuery({
    queryKey: queryKeys.freedom.defaults(),
    queryFn: freedomApi.getFreedomCalculatorDefaults,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!defaultsQuery.data || seededDefaultsRef.current) {
      return;
    }

    setParams((current) => ({
      ...current,
      capital: defaultsQuery.data?.capital ?? current.capital,
      monthlyExpenses: defaultsQuery.data?.monthlyExpenses ?? current.monthlyExpenses,
    }));
    seededDefaultsRef.current = true;
  }, [defaultsQuery.data]);

  const normalizedParams = useMemo(() => normalizeFreedomRequest(params), [params]);
  const requestKey = useMemo(() => getFreedomRequestKey(normalizedParams), [normalizedParams]);
  const canCalculate = defaultsQuery.isSuccess || defaultsQuery.isError;

  useEffect(() => {
    if (!canCalculate) {
      return;
    }

    if (
      requestKey === lastCompletedRequestKeyRef.current ||
      requestKey === inFlightRequestKeyRef.current
    ) {
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    const timeoutId = window.setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      inFlightRequestKeyRef.current = requestKey;

      try {
        const data = await freedomApi.calculateFreedom(normalizedParams);

        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setResult(data);
        lastCompletedRequestKeyRef.current = requestKey;
      } catch (error) {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setCalculationError(
          resolveApiErrorMessage(error, 'Не удалось выполнить расчёт.')
        );
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsCalculating(false);
          if (inFlightRequestKeyRef.current === requestKey) {
            inFlightRequestKeyRef.current = null;
          }
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canCalculate, normalizedParams, requestKey]);

  return {
    calculationError,
    defaults: defaultsQuery.data ?? null,
    defaultsError: defaultsQuery.error
      ? resolveApiErrorMessage(
          defaultsQuery.error,
          'Не удалось загрузить данные. Введите значения вручную.'
        )
      : null,
    defaultsLoading: defaultsQuery.isLoading,
    isCalculating,
    params,
    result,
    setParams,
  };
}
