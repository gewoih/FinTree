import { create } from 'zustand';
import { apiClient } from '../api/apiClient';
import type { CurrentUserDto, UpdateUserProfilePayload } from '../types';

interface UserState {
  currentUser: CurrentUserDto | null;
  isLoading: boolean;
}

interface UserActions {
  fetchCurrentUser(): Promise<boolean>;
  updateProfile(payload: UpdateUserProfilePayload): Promise<boolean>;
  clearUser(): void;
}

let pendingFetch: Promise<boolean> | null = null;

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  currentUser: null,
  isLoading: false,

  async fetchCurrentUser() {
    if (get().currentUser) {
      return true;
    }

    if (pendingFetch) {
      return pendingFetch;
    }

    pendingFetch = (async () => {
      set({ isLoading: true });

      try {
        const user = await apiClient.getCurrentUser();
        set({ currentUser: user });
        return true;
      } catch (err) {
        console.warn('[userStore] fetchCurrentUser failed:', err);
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
      const updated = await apiClient.updateUserProfile(payload);
      set({ currentUser: updated });
      return true;
    } catch {
      return false;
    }
  },

  clearUser() {
    pendingFetch = null;
    set({ currentUser: null, isLoading: false });
  },
}));
