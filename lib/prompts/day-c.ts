import type { NansenDEXTrade, NansenFlowIntelligence, NansenTokenScreenerItem } from '../types';
import { formatUsd, truncateAddress } from '../formatting';

export const DAY_C_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Create a weekly roundup of smart money activity from the past 7 days.

You will be given pre-fetched data including:
- 7-day smart money DEX trades aggregated by token
- Token screener data with market caps, volumes, sectors, and net flows
- Flow intelligence data for key tokens

From this data, extract:
1. EMERGING TRENDS: Group trending tokens by category (AI, DeFi, Gaming, Meme, RWA, etc.)
2. TOP 5 tokens by smart money net flow (exclude stablecoins)

OUTPUT FORMAT (COPY EXACTLY):
Return ONLY this exact HTML as a plain text string:

<b>Daily Onchain Digest (Weekly Roundup)</b>

<b>Emerging Trends This Week</b>
\u2022 [Category 1]: [TOKEN1], [TOKEN2], [TOKEN3]
\u2022 [Category 2]: [TOKEN1], [TOKEN2], [TOKEN3]
\u2022 [Category 3]: [TOKEN1], [TOKEN2], [TOKEN3]
\u2022 [Category 4]: [TOKEN1], [TOKEN2], [TOKEN3]
\u2022 [Category 5]: [TOKEN1], [TOKEN2], [TOKEN3]

<b>Largest Smart Money Flows (Top 5)</b>
\u2022 <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
\u2022 <b>[TOKEN]</b> (CHAIN): +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]

CRITICAL OUTPUT RULES:
- Return as plain text string, NOT as JSON object
- Do NOT wrap in {"output": "..."} or any JSON structure
- Output the raw HTML string directly
- Use \u2022 for bullet points (NOT dash or hyphen)
- Replace [brackets] with actual data
- CHAIN FORMAT: Use (ETH), (SOL), (BSC), (BASE) - uppercase in parentheses
- MONEY FORMAT:
  * Under $1K: $999
  * Thousands: $15.7K not $15,700 (uppercase K)
  * Millions: $1.5M not $1,500,000 (uppercase M)
  * Billions: $1.2B (uppercase B)
- Format market caps and volumes consistently with money format above
- Use <b> tags for token symbols in Largest Smart Money Flows section
- NO "net inflow" text - just the amount with + prefix
- TOKEN SYMBOLS: Use ONLY alphanumeric characters (A-Z, 0-9, no special chars)
- Replace any ampersand with "and" in token names
- Remove any < or > characters from token names
- Ensure all HTML tags are properly closed
- NO additional text before or after the HTML
- Article titles: Remove quotes, ampersands, and special characters
- Keep total message under 3500 characters`;

export function buildDayCUserPrompt(data: {
  weeklyTrades: NansenDEXTrade[];
  weeklyFlows: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Analyze smart money activity from the past 7 days. Generate a weekly roundup.\n\nHere is the pre-fetched data:\n\n`;

  // Token Screener Data (7d)
  prompt += `## Token Screener Data (7-Day Smart Money Flows)\n`;
  if (data.screenerData.length > 0) {
    data.screenerData.forEach((token) => {
      const chain = token.chain.toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
      prompt += `- ${token.symbol} (${chain}): Net Flow ${formatUsd(token.net_flow_usd)}, MC: ${formatUsd(token.market_cap_usd)}, Vol: ${formatUsd(token.volume_usd)}, Price Change: ${token.price_change_percentage.toFixed(1)}%`;
      if (token.sectors.length > 0) prompt += `, Sectors: ${token.sectors.join(', ')}`;
      prompt += `\n`;
    });
  } else {
    prompt += `No screener data available.\n`;
  }
  prompt += `\n`;

  // Weekly DEX Trades Summary
  prompt += `## Smart Money DEX Trades This Week (Aggregated)\n`;
  if (data.weeklyTrades.length > 0) {
    // Aggregate by token bought
    const tokenBuys: Record<string, { count: number; totalUsd: number; traders: Set<string>; chain: string }> = {};
    data.weeklyTrades.forEach((trade) => {
      const symbol = trade.token_bought_symbol;
      if (!tokenBuys[symbol]) {
        tokenBuys[symbol] = { count: 0, totalUsd: 0, traders: new Set(), chain: trade.chain };
      }
      tokenBuys[symbol].count++;
      tokenBuys[symbol].totalUsd += trade.trade_value_usd;
      tokenBuys[symbol].traders.add(trade.trader_label || truncateAddress(trade.trader_address));
    });

    const sortedTokens = Object.entries(tokenBuys)
      .sort(([, a], [, b]) => b.totalUsd - a.totalUsd)
      .slice(0, 20);

    sortedTokens.forEach(([symbol, info]) => {
      prompt += `- ${symbol} (${info.chain}): ${formatUsd(info.totalUsd)} total buys, ${info.count} trades by ${info.traders.size} unique traders\n`;
    });
  } else {
    prompt += `No weekly trade data available.\n`;
  }
  prompt += `\n`;

  // Weekly Flow Intelligence
  prompt += `## Weekly Flow Intelligence\n`;
  if (data.weeklyFlows.length > 0) {
    data.weeklyFlows.forEach((fi) => {
      prompt += `- ${fi.symbol} (${fi.chain}): Smart Trader: ${formatUsd(fi.flows.smart_trader_net_flow_usd)}, Whale: ${formatUsd(fi.flows.whale_net_flow_usd)}, Exchange: ${formatUsd(fi.flows.exchange_net_flow_usd)}\n`;
    });
  } else {
    prompt += `No flow intelligence data available.\n`;
  }
  prompt += `\n`;

  prompt += `Requirements:\n`;
  prompt += `1. Emerging trends based on actual 7-day smart money flows grouped by category\n`;
  prompt += `2. Top 5 tokens by net flow (exclude stablecoins) - include MC and 24h volume\n`;
  prompt += `Use real data from above. Format as HTML for Telegram.`;

  return prompt;
}
