import { NextResponse } from 'next/server';
import { fetchLatestNews } from '@/lib/news';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticle, formatArticleFooter } from '@/lib/articles';
import { NEWS_SYSTEM_PROMPT, buildNewsUserPrompt } from '@/lib/prompts/news';
import type { GenerateResponse } from '@/lib/types';

export const maxDuration = 60;

export async function POST(): Promise<NextResponse<GenerateResponse>> {
  try {
    // Fetch latest news from RSS feeds
    const articles = await fetchLatestNews(24, 30);

    console.log(`[News] Fetched: ${articles.length} news articles`);

    // Build prompt and generate content
    const userPrompt = buildNewsUserPrompt({ articles });

    const generatedContent = await generateContent({
      systemPrompt: NEWS_SYSTEM_PROMPT,
      userPrompt,
    });

    // Append academy article
    const article = getRandomArticle('news');
    const fullContent = generatedContent + formatArticleFooter(article);

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
        articleAppended: article,
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
