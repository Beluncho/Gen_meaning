export type Goal = 'sell' | 'explain' | 'persuade' | 'simplify' | 'entertain';
export type Audience = 'beginner' | 'expert' | 'client' | 'child' | 'general';
export type Tonality = 'business' | 'friendly' | 'inspiring' | 'aggressive' | 'ironic';
export type Formality = 'low' | 'medium' | 'high';
export type Length = 'short' | 'medium' | 'detailed';

export interface TransformationParams {
  goal: Goal;
  audience: Audience;
  tonality: Tonality;
  formality: Formality;
  length: Length;
  simplifyTerms: boolean;
}

export interface TransformationResult {
  adapted: string;
  neutral: string;
  changes: string;
}

export interface RequestRecord {
  id: string;
  title: string;
  sourceText: string;
  params: TransformationParams;
  result: TransformationResult | null;
  createdAt: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  apiKey: string;
}
