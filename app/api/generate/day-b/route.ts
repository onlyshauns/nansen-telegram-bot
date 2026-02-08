import { NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticle, formatArticleFooter } from '@/lib/articles';
import { DAY_B_SYSTEM_PROMPT, buildDayBUserPrompt } from '@/lib/prompts/day-b';
import type { GenerateResponse } from '@/lib/types';

export const maxDuration = 60;

export async function POST(): Promise<NextResponse<GenerateResponse>> {
  try {
    const client = getNansenClient();

    // Fetch all data in parallel
    const [memecoinTrades, perpTrades, screenerData] = await Promise.all([
      client.getMemecoinDEXTrades(['ethereum', 'solana', 'base'], {
        minUsd: 500,
        limit: 50,
      }),
      client.getSmartMoneyPerpTrades({ limit: 25 }),
      client.getTokenScreener(['ethereum', 'solana', 'base'], {
        timeframe: '24h',
        minVolume: 50000,
        minLiquidity: 10000,
        onlySmartMoney: true,
        limit: 25,
      }),
    ]);

    console.log(
      `[Day B] Fetched: ${memecoinTrades.length} memecoin trades, ${perpTrades.length} perp trades, ${screenerData.length} screener tokens`
    );

    // Build prompt and generate content
    const userPrompt = buildDayBUserPrompt({
      memecoinTrades,
      perpTrades,
      screenerData,
    });

    const generatedContent = await generateContent({
      systemPrompt: DAY_B_SYSTEM_PROMPT,
      userPrompt,
    });

    // Append academy article
    const article = getRandomArticle('day-b');
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
    console.error('[Day B] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
