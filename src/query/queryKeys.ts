export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  user: {
    profile: (userId: string) => ['user', 'profile', userId] as const,
    suggested: ['user', 'suggested'] as const,
    followers: (userId: string) => ['user', 'followers', userId] as const,
    following: (userId: string) => ['user', 'following', userId] as const,
    sessions: ['user', 'sessions'] as const,
    search: (q: string) => ['user', 'search', q] as const,
  },
  posts: {
    feed: ['posts', 'feed'] as const,
    following: ['posts', 'following'] as const,
    suggested: ['posts', 'suggested'] as const,
    userPosts: (userId: string) => ['posts', 'user', userId] as const,
    userReplies: (userId: string) => ['posts', 'replies', userId] as const,
    userReposts: (userId: string) => ['posts', 'reposts', userId] as const,
    bookmarked: ['posts', 'bookmarked'] as const,
    detail: (postId: string) => ['posts', 'detail', postId] as const,
    comments: (postId: string) => ['posts', 'comments', postId] as const,
  },
  messages: {
    conversations: ['messages', 'conversations'] as const,
    conversation: (id: string) => ['messages', 'conversation', id] as const,
    messages: (conversationId: string) => ['messages', 'list', conversationId] as const,
    media: (conversationId: string) => ['messages', 'media', conversationId] as const,
    pinned: (conversationId: string) => ['messages', 'pinned', conversationId] as const,
    scheduled: ['messages', 'scheduled'] as const,
  },
  notifications: {
    all: ['notifications', 'all'] as const,
  },
};
