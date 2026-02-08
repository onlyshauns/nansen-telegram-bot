import type { NansenDEXTrade, NansenFlowIntelligence, NansenTokenScreenerItem } from '../types';
import { formatUsd, truncateAddress } from '../formatting';

// Exclude stablecoins and major L1s — we want to surface interesting mid/small-cap activity
const EXCLUDED_SYMBOLS = new Set([
  'BTC', 'WBTC', 'BTCB', 'TBTC',
  'ETH', 'WETH', 'STETH', 'RETH', 'CBETH', 'WSTETH', 'METH', 'EETH', 'WEETH',
  'SOL', 'WSOL', 'MSOL', 'JITOSOL', 'BSOL', 'DZSOL',
  'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP', 'GUSD', 'PYUSD', 'USDS', 'USDE', 'FDUSD', 'CRVUSD', 'GHO',
  'BNB', 'WBNB',
]);

function isExcluded(symbol: string | undefined | null): boolean {
  if (!symbol) return true; // Exclude undefined/null symbols
  const upper = symbol.toUpperCase();
  if (EXCLUDED_SYMBOLS.has(upper)) return true;
  if (upper.startsWith('W') && EXCLUDED_SYMBOLS.has(upper.slice(1))) return true;
  if (upper.endsWith('ETH') && upper !== 'ETH' && upper.length > 3) return true;
  if (upper.endsWith('SOL') && upper !== 'SOL' && upper.length > 3) return true;
  return false;
}

export const DAY_C_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Create a weekly roundup of smart money activity from the past 7 days. All stablecoins, BTC, ETH, SOL, BNB and their wrapped/staking variants have ALREADY been filtered out of the data.

You will be given pre-fetched data including:
- Token screener data grouped by sector with market caps, volumes, and net flows
- 7-day smart money DEX trades aggregated by token (with trader counts)
- Biggest individual trades this week (with trader names/labels)
- Flow intelligence data for key tokens

From this data, extract:
1. EMERGING TRENDS: Identify 4-5 narratives/trends based on sector clustering and individual trade activity. Each trend should name 2-3 tokens with their net flow amounts. Look for:
   - Sectors with multiple tokens showing positive net flows (e.g., AI tokens, DeFi lending, RWA)
   - Tokens with high trader counts (many unique wallets buying = conviction signal)
   - Large individual trades as notable whale moves
2. TOP 5 tokens by smart money net flow — include MC and 24h volume

OUTPUT FORMAT (COPY EXACTLY):
Return ONLY this exact HTML as a plain text string:

📈 <b>Daily Onchain Digest (Weekly Roundup)</b>

<b>🔥 Emerging Trends This Week</b>
• <b>[Trend Name]</b>: [TOKEN1] (+$[AMT]), [TOKEN2] (+$[AMT]) — [1 sentence insight]
• <b>[Trend Name]</b>: [TOKEN1] (+$[AMT]), [TOKEN2] (+$[AMT]) — [1 sentence insight]
• <b>[Trend Name]</b>: [TOKEN1] (+$[AMT]), [TOKEN2] (+$[AMT]) — [1 sentence insight]
• <b>[Trend Name]</b>: [TOKEN1] (+$[AMT]), [TOKEN2] (+$[AMT]) — [1 sentence insight]
• <b>[Trend Name]</b>: [TOKEN1] (+$[AMT]), [TOKEN2] (+$[AMT]) — [1 sentence insight]

<b>📊 Largest Smart Money Flows (Top 5)</b>
• <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]

CRITICAL OUTPUT RULES:
- Return as plain text string, NOT as JSON object
- Do NOT wrap in {"output": "..."} or any JSON structure
- Output the raw HTML string directly
- Use • for bullet points (NOT dash or hyphen)
- Replace [brackets] with actual data
- CHAIN FORMAT: Use (ETH), (SOL), (BSC), (BASE) - uppercase in parentheses
- MONEY FORMAT:
  * Under $1K: $999
  * Thousands: $15.7K not $15,700 (uppercase K)
  * Millions: $1.5M not $1,500,000 (uppercase M)
  * Billions: $1.2B (uppercase B)
- Format market caps and volumes consistently with money format above
- Use <b> tags for token symbols in Largest Smart Money Flows section
- Use <b> tags for trend names in Emerging Trends section
- NO "net inflow" text - just the amount with + prefix
- TOKEN SYMBOLS: Use ONLY alphanumeric characters (A-Z, 0-9, no special chars)
- Replace any ampersand with "and" in token names
- Remove any < or > characters from token names
- Ensure all HTML tags are properly closed
- NO additional text before or after the HTML
- NEVER fabricate data — only use values from the provided dataset
- Use the ACTUAL tokens from the data — do NOT substitute with well-known tokens if they are not in the data
- If fewer than 5 entries exist, show however many are available (minimum 3)
- NEVER output "Data Unavailable" for MC or Vol — use the screener data provided
- If MC or Vol is zero or missing, omit that specific metric rather than showing "Data Unavailable"
- Stablecoins and major L1 tokens have already been filtered out
- Keep total message under 3500 characters
- Emerging Trends insights should be data-driven: mention specific trader counts, accumulation patterns, or notable whale activity from the individual trades data`;

export function buildDayCUserPrompt(data: {
  weeklyTrades: NansenDEXTrade[];
  weeklyFlows: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Analyze smart money activity from the past 7 days. Generate a weekly roundup.\n\nHere is the pre-fetched data:\n\n`;

  // Pre-filter all data sources
  const filteredScreener = data.screenerData.filter((t) => !isExcluded(t.symbol));
  const filteredTrades = data.weeklyTrades.filter((t) => !isExcluded(t.token_bought_symbol));
  const filteredFlows = data.weeklyFlows.filter((fi) => !isExcluded(fi.symbol));

  // === Section 1: Token Screener Data grouped by sector ===
  prompt += `## Token Screener Data (7-Day Smart Money Flows)\n`;
  if (filteredScreener.length > 0) {
    // Group tokens by sector for better trend identification
    const sectorMap: Record<string, typeof filteredScreener> = {};
    filteredScreener.forEach((token) => {
      if (token.sectors?.length > 0) {
        token.sectors.forEach((sector) => {
          if (!sectorMap[sector]) sectorMap[sector] = [];
          sectorMap[sector].push(token);
        });
      } else {
        if (!sectorMap['Other']) sectorMap['Other'] = [];
        sectorMap['Other'].push(token);
      }
    });

    // First show individual tokens sorted by net flow
    filteredScreener.forEach((token) => {
      const chain = (token.chain || 'unknown').toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
      prompt += `- ${token.symbol} (${chain}): Net Flow ${formatUsd(token.net_flow_usd)}, MC: ${formatUsd(token.market_cap_usd)}, Vol: ${formatUsd(token.volume_usd)}, Price Change: ${(token.price_change_percentage ?? 0).toFixed(1)}%`;
      if (token.sectors?.length > 0) prompt += `, Sectors: ${token.sectors.join(', ')}`;
      prompt += `\n`;
    });

    // Then show sector summary
    prompt += `\n### Sector Summary (for Emerging Trends)\n`;
    Object.entries(sectorMap)
      .sort(([, a], [, b]) => {
        const aFlow = a.reduce((sum, t) => sum + t.net_flow_usd, 0);
        const bFlow = b.reduce((sum, t) => sum + t.net_flow_usd, 0);
        return bFlow - aFlow;
      })
      .slice(0, 10)
      .forEach(([sector, tokens]) => {
        const totalFlow = tokens.reduce((sum, t) => sum + t.net_flow_usd, 0);
        const tokenList = tokens
          .sort((a, b) => b.net_flow_usd - a.net_flow_usd)
          .slice(0, 5)
          .map((t) => `${t.symbol} (${formatUsd(t.net_flow_usd)})`)
          .join(', ');
        prompt += `- ${sector}: Total Net Flow ${formatUsd(totalFlow)} — ${tokenList}\n`;
      });
  } else {
    prompt += `No screener data available — use DEX trades below instead.\n`;
  }
  prompt += `\n`;

  // === Section 2: Weekly DEX Trades aggregated by token ===
  prompt += `## Smart Money DEX Trades This Week (Aggregated)\n`;
  if (filteredTrades.length > 0) {
    // Aggregate by token bought
    const tokenBuys: Record<string, { count: number; totalUsd: number; traders: Set<string>; chain: string }> = {};
    filteredTrades.forEach((trade) => {
      const symbol = trade.token_bought_symbol;
      if (!tokenBuys[symbol]) {
        tokenBuys[symbol] = { count: 0, totalUsd: 0, traders: new Set(), chain: trade.chain || 'unknown' };
      }
      tokenBuys[symbol].count++;
      tokenBuys[symbol].totalUsd += trade.trade_value_usd;
      tokenBuys[symbol].traders.add(trade.trader_label || truncateAddress(trade.trader_address));
    });

    const sortedTokens = Object.entries(tokenBuys)
      .sort(([, a], [, b]) => b.totalUsd - a.totalUsd)
      .slice(0, 20);

    sortedTokens.forEach(([symbol, info]) => {
      const traderList = Array.from(info.traders).slice(0, 5).join(', ');
      prompt += `- ${symbol} (${info.chain}): ${formatUsd(info.totalUsd)} total buys, ${info.count} trades by ${info.traders.size} unique traders (${traderList})\n`;
    });
  } else {
    prompt += `No weekly trade data available — use screener data above.\n`;
  }
  prompt += `\n`;

  // === Section 3: Biggest individual trades (for whale/notable trader insights) ===
  prompt += `## Biggest Individual Trades This Week\n`;
  if (filteredTrades.length > 0) {
    filteredTrades
      .sort((a, b) => b.trade_value_usd - a.trade_value_usd)
      .slice(0, 15)
      .forEach((trade) => {
        const traderName = trade.trader_label || truncateAddress(trade.trader_address);
        const chain = (trade.chain || 'unknown').toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
        prompt += `- ${traderName} bought ${trade.token_bought_symbol} (${chain}): ${formatUsd(trade.trade_value_usd)} (sold ${trade.token_sold_symbol})\n`;
      });
  } else {
    prompt += `No individual trade data available.\n`;
  }
  prompt += `\n`;

  // === Section 4: Weekly Flow Intelligence ===
  prompt += `## Weekly Flow Intelligence\n`;
  if (filteredFlows.length > 0) {
    filteredFlows.forEach((fi) => {
      prompt += `- ${fi.symbol} (${fi.chain}): Smart Trader: ${formatUsd(fi.flows.smart_trader_net_flow_usd)}, Whale: ${formatUsd(fi.flows.whale_net_flow_usd)}, Exchange: ${formatUsd(fi.flows.exchange_net_flow_usd)}\n`;
    });
  } else {
    prompt += `No flow intelligence data available.\n`;
  }
  prompt += `\n`;

  prompt += `IMPORTANT: Use ALL available data sources above to populate both sections. Never show "Data Unavailable" — use the MC and Vol from the screener data. If a metric is zero, simply omit it.\n`;
  prompt += `1. Emerging Trends: Group tokens by their actual sector data AND trading patterns. Each trend should:\n`;
  prompt += `   - Name 2-3 tokens with their net flow amounts\n`;
  prompt += `   - Include a 1-sentence data-driven insight (e.g., "3 unique wallets accumulated, largest single trade $250K")\n`;
  prompt += `   - Be based on ACTUAL sector tags from the screener data, NOT generic categories\n`;
  prompt += `2. Top 5 tokens by net flow — include MC and 7d volume from screener data\n`;
  prompt += `Use real data from above. Format as HTML for Telegram.`;

  return prompt;
}
