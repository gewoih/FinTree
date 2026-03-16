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
import type { InvestmentAccountViewModel, InvestmentsView } from './investmentModels';

const EMPTY_CURRENCIES: Currency[] = [];
const INVESTMENT_MODAL_TYPES = [2, 3, 4] as const;

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
  const [adjustmentsAccount, setAdjustmentsAccount] = useState<ManagedAccount | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<InvestmentAccountViewModel | null>(null);

  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(),
    queryFn: getCurrencies,
    staleTime: Infinity,
  });

  const activeAccountsQuery = useQuery({
    queryKey: queryKeys.accounts.active(),
    queryFn: () => accountsApi.getAccounts(false),
    staleTime: 30_000,
  });

  const archivedAccountsQuery = useQuery({
    queryKey: queryKeys.accounts.archived(),
    queryFn: () => accountsApi.getAccounts(true),
    staleTime: 30_000,
  });

  const overviewQuery = useQuery({
    queryKey: queryKeys.investments.overview(),
    queryFn: () => investmentsApi.getInvestmentsOverview(),
    staleTime: 30_000,
  });

  const netWorthQuery = useQuery({
    queryKey: queryKeys.analytics.netWorth(),
    queryFn: () => analyticsApi.getNetWorthTrend(12),
    staleTime: 30_000,
  });

  const currencies = currenciesQuery.data ?? EMPTY_CURRENCIES;

  const activeSourceAccounts = useMemo(
    () => (activeAccountsQuery.data ?? []).map((account) => normalizeAccount(account, currencies)),
    [activeAccountsQuery.data, currencies]
  );
  const archivedSourceAccounts = useMemo(
    () => (archivedAccountsQuery.data ?? []).map((account) => normalizeAccount(account, currencies)),
    [archivedAccountsQuery.data, currencies]
  );

  const activeAccounts = useMemo(
    () => buildInvestmentAccounts(activeSourceAccounts, overviewQuery.data),
    [activeSourceAccounts, overviewQuery.data]
  );
  const archivedAccounts = useMemo(
    () => buildInvestmentAccounts(archivedSourceAccounts, overviewQuery.data),
    [archivedSourceAccounts, overviewQuery.data]
  );

  const currentAccounts = view === 'active' ? activeAccounts : archivedAccounts;
  const filteredAccounts = useMemo(
    () => filterInvestmentAccounts(currentAccounts, deferredSearch),
    [currentAccounts, deferredSearch]
  );
  const hasAnyInvestmentAccounts = activeAccounts.length + archivedAccounts.length > 0;
  const hasSearch = searchInput.trim().length > 0;

  const accountsError =
    currenciesQuery.error ?? (view === 'active' ? activeAccountsQuery.error : archivedAccountsQuery.error);
  const accountsErrorMessage = accountsError ? getAccountErrorMessage(accountsError) : null;
  const accountsLoading =
    (currenciesQuery.isLoading || (view === 'active' ? activeAccountsQuery.isLoading : archivedAccountsQuery.isLoading)) &&
    currentAccounts.length === 0;
  const showBlockingAccountsError =
    Boolean(accountsErrorMessage) && currentAccounts.length === 0 && !accountsLoading;
  const showInlineAccountsError =
    Boolean(accountsErrorMessage) && currentAccounts.length > 0;

  const summaryMetrics = useMemo(
    () => buildInvestmentSummaryMetrics(activeAccounts, overviewQuery.data, baseCurrencyCode),
    [activeAccounts, overviewQuery.data, baseCurrencyCode]
  );
  const allocationSlices = useMemo(
    () => buildInvestmentAllocationSlices(activeAccounts),
    [activeAccounts]
  );
  const netWorthPoints = useMemo(
    () => buildInvestmentNetWorthPoints(netWorthQuery.data),
    [netWorthQuery.data]
  );

  const overviewError = overviewQuery.error
    ? resolveApiErrorMessage(overviewQuery.error, 'Не удалось загрузить сводку по инвестициям.')
    : null;
  const netWorthError = netWorthQuery.error
    ? resolveApiErrorMessage(netWorthQuery.error, 'Не удалось загрузить динамику капитала.')
    : null;

  async function refreshAllData() {
    await Promise.all([
      activeAccountsQuery.refetch(),
      archivedAccountsQuery.refetch(),
      overviewQuery.refetch(),
      netWorthQuery.refetch(),
    ]);
  }

  async function refreshActiveData() {
    await Promise.all([
      activeAccountsQuery.refetch(),
      overviewQuery.refetch(),
      netWorthQuery.refetch(),
    ]);
  }

  const archiveMutation = useMutation({
    mutationFn: accountsApi.archiveAccount,
    onSuccess: async () => {
      const archivedName = archiveTarget?.name;
      setArchiveTarget(null);
      await refreshAllData();
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
      await refreshAllData();
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
      await Promise.all([
        activeAccountsQuery.refetch(),
        overviewQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
      ]);
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
      [...activeSourceAccounts, ...archivedSourceAccounts].find((account) => account.id === accountId) ?? null
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

    const sourceAccount = findSourceAccount(account.id);
    if (!sourceAccount) {
      toast.error('Не удалось загрузить счёт для корректировки.');
      return;
    }

    setAdjustmentsAccount(sourceAccount);
  }

  function handleArchiveRequest(account: InvestmentAccountViewModel) {
    if (isReadOnlyMode || view === 'archived') {
      return;
    }

    setArchiveTarget(account);
  }

  async function handleFormSuccess() {
    setEditingAccount(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.investments.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.netWorth() }),
      activeAccountsQuery.refetch(),
      archivedAccountsQuery.refetch(),
    ]);
  }

  async function handleAdjustmentSuccess() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.investments.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.netWorth() }),
      activeAccountsQuery.refetch(),
    ]);
  }

  return {
    activeAccounts,
    activeCount: activeAccounts.length,
    adjustmentsAccount,
    allocationSlices,
    allowedAccountTypes: INVESTMENT_MODAL_TYPES,
    archiveTarget,
    archivedCount: archivedAccounts.length,
    archivedAccounts,
    accountsErrorMessage,
    accountsLoading,
    baseCurrencyCode,
    canCreateAccount: !isReadOnlyMode && currencies.length > 0,
    closeAdjustments: () => setAdjustmentsAccount(null),
    closeArchiveDialog: () => setArchiveTarget(null),
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
    handleEditAccount,
    handleFormSuccess,
    handleLiquidityChange: (account: InvestmentAccountViewModel, isLiquid: boolean) =>
      liquidityMutation.mutate({ accountId: account.id, isLiquid }),
    handleOpenAdjustments,
    handleOpenCreateAccount,
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
    openForm: () => setIsFormOpen(true),
    overviewError,
    overviewLoading: overviewQuery.isLoading && !overviewQuery.data,
    retryCurrentAccountsView: () => {
      void Promise.all([
        currenciesQuery.refetch(),
        view === 'active' ? refreshActiveData() : archivedAccountsQuery.refetch(),
      ]);
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
