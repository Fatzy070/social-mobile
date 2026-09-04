import axios from 'axios';
import { Platform } from 'react-native';
import { authStorage } from '../store/authStorage';

import Constants from 'expo-constants';

// Determine backend URL:
// 1. Explicit EXPO_PUBLIC_API_URL from .env
// 2. Dynamic host IP from Metro bundler (works automatically on physical devices in Expo Go)
// 3. Fallback to current host LAN IP or emulator loopback
const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.experienceUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }

  return Platform.select({
    android: 'http://10.0.2.2:5000/api',
    ios: 'http://192.168.0.190:5000/api',
    default: 'http://192.168.0.190:5000/api',
  });
};

export const API_BASE_URL = getBaseUrl();

console.log('[Nexus API Client] Connecting to API_BASE_URL:', API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await authStorage.getToken();
  const deviceId = await authStorage.getDeviceId();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (deviceId && !config.headers['x-device-id']) {
    config.headers['x-device-id'] = deviceId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (
      status === 401 &&
      (message === 'No token provided' ||
        message === 'Invalid or expired token' ||
        message?.includes('Session revoked'))
    ) {
      await authStorage.clear();
    }
    return Promise.reject(error);
  }
);
