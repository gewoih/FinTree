import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GlobalMonthScoreCard } from './GlobalMonthScoreCard';

const baseModel = {
  score: null,
  scoreLabel: '—',
  description: 'Недостаточно данных для полного рейтинга месяца.',
  accent: 'neutral' as const,
  deltaLabel: null,
  deltaTone: null,
};

describe('GlobalMonthScoreCard', () => {
  it('keeps child financial metrics visible when the aggregate score is unavailable', () => {
    render(
      <GlobalMonthScoreCard
        loading={false}
        error={null}
        model={baseModel}
        onRetry={vi.fn()}
      >
        <div>Сбережения</div>
      </GlobalMonthScoreCard>,
    );

    expect(screen.getByText('Общий рейтинг месяца')).toBeInTheDocument();
    expect(screen.getByText('Сбережения')).toBeInTheDocument();
    expect(
      screen.queryByText('Добавьте несколько транзакций, чтобы увидеть метрики'),
    ).not.toBeInTheDocument();
  });

  it('shows the empty state only when both the aggregate score and child metrics are absent', () => {
    render(
      <GlobalMonthScoreCard
        loading={false}
        error={null}
        model={baseModel}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Добавьте несколько транзакций, чтобы увидеть метрики'),
    ).toBeInTheDocument();
  });
});
