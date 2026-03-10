import type {
  CurrentUserDto,
  LoginPayload,
  RegisterPayload,
  TelegramLoginPayload,
  UpdateUserProfilePayload,
} from '../types';
import {
  login as loginRequest,
  loginWithTelegram as loginWithTelegramRequest,
  logout as logoutRequest,
  register as registerRequest,
} from './auth';
import {
  getCurrentUser as getCurrentUserRequest,
  updateUserProfile as updateUserProfileRequest,
} from './user';

interface AppApiClient {
  login(payload: LoginPayload): Promise<void>;
  register(payload: RegisterPayload): Promise<void>;
  loginWithTelegram(payload: TelegramLoginPayload): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<CurrentUserDto>;
  updateUserProfile(
    payload: UpdateUserProfilePayload
  ): Promise<CurrentUserDto>;
}

export const apiClient: AppApiClient = {
  async login(payload) {
    await loginRequest(payload);
  },

  async register(payload) {
    await registerRequest(payload);
  },

  async loginWithTelegram(payload) {
    await loginWithTelegramRequest(payload);
  },

  async logout() {
    await logoutRequest();
  },

  async getCurrentUser() {
    return getCurrentUserRequest();
  },

  async updateUserProfile(payload) {
    return updateUserProfileRequest(payload);
  },
};
