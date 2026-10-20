const prisma = require('../config/prisma');
const { enqueueArticleProcessing } = require('./queue.service');
const { fetchHackerNews } = require('./sources/hackerNews.source');
const { fetchNewsApi } = require('./sources/newsApi.source');

/**
 * Fetches raw articles from all configured sources (Hacker News always,
 * NewsAPI.org if NEWS_API_KEY is set), merges them, and returns a flat
 * array. Sources are fetched in parallel and a failure in one source
 * doesn't block the others.
 */
async function fetchFromSources() {
  const results = await Promise.allSettled([fetchHackerNews(), fetchNewsApi()]);

  const articles = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      console.error('[newsFetch] A source failed:', result.reason?.message || result.reason);
    }
  }

  // Dedupe within this single batch (different sources can surface the
  // same story) before it even reaches the DB-level duplicate check.
  const seen = new Set();
  return articles.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

function isDuplicate(existingUrls, candidate) {
  return existingUrls.has(candidate.url);
}

async function fetchNewsNow() {
  const rawArticles = await fetchFromSources();
  if (rawArticles.length === 0) {
    return { fetched: 0, stored: 0, queued: 0 };
  }

  const existing = await prisma.article.findMany({
    where: { url: { in: rawArticles.map((a) => a.url) } },
    select: { url: true },
  });
  const existingUrls = new Set(existing.map((a) => a.url));

  const newArticles = rawArticles.filter((a) => !isDuplicate(existingUrls, a));

  const created = [];
  for (const raw of newArticles) {
    const article = await prisma.article.create({
      data: {
        title: raw.title,
        url: raw.url,
        source: raw.source,
        publishedAt: raw.publishedAt ? new Date(raw.publishedAt) : new Date(),
        rawContent: raw.rawContent || '',
        status: 'RAW',
      },
    });
    created.push(article);
    await enqueueArticleProcessing(article.id);
  }

  return { fetched: rawArticles.length, stored: created.length, queued: created.length };
}

module.exports = { fetchNewsNow, fetchFromSources };
