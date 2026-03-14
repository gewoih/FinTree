import type { SummaryMetric } from '@/components/analytics/models';
import type {
  Account,
  InvestmentsOverviewDto,
  InvestmentAccountOverviewDto,
  NetWorthSnapshotDto,
} from '@/types';
import { sortAccounts } from '@/features/accounts/accountUtils';
import { formatCurrency, formatNumber } from '@/utils/format';
import type {
  InvestmentAccountViewModel,
  InvestmentAllocationSlice,
  InvestmentNetWorthPoint,
} from './investmentModels';
import { INVESTMENT_ACCOUNT_TYPES } from './investmentModels';

const INVESTMENT_ACCOUNT_TYPE_SET = new Set<number>(INVESTMENT_ACCOUNT_TYPES);

function getOverviewMap(
  overview: InvestmentsOverviewDto | undefined
): Map<string, InvestmentAccountOverviewDto> {
  return new Map((overview?.accounts ?? []).map((item) => [item.id, item]));
}

export function isInvestmentAccount(account: Pick<Account, 'type'>): boolean {
  return INVESTMENT_ACCOUNT_TYPE_SET.has(account.type);
}

export function buildInvestmentAccounts(
  accounts: Account[],
  overview: InvestmentsOverviewDto | undefined
): InvestmentAccountViewModel[] {
  const overviewMap = getOverviewMap(overview);

  return sortAccounts(accounts.filter(isInvestmentAccount)).map((account) => {
    const overviewItem = overviewMap.get(account.id);

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currencyCode: account.currencyCode,
      currencyName: account.currency?.name ?? undefined,
      currencySymbol: account.currency?.symbol ?? undefined,
      isLiquid: overviewItem?.isLiquid ?? account.isLiquid,
      isArchived: account.isArchived,
      isMain: account.isMain,
      balance: Number(account.balance ?? 0),
      balanceInBaseCurrency: Number(
        overviewItem?.balanceInBaseCurrency ?? account.balanceInBaseCurrency ?? account.balance ?? 0
      ),
      lastAdjustedAt: overviewItem?.lastAdjustedAt ?? null,
      returnPercent: overviewItem?.returnPercent ?? null,
    };
  });
}

export function filterInvestmentAccounts(
  accounts: InvestmentAccountViewModel[],
  searchText: string
): InvestmentAccountViewModel[] {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return accounts;
  }

  return accounts.filter((account) => {
    const currencyName = account.currencyName?.toLowerCase() ?? '';

    return (
      account.name.toLowerCase().includes(query) ||
      account.currencyCode.toLowerCase().includes(query) ||
      currencyName.includes(query)
    );
  });
}

export function buildInvestmentSummaryMetrics(
  activeAccounts: InvestmentAccountViewModel[],
  overview: InvestmentsOverviewDto | undefined,
  baseCurrencyCode: string
): SummaryMetric[] {
  const totalValue =
    overview?.totalValueInBaseCurrency ??
    activeAccounts.reduce((sum, account) => sum + account.balanceInBaseCurrency, 0);
  const liquidValue =
    overview?.liquidValueInBaseCurrency ??
    activeAccounts
      .filter((account) => account.isLiquid)
      .reduce((sum, account) => sum + account.balanceInBaseCurrency, 0);
  const totalReturnPercent =
    activeAccounts.length > 0 ? overview?.totalReturnPercent ?? null : null;
  const returnAccent =
    totalReturnPercent == null
      ? 'neutral'
      : totalReturnPercent > 0
        ? 'good'
        : totalReturnPercent < 0
          ? 'poor'
          : 'neutral';

  return [
    {
      key: 'capital',
      label: 'Капитал',
      value: formatCurrency(totalValue, baseCurrencyCode),
      icon: 'Wallet',
      accent: 'neutral',
      tooltip: 'Общая стоимость активных инвестиционных счетов в базовой валюте.',
      secondary: 'Активная часть портфеля',
    },
    {
      key: 'liquid',
      label: 'Ликвидная часть',
      value: formatCurrency(liquidValue, baseCurrencyCode),
      icon: 'Banknote',
      accent: liquidValue > 0 ? 'good' : 'neutral',
      tooltip: 'Средства, которые можно вывести без существенных потерь.',
      secondary:
        activeAccounts.length > 0
          ? `${formatNumber(
              totalValue > 0 ? (liquidValue / totalValue) * 100 : 0,
              1
            )}% портфеля`
          : 'Нет активных счетов',
    },
    {
      key: 'return',
      label: 'Доходность',
      value:
        totalReturnPercent == null
          ? '—'
          : `${totalReturnPercent > 0 ? '+' : ''}${formatNumber(totalReturnPercent * 100, 1)}%`,
      icon: 'Activity',
      accent: returnAccent,
      tooltip: 'Совокупная доходность активной части портфеля за выбранный период.',
      secondary: overview
        ? `Период: ${new Intl.DateTimeFormat('ru-RU', {
            month: 'short',
            year: 'numeric',
          }).format(new Date(overview.periodFrom))} — ${new Intl.DateTimeFormat('ru-RU', {
            month: 'short',
            year: 'numeric',
          }).format(new Date(overview.periodTo))}`
        : 'Нет данных по периоду',
    },
  ];
}

export function buildInvestmentAllocationSlices(
  accounts: InvestmentAccountViewModel[]
): InvestmentAllocationSlice[] {
  const segments = accounts
    .map((account) => ({
      id: account.id,
      name: account.name,
      value: Math.max(0, Number(account.balanceInBaseCurrency ?? 0)),
    }))
    .filter((account) => account.value > 0)
    .sort((left, right) => right.value - left.value);

  const total = segments.reduce((sum, item) => sum + item.value, 0);

  return segments.map((segment) => ({
    ...segment,
    share: total > 0 ? (segment.value / total) * 100 : 0,
  }));
}

export function buildInvestmentNetWorthPoints(
  snapshots: NetWorthSnapshotDto[] | undefined
): InvestmentNetWorthPoint[] {
  return [...(snapshots ?? [])]
    .sort((left, right) => {
      if (left.year !== right.year) {
        return left.year - right.year;
      }

      return left.month - right.month;
    })
    .map((snapshot) => {
      const date = new Date(snapshot.year, snapshot.month - 1, 1);

      return {
        id: `${snapshot.year}-${snapshot.month}`,
        label: new Intl.DateTimeFormat('ru-RU', {
          month: 'short',
        }).format(date),
        tooltipLabel: new Intl.DateTimeFormat('ru-RU', {
          month: 'long',
          year: 'numeric',
        }).format(date),
        value: Number(snapshot.netWorth ?? 0),
      };
    });
}

export function formatInvestmentReturn(value: number | null): string {
  if (value == null) {
    return '—';
  }

  return `${value > 0 ? '+' : ''}${formatNumber(value * 100, 1)}%`;
}
