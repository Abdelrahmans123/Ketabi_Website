import express from 'express';
import { generateChatResponse } from '../chatbot/services/chatbot.js';
import Genre from '../models/Genre.js';

const router = express.Router();

const buildFilter = (language, age, genre) => {
  const filter = {};
  
  if (language) {
    const langMap = {
      en: 'english',
      english: 'english',
      ar: 'arabic',
      arabic: 'arabic',
    };
    filter.bookLanguage = langMap[language.toLowerCase()];
  }
  
  if (age) {
    const ageMap = {
      child: 'kids',
      kids: 'kids',
      adult: 'adults',
      adults: 'adults',
      all: 'all',
    };
    filter.recommendedAge = ageMap[age.toLowerCase()];
  }
  
  if (genre) {
    filter.genre = genre;
  }
  
  return filter;
};



// POST - Ask chatbot with genre support
router.post('/ask', async (req, res) => {
  try {
    const { query, language, age, limit, genre } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid query is required',
      });
    }

    const filter = buildFilter(language, age, genre);

    const bookLimit = limit || 3;

    console.log(`🔍 Request: query="${query}", limit=${bookLimit}, genre=${genre || 'auto-detect'}`);

    const result = await generateChatResponse(null, query, {
      limit: bookLimit,
      filter,
    });

    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Chatbot route error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to generate response',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown error',
    });
  }
});

export default router;