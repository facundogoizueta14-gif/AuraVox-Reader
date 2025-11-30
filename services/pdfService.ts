
import { TextChunk } from "../types";

// Helper to yield to main thread to prevent UI freezing
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

// Function to extract text from a PDF file
export const extractTextFromPdf = async (file: File): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // @ts-ignore
      const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
      let fullTextParts: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // @ts-ignore
        const pageItems = textContent.items.map((item) => item.str);
        
        // Strict filtering to remove garbage, page numbers, and headers
        const filteredItems = pageItems.filter((str: string) => {
          const trimmed = str.trim();
          if (!trimmed) return false;
          // Filter strictly numeric lines less than 5 chars (likely page numbers)
          if (/^\d{1,5}$/.test(trimmed)) return false; 
          // Filter common footer artifacts
          if (/Page \d+/i.test(trimmed)) return false;
          return true;
        });

        // Heuristic: Join lines to form paragraphs
        let pageText = "";
        for (const line of filteredItems) {
            // If the line ends with a hyphen, remove it and join directly
            if (line.trim().endsWith('-')) {
                pageText += line.trim().slice(0, -1);
            } 
            // If previous text didn't end in punctuation, assume flow-on sentence
            else if (pageText.length > 0 && !/[.!?]$/.test(pageText.trim())) {
                pageText += " " + line;
            } else {
                pageText += "\n\n" + line;
            }
        }

        fullTextParts.push(pageText);

        if (i % 5 === 0) await yieldToMain();
      }

      resolve(fullTextParts.join('\n')); 
    } catch (err) {
      reject(err);
    }
  });
};

export const chunkText = (text: string, maxChars: number = 1000): TextChunk[] => {
  // Normalize newlines
  const normalized = text.replace(/\r\n/g, '\n');
  // Split by double newline (paragraphs)
  const rawParagraphs = normalized.split(/\n\s*\n/g);
  
  const chunks: TextChunk[] = [];
  let currentId = 0;
  
  // Buffer to combine short lines into decent sized chunks
  let currentBuffer = "";

  for (const para of rawParagraphs) {
    const cleanPara = para.replace(/\s+/g, ' ').trim();
    
    // Skip empty or garbage
    if (!cleanPara || cleanPara.length < 2) continue;
    // Skip isolated numbers or symbols
    if (!/[a-zA-Z]/.test(cleanPara)) continue;

    // Check if adding this paragraph exceeds limit
    if ((currentBuffer.length + cleanPara.length) > maxChars) {
        // Push current buffer if valid
        if (currentBuffer.length > 0) {
            chunks.push({ id: currentId++, text: currentBuffer.trim() });
            currentBuffer = "";
        }
        
        // If the new paragraph itself is too huge, we must split it (rare, but safe)
        if (cleanPara.length > maxChars) {
             const sentences = cleanPara.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanPara];
             for (const sentence of sentences) {
                 if ((currentBuffer.length + sentence.length) > maxChars) {
                     chunks.push({ id: currentId++, text: currentBuffer.trim() });
                     currentBuffer = sentence;
                 } else {
                     currentBuffer += (currentBuffer ? " " : "") + sentence;
                 }
             }
        } else {
            currentBuffer = cleanPara;
        }
    } else {
        // Append to buffer
        currentBuffer += (currentBuffer ? "\n\n" : "") + cleanPara;
    }
  }

  // Flush remaining
  if (currentBuffer.trim().length > 0) {
     chunks.push({ id: currentId++, text: currentBuffer.trim() });
  }

  return chunks;
};
