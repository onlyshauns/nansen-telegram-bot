import type { NewsArticle } from '../types';

// TODO: Replace with your actual system prompt
export const NEWS_SYSTEM_PROMPT = `You are a professional crypto news analyst writing a daily news digest for the Nansen community Telegram channel.

Your task is to summarize the most important crypto and onchain news from the past 24 hours into a concise, well-structured Telegram post.

Guidelines:
- Use plain text formatting (no HTML tags). Use emoji sparingly for visual structure.
- Keep the post between 1500-2500 characters
- Lead with the most impactful story
- Group related stories together
- Focus on news relevant to onchain activity, DeFi, token movements, and market-moving events
- Include brief context for why each story matters
- End with a brief market sentiment note
- Do not include URLs in the post body (they will be available in the source articles)
- Be factual and balanced`;

export function buildNewsUserPrompt(data: {
  articles: NewsArticle[];
}): string {
  let prompt = `Here are the latest crypto news articles from the past 24 hours. Please create a daily news digest Telegram post.\n\n`;

  if (data.articles.length === 0) {
    prompt += `No recent articles found. Please generate a brief note explaining that news sources are temporarily unavailable.\n`;
    return prompt;
  }

  data.articles.forEach((article, i) => {
    prompt += `${i + 1}. [${article.source}] ${article.title}\n`;
    if (article.description) {
      // Truncate long descriptions
      const desc = article.description.length > 200
        ? article.description.slice(0, 200) + '...'
        : article.description;
      prompt += `   ${desc}\n`;
    }
    prompt += `   Published: ${article.timestamp}\n\n`;
  });

  prompt += `\nPlease create a formatted daily news digest Telegram post summarizing the most important stories above.`;

  return prompt;
}
