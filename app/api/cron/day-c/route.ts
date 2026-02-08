import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticles, formatArticleFooter } from '@/lib/articles';
import { DAY_C_SYSTEM_PROMPT, buildDayCUserPrompt } from '@/lib/prompts/day-c';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = getNansenClient();

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

    console.log(`[Cron/Day-C] Fetched: ${weeklyTrades.length} trades, ${weeklyFlows.length} flows, ${screenerData.length} screener`);

    const userPrompt = buildDayCUserPrompt({ weeklyTrades, weeklyFlows, screenerData });
    const generatedContent = await generateContent({ systemPrompt: DAY_C_SYSTEM_PROMPT, userPrompt });

    const articles = getRandomArticles('day-c', 3);
    const fullContent = generatedContent + formatArticleFooter(articles);

    const messageIds = await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      text: fullContent,
    });

    return NextResponse.json({ success: true, messageIds, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Cron/Day-C] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
