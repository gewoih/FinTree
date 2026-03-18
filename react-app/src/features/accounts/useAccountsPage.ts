import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import * as accountsApi from '@/api/accounts';
import { queryKeys } from '@/api/queryKeys';
import { getCurrencies } from '@/api/user';
import type { DataState } from '@/components/common/DataStateWrapper';
import { useCurrentUser } from '@/features/auth/session';
import { resolveApiErrorMessage } from '@/utils/errors';
import type { ManagedAccount, AccountsView } from '@/features/accounts/accountModels';
import {
  filterAccounts,
  normalizeAccount,
  sortAccounts,
} from '@/features/accounts/accountUtils';

export function useAccountsPage() {
  const currentUser = useCurrentUser();
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;
  const [view, setView] = useState<AccountsView>('active');
  const [searchInput, setSearchInput] = useState('');
  const [editingAccount, setEditingAccount] = useState<ManagedAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ManagedAccount | null>(null);

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts.active(),
    queryFn: () => accountsApi.getAccounts(false),
    staleTime: 30_000,
  });

  const archivedAccountsQuery = useQuery({
    queryKey: queryKeys.accounts.archived(),
    queryFn: () => accountsApi.getAccounts(true),
    staleTime: 30_000,
  });

  const currenciesQuery = useQuery({
    queryKey: queryKeys.currencies(),
    queryFn: getCurrencies,
    staleTime: Infinity,
  });

  const activeBankAccounts = sortAccounts(
    (accountsQuery.data ?? []).map((account) =>
      normalizeAccount(account, currenciesQuery.data)
    )
  );
  const archivedBankAccounts = sortAccounts(
    (archivedAccountsQuery.data ?? []).map((account) =>
      normalizeAccount(account, currenciesQuery.data)
    )
  );
  const currentSourceAccounts = view === 'active' ? activeBankAccounts : archivedBankAccounts;
  const currentAccounts = filterAccounts(currentSourceAccounts, searchInput);

  const currentError =
    currenciesQuery.error ??
    (view === 'active' ? accountsQuery.error : archivedAccountsQuery.error);
  const isCurrentViewLoading =
    view === 'active' ? accountsQuery.isLoading : archivedAccountsQuery.isLoading;
  const isLoading =
    currenciesQuery.isLoading ||
    (isCurrentViewLoading && currentSourceAccounts.length === 0);
  const hasSearch = searchInput.trim().length > 0;
  const hasVisibleAccounts = currentSourceAccounts.length > 0;
  const showInlineError = Boolean(currentError) && hasVisibleAccounts;
  const showBlockingError = Boolean(currentError) && !hasVisibleAccounts && !isLoading;
  const compactGridMaxWidth =
    currentAccounts.length < 3
      ? `${currentAccounts.length * 360 + Math.max(currentAccounts.length - 1, 0) * 16}px`
      : undefined;

  const activeCount = activeBankAccounts.length;
  const archivedCount = archivedBankAccounts.length;

  const setPrimaryMutation = useMutation({
    mutationFn: accountsApi.setPrimaryAccount,
    onSuccess: async () => {
      await Promise.all([
        accountsQuery.refetch(),
        archivedAccountsQuery.refetch(),
      ]);
      toast.success('Основной счёт обновлён');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось сделать счёт основным.'));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: accountsApi.archiveAccount,
    onSuccess: async () => {
      setArchiveTarget(null);
      await Promise.all([accountsQuery.refetch(), archivedAccountsQuery.refetch()]);
      toast.success('Счёт архивирован');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось архивировать счёт.'));
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: accountsApi.unarchiveAccount,
    onSuccess: async () => {
      await Promise.all([accountsQuery.refetch(), archivedAccountsQuery.refetch()]);
      toast.success('Счёт возвращён из архива');
    },
    onError: (error) => {
      toast.error(resolveApiErrorMessage(error, 'Не удалось разархивировать счёт.'));
    },
  });

  const handleRetry = () => {
    void currenciesQuery.refetch();
    void accountsQuery.refetch();
    void archivedAccountsQuery.refetch();
  };

  const contentState: DataState = isLoading
    ? 'loading'
    : showBlockingError
      ? 'error'
      : currentAccounts.length === 0
        ? 'empty'
        : 'success';

  return {
    activeCount,
    archiveMutation,
    archiveTarget,
    archivedCount,
    compactGridMaxWidth,
    contentState,
    currentAccounts,
    currentError,
    currencies: currenciesQuery.data ?? [],
    editingAccount,
    handleRetry,
    hasSearch,
    isFormOpen,
    isLoading,
    isReadOnlyMode,
    searchInput,
    setArchiveTarget,
    setEditingAccount,
    setIsFormOpen,
    setSearchInput,
    setView,
    setPrimaryMutation,
    showBlockingError,
    showInlineError,
    unarchiveMutation,
    view,
  };
}
