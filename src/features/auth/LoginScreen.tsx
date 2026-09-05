import React, { useState } from 'react';
import {
  View,
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
import { darkTheme } from '../../theme/colors';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[LoginScreen] Attempting login with:', { email: email.trim().toLowerCase(), url: `${apiClient.defaults.baseURL}/auth/login` });
      
      const { data } = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      // console.log('[LoginScreen] Login success:', data);

      if (data.user && data.token) {
        await setAuth(data.user, data.token, data.accountToken);
      }
    } catch (err: any) {
      console.error('[LoginScreen] Full login error:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        configUrl: err.config?.url,
        baseURL: err.config?.baseURL,
      });

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to server. Check your network or credentials.';

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.brandTitle}>Nexus Social</Text>
          <Text style={styles.brandSubtitle}>Where ideas connect.</Text>
        </View>

        {/* Input Fields */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={darkTheme.fgMuted} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={darkTheme.fgMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={darkTheme.fgMuted} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={darkTheme.fgMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={darkTheme.fgMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={isLoading}
            onPress={handleLogin}
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer / Switch to Signup */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}> Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: darkTheme.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: darkTheme.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  brandTitle: {
    color: darkTheme.fg,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    color: darkTheme.fgMuted,
    fontSize: 15,
    marginTop: 6,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: darkTheme.border,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    color: darkTheme.fg,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: darkTheme.accent,
    height: 52,
    borderRadius: 14,
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
    color: darkTheme.fgMuted,
    fontSize: 14,
  },
  signupLink: {
    color: darkTheme.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
