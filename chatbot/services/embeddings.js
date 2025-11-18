import genAI from '../config/gemini.js';
import { getFromCache, saveToCache } from './cache.js';
import dotenv from 'dotenv';

dotenv.config();

const EMBEDDING_TIMEOUT = 8000;
const MIN_QUERY_LENGTH = 3; 
const EXPECTED_EMBEDDING_SIZE = 3072;

function validateQuery(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'INVALID_QUERY_TYPE' };
  }

  const trimmed = text.trim();

  if (!/[A-Za-z\u0600-\u06FF0-9]/.test(trimmed)) {
    return { 
      valid: false, 
      error: 'NON_TEXT_INPUT',
      message: 'Query must contain letters or numbers'
    };
  }

  const actualCharacters = trimmed.replace(/[^A-Za-z\u0600-\u06FF0-9]/g, '').length;
  
  if (actualCharacters < MIN_QUERY_LENGTH) {
    return { 
      valid: false, 
      error: 'EMPTY_QUERY',
      message: `Query too short (minimum ${MIN_QUERY_LENGTH} characters)`
    };
  }

  if (trimmed.length > 500) {
    return { 
      valid: false, 
      error: 'QUERY_TOO_LONG',
      message: 'Query is too long (max 500 characters)'
    };
  }

  console.log(` Query validated: "${trimmed}"`);
  return { valid: true, text: trimmed };
}

function validateEmbedding(embedding, expectedSize = EXPECTED_EMBEDDING_SIZE) {
  if (!Array.isArray(embedding)) {
    throw new Error('Invalid embedding format: not an array');
  }

  if (embedding.length === 0) {
    throw new Error('Empty embedding array returned');
  }

  if (embedding.length !== expectedSize) {
    console.warn(` Embedding size mismatch: got ${embedding.length}, expected ${expectedSize}`);

    if (embedding.length < 100 || embedding.length > 5000) {
      throw new Error(`EMBEDDING_SIZE_INVALID: ${embedding.length}`);
    }
  }

  return embedding;
}

export const generateEmbedding = async (text, timeout = EMBEDDING_TIMEOUT) => {
  try {
    const validation = validateQuery(text);
    if (!validation.valid) {
      throw new Error(`QUERY_VALIDATION_FAILED: ${validation.error}`);
    }

    const cachedEmbedding = await getFromCache('embedding', validation.text);
    if (cachedEmbedding) {
      console.log(` Cache HIT: Embedding retrieved from Redis`);
      return cachedEmbedding;
    }

    console.log(` Generating embedding for: "${validation.text.substring(0, 50)}..."`);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('EMBEDDING_TIMEOUT')), timeout)
    );

    const result = await Promise.race([
      genAI.models.embedContent({
        model: "gemini-embedding-001",
        contents: validation.text,
      }),
      timeoutPromise,
    ]);

    if (!result.embeddings || !result.embeddings[0]) {
      throw new Error('No embedding returned from API');
    }

    const embedding = validateEmbedding(result.embeddings[0].values);

    await saveToCache('embedding', validation.text, embedding);
    console.log(` Embedding generated and cached`);

    return embedding;

  } catch (error) {
    console.error(' Embedding error:', error.message);

    if (error.message === 'EMBEDDING_TIMEOUT') {
      throw new Error('EMBEDDING_TIMEOUT');
    }

    throw new Error(`EMBEDDING_GENERATION_FAILED: ${error.message}`);
  }
};

export const generateBookEmbedding = async (book) => {
  if (!book.name || !book.author) {
    throw new Error('Book must have name and author');
  }

  const bookText = `Title: ${book.name}\nAuthor: ${book.author}\nDescription: ${book.description || ''}\nEdition: ${book.Edition || ''}\nLanguage: ${book.bookLanguage || ''}\nRecommendedAge: ${book.recommendedAge || ''}\nPages: ${book.noOfPages || 0}`.trim();

  return await generateEmbedding(bookText);
};

export const extractPriceRange = async (query) => {
  const DEFAULT_RANGE = { minPrice: null, maxPrice: null };

  try {
    const cachedPrice = await getFromCache('priceExtract', query);
    if (cachedPrice) {
      console.log(` Cache HIT: Price range retrieved from Redis`);
      return cachedPrice;
    }

    const validation = validateQuery(query);
    if (!validation.valid) {
      return DEFAULT_RANGE;
    }

    console.log(` Extracting price range from: "${query}"`);

    const prompt = `Extract price range from: "${validation.text}". Reply with ONLY JSON: {"minPrice": number or null, "maxPrice": number or null}`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return DEFAULT_RANGE;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validation
    if (parsed.minPrice !== null && parsed.minPrice < 0) parsed.minPrice = null;
    if (parsed.maxPrice !== null && parsed.maxPrice < 0) parsed.maxPrice = null;

    if (
      parsed.minPrice !== null &&
      parsed.maxPrice !== null &&
      parsed.minPrice > parsed.maxPrice
    ) {
      [parsed.minPrice, parsed.maxPrice] = [parsed.maxPrice, parsed.minPrice];
    }

    await saveToCache('priceExtract', query, parsed);
    console.log(` Price range cached`);

    return parsed;

  } catch (error) {
    console.error(' Price extraction error:', error.message);
    return DEFAULT_RANGE;
  }
};

export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string') return 'en';

  const trimmed = text.trim();
  const arabicChars = trimmed.match(/[\u0600-\u06FF]/g) || [];
  const latinChars = trimmed.match(/[A-Za-z]/g) || [];

  if (arabicChars.length && !latinChars.length) return 'ar';
  if (latinChars.length && !arabicChars.length) return 'en';

  if (arabicChars.length > latinChars.length) return 'ar';
  if (latinChars.length > arabicChars.length) return 'en';

  return 'en';
};