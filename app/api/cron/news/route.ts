import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestNews, rankHeadlines } from '@/lib/news';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticles, formatArticleFooter } from '@/lib/articles';
import { NEWS_SYSTEM_PROMPT, buildNewsUserPrompt } from '@/lib/prompts/news';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const articles = await fetchLatestNews(24, 50);
    const rankedHeadlines = rankHeadlines(articles);

    console.log(`[Cron/News] Fetched: ${articles.length} articles, ${rankedHeadlines.length} unique stories`);

    const userPrompt = buildNewsUserPrompt({ rankedHeadlines });
    const generatedContent = await generateContent({
      systemPrompt: NEWS_SYSTEM_PROMPT,
      userPrompt,
    });

    const academyArticles = getRandomArticles('news', 3);
    const fullContent = generatedContent + formatArticleFooter(academyArticles);

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const chatId = process.env.TELEGRAM_CHAT_ID!;

    const messageIds = await sendTelegramMessage({
      botToken,
      chatId,
      text: fullContent,
    });

    return NextResponse.json({
      success: true,
      messageIds,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron/News] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
