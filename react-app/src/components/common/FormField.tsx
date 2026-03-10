import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type AriaAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  labelSrOnly?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * FormField injects `id`, `aria-describedby` and `aria-invalid` into direct input children.
 * If a child already defines these props explicitly, FormField does not overwrite them.
 */
export function FormField({
  label,
  hint,
  error,
  required,
  labelSrOnly,
  id: externalId,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = externalId ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const hasError = Boolean(error);
  const hasHint = Boolean(hint) && !hasError;
  const describedBy = hasError ? errorId : hasHint ? hintId : undefined;

  const normalizedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    const childElement = child as ReactElement<AriaAttributes & { id?: string }>;

    return cloneElement(childElement, {
      id: childElement.props.id ?? fieldId,
      'aria-describedby': childElement.props['aria-describedby'] ?? describedBy,
      'aria-invalid': childElement.props['aria-invalid'] ?? (hasError ? 'true' : undefined),
      required: childElement.props.required ?? required,
    });
  });

  return (
    <div className={cn('group flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className={cn(
            'text-sm font-semibold transition-colors group-focus-within:text-foreground',
            hasError ? 'text-destructive' : 'text-muted-foreground',
            labelSrOnly && 'sr-only'
          )}
        >
          {label}
          {required && (
            <span className="ml-0.5 font-bold text-destructive" aria-label="обязательное поле">
              *
            </span>
          )}
        </label>
      )}

      <div className="w-full">{normalizedChildren}</div>

      {hasHint && (
        <p id={hintId} className="text-xs text-muted-foreground" role="note">
          {hint}
        </p>
      )}

      {hasError && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}
