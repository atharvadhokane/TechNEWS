const axios = require('axios');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2';

// Query used against NewsAPI's "everything" endpoint. Adjust freely —
// this is a reasonable default for a tech/AI news platform.
const QUERY = process.env.NEWS_API_QUERY || 'technology OR "artificial intelligence" OR software';

/**
 * Fetches recent tech articles from NewsAPI.org. Returns an empty array
 * (rather than throwing) if no API key is configured, so this source can
 * be safely included in the fetch pipeline even before you've signed up
 * for a key at https://newsapi.org.
 */
async function fetchNewsApi() {
  if (!NEWS_API_KEY || NEWS_API_KEY === 'your_news_api_key') {
    return [];
  }

  try {
    const { data } = await axios.get(`${NEWS_API_BASE}/everything`, {
      params: {
        q: QUERY,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 20,
        apiKey: NEWS_API_KEY,
      },
    });

    return (data.articles || [])
      .filter((a) => a.title && a.url && a.title !== '[Removed]')
      .map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source?.name || 'NewsAPI',
        publishedAt: a.publishedAt || new Date().toISOString(),
        rawContent: [a.description, a.content].filter(Boolean).join('\n\n') || a.title,
      }));
  } catch (err) {
    console.error('[newsApi] Fetch failed:', err.response?.data?.message || err.message);
    return [];
  }
}

module.exports = { fetchNewsApi };
