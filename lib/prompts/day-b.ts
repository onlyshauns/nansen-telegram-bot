import type { NansenDEXTrade, NansenPerpTrade, NansenTokenScreenerItem } from '../types';
import { formatUsd } from '../formatting';

export const DAY_B_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Analyze smart money memecoin flows and Hyperliquid perpetual positioning in the past 24 hours.

You will be given pre-fetched data including:
- Smart money memecoin DEX trades
- Token screener data with market caps, volumes, and net flows
- Hyperliquid smart money perpetual trades

From this data, extract:
1. TOP 5 memecoins by smart money net flow volume
2. TOP 5 Hyperliquid perpetual positions by size

OUTPUT FORMAT (COPY EXACTLY):
Return ONLY this exact HTML as a plain text string:

<b>Daily Onchain Digest</b>

<b>Smart Money Memecoin Flows</b>
\u2022 <b>[TOKEN1]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN2]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN3]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN4]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN5]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]

<b>Hyperliquid DEX Perps Positioning</b>
\u2022 [TOKEN1]: [X]% long | $[AMOUNT] position
\u2022 [TOKEN2]: [X]% long | $[AMOUNT] position
\u2022 [TOKEN3]: [X]% long | $[AMOUNT] position
\u2022 [TOKEN4]: [X]% long | $[AMOUNT] position
\u2022 [TOKEN5]: [X]% long | $[AMOUNT] position

CRITICAL OUTPUT RULES:
- Return as plain text string, NOT as JSON object
- Do NOT wrap in {"output": "..."} or any JSON structure
- Output the raw HTML string directly
- Use \u2022 for bullet points (not -)
- Replace [brackets] with actual data
- CHAIN FORMAT: Use (ETH), (SOL), (BSC), (BASE) - uppercase in parentheses
- MONEY FORMAT:
  * Under $1K: $999
  * Thousands: $15.7K not $15,700 (uppercase K)
  * Millions: $1.5M not $1,500,000
  * Billions: $1.2B
- Format market caps and volumes consistently with money format above
- Use <b> tags for token symbols in Smart Money Memecoin Flows section
- NO "net inflow" text - just the amount
- Hyperliquid section sorted by position size (descending)
- Ensure all HTML tags are properly closed
- NO additional text before or after the HTML
- Focus on actual memecoins (PEPE, WIF, BONK, etc.)
- Exclude major cryptocurrencies and wrapped tokens`;

export function buildDayBUserPrompt(data: {
  memecoinTrades: NansenDEXTrade[];
  perpTrades: NansenPerpTrade[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Analyze the past 24 hours and generate a smart money memecoin & Hyperliquid positioning digest.\n\nHere is the pre-fetched data:\n\n`;

  // Token Screener Data for memecoins
  prompt += `## Token Screener Data (Smart Money Memecoin Flows)\n`;
  if (data.screenerData.length > 0) {
    data.screenerData.forEach((token) => {
      const chain = token.chain.toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
      prompt += `- ${token.symbol} (${chain}): Net Flow ${formatUsd(token.net_flow_usd)}, MC: ${formatUsd(token.market_cap_usd)}, Vol: ${formatUsd(token.volume_usd)}, Price: ${token.price_change_percentage.toFixed(1)}%`;
      if (token.sectors.length > 0) prompt += `, Sectors: ${token.sectors.join(', ')}`;
      prompt += `\n`;
    });
  } else {
    prompt += `No screener data available.\n`;
  }
  prompt += `\n`;

  // Memecoin Smart Money Trades
  prompt += `## Smart Money Memecoin DEX Trades (Last 24h)\n`;
  if (data.memecoinTrades.length > 0) {
    // Aggregate by token
    const tokenAgg: Record<string, { totalUsd: number; chain: string; count: number }> = {};
    data.memecoinTrades.forEach((trade) => {
      const symbol = trade.token_bought_symbol;
      if (!tokenAgg[symbol]) {
        tokenAgg[symbol] = { totalUsd: 0, chain: trade.chain, count: 0 };
      }
      tokenAgg[symbol].totalUsd += trade.trade_value_usd;
      tokenAgg[symbol].count++;
    });

    Object.entries(tokenAgg)
      .sort(([, a], [, b]) => b.totalUsd - a.totalUsd)
      .slice(0, 15)
      .forEach(([symbol, info]) => {
        prompt += `- ${symbol} (${info.chain}): ${formatUsd(info.totalUsd)} total, ${info.count} trades\n`;
      });
  } else {
    prompt += `No memecoin trades detected.\n`;
  }
  prompt += `\n`;

  // Hyperliquid Perp Trades
  prompt += `## Hyperliquid Smart Money Perp Trades\n`;
  if (data.perpTrades.length > 0) {
    // Aggregate by token to show positioning
    const perpAgg: Record<string, { longs: number; shorts: number; totalSize: number }> = {};
    data.perpTrades.forEach((trade) => {
      if (!perpAgg[trade.token]) {
        perpAgg[trade.token] = { longs: 0, shorts: 0, totalSize: 0 };
      }
      if (trade.side.toLowerCase() === 'long') {
        perpAgg[trade.token].longs += trade.value_usd;
      } else {
        perpAgg[trade.token].shorts += trade.value_usd;
      }
      perpAgg[trade.token].totalSize += trade.value_usd;
    });

    Object.entries(perpAgg)
      .sort(([, a], [, b]) => b.totalSize - a.totalSize)
      .slice(0, 10)
      .forEach(([token, info]) => {
        const total = info.longs + info.shorts;
        const longPct = total > 0 ? ((info.longs / total) * 100).toFixed(0) : '0';
        prompt += `- ${token}: ${longPct}% long, Position: ${formatUsd(info.totalSize)}, Longs: ${formatUsd(info.longs)}, Shorts: ${formatUsd(info.shorts)}\n`;
      });

    prompt += `\nIndividual trades:\n`;
    data.perpTrades.slice(0, 15).forEach((trade) => {
      prompt += `- ${trade.trader} ${trade.action} ${trade.side} ${trade.token}: ${formatUsd(trade.value_usd)} at ${formatUsd(trade.price_usd)}\n`;
    });
  } else {
    prompt += `No Hyperliquid perp trades detected.\n`;
  }
  prompt += `\n`;

  prompt += `Requirements:\n`;
  prompt += `1. Top 5 memecoins by smart money net flows - include MC and 24h volume\n`;
  prompt += `2. Top 5 Hyperliquid perpetual positioning by long/short ratio\n`;
  prompt += `Format as Telegram HTML digest.`;

  return prompt;
}
