type FieldAttrs = Record<string, unknown>;

const hasErrorValue = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return Boolean(value);
};

const isAriaInvalid = (value: unknown): boolean => value === true || value === 'true' || value === '';

export const resolveFieldInvalidState = ({
  invalid,
  error,
  attrs,
}: {
  invalid?: boolean;
  error?: string | null;
  attrs: FieldAttrs;
}): boolean => {
  if (invalid) {
    return true;
  }

  if (hasErrorValue(error)) {
    return true;
  }

  return isAriaInvalid(attrs['aria-invalid']);
};
