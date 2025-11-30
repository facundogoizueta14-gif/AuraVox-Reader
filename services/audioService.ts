/**
 * Converts raw PCM data (Float32 or Int16) to a valid WAV Blob.
 * Gemini API typically returns raw PCM.
 */
export const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob => {
  // The raw data from Gemini 2.5 TTS is typically PCM 16-bit little-endian or Float32 depending on decoding.
  // The base64 decoded string from the API is raw bytes.
  
  // Create WAV header
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const totalDataLen = pcmData.length;
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalDataLen, true);
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, totalDataLen, true);
  
  return new Blob([header, pcmData], { type: 'audio/wav' });
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Base64 decoder for standard JS environment
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
