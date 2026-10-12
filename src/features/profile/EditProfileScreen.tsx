import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';

export const EditProfileScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handlePickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 1. Upload new cover if selected
      if (coverUri) {
        const ext = coverUri.split('.').pop() || 'jpg';
        const coverFormData = new FormData();
        // @ts-ignore
        coverFormData.append('cover', {
          uri: coverUri,
          type: `image/${ext}`,
          name: `cover-${Date.now()}.${ext}`,
        });

        const coverRes = await apiClient.put('/auth/profile/cover', coverFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (coverRes.data.user) {
          updateUser(coverRes.data.user);
        }
      }

      // 2. Upload new avatar if selected
      if (avatarUri) {
        const ext = avatarUri.split('.').pop() || 'jpg';
        const avatarFormData = new FormData();
        // @ts-ignore
        avatarFormData.append('avatar', {
          uri: avatarUri,
          type: `image/${ext}`,
          name: `avatar-${Date.now()}.${ext}`,
        });

        const avatarRes = await apiClient.put('/auth/profile/avatar', avatarFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (avatarRes.data.user) {
          updateUser(avatarRes.data.user);
        }
      }

      // 3. Update bio & username
      const profileRes = await apiClient.put('/auth/profile', {
        bio: bio.trim(),
        username: username.trim(),
      });

      if (profileRes.data.user) {
        updateUser(profileRes.data.user);
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(user?._id || '') });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        'Save failed',
        err.response?.data?.message || err.message || 'Error updating profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Edit Profile"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            disabled={isSaving}
            onPress={handleSave}
            style={styles.saveBtn}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Cover Photo Upload */}
        <View style={styles.coverSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePickCover}
            style={styles.coverWrapper}
          >
            {coverUri || user?.coverImage ? (
              <Image
                source={{ uri: coverUri || user?.coverImage }}
                style={styles.coverImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.fgMuted} />
                <Text style={styles.coverPlaceholderText}>Add cover photo</Text>
              </View>
            )}
            <View style={styles.coverCameraOverlay}>
              <Ionicons name="camera" size={18} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Avatar Upload */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={handlePickAvatar} style={styles.avatarPicker}>
            <Avatar uri={avatarUri || user?.avatar} name={user?.username} size={84} />
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={20} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change profile photo</Text>
        </View>

        {/* Inputs */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={colors.fgMuted}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor={colors.fgMuted}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: metrics.gutter,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  coverSection: {
    marginBottom: 16,
  },
  coverWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverPlaceholderText: {
    color: colors.fgMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  coverCameraOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 18,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -42,
    marginBottom: 24,
  },
  avatarPicker: {
    position: 'relative',
    padding: 3,
    backgroundColor: colors.bg,
    borderRadius: 45,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  changePhotoText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  fieldGroup: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    color: colors.fgMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.fg,
    fontSize: metrics.body,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
