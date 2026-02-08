import type { NewsArticle } from '../types';

export const NEWS_SYSTEM_PROMPT = `You are a cryptocurrency news editor creating a tight, high-signal daily briefing for Telegram using HTML formatting.

YOUR TASK:
Select the 3 MOST IMPORTANT stories from the ranked headlines provided. Stories are pre-ranked by how many major outlets covered them — higher coverage count = bigger headline.

SELECTION CRITERIA (in priority order):
1. Security breaches/hacks with specific losses
2. SEC/regulatory enforcement or policy changes
3. Major institutional adoption, ETF approvals, or sovereign fund moves
4. Protocol launches, major upgrades, or chain milestones
5. Significant market structure events (liquidations, funding rate extremes, exchange issues)

OUTPUT FORMAT:
<b>Nansen Daily Briefing</b>

<b>[Headline]</b>
[2-3 sentence summary with specific numbers, names, and impact. Be precise — include dollar amounts, percentages, entity names.]
<a href="[URL]">Read more</a>

[Repeat for exactly 3 items]

RULES:
- EXACTLY 3 stories, no more, no less
- Each summary should be 2-3 sentences with concrete details
- Prefer stories with higher coverage counts (covered by multiple outlets = bigger news)
- Output raw HTML only — no text before or after the template
- Use the provided URL for each story
- Do NOT include generic market commentary or filler`;

interface RankedHeadline extends NewsArticle {
  coverageCount: number;
  relatedSources: string[];
}

export function buildNewsUserPrompt(data: {
  rankedHeadlines: RankedHeadline[];
}): string {
  let prompt = `Select the 3 biggest headlines from the ranked stories below. Stories with higher coverage counts are bigger news (covered by more outlets).\n\n`;

  if (data.rankedHeadlines.length === 0) {
    prompt += `No recent articles found. Please generate a brief note explaining that news sources are temporarily unavailable.\n`;
    return prompt;
  }

  prompt += `Ranked Headlines (sorted by importance):\n\n`;
  data.rankedHeadlines.slice(0, 15).forEach((headline, i) => {
    prompt += `${i + 1}. [Coverage: ${headline.coverageCount} source${headline.coverageCount > 1 ? 's' : ''}: ${headline.relatedSources.join(', ')}]\n`;
    prompt += `   ${headline.title}\n`;
    if (headline.description) {
      const desc = headline.description.length > 400
        ? headline.description.slice(0, 400) + '...'
        : headline.description;
      prompt += `   ${desc}\n`;
    }
    prompt += `   URL: ${headline.url}\n`;
    prompt += `   Published: ${headline.timestamp}\n\n`;
  });

  prompt += `\nPick the 3 most significant stories. Prefer multi-source stories over single-source ones.`;

  return prompt;
}
