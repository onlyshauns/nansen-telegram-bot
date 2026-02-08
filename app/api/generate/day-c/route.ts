import { NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticle, formatArticleFooter } from '@/lib/articles';
import { DAY_C_SYSTEM_PROMPT, buildDayCUserPrompt } from '@/lib/prompts/day-c';
import type { GenerateResponse } from '@/lib/types';

export const maxDuration = 60;

export async function POST(): Promise<NextResponse<GenerateResponse>> {
  try {
    const client = getNansenClient();

    // Fetch weekly data in parallel
    const [weeklyTrades, weeklyFlows] = await Promise.all([
      client.getWeeklyDEXTrades(['ethereum', 'solana', 'base'], {
        minUsd: 5000,
        limit: 100,
      }),
      client.getWeeklyFlowIntelligence(['ethereum', 'solana', 'base']),
    ]);

    console.log(
      `[Day C] Fetched: ${weeklyTrades.length} weekly trades, ${weeklyFlows.length} flow entries`
    );

    // Build prompt and generate content
    const userPrompt = buildDayCUserPrompt({
      weeklyTrades,
      weeklyFlows,
    });

    const generatedContent = await generateContent({
      systemPrompt: DAY_C_SYSTEM_PROMPT,
      userPrompt,
    });

    // Append academy article
    const article = getRandomArticle('day-c');
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
    console.error('[Day C] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
