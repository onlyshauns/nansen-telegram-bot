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
