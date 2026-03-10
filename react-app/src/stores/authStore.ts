import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  setAuthenticated: (userId: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      email: null,
      setAuthenticated: (userId, email) =>
        set({ isAuthenticated: true, userId, email }),
      clearAuth: () =>
        set({ isAuthenticated: false, userId: null, email: null }),
    }),
    { name: 'ft-auth' }
  )
);
