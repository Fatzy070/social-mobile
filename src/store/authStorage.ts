import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'nexus_auth_token';
const DEVICE_ID_KEY = 'nexus_device_id';

let memoryToken: string | null = null;
let memoryDeviceId: string | null = null;

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

  async clear(): Promise<void> {
    memoryToken = null;
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    } catch (err) {
      console.error('Failed to clear secure storage', err);
    }
  },
};
