import genAI from '../config/gemini.js';
import { searchBooks } from './vectorSearch.js';
import { detectLanguage, extractPriceRange } from './embeddings.js';
import { getFromCache, saveToCache } from './cache.js';

const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const MAX_RESPONSE_LENGTH = 1000;
const DEFAULT_LIMIT = 3;

const FALLBACK_MESSAGES = {
  ar: {
    timeout: '⏱️ عذراً، استغرقت العملية وقتاً طويلاً.',
    error: '❌ حدث خطأ مؤقت. حاول لاحقاً.',
    empty: '📚 لم أتمكن من إيجاد كتب مناسبة.',
    noBooks: 'للأسف، لا توجد كتب تطابق بحثك. 💡 اقترح عليك بعض الكتب:',
    emptyQuery: '📝 برجاء اكتب استعلام أكثر وضوحاً.',
    indexError: '⚠️ حدث خطأ في إعدادات النظام.',
    nonText: '⚠️ يرجى كتابة استعلام نصي صحيح.',
  },
  en: {
    timeout: '⏱️ Sorry, request took too long.',
    error: '❌ An error occurred.',
    empty: '📚 Could not find suitable books.',
    noBooks: 'Sorry, no books match your search. 💡 Here are some suggestions:',
    emptyQuery: '📝 Please write a clearer query.',
    indexError: '⚠️ System configuration error.',
    nonText: '⚠️ Please enter a valid text query.',
  },
};

async function executeWithRetry(asyncFn, maxRetries = MAX_RETRIES, timeoutMs = TIMEOUT_MS) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      );
      return await Promise.race([asyncFn(), timeoutPromise]);
    } catch (error) {
      console.error(` Attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

function sanitizeAIResponse(text, maxLength = MAX_RESPONSE_LENGTH) {
  if (!text) return null;
  let cleaned = text.trim().replace(/``````/g, '').replace(/`/g, '').replace(/\s+/g, ' ');
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength) + '...';
  return cleaned.length < 10 ? null : cleaned;
}

export const generateChatResponse = async (db, userQuery, options = {}) => {
  const language = detectLanguage(userQuery);
  const fallback = FALLBACK_MESSAGES[language];
  const limit = options.limit || DEFAULT_LIMIT;

  try {
    console.log(`🌐 Language: ${language === 'ar' ? 'Arabic' : 'English'}`);
    console.log(`📚 Using limit: ${limit} books`);

    const cacheKey = `${userQuery}_${JSON.stringify(options)}`;
    const cachedResponse = await getFromCache('aiResponse', cacheKey);
    if (cachedResponse) {
      console.log(` Cache HIT: Full response retrieved from Redis`);
      return { ...cachedResponse, fromCache: true };
    }

    let relevantBooks;
    let isEmptySearch = false;
    try {
      const searchResult = await executeWithRetry(() =>
        searchBooks(userQuery, { 
          limit,
          filter: options.filter || {} 
        })
      );
      
      relevantBooks = searchResult;
      isEmptySearch = searchResult.isEmptySearch || false; 
    } catch (error) {
      console.error(' Vector search failed:', error.message);

      let responseMessage = fallback.error;
      let errorCode = 'SEARCH_ERROR';

      if (error.message === 'TIMEOUT') {
        responseMessage = fallback.timeout;
        errorCode = 'SEARCH_TIMEOUT';
      } else if (error.message.includes('NON_TEXT_INPUT')) {
        responseMessage = fallback.nonText;
        errorCode = 'NON_TEXT_INPUT';
      } else if (error.message.includes('EMPTY_QUERY')) {
        responseMessage = fallback.emptyQuery;
        errorCode = 'EMPTY_QUERY';
      }

      return {
        response: responseMessage,
        books: [],
        metadata: { query: userQuery, language, errorCode, limit },
      };
    }

    if (!relevantBooks || relevantBooks.length === 0) {
      return {
        response: fallback.noBooks,
        books: [],
        metadata: { query: userQuery, language, booksFound: 0, limit, isEmptySearch: true },
      };
    }

    console.log(` Found ${relevantBooks.length} books (showing ${Math.min(relevantBooks.length, limit)})${isEmptySearch ? ' [SUGGESTIONS]' : ''}`);

    const context = relevantBooks
      .slice(0, limit)
      .map(
        (book, i) =>
          language === 'ar'
            ? `الكتاب ${i + 1}: ${book.name} | ${book.author} | ${book.genreName}`
            : `Book ${i + 1}: ${book.name} | ${book.author} | ${book.genreName}`
      )
      .join('\n');

    let systemPrompt;
    if (isEmptySearch) {
      systemPrompt =
        language === 'ar'
          ? 'أنت مساعد كتب ذكي. هذه اقتراحات من الكتب المتاحة بما أن البحث لم يعط نتائج. قدّم هذه الاقتراحات بودية. ⚠️ لا تضف معلومات غير موجودة.'
          : 'You are a helpful book assistant. These are suggestions since the search didn\'t return results. Present them kindly. ⚠️ Do not add information you don\'t have.';
    } else {
      systemPrompt =
        language === 'ar'
          ? 'أنت مساعد كتب ذكي في متجر "كتابي". أجب بإيجاز وودّية. ⚠️ لا تضف معلومات غير موجودة.'
          : 'You are a helpful book assistant for "Ketabi" bookstore. Answer briefly and kindly. ⚠️ Do not add information you don\'t have.';
    }

    const userMessage =
      language === 'ar'
        ? `${isEmptySearch ? 'اقتراحات:' : 'سؤال:'} ${userQuery}\n\nالكتب: ${context}`
        : `${isEmptySearch ? 'Suggestions for:' : 'Question:'} ${userQuery}\n\nBooks: ${context}`;

    let aiResponse;
    try {
      aiResponse = await executeWithRetry(async () => {
        const response = await genAI.models.generateContent({
          model: process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash',
          systemInstruction: systemPrompt,
          contents: userMessage,
        });
        return response.text || '';
      });
    } catch (error) {
      console.error(' Gemini API error:', error.message);

      let responseMessage = fallback.error;
      if (error.message === 'TIMEOUT') responseMessage = fallback.timeout;

      return {
        response: responseMessage,
        books: relevantBooks.slice(0, limit),
        metadata: { query: userQuery, language, booksFound: relevantBooks.length, limit, isEmptySearch },
      };
    }

    const sanitized = sanitizeAIResponse(aiResponse);
    if (!sanitized) {
      return {
        response: isEmptySearch ? fallback.noBooks : fallback.empty,
        books: relevantBooks.slice(0, limit),
        metadata: { query: userQuery, language, booksFound: relevantBooks.length, limit, isEmptySearch },
      };
    }

    const result = {
      response: sanitized,
      books: relevantBooks.slice(0, limit),
      metadata: {
        query: userQuery,
        language,
        booksFound: relevantBooks.length,
        limit,
        isEmptySearch,
        timestamp: new Date().toISOString(),
      },
    };

    await saveToCache('aiResponse', cacheKey, result);
    console.log(` Full response cached (${limit} books${isEmptySearch ? ' [SUGGESTIONS]' : ''})`);

    return result;

  } catch (error) {
    console.error(' Unexpected error:', error);

    return {
      response: FALLBACK_MESSAGES[language].error,
      books: [],
      metadata: { query: userQuery, language, errorCode: 'UNKNOWN_ERROR', limit },
    };
  }
};