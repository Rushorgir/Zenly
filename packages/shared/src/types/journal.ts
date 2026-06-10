export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface Sentiment {
  score: number;
  label: SentimentLabel;
  confidence: number;
  primaryEmotions?: string[];
  reasoning?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  level: RiskLevel;
  factors: string[];
  confidence: number;
  isCrisis?: boolean;
}

export interface AIAnalysis {
  summary: string;
  insights: string[];
  sentiment: Sentiment;
  riskAssessment: RiskAssessment;
  themes?: string[];
  suggestedActions?: string[];
  processedAt?: string;
}

export type JournalStatus = 'draft' | 'analyzing' | 'analyzed' | 'error';

export interface Journal {
  _id: string;
  content: string;
  mood: number;
  tags?: string[];
  status: JournalStatus;
  aiAnalysis?: AIAnalysis;
  conversationId?: string;
  createdAt: string;
  updatedAt?: string; // profile/page.tsx has only createdAt, but journal/page.tsx has updatedAt: string
}

export interface Message {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status?: 'sending' | 'delivered' | 'error';
  aiMetadata?: {
    isCrisis?: boolean;
    riskLevel?: RiskLevel;
    model?: string;
  };
}
