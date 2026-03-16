import { create } from 'zustand';
import { queryClient } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import * as userApi from '@/api/user';
import type { CurrentUserDto, UpdateUserProfilePayload } from '../types';

interface UserState {
  currentUser: CurrentUserDto | null;
  isLoading: boolean;
}

interface UserActions {
  fetchCurrentUser(force?: boolean): Promise<boolean>;
  updateProfile(payload: UpdateUserProfilePayload): Promise<boolean>;
  clearUser(): void;
}

let pendingFetch: Promise<boolean> | null = null;

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  currentUser: null,
  isLoading: false,

  async fetchCurrentUser(force = false) {
    if (!force && get().currentUser) {
      return true;
    }

    if (pendingFetch) {
      return pendingFetch;
    }

    pendingFetch = (async () => {
      set({ isLoading: true });

      try {
        const user = force
          ? await queryClient.fetchQuery({
              queryKey: queryKeys.currentUser(),
              queryFn: userApi.getCurrentUser,
              staleTime: 0,
            })
          : await queryClient.ensureQueryData({
              queryKey: queryKeys.currentUser(),
              queryFn: userApi.getCurrentUser,
            });

        set({ currentUser: user });
        return true;
      } catch (err) {
        console.warn('[userStore] fetchCurrentUser failed:', err);
        queryClient.removeQueries({ queryKey: queryKeys.currentUser() });
        set({ currentUser: null });
        return false;
      } finally {
        set({ isLoading: false });
        pendingFetch = null;
      }
    })();

    return pendingFetch;
  },

  async updateProfile(payload) {
    try {
      const updated = await userApi.updateUserProfile(payload);
      queryClient.setQueryData(queryKeys.currentUser(), updated);
      set({ currentUser: updated });
      return true;
    } catch {
      return false;
    }
  },

  clearUser() {
    pendingFetch = null;
    queryClient.removeQueries({ queryKey: queryKeys.currentUser() });
    set({ currentUser: null, isLoading: false });
  },
}));
