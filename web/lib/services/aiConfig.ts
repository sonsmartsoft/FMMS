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
    defaultModel: 'gemini-3.6-flash',
    modelOptions: [
      'gemini-3.6-flash',
      'gemini-2.5-flash',
      'gemini-1.5-flash',
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

export interface SavedProviderState {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface FMMSAIStorageConfig {
  defaultProvider: string;
  providers: Record<string, SavedProviderState>;
}

export const LOCAL_AI_CONFIG_KEY = 'fmms_ai_config';

export function getClientAIConfig(): FMMSAIStorageConfig {
  if (typeof window === 'undefined') {
    return {
      defaultProvider: 'gemini',
      providers: {},
    };
  }

  try {
    const raw = localStorage.getItem(LOCAL_AI_CONFIG_KEY);
    if (!raw) {
      return {
        defaultProvider: 'gemini',
        providers: {},
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      defaultProvider: 'gemini',
      providers: {},
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
} {
  const config = getClientAIConfig();
  const providerId = config.defaultProvider || 'gemini';
  const pCfg = config.providers?.[providerId] || {};
  const meta = MODERN_AI_PROVIDERS.find(p => p.id === providerId) || MODERN_AI_PROVIDERS[0];

  let chosenModel = pCfg.model || meta.defaultModel;
  // If an old obsolete gemini model was stored in localStorage, upgrade it automatically to gemini-3.6-flash
  if (providerId === 'gemini' && (chosenModel === 'gemini-2.0-flash' || chosenModel === 'gemini-1.0-pro' || !chosenModel)) {
    chosenModel = 'gemini-3.6-flash';
  }

  return {
    provider: providerId,
    baseUrl: pCfg.baseUrl || meta.defaultBaseUrl,
    apiKey: pCfg.apiKey || '',
    model: chosenModel,
  };
}
