import type { NansenDEXTrade, NansenTransfer, NansenFlowIntelligence, NansenTokenScreenerItem } from '../types';
import { formatUsd } from '../formatting';

export const DAY_A_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Analyze smart money activity in the past 24 hours and generate a market digest.

You will be given pre-fetched data including:
- Smart money net flow data (token balances and flows)
- Token screener data with market caps and volumes
- High conviction transfer data
- Smart money DEX trades

From this data, extract:
1. TOP 5 tokens by smart money net flow (exclude stablecoins, BTC, ETH, SOL, wrapped/staking versions)
2. HIGH CONVICTION tokens where 3+ unique smart money entities are accumulating

OUTPUT FORMAT (COPY EXACTLY):
Your response must be ONLY the following HTML structure with real data:

📈 <b>Daily Onchain Digest</b>

<b>🤓 Smart Money Flows</b>
• <b>[TOKEN1]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN2]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN3]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN4]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN5]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]

<b>🎯 High Conviction Accumulation</b>
<i>3+ Smart Entities buying same token</i>
• [TOKEN1]: [X] entities | +$[AMOUNT]
• [TOKEN2]: [X] entities | +$[AMOUNT]
• [TOKEN3]: [X] entities | +$[AMOUNT]
• [TOKEN4]: [X] entities | +$[AMOUNT]
• [TOKEN5]: [X] entities | +$[AMOUNT]

CRITICAL OUTPUT RULES:
- Output ONLY the HTML above - no other text, no explanations, no commentary
- Use • for bullet points (NOT - or *)
- Always start a sentence or bullet point with a capitalised letter
- MONEY FORMAT: Under $1K: $999 | Thousands: $15.7K | Millions: $1.5M | Billions: $1.2B (always uppercase K/M/B)
- Format market caps and volumes consistently with money format above
- Use <b> tags for token symbols in Smart Money Flows section
- Sort by highest amounts first
- NO "net inflow" text - just the amount with + prefix
- Ensure all HTML tags are properly closed
- If fewer than 5 Smart Money Flow tokens exist, show however many are available (minimum 3)
- If fewer than 5 High Conviction tokens exist, show however many qualify (minimum 3+ entities)
- If very few tokens qualify for a section, still show at least 3 entries with the best available data
- NEVER output "DATA UNAVAILABLE" — always use the provided data to fill entries
- EXCLUDE: BTC, ETH, SOL, stablecoins, and any wrapped/liquid staking versions
- EXCLUDE PATTERNS: Tokens ending in "SOL" (DZSOL, JITOSOL), ending in "ETH" (stETH, rETH), starting with "w" (wBTC, wETH)
- Output raw HTML text only`;

export function buildDayAUserPrompt(data: {
  dexTrades: NansenDEXTrade[];
  transfers: NansenTransfer[];
  flowIntelligence: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Here is today's smart money activity data from the past 24 hours. Generate the Daily Onchain Digest.\n\n`;

  // Smart Money Screener Data (net flows + market data)
  prompt += `## Token Screener Data (Smart Money Net Flows, Market Cap, Volume)\n`;
  if (data.screenerData.length > 0) {
    data.screenerData.forEach((token) => {
      const chain = token.chain.toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
      prompt += `- ${token.symbol} (${chain}): Net Flow ${formatUsd(token.net_flow_usd)}, MC: ${formatUsd(token.market_cap_usd)}, Vol: ${formatUsd(token.volume_usd)}, Price Change: ${token.price_change_percentage.toFixed(1)}%`;
      if (token.sectors.length > 0) prompt += `, Sectors: ${token.sectors.join(', ')}`;
      prompt += `\n`;
    });
  } else {
    prompt += `No screener data available — use DEX trades and flow intelligence data below instead.\n`;
  }
  prompt += `\n`;

  // Smart Money DEX Trades (for high conviction detection)
  prompt += `## Smart Money DEX Trades (Last 24h) - Use to identify High Conviction tokens\n`;
  if (data.dexTrades.length > 0) {
    // Aggregate by token bought to identify high conviction
    const tokenBuyers: Record<string, { entities: Set<string>; totalUsd: number; chain: string }> = {};
    data.dexTrades.forEach((trade) => {
      const symbol = trade.token_bought_symbol;
      if (!tokenBuyers[symbol]) {
        tokenBuyers[symbol] = { entities: new Set(), totalUsd: 0, chain: trade.chain };
      }
      const entity = trade.trader_label || trade.trader_address;
      tokenBuyers[symbol].entities.add(entity);
      tokenBuyers[symbol].totalUsd += trade.trade_value_usd;
    });

    // Show aggregated data
    const sorted = Object.entries(tokenBuyers)
      .sort(([, a], [, b]) => b.entities.size - a.entities.size)
      .slice(0, 20);

    sorted.forEach(([symbol, info]) => {
      prompt += `- ${symbol} (${info.chain}): ${info.entities.size} unique entities, Total: ${formatUsd(info.totalUsd)}\n`;
    });
  } else {
    prompt += `No DEX trade data available — use screener and flow intelligence for content.\n`;
  }
  prompt += `\n`;

  // Flow Intelligence
  prompt += `## Flow Intelligence Summary\n`;
  if (data.flowIntelligence.length > 0) {
    data.flowIntelligence.forEach((fi) => {
      prompt += `- ${fi.symbol} (${fi.chain}): Smart Trader flow: ${formatUsd(fi.flows.smart_trader_net_flow_usd)}, Whale flow: ${formatUsd(fi.flows.whale_net_flow_usd)}, Exchange flow: ${formatUsd(fi.flows.exchange_net_flow_usd)}\n`;
    });
  } else {
    prompt += `No flow intelligence data available.\n`;
  }
  prompt += `\n`;

  // High Conviction Transfers
  prompt += `## High Conviction Transfers\n`;
  if (data.transfers.length > 0) {
    data.transfers.slice(0, 20).forEach((t) => {
      prompt += `- ${t.token_symbol}: ${formatUsd(t.transfer_value_usd)} from ${t.from_address_label || 'Unknown'} to ${t.to_address_label || 'Unknown'}\n`;
    });
  } else {
    prompt += `No transfer data available.\n`;
  }
  prompt += `\n`;

  prompt += `IMPORTANT: Use ALL available data sources above to populate both sections. If one data source is empty, rely on the others. Always fill out the full template with real data from the sources provided.\n`;
  prompt += `1. Top 5 Smart Money net inflows (exclude stables/BTC/ETH/SOL) - include MC and 24h volume\n`;
  prompt += `2. Top 5 High Conviction tokens (3+ unique smart entities accumulating) - if fewer than 5 qualify, show however many do\n`;
  prompt += `Output raw HTML for Telegram.`;

  return prompt;
}
