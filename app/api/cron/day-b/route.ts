import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen';
import { generateContent } from '@/lib/claude';
import { sendTelegramMessage } from '@/lib/telegram';
import { getRandomArticles, formatArticleFooter } from '@/lib/articles';
import { DAY_B_SYSTEM_PROMPT, buildDayBUserPrompt } from '@/lib/prompts/day-b';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = getNansenClient();

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

    console.log(`[Cron/Day-B] Fetched: ${memecoinTrades.length} memecoin trades, ${perpTrades.length} perp trades, ${screenerData.length} screener`);

    const userPrompt = buildDayBUserPrompt({ memecoinTrades, perpTrades, screenerData });
    const generatedContent = await generateContent({ systemPrompt: DAY_B_SYSTEM_PROMPT, userPrompt });

    const articles = getRandomArticles('day-b', 3);
    const fullContent = generatedContent + formatArticleFooter(articles);

    const messageIds = await sendTelegramMessage({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      chatId: process.env.TELEGRAM_CHAT_ID!,
      text: fullContent,
    });

    return NextResponse.json({ success: true, messageIds, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[Cron/Day-B] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
