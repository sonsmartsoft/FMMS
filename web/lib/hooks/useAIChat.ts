'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AIChatMessage,
  getLocalChatHistory,
  appendChatMessage,
  clearChatHistory,
  onChatHistoryChange,
} from '@/lib/services/aiChatService';
import { getActiveAISettings } from '@/lib/services/aiConfig';

export function useAIChat() {
  const [messages, setMessages] = useState<AIChatMessage[]>(() => getLocalChatHistory());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sync initial state
    setMessages(getLocalChatHistory());

    // Subscribe to cross-component and cross-tab chat updates
    const unsubscribe = onChatHistoryChange((updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(async (promptText: string, currentAssetId?: string, overrideProvider?: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    // 1. Immediately append to shared history
    appendChatMessage(userMsg);
    setLoading(true);

    try {
      const activeSettings = getActiveAISettings();
      const providerToUse = overrideProvider || activeSettings.provider;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          provider: providerToUse,
          model: activeSettings.model,
          systemPrompt: activeSettings.systemPrompt,
          apiKey: activeSettings.apiKey,
          baseUrl: activeSettings.baseUrl,
          assetId: currentAssetId,
        }),
      });

      const data = await res.json();
      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'AI không trả về nội dung.',
        providerUsed: data.providerUsed,
        timestamp: new Date().toISOString(),
        toolCall: data.toolCall,
      };

      // 2. Append AI response to shared history
      appendChatMessage(aiMsg);
    } catch {
      const errorMsg: AIChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ Không thể kết nối với server AI. Vui lòng kiểm tra lại kết nối mạng hoặc Cài đặt AI.',
        timestamp: new Date().toISOString(),
      };
      appendChatMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const resetHistory = useCallback(() => {
    clearChatHistory();
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearHistory: resetHistory,
  };
}
