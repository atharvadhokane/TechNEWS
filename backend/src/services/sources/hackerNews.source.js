const axios = require('axios');

const HN_API_BASE = process.env.HN_API_BASE || 'https://hacker-news.firebaseio.com/v0';

// How many top stories to pull each fetch cycle. Kept small since each
// story requires a separate detail request against the Firebase API.
const STORY_LIMIT = parseInt(process.env.HN_STORY_LIMIT || '15', 10);

/**
 * Fetches the current top stories from Hacker News and normalizes them
 * into the { title, url, source, publishedAt, rawContent } shape expected
 * by newsFetch.service.js. No API key required.
 */
async function fetchHackerNews() {
  const { data: topStoryIds } = await axios.get(`${HN_API_BASE}/topstories.json`);
  const ids = topStoryIds.slice(0, STORY_LIMIT);

  const stories = await Promise.all(
    ids.map(async (id) => {
      try {
        const { data: item } = await axios.get(`${HN_API_BASE}/item/${id}.json`);
        if (!item || item.type !== 'story' || !item.title) return null;

        return {
          title: item.title,
          // Self-posts (Ask HN, Show HN, etc.) have no external url —
          // fall back to the HN discussion page itself.
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          source: 'Hacker News',
          publishedAt: item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString(),
          // HN doesn't provide article body text, only the title/link
          // and (for text posts) the HTML body — good enough as raw
          // input for the LLM enrichment pipeline to summarize/tag.
          rawContent: item.text || item.title,
        };
      } catch (err) {
        console.error(`[hackerNews] Failed to fetch item ${id}:`, err.message);
        return null;
      }
    })
  );

  return stories.filter(Boolean);
}

module.exports = { fetchHackerNews };
