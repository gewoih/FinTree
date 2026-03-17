import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as accountsApi from '@/api/accounts';
import * as analyticsApi from '@/api/analytics';
import * as investmentsApi from '@/api/investments';
import { queryKeys } from '@/api/queryKeys';
import { getCurrencies } from '@/api/user';
import type { ManagedAccount } from '@/features/accounts/accountModels';
import { useCurrentUser } from '@/features/auth/session';
import { normalizeAccount } from '@/features/accounts/accountUtils';
import { resolveApiErrorMessage } from '@/utils/errors';
import type { Currency } from '@/types';
import {
  buildInvestmentAccounts,
  buildInvestmentAllocationSlices,
  buildInvestmentNetWorthPoints,
  buildInvestmentSummaryMetrics,
  filterInvestmentAccounts,
} from './investmentUtils';
import type {
  InvestmentAccountViewModel,
  InvestmentsView,
} from './investmentModels';
import { INVESTMENT_ACCOUNT_TYPES } from './investmentModels';

const EMPTY_CURRENCIES: Currency[] = [];

type CashFlowModalState =
  | { type: 'closed' }
  | { type: 'deposit' | 'withdrawal'; account: InvestmentAccountViewModel };

function getAccountErrorMessage(error: unknown): string {
  return resolveApiErrorMessage(error, 'Не удалось загрузить инвестиционные счета.');
}

export function useInvestmentsPage() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const baseCurrencyCode = currentUser?.baseCurrencyCode ?? 'RUB';
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;

  const [view, setViewState] = useState<InvestmentsView>('active');
  const [searchInput, setSearchInputState] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [adjustmentsAccount, setAdjustmentsAccount] =
    useState<InvestmentAccountViewModel | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<InvestmentAccountViewModel | null>(null);
  const [cashFlowModal, setCashFlowModal] = useState<CashFlowModalState>({
    type: 'closed',
  });

  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(),
    queryFn: getCurrencies,
    staleTime: Infinity,
  });

  const activeAccountsQuery = useQuery({
    queryKey: queryKeys.investments.accounts(false),
    queryFn: () => accountsApi.getAccounts(false, INVESTMENT_ACCOUNT_TYPES),
    staleTime: 30_000,
  });

  const archivedAccountsQuery = useQuery({
    queryKey: queryKeys.investments.accounts(true),
    queryFn: () => accountsApi.getAccounts(true, INVESTMENT_ACCOUNT_TYPES),
    staleTime: 30_000,
  });

  const activeOverviewQuery = useQuery({
    queryKey: queryKeys.investments.overview(false),
    queryFn: () => investmentsApi.getInvestmentsOverview(undefined, undefined, false),
    staleTime: 30_000,
  });

  const archivedOverviewQuery = useQuery({
    queryKey: queryKeys.investments.overview(true),
    queryFn: () => investmentsApi.getInvestmentsOverview(undefined, undefined, true),
    staleTime: 30_000,
  });

  const netWorthQuery = useQuery({
    queryKey: queryKeys.analytics.netWorth(),
    queryFn: () => analyticsApi.getNetWorthTrend(12),
    staleTime: 30_000,
  });

  const currencies = currenciesQuery.data ?? EMPTY_CURRENCIES;

  const activeSourceAccounts = useMemo(
    () =>
      (activeAccountsQuery.data ?? []).map((account) =>
        normalizeAccount(account, currencies)
      ),
    [activeAccountsQuery.data, currencies]
  );
  const archivedSourceAccounts = useMemo(
    () =>
      (archivedAccountsQuery.data ?? []).map((account) =>
        normalizeAccount(account, currencies)
      ),
    [archivedAccountsQuery.data, currencies]
  );

  const activeAccounts = useMemo(
    () =>
      activeOverviewQuery.data
        ? buildInvestmentAccounts(activeSourceAccounts, activeOverviewQuery.data)
        : [],
    [activeOverviewQuery.data, activeSourceAccounts]
  );
  const archivedAccounts = useMemo(
    () =>
      archivedOverviewQuery.data
        ? buildInvestmentAccounts(archivedSourceAccounts, archivedOverviewQuery.data)
        : [],
    [archivedOverviewQuery.data, archivedSourceAccounts]
  );

  const currentAccountsQuery = view === 'active' ? activeAccountsQuery : archivedAccountsQuery;
  const currentOverviewQuery = view === 'active' ? activeOverviewQuery : archivedOverviewQuery;
  const currentAccounts = view === 'active' ? activeAccounts : archivedAccounts;
  const filteredAccounts = useMemo(
    () => filterInvestmentAccounts(currentAccounts, deferredSearch),
    [currentAccounts, deferredSearch]
  );
  const hasAnyInvestmentAccounts =
    activeSourceAccounts.length + archivedSourceAccounts.length > 0;
  const hasSearch = searchInput.trim().length > 0;

  const accountsError =
    currenciesQuery.error ?? currentAccountsQuery.error ?? currentOverviewQuery.error;
  const accountsErrorMessage = accountsError ? getAccountErrorMessage(accountsError) : null;
  const accountsLoading =
    (currenciesQuery.isLoading ||
      currentAccountsQuery.isLoading ||
      currentOverviewQuery.isLoading) &&
    currentAccounts.length === 0;
  const showBlockingAccountsError =
    Boolean(accountsErrorMessage) && currentAccounts.length === 0 && !accountsLoading;
  const showInlineAccountsError =
    Boolean(accountsErrorMessage) && currentAccounts.length > 0;

  const summaryMetrics = useMemo(
    () =>
      buildInvestmentSummaryMetrics(
        activeAccounts,
        activeOverviewQuery.data,
        baseCurrencyCode
      ),
    [activeAccounts, activeOverviewQuery.data, baseCurrencyCode]
  );
  const allocationSlices = useMemo(
    () => buildInvestmentAllocationSlices(activeAccounts),
    [activeAccounts]
  );
  const netWorthPoints = useMemo(
    () => buildInvestmentNetWorthPoints(netWorthQuery.data),
    [netWorthQuery.data]
  );

  const overviewError = activeOverviewQuery.error
    ? resolveApiErrorMessage(
        activeOverviewQuery.error,
        'Не удалось загрузить сводку по инвестициям.'
      )
    : null;
  const netWorthError = netWorthQuery.error
    ? resolveApiErrorMessage(netWorthQuery.error, 'Не удалось загрузить динамику капитала.')
    : null;

  async function invalidateInvestmentData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.investments.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() }),
    ]);
  }

  async function invalidateAfterCashFlow() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() }),
      invalidateInvestmentData(),
    ]);
  }

  async function retryData() {
    const requests: Array<Promise<unknown>> = [
      currenciesQuery.refetch(),
      activeAccountsQuery.refetch(),
      activeOverviewQuery.refetch(),
      netWorthQuery.refetch(),
    ];

    if (view === 'archived') {
      requests.push(archivedAccountsQuery.refetch(), archivedOverviewQuery.refetch());
    }

    await Promise.all(requests);
  }

  const archiveMutation = useMutation({
    mutationFn: accountsApi.archiveAccount,
    onSuccess: async () => {
      const archivedName = archiveTarget?.name;
      setArchiveTarget(null);
      await invalidateInvestmentData();
      toast.success(
        archivedName
          ? `Счёт «${archivedName}» перемещён в архив`
          : 'Счёт перемещён в архив'
      );
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось архивировать счёт.'));
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: accountsApi.unarchiveAccount,
    onSuccess: async () => {
      await invalidateInvestmentData();
      toast.success('Счёт возвращён из архива');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось разархивировать счёт.'));
    },
  });

  const liquidityMutation = useMutation({
    mutationFn: ({
      accountId,
      isLiquid,
    }: {
      accountId: string;
      isLiquid: boolean;
    }) => accountsApi.updateAccountLiquidity(accountId, isLiquid),
    onSuccess: async (_, variables) => {
      await invalidateInvestmentData();
      toast.success(
        variables.isLiquid ? 'Счёт помечен как ликвидный' : 'Счёт помечен как неликвидный'
      );
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось обновить ликвидность счёта.'));
    },
  });

  function setView(nextView: InvestmentsView) {
    setViewState(nextView);
    setSearchInputState('');
  }

  function setSearchInput(value: string) {
    setSearchInputState(value);
  }

  function handleOpenCreateAccount() {
    if (isReadOnlyMode) {
      return;
    }

    if ((currenciesQuery.data ?? []).length === 0) {
      toast.error('Список валют ещё не загружен. Попробуйте чуть позже.');
      return;
    }

    setEditingAccount(null);
    setIsFormOpen(true);
  }

  function findSourceAccount(accountId: string): ManagedAccount | null {
    return (
      [...activeSourceAccounts, ...archivedSourceAccounts].find(
        (account) => account.id === accountId
      ) ?? null
    );
  }

  function handleEditAccount(account: InvestmentAccountViewModel) {
    if (isReadOnlyMode) {
      return;
    }

    const sourceAccount = findSourceAccount(account.id);
    if (!sourceAccount) {
      toast.error('Не удалось загрузить счёт для редактирования.');
      return;
    }

    setEditingAccount(sourceAccount);
    setIsFormOpen(true);
  }

  function handleOpenAdjustments(account: InvestmentAccountViewModel) {
    if (isReadOnlyMode || view === 'archived') {
      return;
    }

    setAdjustmentsAccount(account);
  }

  function handleOpenCashFlow(
    account: InvestmentAccountViewModel,
    type: 'deposit' | 'withdrawal'
  ) {
    if (isReadOnlyMode || view === 'archived') {
      return;
    }

    setCashFlowModal({ type, account });
  }

  function handleArchiveRequest(account: InvestmentAccountViewModel) {
    if (isReadOnlyMode || view === 'archived') {
      return;
    }

    setArchiveTarget(account);
  }

  async function handleFormSuccess() {
    setEditingAccount(null);
    await invalidateInvestmentData();
  }

  async function handleAdjustmentSuccess() {
    await invalidateInvestmentData();
  }

  async function handleCashFlowSuccess() {
    await invalidateAfterCashFlow();
  }

  return {
    activeCount: activeSourceAccounts.length,
    adjustmentsAccount,
    allocationSlices,
    allowedAccountTypes: INVESTMENT_ACCOUNT_TYPES,
    archiveTarget,
    archivedCount: archivedSourceAccounts.length,
    accountsErrorMessage,
    accountsLoading,
    baseCurrencyCode,
    canCreateAccount: !isReadOnlyMode && currencies.length > 0,
    cashFlowModal,
    closeAdjustments: () => setAdjustmentsAccount(null),
    closeArchiveDialog: () => setArchiveTarget(null),
    closeCashFlowModal: () => setCashFlowModal({ type: 'closed' }),
    closeForm: () => {
      setEditingAccount(null);
      setIsFormOpen(false);
    },
    currencies,
    editingAccount,
    filteredAccounts,
    handleAdjustmentSuccess,
    handleArchiveConfirm: () => {
      if (archiveTarget) {
        archiveMutation.mutate(archiveTarget.id);
      }
    },
    handleArchiveRequest,
    handleCashFlowSuccess,
    handleEditAccount,
    handleFormSuccess,
    handleLiquidityChange: (account: InvestmentAccountViewModel, isLiquid: boolean) =>
      liquidityMutation.mutate({ accountId: account.id, isLiquid }),
    handleOpenAdjustments,
    handleOpenCreateAccount,
    handleOpenDeposit: (account: InvestmentAccountViewModel) =>
      handleOpenCashFlow(account, 'deposit'),
    handleOpenWithdraw: (account: InvestmentAccountViewModel) =>
      handleOpenCashFlow(account, 'withdrawal'),
    handleUnarchive: (account: InvestmentAccountViewModel) =>
      unarchiveMutation.mutate(account.id),
    hasAnyInvestmentAccounts,
    hasSearch,
    isArchiveLoading: (accountId: string) =>
      (archiveMutation.isPending && archiveMutation.variables === accountId) ||
      (unarchiveMutation.isPending && unarchiveMutation.variables === accountId),
    isFormOpen,
    isLiquidityLoading: (accountId: string) =>
      liquidityMutation.isPending && liquidityMutation.variables?.accountId === accountId,
    isReadOnlyMode,
    netWorthError,
    netWorthLoading: netWorthQuery.isLoading && netWorthPoints.length === 0,
    netWorthPoints,
    overviewError,
    overviewLoading: activeOverviewQuery.isLoading && !activeOverviewQuery.data,
    retryCurrentAccountsView: () => {
      void retryData();
    },
    searchInput,
    setSearchInput,
    setView,
    showBlockingAccountsError,
    showInlineAccountsError,
    summaryMetrics,
    view,
  };
}
