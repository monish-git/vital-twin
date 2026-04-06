// services/chunkingService.ts
// Text chunking service for RAG (Retrieval-Augmented Generation)

export interface Chunk {
  id: string;
  text: string;
  metadata?: {
    docId: string;
    docName: string;
    page?: number;
    index: number;
  };
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Split text into overlapping chunks
 * @param text - The text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { chunkSize = 500, chunkOverlap = 100 } = options;
  
  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleanedText) return [];

  // If text is shorter than chunk size, return as single chunk
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    // Calculate end index
    let endIndex = startIndex + chunkSize;
    
    // If not at the end, try to break at a sentence or paragraph boundary
    if (endIndex < cleanedText.length) {
      // Look for sentence endings within the last 50 characters
      const searchStart = Math.max(0, endIndex - 50);
      const searchEnd = endIndex;
      const searchText = cleanedText.substring(searchStart, searchEnd);
      
      // Try to find sentence endings: . ! ? followed by space or end
      const sentenceMatch = searchText.match(/[.!?]\s+[A-Z]|[.!?]$/);
      
      if (sentenceMatch && sentenceMatch.index !== undefined) {
        // Adjust end index to sentence boundary
        const sentenceEndPos = sentenceMatch.index + sentenceMatch[0].length;
        endIndex = searchStart + sentenceEndPos;
      } else {
        // Try to break at a newline
        const newlineIndex = searchText.lastIndexOf('\n');
        if (newlineIndex > searchStart) {
          endIndex = newlineIndex + 1;
        }
      }
    }

    // Extract chunk
    const chunk = cleanedText.substring(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // Move to next chunk (with overlap)
    const nextStartIndex = endIndex - chunkOverlap;
    
    // Ensure we make progress
    if (nextStartIndex <= startIndex) {
      startIndex = endIndex;
    } else {
      startIndex = nextStartIndex;
    }
    
    // Prevent infinite loop
    if (startIndex >= cleanedText.length) break;
  }

  return chunks;
}

/**
 * Create chunk objects with metadata
 * @param text - Text to chunk
 * @param docId - Document ID
 * @param docName - Document name
 * @param options - Chunking options
 * @returns Array of Chunk objects
 */
export function createChunks(
  text: string,
  docId: string,
  docName: string,
  options: ChunkOptions = {}
): Chunk[] {
  const textChunks = chunkText(text, options);
  
  return textChunks.map((textChunk, index) => ({
    id: `${docId}-chunk-${index}`,
    text: textChunk,
    metadata: {
      docId,
      docName,
      index,
    },
  }));
}

/**
 * Extract text from extracted lines (for OCR results)
 * @param lines - Array of text lines from OCR
 * @returns Combined and cleaned text
 */
export function combineOcrLines(lines: string[]): string {
  if (!lines || lines.length === 0) return '';
  
  return lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

