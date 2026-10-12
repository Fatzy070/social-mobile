import { ScreenIntro } from '../../components/common/ScreenIntro';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';

export const SettingsScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { user, updateUser, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const privacy = user?.settings?.privacy || {};
  const isPrivate = privacy.privateAccount || false;

  const notifs = user?.settings?.notificationPreferences || {
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    bookmarks: true,
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettingsPayload: any) => {
      const { data } = await apiClient.put('/auth/settings', {
        settings: newSettingsPayload,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.user) {
        updateUser(data.user);
      }
    },
    onError: (err: any) => {
      Alert.alert('Settings update failed', err.response?.data?.message || 'Could not update settings');
    },
  });

  const togglePrivateAccount = (val: boolean) => {
    updateSettingsMutation.mutate({
      privacy: {
        ...privacy,
        privateAccount: val,
      },
    });
  };

  const toggleNotification = (key: 'likes' | 'comments' | 'follows' | 'messages' | 'bookmarks', val: boolean) => {
    updateSettingsMutation.mutate({
      notificationPreferences: {
        ...notifs,
        [key]: val,
      },
    });
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out of Nexus Social?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/auth/logout');
          } catch {}
          await logout();
          queryClient.clear();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenIntro label="Your preferences" title="Make Nexus yours." description="Choose what you share, hear, and see." />
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Your space</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="person-outline" size={20} color={colors.fg} />
            <Text style={styles.rowText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.fgMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Bookmarks')}
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.fg} />
            <Text style={styles.rowText}>Bookmarks</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.fgMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('Sessions')}
          >
            <Ionicons name="laptop-outline" size={20} color={colors.fg} />
            <Text style={styles.rowText}>Active Sessions</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.fgMuted} />
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.fg} />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowText}>Private Account</Text>
              <Text style={styles.rowSubtext}>Only approved followers can view your posts</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={togglePrivateAccount}
              trackColor={{ false: colors.surface, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Notification Preferences */}
        <Text style={styles.sectionTitle}>Keep me in the loop</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="heart-outline" size={20} color={colors.like} />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowText}>Likes</Text>
              <Text style={styles.rowSubtext}>Notify when someone likes your posts</Text>
            </View>
            <Switch
              value={notifs.likes ?? true}
              onValueChange={(val) => toggleNotification('likes', val)}
              trackColor={{ false: colors.surface, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.row}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.accentText} />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowText}>Comments</Text>
              <Text style={styles.rowSubtext}>Notify when someone replies to your posts</Text>
            </View>
            <Switch
              value={notifs.comments ?? true}
              onValueChange={(val) => toggleNotification('comments', val)}
              trackColor={{ false: colors.surface, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.row}>
            <Ionicons name="person-add-outline" size={20} color={colors.success} />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowText}>Follows</Text>
              <Text style={styles.rowSubtext}>Notify when someone starts following you</Text>
            </View>
            <Switch
              value={notifs.follows ?? true}
              onValueChange={(val) => toggleNotification('follows', val)}
              trackColor={{ false: colors.surface, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color={colors.accentText} />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowText}>Direct Messages</Text>
              <Text style={styles.rowSubtext}>Notify when someone sends a message</Text>
            </View>
            <Switch
              value={notifs.messages ?? true}
              onValueChange={(val) => toggleNotification('messages', val)}
              trackColor={{ false: colors.surface, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.row}>
            <Ionicons name="bookmark-outline" size={20} color={colors.bookmark} />
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowText}>Bookmarks</Text>
              <Text style={styles.rowSubtext}>Notify when someone bookmarks your post</Text>
            </View>
            <Switch
              value={notifs.bookmarks ?? true}
              onValueChange={(val) => toggleNotification('bookmarks', val)}
              trackColor={{ false: colors.surface, true: colors.accent }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.rowText, { color: colors.error }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Nexus Social for Mobile · Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: metrics.gutter,
    paddingTop: 16,
  },
  sectionTitle: {
    color: colors.fgMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: metrics.gutter,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowText: {
    color: colors.fg,
    fontSize: metrics.body,
    fontWeight: '600',
  },
  rowSubtext: {
    color: colors.fgMuted,
    fontSize: 12,
    marginTop: 2,
  },
  versionText: {
    color: colors.fgMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
});
