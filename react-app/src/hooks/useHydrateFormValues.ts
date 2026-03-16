import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

interface UseHydrateFormValuesOptions<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  values: TFieldValues;
  identityKey?: string;
}

export function useHydrateFormValues<TFieldValues extends FieldValues>({
  form,
  values,
  identityKey,
}: UseHydrateFormValuesOptions<TFieldValues>) {
  const previousIdentityKeyRef = useRef(identityKey);

  useEffect(() => {
    const didIdentityChange =
      identityKey !== undefined && previousIdentityKeyRef.current !== identityKey;

    previousIdentityKeyRef.current = identityKey;

    form.reset(values, didIdentityChange ? undefined : { keepDirtyValues: true });
  }, [form, identityKey, values]);
}
