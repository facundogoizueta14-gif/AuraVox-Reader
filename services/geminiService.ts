
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_VOICE_MAP } from "../constants";
import { base64ToUint8Array, pcmToWav } from "./audioService";
import { VoiceOption } from "../types";

// Helper to check for API key
export const checkApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

// Sanitize text to remove control characters that might confuse the model
const sanitizeText = (text: string): string => {
  return text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
    .trim();
};

// Main TTS function
export const generateSpeech = async (
  text: string, 
  voiceName: string
): Promise<Blob> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const cleanText = sanitizeText(text);
  if (!cleanText || cleanText.length < 2) {
    // Return silent audio or throw specific error? 
    // Throwing error allows the app to skip or retry.
    throw new Error("Text is too short or empty after sanitization.");
  }

  // Resolve voice name if it's one of our internal options
  const mappedVoiceName = GEMINI_VOICE_MAP[voiceName as VoiceOption] || voiceName;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        // Use string literal 'AUDIO' to avoid runtime enum issues
        responseModalities: ['AUDIO'], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: mappedVoiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      console.error("Gemini Response missing audio:", JSON.stringify(response, null, 2));
      
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason) {
        throw new Error(`Gemini blocked generation. Reason: ${finishReason}`);
      }
      
      throw new Error("No audio data received from Gemini.");
    }

    const pcmData = base64ToUint8Array(base64Audio);
    return pcmToWav(pcmData, 24000, 1);

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    if (error instanceof Error && (error as any).response) {
         try {
            const errorBody = await (error as any).response.text();
            console.error("API Error Body:", errorBody);
         } catch (e) { /* ignore */ }
    }
    throw error;
  }
};
