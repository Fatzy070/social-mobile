import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  circle = false,
}) => {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [opacityAnim]);

  const baseBg = colors.borderStrong;
  const computedRadius = circle && typeof height === 'number' ? height / 2 : borderRadius;

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: computedRadius,
          backgroundColor: baseBg,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const SkeletonAvatar: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }> = ({
  size = 44,
  style,
}) => {
  return <Skeleton width={size} height={size} circle style={style} />;
};

export const SkeletonText: React.FC<{
  lines?: number;
  gap?: number;
  lineHeight?: number;
  lastLineWidth?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}> = ({ lines = 2, gap = 8, lineHeight = 14, lastLineWidth = '70%', style }) => {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </View>
  );
};

export const PostCardSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.postCard, { borderBottomColor: colors.border }]}>
      <View style={styles.postHeader}>
        <SkeletonAvatar size={44} />
        <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
          <Skeleton width="45%" height={15} />
          <Skeleton width="28%" height={12} />
        </View>
      </View>

      <View style={{ marginTop: 12, gap: 8 }}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="92%" height={14} />
        <Skeleton width="65%" height={14} />
      </View>

      <Skeleton width="100%" height={180} borderRadius={14} style={{ marginTop: 12 }} />

      <View style={styles.postActions}>
        <Skeleton width={50} height={18} borderRadius={6} />
        <Skeleton width={50} height={18} borderRadius={6} />
        <Skeleton width={50} height={18} borderRadius={6} />
        <Skeleton width={50} height={18} borderRadius={6} />
      </View>
    </View>
  );
};

export const PostFeedSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <PostCardSkeleton key={idx} />
      ))}
    </View>
  );
};

export const UserRowSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
      <SkeletonAvatar size={48} />
      <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
        <Skeleton width="40%" height={15} />
        <Skeleton width="25%" height={12} />
        <Skeleton width="60%" height={12} style={{ marginTop: 2 }} />
      </View>
      <Skeleton width={75} height={32} borderRadius={16} />
    </View>
  );
};

export const UserListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <UserRowSkeleton key={idx} />
      ))}
    </View>
  );
};

export const ConversationRowSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.conversationRow, { borderBottomColor: colors.border }]}>
      <SkeletonAvatar size={52} />
      <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="45%" height={15} />
          <Skeleton width="18%" height={11} />
        </View>
        <Skeleton width="80%" height={13} />
      </View>
    </View>
  );
};

export const ConversationListSkeleton: React.FC<{ count?: number }> = ({ count = 7 }) => {
  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <ConversationRowSkeleton key={idx} />
      ))}
    </View>
  );
};

export const NotificationRowSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.notificationRow, { borderBottomColor: colors.border }]}>
      <SkeletonAvatar size={44} />
      <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
        <Skeleton width="75%" height={14} />
        <Skeleton width="30%" height={11} />
      </View>
    </View>
  );
};

export const NotificationListSkeleton: React.FC<{ count?: number }> = ({ count = 7 }) => {
  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <NotificationRowSkeleton key={idx} />
      ))}
    </View>
  );
};

export const ChatMessageSkeleton: React.FC = () => {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 14, flex: 1, justifyContent: 'flex-end' }}>
      <View style={{ alignSelf: 'flex-start', maxWidth: '75%', gap: 4 }}>
        <Skeleton width={180} height={42} borderRadius={16} />
        <Skeleton width={60} height={10} style={{ marginLeft: 4 }} />
      </View>

      <View style={{ alignSelf: 'flex-end', maxWidth: '75%', gap: 4 }}>
        <Skeleton width={220} height={56} borderRadius={16} />
        <Skeleton width={60} height={10} style={{ alignSelf: 'flex-end', marginRight: 4 }} />
      </View>

      <View style={{ alignSelf: 'flex-start', maxWidth: '75%', gap: 4 }}>
        <Skeleton width={140} height={36} borderRadius={16} />
        <Skeleton width={60} height={10} style={{ marginLeft: 4 }} />
      </View>

      <View style={{ alignSelf: 'flex-end', maxWidth: '75%', gap: 4 }}>
        <Skeleton width={190} height={44} borderRadius={16} />
        <Skeleton width={60} height={10} style={{ alignSelf: 'flex-end', marginRight: 4 }} />
      </View>

      <View style={{ alignSelf: 'flex-start', maxWidth: '75%', gap: 4 }}>
        <Skeleton width={240} height={70} borderRadius={16} />
        <Skeleton width={60} height={10} style={{ marginLeft: 4 }} />
      </View>
    </View>
  );
};

export const ProfileHeaderSkeleton: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {/* Cover skeleton */}
      <Skeleton width="100%" height={130} borderRadius={0} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {/* Avatar & Edit button row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40 }}>
          <Skeleton width={84} height={84} circle style={{ borderWidth: 3, borderColor: colors.bg }} />
          <Skeleton width={100} height={36} borderRadius={18} />
        </View>

        {/* Name and handle */}
        <View style={{ marginTop: 14, gap: 6 }}>
          <Skeleton width={150} height={20} />
          <Skeleton width={90} height={14} />
        </View>

        {/* Bio */}
        <View style={{ marginTop: 12, gap: 6 }}>
          <Skeleton width="90%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 20, marginTop: 14 }}>
          <Skeleton width={90} height={16} />
          <Skeleton width={90} height={16} />
        </View>
      </View>
    </View>
  );
};

export const CardRowSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const { colors } = useTheme();

  return (
    <View style={{ padding: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={{
            padding: 16,
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={38} height={38} borderRadius={10} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="55%" height={16} />
              <Skeleton width="35%" height={12} />
            </View>
          </View>
          <Skeleton width="85%" height={14} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

