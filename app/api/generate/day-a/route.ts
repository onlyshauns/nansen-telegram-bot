import { NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticle, formatArticleFooter } from '@/lib/articles';
import { DAY_A_SYSTEM_PROMPT, buildDayAUserPrompt } from '@/lib/prompts/day-a';
import type { GenerateResponse } from '@/lib/types';

export const maxDuration = 60;

export async function POST(): Promise<NextResponse<GenerateResponse>> {
  try {
    const client = getNansenClient();

    // Fetch all data in parallel
    const [dexTrades, transfers, flowIntelligence] = await Promise.all([
      client.getSmartMoneyDEXTrades(['ethereum', 'solana', 'base'], {
        minUsd: 1000,
        limit: 50,
        sinceHours: 24,
      }),
      client.getHighConvictionTransfers(['ethereum', 'solana', 'base'], {
        minUsd: 100000,
        limit: 30,
      }),
      client.getMultiTokenFlowIntelligence(['ethereum', 'solana', 'base']),
    ]);

    console.log(
      `[Day A] Fetched: ${dexTrades.length} DEX trades, ${transfers.length} transfers, ${flowIntelligence.length} flow entries`
    );

    // Build prompt and generate content
    const userPrompt = buildDayAUserPrompt({
      dexTrades,
      transfers,
      flowIntelligence,
    });

    const generatedContent = await generateContent({
      systemPrompt: DAY_A_SYSTEM_PROMPT,
      userPrompt,
    });

    // Append academy article
    const article = getRandomArticle('day-a');
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
    console.error('[Day A] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
