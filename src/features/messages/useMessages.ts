import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../query/queryKeys';
import { Conversation, Message } from '../../types';

export const useConversations = () => {
  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: async () => {
      const { data } = await apiClient.get('/messages/conversations');
      return {
        conversations: (data.conversations || []) as Conversation[],
        totalUnreadCount: data.totalUnreadCount || 0,
      };
    },
    refetchInterval: 5000,
  });
};

export const useConversation = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.messages.conversation(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/conversation/${conversationId}`);
      return data as Conversation;
    },
    enabled: !!conversationId,
  });
};

export const useMessages = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.messages.messages(conversationId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/messages/${conversationId}`);
      return (data.messages || []) as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: 4000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.message as Message;
    },
    onSuccess: (newMessage, variables) => {
      // @ts-ignore
      const conversationId = variables?._parts?.find((p: any) => p[0] === 'conversationId')?.[1];
      if (conversationId) {
        queryClient.setQueryData(
          queryKeys.messages.messages(conversationId),
          (old: Message[] = []) => [...old, newMessage]
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
      }
    },
  });
};

export const useMarkMessagesRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await apiClient.post(`/messages/read/${conversationId}`);
      return data;
    },
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
  });
};

export const useAudioSignature = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/messages/audio/upload-signature');
      return data as {
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
        resourceType: string;
      };
    },
  });
};
