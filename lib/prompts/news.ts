import type { NewsArticle } from '../types';

export const NEWS_SYSTEM_PROMPT = `You are a cryptocurrency news editor creating a tight, high-signal daily briefing for Telegram using HTML formatting.

YOUR TASK:
Select the 3 MOST IMPORTANT stories from the ranked headlines provided. Each story is pre-ranked by how many outlets covered it and comes from a different source.

SELECTION CRITERIA (in priority order):
1. Security breaches/hacks with specific losses
2. SEC/regulatory enforcement or policy changes
3. Major institutional adoption, ETF approvals, or sovereign fund moves
4. Protocol launches, major upgrades, or chain milestones
5. Significant market structure events (liquidations, funding rate extremes, exchange issues)

OUTPUT FORMAT:
📰 <b>Daily Onchain News</b>

<b>[Headline]</b>
[1 sentence summary — be specific with dollar amounts, percentages, entity names.] <a href="[URL]">Read more</a>

[Repeat for exactly 3 items]

RULES:
- EXACTLY 3 stories, no more, no less
- Each summary is exactly 1 sentence — concise and factual
- Each story MUST be from a different source (the source is shown in the data)
- Link text is always "Read more"
- Prefer stories with higher coverage counts
- Output raw HTML only — no text before or after the template
- Do NOT include generic market commentary or filler`;

interface RankedHeadline extends NewsArticle {
  coverageCount: number;
  relatedSources: string[];
}

export function buildNewsUserPrompt(data: {
  rankedHeadlines: RankedHeadline[];
}): string {
  if (data.rankedHeadlines.length === 0) {
    return `No recent articles found. Please generate a brief note explaining that news sources are temporarily unavailable.\n`;
  }

  // Ensure source diversity — pick top headlines but no two from same source
  const diverse: typeof data.rankedHeadlines = [];
  const usedSources = new Set<string>();
  for (const headline of data.rankedHeadlines) {
    if (!usedSources.has(headline.source)) {
      diverse.push(headline);
      usedSources.add(headline.source);
    }
    if (diverse.length >= 10) break;
  }

  let prompt = `Pick the 3 biggest headlines. Each story is from a different source — use that source name in the link.\n\n`;
  prompt += `Headlines (ranked by coverage):\n\n`;
  diverse.forEach((headline, i) => {
    prompt += `${i + 1}. [${headline.coverageCount} source${headline.coverageCount > 1 ? 's' : ''}] [${headline.source}]\n`;
    prompt += `   ${headline.title}\n`;
    if (headline.description) {
      const desc = headline.description.length > 300
        ? headline.description.slice(0, 300) + '...'
        : headline.description;
      prompt += `   ${desc}\n`;
    }
    prompt += `   URL: ${headline.url}\n\n`;
  });

  prompt += `Each story must link to a different source. Keep each summary to 1 sentence.`;

  return prompt;
}
