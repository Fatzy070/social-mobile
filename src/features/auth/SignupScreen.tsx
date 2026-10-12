import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';

export const SignupScreen = () => {
  const { colors, styles } = useThemedStyles(createStyles);
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await apiClient.post('/auth/signup', {
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (data.user && data.token) {
        await setAuth(data.user, data.token, data.accountToken);
      }
    } catch (err: any) {
      Alert.alert('Signup Failed', err.response?.data?.message || 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.wordmark}><View style={styles.wordmarkBadge}><Text style={styles.wordmarkInitial}>N</Text></View><Text style={styles.wordmarkText}>Nexus.</Text></View>
        <View style={styles.brandContainer}>
          <Text style={styles.kicker}>MAKE YOURSELF AT HOME</Text>
          <Text style={styles.brandTitle}>A little more
connected.</Text>
          <Text style={styles.brandSubtitle}>A place for your thoughts and your people.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color={colors.fgMuted} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.fgMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={colors.fgMuted} />
            <TextInput
              style={styles.input}
              accessibilityLabel="Email address"
              placeholder="Email address"
              placeholderTextColor={colors.fgMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.fgMuted} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={colors.fgMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.fgMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={isLoading}
            onPress={handleSignup}
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signupLink}> Continue to Nexus</Text>
          </TouchableOpacity>
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
  inner: {
    flexGrow: 1,
    paddingVertical: 64,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 52 },
  wordmarkBadge: { width: 32, height: 32, borderRadius: 7, backgroundColor: colors.fg, alignItems: 'center', justifyContent: 'center' },
  wordmarkInitial: { color: colors.bg, fontSize: 21, fontWeight: '800' },
  wordmarkText: { color: colors.fg, fontSize: 25, fontWeight: '800', letterSpacing: -1 },
  kicker: { fontSize: 10, letterSpacing: 1.7, color: colors.accentText, fontWeight: '700', marginBottom: 16 },
  brandContainer: {
    alignItems: 'flex-start',
    marginBottom: 36,
  },
  brandTitle: {
    color: colors.fg,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: colors.fgMuted,
    fontSize: metrics.body,
    marginTop: 6,
  },
  form: {
    gap: 16,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: metrics.gutter,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: metrics.body,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: metrics.radius,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: colors.fgMuted,
    fontSize: 14,
  },
  signupLink: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '700',
  },
});
