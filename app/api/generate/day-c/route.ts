import { NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticles, formatArticleFooter } from '@/lib/articles';
import { DAY_C_SYSTEM_PROMPT, buildDayCUserPrompt } from '@/lib/prompts/day-c';
import type { GenerateResponse } from '@/lib/types';

export const maxDuration = 60;

export async function POST(): Promise<NextResponse<GenerateResponse>> {
  try {
    const client = getNansenClient();

    // Fetch weekly data in parallel
    const [weeklyTrades, weeklyFlows, screenerData] = await Promise.all([
      client.getWeeklyDEXTrades(['ethereum', 'solana', 'base'], {
        minUsd: 5000,
        limit: 100,
      }),
      client.getWeeklyFlowIntelligence(['ethereum', 'solana', 'base']),
      client.getTokenScreener(['ethereum', 'solana', 'base'], {
        timeframe: '7d',
        minVolume: 100000,
        minLiquidity: 100000,
        onlySmartMoney: true,
        limit: 25,
      }),
    ]);

    console.log(
      `[Day C] Fetched: ${weeklyTrades.length} weekly trades, ${weeklyFlows.length} flow entries, ${screenerData.length} screener tokens`
    );

    // Build prompt and generate content
    const userPrompt = buildDayCUserPrompt({
      weeklyTrades,
      weeklyFlows,
      screenerData,
    });

    const generatedContent = await generateContent({
      systemPrompt: DAY_C_SYSTEM_PROMPT,
      userPrompt,
    });

    // Append academy articles footer
    const articles = getRandomArticles('day-c', 3);
    const fullContent = generatedContent + formatArticleFooter(articles);

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
        articleAppended: articles[0],
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
