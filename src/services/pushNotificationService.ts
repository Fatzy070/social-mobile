import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { authStorage } from '../store/authStorage';
import { queryClient } from '../query/queryClient';
import { queryKeys } from '../query/queryKeys';

// Configure default foreground presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register the mobile device for Expo Push Notifications
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  console.log('[PUSH] Device registration: Initializing push setup...');

  // Set up Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });

    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social Interactions',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#6366f1',
    });
  }

  try {
    // 1. Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. Request permission if not already determined
    if (existingStatus !== 'granted') {
      console.log('[PUSH] Notification permission not granted yet, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH] Notification permission denied or not granted:', finalStatus);
      return null;
    }

    console.log('[PUSH] Notification permission granted! Fetching Expo push token...');

    // 3. Resolve project ID from Expo constants if configured
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    console.log('[PUSH] Expo token received:', token);

    // 4. Send token to backend
    const deviceId = await authStorage.getDeviceId();
    const platform = Platform.OS as 'ios' | 'android' | 'web';
    const deviceName = `${Platform.OS === 'ios' ? 'Apple Device' : 'Android Device'}`;

    await apiClient.post('/notification/push/register', {
      expoPushToken: token,
      deviceId: deviceId || 'mobile-device',
      platform,
      deviceName,
    });

    console.log('[PUSH] Token registered successfully with backend!');
    return token;
  } catch (error: any) {
    console.warn('[PUSH] Device registration error:', error?.response?.data?.message || error?.message || error);
    return null;
  }
};

/**
 * Unregister push token when user logs out
 */
export const unregisterPushNotifications = async (): Promise<void> => {
  try {
    const deviceId = await authStorage.getDeviceId();
    if (!deviceId) return;

    console.log('[PUSH] Unregistering device token with backend...');
    await apiClient.post('/notification/push/unregister', { deviceId });
    console.log('[PUSH] Token unregistered successfully.');
  } catch (err) {
    console.warn('[PUSH] Failed to unregister push token:', err);
  }
};

/**
 * Handle notification received while app is in foreground
 */
export const handleForegroundNotification = (notification: Notifications.Notification) => {
  const data: Record<string, any> = notification.request.content.data || {};
  console.log('[PUSH] Notification event received in foreground:', data);

  const notifType = String(data.notificationType || data.type || '');

  // Invalidate appropriate TanStack Query caches silently without reloading screen
  if (['message', 'group_message', 'reply', 'scheduled_message'].includes(notifType)) {
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    if (data.conversationId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.messages(String(data.conversationId)),
      });
    }
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    if (data.postId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(String(data.postId)),
      });
    }
  }
};

/**
 * Handle user tapping a notification response
 */
export const handleNotificationResponse = (
  response: Notifications.NotificationResponse,
  navigate: (screen: string, params?: any) => void
) => {
  const data: Record<string, any> = response.notification.request.content.data || {};
  console.log('[PUSH] Notification tapped by user with payload:', data);

  if (!data) return;

  const screen = typeof data.screen === 'string' ? data.screen : '';
  const params = typeof data.params === 'object' && data.params !== null ? data.params : {};
  const conversationId = String(data.conversationId || params.conversationId || '');
  const postId = String(data.postId || params.postId || '');
  const userId = String(data.userId || data.senderId || params.userId || '');
  const type = String(data.type || data.notificationType || '');

  if (screen === 'Chat' || ['message', 'group_message', 'reply', 'scheduled_message'].includes(type)) {
    if (conversationId) {
      navigate('Chat', { conversationId });
      return;
    }
  }

  if (screen === 'PostDetail' || ['like', 'comment', 'repost', 'quote', 'mention', 'bookmark'].includes(type)) {
    if (postId) {
      navigate('PostDetail', { postId });
      return;
    }
  }

  if (screen === 'UserProfile' || type === 'follow') {
    if (userId) {
      navigate('UserProfile', { userId });
      return;
    }
  }

  if (screen) {
    navigate(screen, Object.keys(params).length > 0 ? params : undefined);
  } else {
    navigate('NotificationsTab');
  }
};
