import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestNews, rankHeadlines } from '@/lib/news';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticles, formatArticleFooter } from '@/lib/articles';
import { NEWS_SYSTEM_PROMPT, buildNewsUserPrompt } from '@/lib/prompts/news';
import type { GenerateResponse } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse>> {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch latest news from RSS feeds and rank by headline importance
    const articles = await fetchLatestNews(24, 50);
    const rankedHeadlines = rankHeadlines(articles);

    console.log(`[News] Fetched: ${articles.length} articles, ${rankedHeadlines.length} unique stories, top story covered by ${rankedHeadlines[0]?.coverageCount || 0} sources`);

    // Build prompt and generate content
    const userPrompt = buildNewsUserPrompt({ rankedHeadlines });

    const generatedContent = await generateContent({
      systemPrompt: NEWS_SYSTEM_PROMPT,
      userPrompt,
    });

    // Append academy articles footer
    const academyArticles = getRandomArticles('news', 3);
    const fullContent = generatedContent + formatArticleFooter(academyArticles);

    // Send to Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const chatId = process.env.TELEGRAM_CHAT_ID!;

    const messageIds = await sendTelegramMessage({
      botToken,
      chatId,
      text: fullContent,
    });

    return NextResponse.json({
      success: true,
      result: {
        content: fullContent,
        telegramMessageIds: messageIds,
        articleAppended: academyArticles[0],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[News] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
