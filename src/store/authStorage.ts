import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'nexus_auth_token';
const AUTH_USER_KEY = 'nexus_auth_user';
const DEVICE_ID_KEY = 'nexus_device_id';
const SAVED_ACCOUNTS_KEY = 'nexus_saved_accounts';

let memoryToken: string | null = null;
let memoryUser: any = null;
let memoryDeviceId: string | null = null;
let memorySavedAccounts: any[] = [];

export interface StoredAccount {
  _id: string;
  username: string;
  email?: string;
  avatar?: string;
  addedAt: string;
  accountToken?: string;
  authToken?: string;
}

export const authStorage = {
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : memoryToken;
      }
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  },

  async setToken(token: string | null): Promise<void> {
    memoryToken = token;
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
          else localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        return;
      }
      if (token) {
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      }
    } catch (err) {
      console.error('Failed to write auth token to secure storage', err);
    }
  },

  async getUser(): Promise<any> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_USER_KEY) : null;
      } else {
        raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
      }
      if (raw) return JSON.parse(raw);
      return memoryUser;
    } catch {
      return memoryUser;
    }
  },

  async setUser(user: any): Promise<void> {
    memoryUser = user;
    try {
      const raw = user ? JSON.stringify(user) : null;
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          if (raw) localStorage.setItem(AUTH_USER_KEY, raw);
          else localStorage.removeItem(AUTH_USER_KEY);
        }
        return;
      }
      if (raw) {
        await SecureStore.setItemAsync(AUTH_USER_KEY, raw);
      } else {
        await SecureStore.deleteItemAsync(AUTH_USER_KEY);
      }
    } catch (err) {
      console.error('Failed to write user to secure storage', err);
    }
  },

  async getDeviceId(): Promise<string> {
    try {
      let id = Platform.OS === 'web'
        ? (typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_ID_KEY) : memoryDeviceId)
        : await SecureStore.getItemAsync(DEVICE_ID_KEY);

      if (!id) {
        id = `mobile-${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem(DEVICE_ID_KEY, id);
        } else if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
        }
        memoryDeviceId = id;
      }
      return id;
    } catch {
      if (!memoryDeviceId) {
        memoryDeviceId = `mobile-fallback-${Date.now()}`;
      }
      return memoryDeviceId;
    }
  },

  async getSavedAccounts(): Promise<StoredAccount[]> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SAVED_ACCOUNTS_KEY) : null;
      } else {
        raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
      }
      if (raw) return JSON.parse(raw);
      return memorySavedAccounts;
    } catch {
      return memorySavedAccounts;
    }
  },

  async setSavedAccounts(accounts: StoredAccount[]): Promise<void> {
    memorySavedAccounts = accounts;
    try {
      const raw = JSON.stringify(accounts);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SAVED_ACCOUNTS_KEY, raw);
        }
        return;
      }
      await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, raw);
    } catch (err) {
      console.error('Failed to write saved accounts to storage', err);
    }
  },

  async clear(): Promise<void> {
    memoryToken = null;
    memoryUser = null;
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(AUTH_USER_KEY);
    } catch (err) {
      console.error('Failed to clear secure storage', err);
    }
  },
};
