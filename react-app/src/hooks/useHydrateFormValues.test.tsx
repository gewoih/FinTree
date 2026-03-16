import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { useHydrateFormValues } from './useHydrateFormValues';

interface FormValues {
  title: string;
  notes: string;
}

function FormHarness({
  values,
  identityKey,
}: {
  values: FormValues;
  identityKey?: string;
}) {
  const form = useForm<FormValues>({
    defaultValues: values,
  });

  useHydrateFormValues({
    form,
    values,
    identityKey,
  });

  return (
    <form>
      <input aria-label="title" {...form.register('title')} />
      <input aria-label="notes" {...form.register('notes')} />
    </form>
  );
}

describe('useHydrateFormValues', () => {
  it('keeps dirty values during background revalidation', async () => {
    const user = userEvent.setup();
    const view = render(
      <FormHarness
        identityKey="2024-12"
        values={{ title: 'Исходное значение', notes: 'Первый комментарий' }}
      />,
    );

    const titleInput = screen.getByLabelText('title');
    const notesInput = screen.getByLabelText('notes');

    await user.clear(titleInput);
    await user.type(titleInput, 'Локальное изменение');

    view.rerender(
      <FormHarness
        identityKey="2024-12"
        values={{ title: 'С сервера', notes: 'Обновлённый комментарий' }}
      />,
    );

    expect(titleInput).toHaveValue('Локальное изменение');
    expect(notesInput).toHaveValue('Обновлённый комментарий');
  });

  it('fully resets the form when the identity key changes', async () => {
    const user = userEvent.setup();
    const view = render(
      <FormHarness
        identityKey="2024-12"
        values={{ title: 'Декабрь', notes: 'Итоги декабря' }}
      />,
    );

    const titleInput = screen.getByLabelText('title');

    await user.clear(titleInput);
    await user.type(titleInput, 'Черновик');

    view.rerender(
      <FormHarness
        identityKey="2025-01"
        values={{ title: 'Январь', notes: 'Итоги января' }}
      />,
    );

    expect(titleInput).toHaveValue('Январь');
    expect(screen.getByLabelText('notes')).toHaveValue('Итоги января');
  });
});
