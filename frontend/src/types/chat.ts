export type Language = 'vi' | 'en';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tags?: string[];
  toolCalls?: string[];
  kbSources?: string[];
  timestamp: number;
}

export interface ChatSessionInfo {
  sessionId: string;
}

export interface ChatSendResponse {
  content: string;
  tags?: string[];
  toolCalls?: string[];
  sessionId: string;
}