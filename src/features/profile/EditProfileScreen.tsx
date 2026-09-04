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
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Avatar } from '../../components/common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { darkTheme } from '../../theme/colors';

export const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
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

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 1. Upload new avatar if selected
      if (avatarUri) {
        const ext = avatarUri.split('.').pop() || 'jpg';
        const formData = new FormData();
        // @ts-ignore
        formData.append('avatar', {
          uri: avatarUri,
          type: `image/${ext}`,
          name: `avatar-${Date.now()}.${ext}`,
        });

        const avatarRes = await apiClient.put('/auth/profile/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (avatarRes.data.user) {
          updateUser(avatarRes.data.user);
        }
      }

      // 2. Update bio & username
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
      Alert.alert('Save failed', err.response?.data?.message || err.message || 'Error updating profile');
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
        {/* Avatar upload */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={handlePickAvatar} style={styles.avatarPicker}>
            <Avatar uri={avatarUri || user?.avatar} name={user?.username} size={90} />
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={22} color="#ffffff" />
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
            placeholderTextColor={darkTheme.fgMuted}
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
            placeholderTextColor={darkTheme.fgMuted}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  saveBtn: {
    backgroundColor: darkTheme.accent,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarPicker: {
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: darkTheme.accent,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.bg,
  },
  changePhotoText: {
    color: darkTheme.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: darkTheme.fgMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: darkTheme.fg,
    fontSize: 15,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
