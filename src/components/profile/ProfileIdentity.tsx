import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Avatar } from '../common/Avatar';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { Theme } from '../../theme/colors';

interface Props {
  username?: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  actions: React.ReactNode;
  relationships: React.ReactNode;
}

export function ProfileIdentity({ username, avatar, cover, bio, actions, relationships }: Props) {
  const { styles } = useThemedStyles(createStyles);
  return <View style={styles.container}>
    <View style={styles.identity}>
      <Avatar uri={avatar} name={username} size={72} />
      <View style={styles.nameBlock}><Text style={styles.eyebrow}>NEXUS / PROFILE</Text><Text style={styles.name}>{username}</Text><Text style={styles.handle}>@{username?.toLowerCase()}</Text></View>
    </View>
    {!!bio && <Text style={styles.bio}>{bio}</Text>}
    <View style={styles.relationships}>{relationships}</View>
    <View style={styles.actions}>{actions}</View>
    {!!cover && <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" accessibilityLabel={`${username}'s cover photo`} />}
  </View>;
}
const createStyles = (colors: Theme) => StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.surface },
  identity: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  nameBlock: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.accentText, fontSize: 9, letterSpacing: 1.7, fontWeight: '700', marginBottom: 8 },
  name: { color: colors.fg, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -1 },
  handle: { color: colors.fgMuted, fontSize: 13, marginTop: 5 },
  bio: { fontSize: 16, lineHeight: 25, color: colors.fg, marginTop: 22 },
  relationships: { marginTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cover: { width: '100%', height: 150, borderRadius: 10, marginTop: 24 },
});
