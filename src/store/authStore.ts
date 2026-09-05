import { create } from 'zustand';
import { User } from '../types';
import { authStorage, StoredAccount } from './authStorage';

interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  savedAccounts: StoredAccount[];
  setAuth: (user: User, token: string, accountToken?: string) => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  switchAccount: (account: StoredAccount, targetUser: User, token: string, newAccountToken?: string) => Promise<void>;
  removeSavedAccount: (userId: string) => Promise<void>;
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
  savedAccounts: [],

  setAuth: async (user: User, token: string, accountToken?: string) => {
    const normalizedUser = {
      ...user,
      _id: (user as any)._id || (user as any).id,
    };

    const currentAccounts = get().savedAccounts;
    const existing = currentAccounts.find((a) => a._id === normalizedUser._id);
    const filtered = currentAccounts.filter((a) => a._id !== normalizedUser._id);
    const updatedAccounts: StoredAccount[] = [
      {
        _id: normalizedUser._id,
        username: normalizedUser.username,
        email: normalizedUser.email,
        avatar: normalizedUser.avatar,
        addedAt: existing?.addedAt || new Date().toISOString(),
        accountToken: accountToken || existing?.accountToken,
        authToken: token,
      },
      ...filtered,
    ];

    await Promise.all([
      authStorage.setToken(token),
      authStorage.setUser(normalizedUser),
      authStorage.setSavedAccounts(updatedAccounts),
    ]);

    set({
      user: normalizedUser,
      token,
      savedAccounts: updatedAccounts,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateUser: (partial: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    authStorage.setUser(updated);

    const currentAccounts = get().savedAccounts.map((acc) =>
      acc._id === updated._id
        ? {
            ...acc,
            username: updated.username || acc.username,
            avatar: updated.avatar || acc.avatar,
            email: updated.email || acc.email,
          }
        : acc
    );
    authStorage.setSavedAccounts(currentAccounts);

    set({ user: updated, savedAccounts: currentAccounts });
  },

  switchAccount: async (account: StoredAccount, targetUser: User, token: string, newAccountToken?: string) => {
    const normalizedUser = {
      ...targetUser,
      _id: (targetUser as any)._id || (targetUser as any).id,
    };

    const currentAccounts = get().savedAccounts;
    const existing = currentAccounts.find((a) => a._id === normalizedUser._id);
    const filtered = currentAccounts.filter((a) => a._id !== normalizedUser._id);
    const updatedAccounts: StoredAccount[] = [
      {
        _id: normalizedUser._id,
        username: normalizedUser.username,
        email: normalizedUser.email || account.email,
        avatar: normalizedUser.avatar || account.avatar,
        addedAt: existing?.addedAt || account.addedAt || new Date().toISOString(),
        accountToken: newAccountToken || account.accountToken || existing?.accountToken,
        authToken: token,
      },
      ...filtered,
    ];

    await Promise.all([
      authStorage.setToken(token),
      authStorage.setUser(normalizedUser),
      authStorage.setSavedAccounts(updatedAccounts),
    ]);

    set({
      user: normalizedUser,
      token,
      savedAccounts: updatedAccounts,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  removeSavedAccount: async (userId: string) => {
    const updated = get().savedAccounts.filter((a) => a._id !== userId);
    await authStorage.setSavedAccounts(updated);
    set({ savedAccounts: updated });
  },

  logout: async () => {
    try {
      const { unregisterPushNotifications } = await import('../services/pushNotificationService');
      await unregisterPushNotifications();
    } catch {}

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
      const [token, user, deviceId, savedAccounts] = await Promise.all([
        authStorage.getToken(),
        authStorage.getUser(),
        authStorage.getDeviceId(),
        authStorage.getSavedAccounts(),
      ]);
      const normalizedUser = user
        ? { ...user, _id: user._id || user.id }
        : null;

      let validAccounts = savedAccounts || [];
      if (normalizedUser && token && !validAccounts.some((a) => a._id === normalizedUser._id)) {
        validAccounts = [
          {
            _id: normalizedUser._id,
            username: normalizedUser.username,
            email: normalizedUser.email,
            avatar: normalizedUser.avatar,
            addedAt: new Date().toISOString(),
            authToken: token,
          },
          ...validAccounts,
        ];
        await authStorage.setSavedAccounts(validAccounts);
      }

      set({
        token,
        user: normalizedUser,
        isAuthenticated: !!(token && normalizedUser),
        deviceId,
        savedAccounts: validAccounts,
        isInitializing: false,
      });
    } catch {
      set({ isInitializing: false });
    }
  },
}));
