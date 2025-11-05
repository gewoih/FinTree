import { render } from '@testing-library/vue';
import FinancialHealthSummaryCard from '../FinancialHealthSummaryCard.vue';

const metrics = [
  {
    key: 'savings',
    label: 'Сбережения',
    description: 'Доля дохода, которая остаётся после расходов.',
    value: '45%',
  },
];

describe('FinancialHealthSummaryCard', () => {
  it('shows loading state', () => {
    const { getByText } = render(FinancialHealthSummaryCard, {
      props: {
        loading: true,
        metrics,
        hasData: true,
        periodLabel: '3 месяца',
      },
    });

    expect(getByText('Считаем показатели...')).toBeInTheDocument();
  });

  it('renders metrics when data is available', () => {
    const { getByText } = render(FinancialHealthSummaryCard, {
      props: {
        loading: false,
        metrics,
        hasData: true,
        periodLabel: '3 месяца',
      },
    });

    expect(getByText('Сбережения')).toBeInTheDocument();
    expect(getByText('45%')).toBeInTheDocument();
  });

  it('renders empty state when there is no data', () => {
    const { getByText } = render(FinancialHealthSummaryCard, {
      props: {
        loading: false,
        metrics: [],
        hasData: false,
        periodLabel: '3 месяца',
      },
    });

    expect(getByText('Недостаточно данных')).toBeInTheDocument();
  });
});
