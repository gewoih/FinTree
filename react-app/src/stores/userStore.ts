import { create } from 'zustand';
import type { CurrentUserDto } from '@/types';

interface UserState {
  user: CurrentUserDto | null;
  setUser: (user: CurrentUserDto) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
