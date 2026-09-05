import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/query/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAuthStore } from './src/store/authStore';
import {
  registerForPushNotifications,
  handleForegroundNotification,
  handleNotificationResponse,
} from './src/services/pushNotificationService';

export const navigationRef = createNavigationContainerRef<any>();

function AppContent() {
  const { resolvedThemeMode } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Request permissions and register push token with backend
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // 1. Foreground notification arrival listener
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      handleForegroundNotification(notification);
    });

    // 2. Notification response / tap listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, (screen, params) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(screen, params);
        }
      });
    });

    // 3. Cold start check (if app opened from killed state by tapping notification)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        setTimeout(() => {
          handleNotificationResponse(response, (screen, params) => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(screen, params);
            }
          });
        }, 500);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={resolvedThemeMode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
