
export interface Book {
  id: string;
  title: string;
  content: string; // Full text content
  chunks: TextChunk[];
  lastPosition: number; // Index of the chunk currently being read
  bookmarks?: number[]; // Indices of bookmarked chunks
  createdAt: number;
}

export interface TextChunk {
  id: number;
  text: string;
  isHeading?: boolean;
}

export interface AudioCache {
  chunkId: number;
  blobUrl: string;
  duration: number;
}

export enum AppState {
  LIBRARY = 'LIBRARY',
  READING = 'READING',
}

export enum VoiceOption {
  // MALE VOICES
  PEPE = 'voice_pepe',   // Deep, Authoritative -> Cientifico
  FEFE = 'voice_fefe',   // Standard, Balanced -> Ensayo
  CARLITO = 'voice_carlito',  // Energetic, Playful -> Relatos/Aventura

  // FEMALE VOICES
  MARGARITA = 'voice_margarita',   // Balanced, Warm -> Narrativa
  ANASTASIA = 'voice_anastasia', // Soft, Ethereal -> Poesia/Suave
  JUANA = 'voice_juana',       // Professional -> Informativa
}

export const VOICE_LABELS: Record<VoiceOption, string> = {
  [VoiceOption.PEPE]: 'Pepe (Hombre - Científico)',
  [VoiceOption.FEFE]: 'Fefe (Hombre - Ensayo)',
  [VoiceOption.CARLITO]: 'Carlito (Hombre - Aventura)',
  [VoiceOption.MARGARITA]: 'Margarita (Mujer - Narrativa)',
  [VoiceOption.ANASTASIA]: 'Anastasia (Mujer - Suave)',
  [VoiceOption.JUANA]: 'Juana (Mujer - Informativa)',
};

export type FontFamily = 'sans' | 'serif' | 'mono' | 'display' | 'lora';

export type AmbienceType = 'none' | 'rain' | 'cafe' | 'nature' | 'fire';

export interface Settings {
  voice: VoiceOption;
  speed: number; // 0.25 to 2.0
  fontFamily: FontFamily;
  fontSize: number; // px
  pitch: number; // -10 to 10 (Legacy/Unused but kept for DB compatibility if needed, or ignored)
  ambience: AmbienceType;
  ambienceVolume: number; // 0.0 to 1.0
}

export const DEFAULT_SETTINGS: Settings = {
  voice: VoiceOption.MARGARITA,
  speed: 1.0,
  fontFamily: 'sans',
  fontSize: 14,
  pitch: 0,
  ambience: 'none',
  ambienceVolume: 0.1,
};
