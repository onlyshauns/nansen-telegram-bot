import Parser from 'rss-parser';
import type { NewsArticle } from './types';

const parser = new Parser();

const RSS_FEEDS: Record<string, string> = {
  coindesk: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  cointelegraph: 'https://cointelegraph.com/rss',
  decrypt: 'https://decrypt.co/feed',
  theblock: 'https://www.theblock.co/rss.xml',
  bitcoinmagazine: 'https://bitcoinmagazine.com/feed',
  newsbtc: 'https://www.newsbtc.com/feed/',
  beincrypto: 'https://beincrypto.com/feed/',
  cryptoslate: 'https://cryptoslate.com/feed/',
};

async function parseRssFeed(
  url: string,
  sourceName: string
): Promise<NewsArticle[]> {
  try {
    const feed = await parser.parseURL(url);

    return feed.items.map((item, index) => ({
      id: `${sourceName}-${item.guid || index}`,
      title: item.title || 'Untitled',
      source: sourceName,
      url: item.link || '#',
      timestamp: item.pubDate || item.isoDate || new Date().toISOString(),
      description: item.contentSnippet || undefined,
    }));
  } catch (error) {
    console.error(`[News] Error parsing ${sourceName} RSS:`, error);
    return [];
  }
}

export async function fetchLatestNews(
  hoursBack: number = 24,
  limit: number = 30
): Promise<NewsArticle[]> {
  const feedEntries = Object.entries(RSS_FEEDS);

  const results = await Promise.allSettled(
    feedEntries.map(([name, url]) => parseRssFeed(url, name))
  );

  const allArticles = results
    .filter(
      (r): r is PromiseFulfilledResult<NewsArticle[]> =>
        r.status === 'fulfilled'
    )
    .flatMap((r) => r.value);

  // Filter to articles within the time window
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const recentArticles = allArticles
    .filter((article) => {
      try {
        return new Date(article.timestamp) >= cutoff;
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);

  return recentArticles;
}

/**
 * Rank articles by headline importance.
 * Stories covered by multiple sources get boosted.
 * Returns articles with a `coverageCount` indicating how many sources covered the same story.
 */
export function rankHeadlines(
  articles: NewsArticle[]
): (NewsArticle & { coverageCount: number; relatedSources: string[] })[] {
  // Normalize title into keywords for fuzzy matching
  const normalize = (title: string): string[] => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  };

  // Group articles by story similarity
  const groups: {
    articles: NewsArticle[];
    keywords: Set<string>;
  }[] = [];

  for (const article of articles) {
    const keywords = normalize(article.title);
    if (keywords.length === 0) continue;

    // Find matching group (at least 2 significant keywords overlap)
    let matched = false;
    for (const group of groups) {
      const overlap = keywords.filter((k) => group.keywords.has(k)).length;
      if (overlap >= 2) {
        group.articles.push(article);
        keywords.forEach((k) => group.keywords.add(k));
        matched = true;
        break;
      }
    }

    if (!matched) {
      groups.push({
        articles: [article],
        keywords: new Set(keywords),
      });
    }
  }

  // Sort groups by coverage count (most covered first), then by recency
  groups.sort((a, b) => {
    if (b.articles.length !== a.articles.length) {
      return b.articles.length - a.articles.length;
    }
    return (
      new Date(b.articles[0].timestamp).getTime() -
      new Date(a.articles[0].timestamp).getTime()
    );
  });

  // Return the best article from each group with metadata
  return groups.map((group) => {
    // Pick the article with the longest description (most detailed)
    const best = group.articles.reduce((a, b) =>
      (a.description?.length || 0) >= (b.description?.length || 0) ? a : b
    );
    const sources = [...new Set(group.articles.map((a) => a.source))];
    return {
      ...best,
      coverageCount: group.articles.length,
      relatedSources: sources,
    };
  });
}

const STOP_WORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'been', 'will', 'would',
  'could', 'should', 'their', 'there', 'about', 'which', 'when',
  'what', 'more', 'after', 'before', 'over', 'into', 'than',
  'other', 'says', 'said', 'also', 'just', 'most', 'some',
  'amid', 'here', 'heres', 'your', 'does',
]);
