import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonthPicker } from './MonthPicker';

describe('MonthPicker', () => {
  it('keeps critical controls keyboard-accessible and touch-sized', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <MonthPicker
        value={new Date(2025, 0, 1)}
        maxDate={new Date(2025, 11, 1)}
        onChange={handleChange}
      />,
    );

    const previousYearButton = screen.getByRole('button', {
      name: 'Предыдущий год',
    });
    const januaryButton = screen.getByRole('button', {
      name: 'Выбрать январь 2025',
    });

    expect(previousYearButton).toHaveAccessibleName('Предыдущий год');
    expect(previousYearButton).toHaveClass('size-11');
    expect(januaryButton).toHaveClass('min-h-[44px]');

    await user.click(januaryButton);

    expect(handleChange).toHaveBeenCalledWith(new Date(2025, 0, 1));
  });
});
