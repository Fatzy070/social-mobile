import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Avatar } from '../common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { queryClient } from '../../query/queryClient';
import { apiClient } from '../../api/client';
import { StoredAccount } from '../../store/authStorage';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 330);

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({ isOpen, onClose }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, savedAccounts, logout, switchAccount, setAuth, removeSavedAccount } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();

  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [addAccountError, setAddAccountError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const navigateTo = (screen: string, params?: any) => {
    onClose();
    setTimeout(() => {
      navigation.navigate(screen, params);
    }, 150);
  };

  const handleSwitchAccount = async (targetAccount: StoredAccount) => {
    if (targetAccount._id === user?._id || switchingUserId) return;

    setSwitchingUserId(targetAccount._id);
    try {
      const response = await apiClient.post('/auth/switch-account', {
        targetUserId: targetAccount._id,
        accountToken: targetAccount.accountToken,
      });

      const { user: switchedUser, token, accountToken: newAccountToken } = response.data;

      // Clear TanStack query cache so stale previous account data is never displayed
      queryClient.clear();

      await switchAccount(targetAccount, switchedUser, token, newAccountToken);
      queryClient.setQueryData(['authUser'], switchedUser);

      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Failed to switch accounts. Please log in directly.';
      Alert.alert('Switch Account', msg);
    } finally {
      setSwitchingUserId(null);
    }
  };

  const handleAddAccountSubmit = async () => {
    if (!addEmail.trim() || !addPassword) {
      setAddAccountError('Please enter both email and password.');
      return;
    }

    setIsAddingAccount(true);
    setAddAccountError(null);
    try {
      const response = await apiClient.post('/auth/login', {
        email: addEmail.trim(),
        password: addPassword,
      });

      const { user: newUser, token, accountToken } = response.data;

      queryClient.clear();
      await setAuth(newUser, token, accountToken);
      queryClient.setQueryData(['authUser'], newUser);

      setShowAddAccountModal(false);
      setAddEmail('');
      setAddPassword('');
      onClose();
    } catch (err: any) {
      setAddAccountError(
        err?.response?.data?.message || 'Invalid credentials or failed to sign in.'
      );
    } finally {
      setIsAddingAccount(false);
    }
  };

  const followersCount = user?.followers?.length || 0;
  const followingCount = user?.following?.length || 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Container */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: colors.card,
            borderRightColor: colors.border,
            paddingTop: insets.top + (Platform.OS === 'ios' ? 12 : 20),
            paddingBottom: insets.bottom + 16,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Profile Section */}
          <TouchableOpacity
            style={styles.profileSection}
            activeOpacity={0.8}
            onPress={() => navigateTo('ProfileTab')}
          >
            <View style={styles.avatarRow}>
              <Avatar uri={user?.avatar} name={user?.username || 'User'} size={56} />
              <View style={[styles.brandBadge, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
                <Text style={styles.brandBadgeText}>N</Text>
              </View>
            </View>

            <View style={styles.nameHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.displayName, { color: colors.fg }]} numberOfLines={1}>
                  {user?.username || 'Nexus Member'}
                </Text>
                <Text style={[styles.handle, { color: colors.fgMuted }]} numberOfLines={1}>
                  @{user?.username?.toLowerCase() || 'user'}
                </Text>
              </View>

              {/* Account Switcher trigger button */}
              <TouchableOpacity
                style={[styles.switchToggleBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => setIsAccountsExpanded((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isAccountsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.fgMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Follow stats row */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() =>
                  navigateTo('FollowList', {
                    userId: user?._id,
                    initialTab: 'following',
                    username: user?.username,
                  })
                }
              >
                <Text style={[styles.statNumber, { color: colors.fg }]}>{followingCount}</Text>
                <Text style={[styles.statLabel, { color: colors.fgMuted }]}>Following</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() =>
                  navigateTo('FollowList', {
                    userId: user?._id,
                    initialTab: 'followers',
                    username: user?.username,
                  })
                }
              >
                <Text style={[styles.statNumber, { color: colors.fg }]}>{followersCount}</Text>
                <Text style={[styles.statLabel, { color: colors.fgMuted }]}>Followers</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Expandable Account Switcher Section */}
          {isAccountsExpanded && (
            <View style={[styles.accountsAccordion, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.accordionTitle, { color: colors.fgSubtle }]}>Saved Accounts</Text>
              {savedAccounts.map((acc) => {
                const isActive = acc._id === user?._id;
                const isSwitching = switchingUserId === acc._id;

                return (
                  <TouchableOpacity
                    key={acc._id}
                    style={[
                      styles.accountItemRow,
                      isActive && { backgroundColor: colors.accentMuted },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSwitchAccount(acc)}
                    disabled={isActive || !!switchingUserId}
                  >
                    <Avatar uri={acc.avatar} name={acc.username || 'User'} size={32} />
                    <View style={styles.accountItemDetails}>
                      <Text style={[styles.accountItemName, { color: colors.fg }]} numberOfLines={1}>
                        @{acc.username}
                      </Text>
                      <Text style={[styles.accountItemEmail, { color: colors.fgMuted }]} numberOfLines={1}>
                        {acc.email}
                      </Text>
                    </View>

                    {isSwitching ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : isActive ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => removeSavedAccount(acc._id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={colors.fgSubtle} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.addAccountRow, { borderTopColor: colors.border }]}
                onPress={() => setShowAddAccountModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={18} color={colors.accent} />
                <Text style={[styles.addAccountText, { color: colors.accent }]}>Add an existing account</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Navigation Items */}
          <View style={styles.navSection}>
            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => navigateTo('ProfileTab')}
            >
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={22} color={colors.fg} />
              </View>
              <Text style={[styles.navItemLabel, { color: colors.fg }]}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => navigateTo('Bookmarks')}
            >
              <View style={styles.iconBox}>
                <Ionicons name="bookmark-outline" size={22} color={colors.fg} />
              </View>
              <View style={styles.labelRow}>
                <Text style={[styles.navItemLabel, { color: colors.fg }]}>Bookmarks</Text>
                <View style={[styles.highlightBadge, { backgroundColor: colors.accentMuted }]}>
                  <Text style={[styles.highlightBadgeText, { color: colors.accent }]}>Saved</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => navigateTo('ScheduledMessages')}
            >
              <View style={styles.iconBox}>
                <Ionicons name="time-outline" size={22} color={colors.fg} />
              </View>
              <Text style={[styles.navItemLabel, { color: colors.fg }]}>Scheduled Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => navigateTo('Sessions')}
            >
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.fg} />
              </View>
              <Text style={[styles.navItemLabel, { color: colors.fg }]}>Active Sessions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => navigateTo('Settings')}
            >
              <View style={styles.iconBox}>
                <Ionicons name="settings-outline" size={22} color={colors.fg} />
              </View>
              <Text style={[styles.navItemLabel, { color: colors.fg }]}>Settings & Privacy</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Theme Switcher Row */}
          <TouchableOpacity
            style={[styles.themeRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={toggleTheme}
          >
            <View style={styles.themeLeft}>
              <View style={[styles.themeIconCircle, { backgroundColor: colors.accentMuted }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={18}
                  color={isDark ? colors.accent : '#f59e0b'}
                />
              </View>
              <View>
                <Text style={[styles.themeTitle, { color: colors.fg }]}>
                  {isDark ? 'Dark Theme' : 'Light Theme'}
                </Text>
                <Text style={[styles.themeSubtitle, { color: colors.fgMuted }]}>
                  Tap to switch to {isDark ? 'Light' : 'Dark'}
                </Text>
              </View>
            </View>

            <View style={[styles.themePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={16}
                color={colors.fg}
              />
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer actions */}
        <View style={[styles.footerSection, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              logout();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Inline Add Account Modal */}
      <Modal
        visible={showAddAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddAccountModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddAccountModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.fg }]}>Add Nexus Account</Text>
                  <TouchableOpacity
                    onPress={() => setShowAddAccountModal(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={22} color={colors.fgMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: colors.fgMuted }]}>
                  Log in with another account. You can switch between your accounts anytime without logging out.
                </Text>

                {addAccountError ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.errorMuted }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{addAccountError}</Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.fgMuted }]}>Email</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.fg,
                      },
                    ]}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.fgSubtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={addEmail}
                    onChangeText={setAddEmail}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.fgMuted }]}>Password</Text>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                        color: colors.fg,
                      },
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.fgSubtle}
                    secureTextEntry
                    value={addPassword}
                    onChangeText={setAddPassword}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowAddAccountModal(false)}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.fg }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalSubmitBtn,
                      { backgroundColor: colors.accent },
                      isAddingAccount && { opacity: 0.7 },
                    ]}
                    onPress={handleAddAccountSubmit}
                    disabled={isAddingAccount}
                  >
                    {isAddingAccount ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Sign In & Add</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    zIndex: 998,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    borderRightWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    marginBottom: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  brandBadgeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 18,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  handle: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  switchToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  accountsAccordion: {
    marginTop: 10,
    marginBottom: 4,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  accordionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  accountItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 10,
  },
  accountItemDetails: {
    flex: 1,
  },
  accountItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  accountItemEmail: {
    fontSize: 11,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
  },
  addAccountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  navSection: {
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  iconBox: {
    width: 34,
    alignItems: 'flex-start',
  },
  labelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  highlightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  highlightBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  themeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  themePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  footerSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
