import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { darkTheme } from '../../theme/colors';
import { User } from '../../types';

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 400ms Debounce to prevent wasteful requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Suggested users query (when query is empty)
  const { data: suggested = [], isLoading: suggestedLoading } = useQuery({
    queryKey: queryKeys.user.suggested,
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/suggested/users');
      return (data.users || []) as User[];
    },
    enabled: !debouncedQuery,
  });

  // Search query (when query is non-empty)
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: queryKeys.user.search(debouncedQuery),
    queryFn: async () => {
      const { data } = await apiClient.get(`/auth/search?q=${encodeURIComponent(debouncedQuery)}`);
      return (data.users || []) as User[];
    },
    enabled: !!debouncedQuery,
  });

  const displayUsers = debouncedQuery ? searchResults : suggested;
  const isLoading = debouncedQuery ? searchLoading : suggestedLoading;

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation.navigate('UserProfile', { userId: item._id })}
      style={styles.userRow}
    >
      <Avatar uri={item.avatar} name={item.username} size={46} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.handle}>@{item.username.toLowerCase()}</Text>
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={darkTheme.fgMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Search" />

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={darkTheme.fgMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            placeholderTextColor={darkTheme.fgMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={darkTheme.fgMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionHeader}>
        {debouncedQuery ? `Search results for "${debouncedQuery}"` : 'Suggested for you'}
      </Text>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={darkTheme.accent} />
        </View>
      ) : displayUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={44} color={darkTheme.fgMuted} />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={displayUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 15,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    color: darkTheme.fgMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: darkTheme.fgMuted,
    fontSize: 15,
    marginTop: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: darkTheme.fg,
    fontSize: 15,
    fontWeight: '700',
  },
  handle: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    marginTop: 1,
  },
  bio: {
    color: darkTheme.fgMuted,
    fontSize: 12,
    marginTop: 3,
  },
});
