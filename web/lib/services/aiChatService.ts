export interface AIChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  providerUsed?: string;
  timestamp: string;
  toolCall?: { name: string; status: 'EXECUTED' | 'CONFIRMED'; result?: string };
}

const STORAGE_KEY = 'fmms_ai_chat_history';
const CHAT_CHANGE_EVENT = 'fmms_ai_chat_updated';

const DEFAULT_WELCOME_MESSAGE: AIChatMessage = {
  id: 'welcome-1',
  sender: 'ai',
  text: `Tôi là **FMMS AI Senior Advisor** — cố vấn thông minh quản trị chi phí & vận hành phương tiện gia đình của bạn.

Tôi có thể giúp bạn:
- 📊 **Phân tích chi phí**: Tổng hợp chi tiết theo từng xe & danh mục
- ⛽ **Nhiên liệu & Định mức**: Theo dõi L/100km và chi phí xăng/pin
- 🔧 **Kỹ thuật & Bảo dưỡng**: Nhắc nhở các mốc định kỳ và kiểm tra an toàn
- 🏦 **Khoản vay ngân hàng**: Dư nợ giảm dần, tính gốc lãi hàng kỳ

Hãy hỏi tôi bất cứ điều gì về các xe của bạn!`,
  timestamp: new Date().toISOString(),
};

export function getLocalChatHistory(): AIChatMessage[] {
  if (typeof window === 'undefined') return [DEFAULT_WELCOME_MESSAGE];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_WELCOME_MESSAGE];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_WELCOME_MESSAGE];
  } catch {
    return [DEFAULT_WELCOME_MESSAGE];
  }
}

export function saveLocalChatHistory(messages: AIChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent(CHAT_CHANGE_EVENT, { detail: messages }));
  } catch (e) {
    console.warn('[AI Chat Service] Failed to save chat history:', e);
  }
}

export function appendChatMessage(message: AIChatMessage): AIChatMessage[] {
  const current = getLocalChatHistory();
  const next = [...current, message];
  saveLocalChatHistory(next);
  return next;
}

export function clearChatHistory(): AIChatMessage[] {
  const initial = [DEFAULT_WELCOME_MESSAGE];
  saveLocalChatHistory(initial);
  return initial;
}

export function onChatHistoryChange(callback: (messages: AIChatMessage[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail) callback(e.detail);
    else callback(getLocalChatHistory());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getLocalChatHistory());
    }
  };

  window.addEventListener(CHAT_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CHAT_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
