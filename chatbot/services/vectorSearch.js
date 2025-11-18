import { generateEmbedding, extractPriceRange } from './embeddings.js';
import { getFromCache, saveToCache } from './cache.js';
import Book from '../../models/Book.js';
import Genre from '../../models/Genre.js';
import dotenv from 'dotenv';

dotenv.config();

function getVectorIndexName() {
  const indexName = process.env.VECTOR_INDEX_NAME || 'vector_index_1';

  if (!indexName || typeof indexName !== 'string' || indexName.trim() === '') {
    throw new Error('VECTOR_INDEX_MISCONFIGURED: Invalid or missing VECTOR_INDEX_NAME');
  }

  return indexName.trim();
}

function validateBookDocument(book) {
  if (!book.name || !book.author) {
    console.warn(' Book missing required fields:', book._id);
    return false;
  }

  if (typeof book.price !== 'number' || book.price < 0) {
    console.warn(` Book ${book._id} has invalid price:`, book.price);
    book.price = 0;
  }

  if (!book.genreName) {
    book.genreName = 'Unknown Genre';
  }

  return true;
}

// Helper function to extract genre from query
async function extractGenreFromQuery(query) {
  try {
    console.log(` Extracting genre from query: "${query}"`);

    // Get all genres from database
    const genres = await Genre.find({});
    
    if (!genres || genres.length === 0) {
      console.log('No genres found in database');
      return null;
    }

    // Convert query to lowercase for matching
    const queryLower = query.toLowerCase();
    
    // Check if query contains any genre name or slug
    for (const genre of genres) {
      const genreName = genre.name.toLowerCase();
      const genreSlug = genre.slug.toLowerCase();
      
      if (
        queryLower.includes(genreName) || 
        queryLower.includes(genreSlug) ||
        queryLower.includes(genreSlug.replace(/-/g, ' '))
      ) {
        console.log(` Found genre: ${genre.name} (${genre.slug})`);
        return {
          id: genre._id,
          name: genre.name,
          slug: genre.slug
        };
      }
    }

    console.log('No matching genre found in query');
    return null;

  } catch (error) {
    console.error('Error extracting genre:', error.message);
    return null;
  }
}

async function getRandomSuggestions(limit = 3, genreFilter = null) {
  try {
    console.log(' Getting random book suggestions...');

    const matchStage = { $match: {} };
    
    if (genreFilter) {
      matchStage.$match.genre = genreFilter;
    }

    const suggestions = await Book.aggregate([
      matchStage,
      { $sample: { size: limit * 2 } }, 
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreDetails',
        },
      },
      {
        $addFields: {
          genreName: {
            $cond: {
              if: {
                $and: [
                  { $isArray: '$genreDetails' },
                  { $gt: [{ $size: '$genreDetails' }, 0] },
                ],
              },
              then: { $arrayElemAt: ['$genreDetails.name', 0] },
              else: 'Unknown Genre',
            },
          },
        },
      },
      { $project: { genreDetails: 0 } },
      { $limit: limit },
    ]);

    const validatedSuggestions = suggestions.filter((book) => validateBookDocument(book));
    console.log(`Got ${validatedSuggestions.length} random suggestions`);

    return validatedSuggestions;
  } catch (error) {
    console.error(' Error getting random suggestions:', error.message);
    return [];
  }
}

export const searchBooks = async (query, options = {}) => {
  const { limit = 3, numCandidates = 100, filter = {} } = options;

  try {
    console.log(' Query:', query);
    console.log(` Limit: ${limit} books`);

    // Check cache first
    const cacheKey = `${query}_${JSON.stringify(filter)}_${limit}`;
    const cachedResults = await getFromCache('search', cacheKey);
    if (cachedResults) {
      console.log(` Cache HIT: Search results retrieved from Redis`);
      return cachedResults;
    }

    // Extract genre from query
    const detectedGenre = await extractGenreFromQuery(query);

    const { minPrice, maxPrice } = await extractPriceRange(query);
    console.log(` Price Range: ${minPrice || 'any'} - ${maxPrice || 'any'}`);

    const queryEmbedding = await generateEmbedding(query);
    console.log(' Embedding generated');

    // Build vector search filter
    const vectorFilter = {};
    
    // Add genre filter if detected from query
    if (detectedGenre) {
      vectorFilter.genre = detectedGenre.id;
      console.log(` Genre filter applied: ${detectedGenre.name}`);
    }
    
    // Add other filters
    if (filter.bookLanguage) vectorFilter.bookLanguage = filter.bookLanguage;
    if (filter.recommendedAge) vectorFilter.recommendedAge = filter.recommendedAge;
    if (filter.status) vectorFilter.status = filter.status;
    if (filter.genre) vectorFilter.genre = filter.genre; // Allow explicit genre filter

    console.log(' Vector Filter:', JSON.stringify(vectorFilter, null, 2));

    const priceMatch = {};
    if (minPrice !== null && minPrice >= 0) priceMatch.$gte = minPrice;
    if (maxPrice !== null && maxPrice >= 0) priceMatch.$lte = maxPrice;

    const indexName = getVectorIndexName();

    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: numCandidates,
          limit: limit * 3,
          ...(Object.keys(vectorFilter).length > 0 && { filter: vectorFilter }),
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          author: 1,
          description: 1,
          Edition: 1,
          bookLanguage: 1,
          recommendedAge: 1,
          genre: 1,
          price: 1,
          discount: 1,
          stock: 1,
          noOfPages: 1,
          image: 1,
          avgRating: 1,
          status: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $lookup: {
          from: 'genres',
          localField: 'genre',
          foreignField: '_id',
          as: 'genreDetails',
        },
      },
      {
        $addFields: {
          genreName: {
            $cond: {
              if: {
                $and: [
                  { $isArray: '$genreDetails' },
                  { $gt: [{ $size: '$genreDetails' }, 0] },
                ],
              },
              then: { $arrayElemAt: ['$genreDetails.name', 0] },
              else: 'Unknown Genre',
            },
          },
        },
      },
      {
        $project: {
          genreDetails: 0,
        },
      },
    ];

    if (Object.keys(priceMatch).length > 0) {
      pipeline.push({
        $match: {
          price: priceMatch,
          price: { $exists: true, $type: 'number' },
        },
      });
    }

    pipeline.push(
      { $sort: { score: -1 } },
      { $limit: limit }
    );

    console.log(' Running aggregation pipeline...');
    const results = await Book.aggregate(pipeline);

    console.log(` Found ${results.length} books (limit: ${limit})`);

    // Validate results
    const validatedResults = results.filter((book) => validateBookDocument(book));

    if (validatedResults.length > 0) {
      validatedResults.forEach((book, idx) => {
        console.log(`  ${idx + 1}. "${book.name}" | ${book.author} | ${book.genreName}`);
      });
    }

    // Get random suggestions if no results found
    let finalResults = validatedResults;
    if (validatedResults.length === 0) {
      console.warn('⚠️ No results found. Getting random suggestions...');
      const genreIdForSuggestions = detectedGenre ? detectedGenre.id : null;
      finalResults = await getRandomSuggestions(limit, genreIdForSuggestions);
      finalResults.isEmptySearch = true;
    }

    // Cache results
    await saveToCache('search', cacheKey, finalResults);
    console.log(` Search results cached (${finalResults.length} books)`);

    return finalResults;

  } catch (error) {
    console.error(' Vector search error:', error.message);

    if (error.message.includes('VECTOR_INDEX_MISCONFIGURED')) {
      throw new Error('INDEX_CONFIG_ERROR: ' + error.message);
    }

    if (error.message.includes('QUERY_VALIDATION_FAILED')) {
      throw new Error('SEARCH_VALIDATION_ERROR: ' + error.message);
    }

    throw new Error(`SEARCH_ERROR: ${error.message}`);
  }
};