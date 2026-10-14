export type ImageResolution = '1K' | '2K' | '4K';
export type AspectRatio = '16:9' | '1:1' | '9:16' | '4:3';

export type VoiceName = 'Kore' | 'Fenrir' | 'Puck' | 'Zephyr' | 'Charon';

export type BreathPatternType = 'box' | '4-7-8' | 'coherence' | 'natural';

export type SoundscapeType =
  | 'ocean'
  | 'singing-bowls'
  | 'forest-rain'
  | 'theta-binaural'
  | 'alpha-flow'
  | 'zen-stream';

export interface ScriptSegment {
  cueTimeSec: number;
  text: string;
}

export interface MeditationSession {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  imageUrl: string;
  imagePrompt?: string;
  imageSize: ImageResolution;
  aspectRatio?: AspectRatio;
  voice: VoiceName;
  voiceStyle?: string;
  audioBase64?: string; // Generated TTS audio wav base64
  soundscape: SoundscapeType;
  breathTechnique: BreathPatternType;
  fullScript: string;
  segments: ScriptSegment[];
  isCustom?: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  suggestedSession?: Partial<MeditationSession>;
}

export type ChatModel =
  | 'gemini-3.5-flash'
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-flash-lite';

export type ChatPersona = 'zen_master' | 'somatic_guide' | 'neuro_mindfulness';

export interface JournalEntry {
  id: string;
  sessionId: string;
  sessionTitle: string;
  date: string;
  durationMinutes: number;
  stressBefore: number; // 1-10
  calmnessAfter: number; // 1-10
  notes: string;
}
