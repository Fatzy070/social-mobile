import { create } from 'zustand';
import { User } from '../types';
import { authStorage } from './authStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  deviceId: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  setAuth: async (user: User, token: string) => {
    await authStorage.setToken(token);
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateUser: (partial: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...partial } });
  },

  logout: async () => {
    await authStorage.clear();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initializeAuth: async () => {
    try {
      const [token, deviceId] = await Promise.all([
        authStorage.getToken(),
        authStorage.getDeviceId(),
      ]);
      set({ token, deviceId, isInitializing: false });
    } catch {
      set({ isInitializing: false });
    }
  },
}));
