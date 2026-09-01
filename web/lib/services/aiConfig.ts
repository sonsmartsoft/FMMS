export interface ProviderConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  modelOptions: string[];
  docsUrl: string;
  color: string;
  type: 'openai' | 'gemini' | 'claude' | 'custom';
}

export const MODERN_AI_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    label: 'Google Gemini (Khuyến nghị - Miễn phí)',
    description: 'Gemini 3.6 Flash / 1.5 Pro từ Google AI Studio. Tốc độ cực nhanh, có gói miễn phí.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-flash',
    modelOptions: [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash-latest',
    ],
    docsUrl: 'https://aistudio.google.com/apikey',
    color: '#4285F4',
    type: 'gemini',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    label: 'OpenAI (GPT-4o / o3-mini)',
    description: 'Trực tiếp từ OpenAI API. Hỗ trợ GPT-4o, GPT-4o-mini, o3-mini, o1.',
    defaultBaseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    modelOptions: [
      'gpt-4o-mini',
      'gpt-4o',
      'o3-mini',
      'o1-mini',
      'o1',
      'chatgpt-4o-latest',
      'gpt-4.5-preview',
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
    color: '#10A37F',
    type: 'openai',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    label: 'DeepSeek AI (V3 / R1)',
    description: 'DeepSeek V3 (chat thông minh) & R1 (suy luận toán/logic). Giá cực rẻ, chất lượng hàng đầu.',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    modelOptions: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
    docsUrl: 'https://platform.deepseek.com/api_keys',
    color: '#3B82F6',
    type: 'openai',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    label: 'Anthropic Claude (Claude 3.7 / 3.5)',
    description: 'Claude 3.7 Sonnet (Hybrid Reasoning), Claude 3.5 Sonnet & Haiku qua Anthropic API.',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-7-sonnet-20250219',
    modelOptions: [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: '#D97706',
    type: 'claude',
  },
  {
    id: 'chatgpt2api',
    name: 'ChatGPT2API / Gateway',
    label: 'Custom Gateway (ChatGPT2API / OneAPI / NewAPI)',
    description: 'Gateway tự host tại nhà (Cloudflare Tunnel, Docker) hoặc OneAPI/NewAPI proxy tương thích chuẩn OpenAI.',
    defaultBaseUrl: '',
    defaultModel: 'chatgpt/auto',
    modelOptions: [
      'chatgpt/auto',
      'gemini_free/auto',
      'deepseek/auto',
      'claude/auto',
      'gpt-4o',
      'gpt-4o-mini',
    ],
    docsUrl: 'https://github.com/TriTue2011/chatgpt2api',
    color: '#8B5CF6',
    type: 'custom',
  },
];

export interface AIPersona {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
}

export const AI_PERSONAS: AIPersona[] = [
  {
    id: 'financial_advisor',
    name: 'Chuyên Gia Quản Trị Chi Phí & Tối Ưu',
    description: 'Trình bày đẹp mắt, dùng bảng Markdown phân tích rõ ràng, có tóm tắt số liệu & lời khuyên tối ưu chi tiêu.',
    icon: '💼',
    systemPrompt: `Bạn là Cố Vấn Tài Chính & Vận Hành Phương Tiện Gia Đình (FMMS Senior Advisor).

QUY TẮC TRÌNH BÀY VÀ ĐỊNH DẠNG (BẮT BUỘC):
1. TRÌNH BÀY CÓ CẤU TRÚC RÕ RÀNG:
   - Dùng bảng Markdown chuẩn (| Hạng mục | Chi phí | Ghi chú |) khi liệt kê từ 2 số liệu trở lên.
   - In đậm toàn bộ số tiền và mốc ODO (VD: **820.000 ₫**, **12.500 km**).
   - Chia câu trả lời thành các phần rõ rệt:
     📌 **Tóm tắt nhanh**
     📊 **Chi tiết số liệu** (bảng biểu)
     💡 **Khuyến nghị & Đánh giá**
2. PHONG CÁCH & NGÔN NGỮ:
   - Tiếng Việt chuẩn mực, thông minh, chuyên nghiệp nhưng thân thiện.
   - Luôn dựa trên số liệu thực tế được cung cấp, không suy diễn số liệu ảo.`,
  },
  {
    id: 'concise',
    name: 'Ngắn Gọn & Súc Tích (Tối Giản)',
    description: 'Chỉ trả lời đúng trọng tâm câu hỏi, đưa ra con số chính xác và kết luận ngắn gọn, không giải thích dài dòng.',
    icon: '⚡',
    systemPrompt: `Bạn là trợ lý FMMS chế độ Ngắn Gọn (Ultra Concise).
Quy tắc:
- Trả lời thẳng vào câu hỏi trong tối đa 3-5 gạch đầu dòng ngắn gọn.
- Nêu rõ số tiền / thông số chính xác mà người dùng hỏi.
- Không chào hỏi dài dòng, không lặp lại câu hỏi.`,
  },
  {
    id: 'mechanic',
    name: 'Chuyên Viên Kỹ Thuật & Bảo Dưỡng Xe',
    description: 'Tập trung sâu vào an toàn kỹ thuật xe, nhắc lịch thay dầu, lốp xe, phụ tùng và định mức tiêu hao.',
    icon: '🔧',
    systemPrompt: `Bạn là Chuyên Gia Kỹ Thuật Ô Tô & Xe Máy của hệ thống FMMS.
Quy tắc:
- Ưu tiên phân tích tình trạng xe, định mức tiêu thụ nhiên liệu (L/100km), các mốc bảo dưỡng định kỳ (5.000km, 10.000km, 20.000km...).
- Cảnh báo kịp thời các hạng mục bảo dưỡng quá hạn hoặc chi phí sửa chữa bất thường.`,
  },
  {
    id: 'custom',
    name: 'Tùy Chỉnh Tự Do (Custom)',
    description: 'Tự nhập vai trò, xưng hô và phong cách trả lời theo ý thích của riêng bạn.',
    icon: '✍️',
    systemPrompt: '',
  },
];

export interface SavedProviderState {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface FMMSAIStorageConfig {
  defaultProvider: string;
  providers: Record<string, SavedProviderState>;
  personaId?: string;
  customSystemPrompt?: string;
}

export const LOCAL_AI_CONFIG_KEY = 'fmms_ai_config';

export function getClientAIConfig(): FMMSAIStorageConfig {
  if (typeof window === 'undefined') {
    return {
      defaultProvider: 'gemini',
      providers: {},
      personaId: 'financial_advisor',
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_AI_CONFIG_KEY);
    if (!raw) {
      return {
        defaultProvider: 'gemini',
        providers: {},
        personaId: 'financial_advisor',
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      defaultProvider: 'gemini',
      providers: {},
      personaId: 'financial_advisor',
    };
  }
}

export function saveClientAIConfig(config: FMMSAIStorageConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_AI_CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

export function getActiveAISettings(): {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  personaId: string;
} {
  const config = getClientAIConfig();
  const providerId = config.defaultProvider || 'gemini';
  const pCfg = config.providers?.[providerId] || {};
  const meta = MODERN_AI_PROVIDERS.find(p => p.id === providerId) || MODERN_AI_PROVIDERS[0];

  let chosenModel = pCfg.model || meta.defaultModel;
  if (providerId === 'gemini' && (chosenModel === 'gemini-2.0-flash' || chosenModel === 'gemini-1.0-pro' || !chosenModel)) {
    chosenModel = 'gemini-3.6-flash';
  }

  const personaId = config.personaId || 'financial_advisor';
  const persona = AI_PERSONAS.find(p => p.id === personaId) || AI_PERSONAS[0];
  const systemPrompt = personaId === 'custom' && config.customSystemPrompt
    ? config.customSystemPrompt
    : persona.systemPrompt;

  return {
    provider: providerId,
    baseUrl: pCfg.baseUrl || meta.defaultBaseUrl,
    apiKey: pCfg.apiKey || '',
    model: chosenModel,
    systemPrompt,
    personaId,
  };
}
