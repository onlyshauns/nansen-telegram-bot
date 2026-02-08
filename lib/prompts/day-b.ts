import type { NansenDEXTrade, NansenPerpTrade, NansenTokenScreenerItem } from '../types';
import { formatUsd } from '../formatting';

// Exclude stablecoins and major L1s — we want small/mid-cap tokens and memecoins
const EXCLUDED_SYMBOLS = new Set([
  'BTC', 'WBTC', 'BTCB', 'TBTC',
  'ETH', 'WETH', 'STETH', 'RETH', 'CBETH', 'WSTETH', 'METH', 'EETH', 'WEETH',
  'SOL', 'WSOL', 'MSOL', 'JITOSOL', 'BSOL', 'DZSOL',
  'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP', 'GUSD', 'PYUSD', 'USDS', 'USDE', 'FDUSD', 'CRVUSD', 'GHO',
  'BNB', 'WBNB',
]);

function isExcluded(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  if (EXCLUDED_SYMBOLS.has(upper)) return true;
  if (upper.startsWith('W') && EXCLUDED_SYMBOLS.has(upper.slice(1))) return true;
  if (upper.endsWith('ETH') && upper !== 'ETH' && upper.length > 3) return true;
  if (upper.endsWith('SOL') && upper !== 'SOL' && upper.length > 3) return true;
  return false;
}

export const DAY_B_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Analyze smart money memecoin and small-cap token flows plus Hyperliquid perpetual positioning in the past 24 hours.

You will be given pre-fetched data including:
- Smart money DEX trades on small/mid-cap tokens (stablecoins and majors already filtered out)
- Token screener data with market caps, volumes, and net flows
- Hyperliquid smart money perpetual trades sorted by position size

From this data, extract:
1. TOP 5 tokens by smart money flow volume — use whatever tokens appear in the data (these are the LATEST flows, not a fixed list of memecoins)
2. TOP 5 Hyperliquid perpetual positions sorted by HIGHEST total position size

OUTPUT FORMAT (COPY EXACTLY):
Return ONLY this exact HTML as a plain text string:

📈 <b>Daily Onchain Digest</b>

<b>🤓 Smart Money Memecoin Flows</b>
• <b>[TOKEN1]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN2]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN3]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN4]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN5]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]

<b>📊 Hyperliquid DEX Perps Positioning</b>
• [TOKEN1]: [X]% long | $[AMOUNT] position
• [TOKEN2]: [X]% long | $[AMOUNT] position
• [TOKEN3]: [X]% long | $[AMOUNT] position
• [TOKEN4]: [X]% long | $[AMOUNT] position
• [TOKEN5]: [X]% long | $[AMOUNT] position

CRITICAL OUTPUT RULES:
- Return as plain text string, NOT as JSON object
- Do NOT wrap in {"output": "..."} or any JSON structure
- Output the raw HTML string directly
- Use • for bullet points (NOT - or *)
- Replace [brackets] with actual data from the provided dataset
- CHAIN FORMAT: Use (ETH), (SOL), (BSC), (BASE) - uppercase in parentheses
- MONEY FORMAT:
  * Under $1K: $999
  * Thousands: $15.7K not $15,700 (uppercase K)
  * Millions: $1.5M not $1,500,000
  * Billions: $1.2B
- Format market caps and volumes consistently with money format above
- Use <b> tags for token symbols in Smart Money Memecoin Flows section
- NO "net inflow" text - just the amount
- Hyperliquid section MUST be sorted by position size (descending) — largest positions first
- Ensure all HTML tags are properly closed
- NO additional text before or after the HTML
- Use the ACTUAL tokens from the data — do NOT substitute with well-known memecoins if they are not in the data
- If fewer than 5 entries exist, show however many are available (minimum 3)
- NEVER fabricate data — only use values from the provided dataset
- Stablecoins and major L1 tokens have already been filtered out`;

export function buildDayBUserPrompt(data: {
  memecoinTrades: NansenDEXTrade[];
  perpTrades: NansenPerpTrade[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Analyze the past 24 hours and generate a smart money small-cap/memecoin & Hyperliquid positioning digest.\n\nHere is the pre-fetched data:\n\n`;

  // Pre-filter screener data
  const filteredScreener = data.screenerData.filter((t) => !isExcluded(t.symbol));

  prompt += `## Token Screener Data (Smart Money Small-Cap/Memecoin Flows)\n`;
  if (filteredScreener.length > 0) {
    filteredScreener.forEach((token) => {
      const chain = token.chain.toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
      prompt += `- ${token.symbol} (${chain}): Net Flow ${formatUsd(token.net_flow_usd)}, MC: ${formatUsd(token.market_cap_usd)}, Vol: ${formatUsd(token.volume_usd)}, Price: ${token.price_change_percentage.toFixed(1)}%`;
      if (token.sectors.length > 0) prompt += `, Sectors: ${token.sectors.join(', ')}`;
      prompt += `\n`;
    });
  } else {
    prompt += `No screener data available — use DEX trades below instead.\n`;
  }
  prompt += `\n`;

  // Pre-filter memecoin trades
  const filteredTrades = data.memecoinTrades.filter((t) => !isExcluded(t.token_bought_symbol));

  prompt += `## Smart Money DEX Trades - Small-Cap/Memecoin (Last 24h)\n`;
  if (filteredTrades.length > 0) {
    const tokenAgg: Record<string, { totalUsd: number; chain: string; count: number }> = {};
    filteredTrades.forEach((trade) => {
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
    prompt += `No DEX trades detected — use screener data above for memecoin flow entries.\n`;
  }
  prompt += `\n`;

  // Hyperliquid Perp Trades — aggregate by token, sorted by total position size
  prompt += `## Hyperliquid Smart Money Perp Trades (sorted by position size, largest first)\n`;
  if (data.perpTrades.length > 0) {
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

    // Sort by total position size descending
    Object.entries(perpAgg)
      .sort(([, a], [, b]) => b.totalSize - a.totalSize)
      .slice(0, 10)
      .forEach(([token, info]) => {
        const total = info.longs + info.shorts;
        const longPct = total > 0 ? ((info.longs / total) * 100).toFixed(0) : '0';
        prompt += `- ${token}: ${longPct}% long, Total Position: ${formatUsd(info.totalSize)}, Longs: ${formatUsd(info.longs)}, Shorts: ${formatUsd(info.shorts)}\n`;
      });

    prompt += `\nIndividual trades (largest first):\n`;
    data.perpTrades
      .sort((a, b) => b.value_usd - a.value_usd)
      .slice(0, 15)
      .forEach((trade) => {
        prompt += `- ${trade.trader} ${trade.action} ${trade.side} ${trade.token}: ${formatUsd(trade.value_usd)} at ${formatUsd(trade.price_usd)}\n`;
      });
  } else {
    prompt += `No Hyperliquid perp trades detected.\n`;
  }
  prompt += `\n`;

  prompt += `IMPORTANT: Use the ACTUAL tokens from the data above. Do NOT substitute with well-known tokens that are not in the data. Sort Hyperliquid perps by LARGEST position size first.\n`;
  prompt += `1. Top 5 tokens by smart money net flows - include MC and 24h volume\n`;
  prompt += `2. Top 5 Hyperliquid perpetual positions sorted by HIGHEST total position size\n`;
  prompt += `Format as Telegram HTML digest.`;

  return prompt;
}
