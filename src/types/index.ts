export interface UserSettings {
  theme?: 'system' | 'dark' | 'light';
  privacy?: {
    privateAccount?: boolean;
    allowDirectMessages?: 'everyone' | 'followers' | 'none';
    showActivityStatus?: boolean;
    searchIndexing?: boolean;
  };
  notificationPreferences?: {
    likes?: boolean;
    comments?: boolean;
    follows?: boolean;
    messages?: boolean;
    bookmarks?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  };
  userNotificationControls?: Array<{
    targetUser: string;
    level: 'all' | 'posts_only' | 'none';
  }>;
}

export interface User {
  _id: string;
  id?: string;
  username: string;
  email?: string;
  avatar?: string;
  coverImage?: string;
  role?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  blockedUsers?: string[];
  postCount?: number;
  pinnedPost?: any;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  settings?: UserSettings;
}

export interface PostMedia {
  url: string;
  fileType: 'image' | 'video';
  publicId?: string;
  _id?: string;
}

export interface Post {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    avatar?: string;
    blockedUsers?: string[];
    followers?: string[];
  };
  content?: string;
  media?: PostMedia[];
  visibility?: 'public' | 'followers' | 'mentions' | 'private';
  mentions?: string[];
  likes: string[];
  likesCount?: number;
  commentCount: number;
  bookMark: string[];
  reposts: string[];
  quotedPost?: Post | null;
  quoteCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  postId: string;
  authorId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  members: Array<{
    _id: string;
    username: string;
    avatar?: string;
    email?: string;
  }>;
  lastMessage?: Message | null;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupAvatarPublicId?: string;
  groupAdmin?: string | { _id: string; username?: string; avatar?: string };
  messagingMode?: 'ALL_MEMBERS' | 'ADMINS_ONLY';
  disappearingMessages?: {
    enabled: boolean;
    duration: 'off' | '24h' | '7d' | '30d';
  };
  pinnedMessages?: string[];
  unreadCount?: number;
  updatedAt: string;
  createdAt: string;
}

export interface AudioMetadata {
  url: string;
  publicId: string;
  duration: number;
  mimeType?: string;
  fileSize?: number;
}

export interface MessageMedia {
  url: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  publicId?: string;
  _id?: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  text?: string;
  messageType: 'text' | 'media' | 'voice';
  audio?: AudioMetadata | null;
  media?: MessageMedia[];
  replyTo?: {
    _id: string;
    text?: string;
    messageType?: string;
    media?: MessageMedia[];
    audio?: AudioMetadata | null;
    sender?: {
      _id: string;
      username: string;
      avatar?: string;
    };
    createdAt?: string;
  } | null;
  isEdited?: boolean;
  editedAt?: string | null;
  isPinned?: boolean;
  isForwarded?: boolean;
  forwardedFrom?: {
    senderName?: string | null;
    senderId?: string | null;
    originalMessageId?: string | null;
  };
  mentions?: Array<{
    _id: string;
    username: string;
    avatar?: string;
  }>;
  status: 'sending' | 'delivered' | 'read' | 'failed';
  isRead?: boolean;
  readBy?: Array<{
    user: string;
    readAt: string;
  }>;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationItem {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  receiver: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'bookmark' | 'repost' | 'quote' | 'mention';
  post?: Post | string;
  message?: Message | string;
  conversationId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserSession {
  _id: string;
  sessionId: string;
  deviceId: string;
  browser: string;
  os: string;
  deviceType: string;
  userAgent: string;
  ipAddress: string;
  lastActive: string;
  revokedAt: string | null;
  isCurrent?: boolean;
}

export interface ScheduledMessage {
  _id: string;
  sender: string;
  conversationId: {
    _id: string;
    isGroup?: boolean;
    groupName?: string;
    groupAvatar?: string;
    members?: Array<{
      _id: string;
      username: string;
      avatar?: string;
    }>;
  };
  text: string;
  media?: MessageMedia[];
  scheduledFor: string;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
