
import { FontFamily, VoiceOption, AmbienceType } from "./types";

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'sans', label: 'Inter (Modern)' },
  { value: 'serif', label: 'Merriweather (Classic)' },
  { value: 'display', label: 'Playfair (Elegant)' },
  { value: 'lora', label: 'Lora (Reading)' },
  { value: 'mono', label: 'Roboto Mono (Code)' },
];

export const DB_NAME = 'LuminaReaderDB';
export const STORE_BOOKS = 'books';
export const STORE_SETTINGS = 'settings';

// Model configuration
export const GEMINI_MODEL = 'gemini-2.5-flash-preview-tts';

// Audio constraints - Optimized to 800 chars for faster "Time to First Audio"
export const MAX_CHUNK_LENGTH = 800;

export const GEMINI_VOICE_MAP: Record<VoiceOption, string> = {
  [VoiceOption.PEPE]: 'Fenrir',
  [VoiceOption.FEFE]: 'Charon',
  [VoiceOption.CARLITO]: 'Puck',
  [VoiceOption.MARGARITA]: 'Kore',
  [VoiceOption.ANASTASIA]: 'Zephyr',
  [VoiceOption.JUANA]: 'Kore',
};

export const AMBIENCE_SOUNDS: Record<AmbienceType, { label: string; src: string | null }> = {
  none: { label: 'Off', src: null },
  rain: { label: 'Rain', src: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_b2b643e264.mp3' },
  cafe: { label: 'Cafe', src: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_6508f75267.mp3' },
  nature: { label: 'Nature', src: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_346210f9b3.mp3' },
  fire: { label: 'Fireplace', src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3' },
};
