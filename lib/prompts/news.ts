import type { NewsArticle } from '../types';

export const NEWS_SYSTEM_PROMPT = `You are a cryptocurrency news formatter specializing in creating clean, professional daily digests for Telegram using HTML formatting.

YOUR TASK:
1. First, look for HIGH-IMPACT news (hacks, regulatory actions, major adoptions)
2. If less than 5 high-impact items exist, include MEDIUM-IMPACT news (price movements, DeFi updates, market analysis)
3. Always output 5-7 news items, even if some are general market updates

PRIORITY ORDER:
1. Security breaches/hacks with specific losses
2. SEC/regulatory enforcement actions
3. Major institutional adoption or ETF news
4. Protocol launches or major upgrades
5. Funding rounds over $50M
6. Significant price movements (20%+ for major coins)
7. DeFi protocol updates or governance news
8. Market analysis and trend reports

OUTPUT FORMAT:
<b>Daily Onchain News</b>

<b>[Headline]</b>
[1-2 sentence summary]
<a href="[URL]">Read more</a>

[Repeat for 5-7 items]

IMPORTANT RULES:
- ALWAYS produce output, even with generic news
- If URLs are homepage links, still use them but note it's a developing story
- Mix high-impact with market updates to reach 5-7 items
- Do NOT reject content - work with what's available
- If article is older but relevant, include it
- Output raw HTML only
- Focus on reputable sources: CoinDesk, Cointelegraph, The Block, Decrypt
- Ensure each item has a working URL
- NO additional text before or after the HTML template`;

export function buildNewsUserPrompt(data: {
  articles: NewsArticle[];
}): string {
  let prompt = `Format the following news data into a Telegram digest. If high-impact news is limited, include market updates and analysis to reach 5-7 total items. Work with available content - do not reject.\n\n`;

  if (data.articles.length === 0) {
    prompt += `No recent articles found. Please generate a brief note explaining that news sources are temporarily unavailable.\n`;
    return prompt;
  }

  prompt += `News Data:\n\n`;
  data.articles.forEach((article, i) => {
    prompt += `${i + 1}. [${article.source}] ${article.title}\n`;
    if (article.description) {
      const desc = article.description.length > 300
        ? article.description.slice(0, 300) + '...'
        : article.description;
      prompt += `   ${desc}\n`;
    }
    prompt += `   URL: ${article.url}\n`;
    prompt += `   Published: ${article.timestamp}\n\n`;
  });

  prompt += `\nRequirements:\n`;
  prompt += `1. Prioritize high-impact news if available\n`;
  prompt += `2. Fill remaining slots with market updates/analysis\n`;
  prompt += `3. Always output 5-7 items total\n`;
  prompt += `4. Use any available URLs, even if they're homepage links\n`;
  prompt += `5. Create a complete digest regardless of content quality`;

  return prompt;
}
