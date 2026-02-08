import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticles, formatArticleFooter } from '@/lib/articles';
import { DAY_A_SYSTEM_PROMPT, buildDayAUserPrompt } from '@/lib/prompts/day-a';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = getNansenClient();

    const [dexTrades, transfers, flowIntelligence, screenerData] = await Promise.all([
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
      client.getTokenScreener(['ethereum', 'solana', 'base'], {
        timeframe: '24h',
        minVolume: 100000,
        minLiquidity: 50000,
        onlySmartMoney: true,
        limit: 25,
      }),
    ]);

    console.log(`[Cron/Day-A] Fetched: ${dexTrades.length} trades, ${transfers.length} transfers, ${flowIntelligence.length} flows, ${screenerData.length} screener`);

    const userPrompt = buildDayAUserPrompt({ dexTrades, transfers, flowIntelligence, screenerData });
    const generatedContent = await generateContent({ systemPrompt: DAY_A_SYSTEM_PROMPT, userPrompt });

    const articles = getRandomArticles('day-a', 3);
    const fullContent = generatedContent + formatArticleFooter(articles);

    const messageIds = await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      text: fullContent,
    });

    return NextResponse.json({ success: true, messageIds, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Cron/Day-A] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
