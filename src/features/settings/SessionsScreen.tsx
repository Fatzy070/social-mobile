import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '../../components/common/Header';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { darkTheme } from '../../theme/colors';
import { CardRowSkeleton } from '../../components/common/Skeleton';
import { UserSession } from '../../types';

export const SessionsScreen = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: queryKeys.user.sessions,
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/sessions');
      return (data.sessions || []) as UserSession[];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.sessions });
      Alert.alert('Session revoked', 'The selected session has been terminated.');
    },
    onError: (err: any) => {
      Alert.alert('Failed to revoke', err.response?.data?.message || 'Could not revoke session');
    },
  });

  const handleRevoke = (session: UserSession) => {
    Alert.alert(
      'Revoke Session',
      `Log out ${session.browser || 'device'} on ${session.os || 'OS'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => revokeMutation.mutate(session.sessionId),
        },
      ]
    );
  };

  const getDeviceIcon = (type: string, os: string) => {
    if (type === 'mobile' || os === 'iOS' || os === 'Android') {
      return <Ionicons name="phone-portrait-outline" size={22} color={darkTheme.accent} />;
    }
    return <Ionicons name="laptop-outline" size={22} color={darkTheme.accent} />;
  };

  const renderItem = ({ item }: { item: UserSession }) => {
    const timeAgo = item.lastActive
      ? formatDistanceToNow(new Date(item.lastActive), { addSuffix: true })
      : '';

    return (
      <View style={styles.sessionCard}>
        <View style={styles.deviceRow}>
          {getDeviceIcon(item.deviceType, item.os)}
          <View style={styles.sessionDetails}>           
         <View >
              <Text style={styles.deviceTitle}>
                {item.browser} on {item.os}
              </Text>
             
            </View>
              <View style={styles.titleRow}>
                <Text style={styles.sessionMeta}>
              Last active: {timeAgo}</Text>
               {item.isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>This Device</Text>
                </View>
              )}
              </View>           
          </View>
        </View>

        {!item.isCurrent && (
          <TouchableOpacity
            onPress={() => handleRevoke(item)}
            style={styles.revokeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.revokeBtnText}>Revoke</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Active Sessions" onBack={() => navigation.goBack()} />

      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={20} color={darkTheme.accent} />
        <Text style={styles.infoBannerText}>
          Manage devices and browsers logged into your Nexus Social account.
        </Text>
      </View>

      {isLoading && sessions.length === 0 ? (
        <CardRowSkeleton count={3} />
      ) : sessions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No other active sessions.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionId || item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: darkTheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  infoBannerText: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: darkTheme.fgMuted,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sessionCard: {
    backgroundColor: darkTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceTitle: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: darkTheme.accentMuted,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  currentBadgeText: {
    color: darkTheme.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionMeta: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 4,
  },
  revokeBtn: {
    borderWidth: 1,
    borderColor: darkTheme.error,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  revokeBtnText: {
    color: darkTheme.error,
    fontSize: 12,
    fontWeight: '600',
  },
});
