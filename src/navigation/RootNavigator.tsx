import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';

// Screens
import { LoginScreen } from '../features/auth/LoginScreen';
import { SignupScreen } from '../features/auth/SignupScreen';
import { FeedScreen } from '../features/feed/FeedScreen';
import { CreatePostScreen } from '../features/feed/CreatePostScreen';
import { PostDetailScreen } from '../features/feed/PostDetailScreen';
import { BookmarksScreen } from '../features/feed/BookmarksScreen';
import { SearchScreen } from '../features/feed/SearchScreen';
import { ConversationsScreen } from '../features/messages/ConversationsScreen';
import { ChatScreen } from '../features/messages/ChatScreen';
import { ChatDetailsScreen } from '../features/messages/ChatDetailsScreen';
import { ScheduledMessagesScreen } from '../features/messages/ScheduledMessagesScreen';
import { NewChatModalScreen } from '../features/messages/NewChatModalScreen';
import { GroupDetailsScreen } from '../features/groups/GroupDetailsScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { UserProfileScreen } from '../features/profile/UserProfileScreen';
import { FollowListScreen } from '../features/profile/FollowListScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { SessionsScreen } from '../features/settings/SessionsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fgMuted,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={27}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={27}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={27}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={ConversationsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'mail' : 'mail-outline'}
              size={27}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={27}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();
  const { colors } = useTheme();

  useEffect(() => {
    initializeAuth();
  }, []);

  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="NewChatModal"
            component={NewChatModalScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="FollowList" component={FollowListScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ChatDetails" component={ChatDetailsScreen} />
          <Stack.Screen name="ScheduledMessages" component={ScheduledMessagesScreen} />
          <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Sessions" component={SessionsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
