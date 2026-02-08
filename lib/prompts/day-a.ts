import type { NansenDEXTrade, NansenTransfer, NansenFlowIntelligence, NansenTokenScreenerItem } from '../types';
import { formatUsd } from '../formatting';

export const DAY_A_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Analyze smart money activity in the past 24 hours and generate a market digest.

You will be given pre-fetched data including:
- Smart money net flow data (token balances and flows)
- Token screener data with market caps and volumes
- High conviction transfer data

From this data, extract:
1. TOP 5 tokens by smart money net flow (exclude stablecoins, BTC, ETH, SOL, wrapped/staking versions)
2. HIGH CONVICTION tokens where 3+ unique smart money entities are accumulating

OUTPUT FORMAT (COPY EXACTLY):
Your response must be ONLY the following HTML structure with real data:

<b>Daily Onchain Digest</b>

<b>Smart Money Flows</b>
• <b>[TOKEN1]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN2]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN3]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN4]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]
• <b>[TOKEN5]</b>: +$[AMOUNT] | MC: $[MCAP] | Vol: $[VOLUME]

<b>High Conviction Accumulation</b>
<i>3+ Smart Entities buying same token</i>
• [TOKEN1]: [X] entities | +$[AMOUNT]
• [TOKEN2]: [X] entities | +$[AMOUNT]
• [TOKEN3]: [X] entities | +$[AMOUNT]
• [TOKEN4]: [X] entities | +$[AMOUNT]
• [TOKEN5]: [X] entities | +$[AMOUNT]

RULES:
- Output ONLY the HTML above - no other text
- Replace [brackets] with actual data
- Use real token names and dollar amounts
- Sort by highest amounts first
- EXCLUDE: BTC, ETH, SOL, stablecoins, and any wrapped/liquid staking versions
- EXCLUDE PATTERNS: Tokens ending in "SOL" (DZSOL, JITOSOL), ending in "ETH" (stETH, rETH), starting with "w" (wBTC, wETH)
- Format numbers: $465.1K not $465,100
- Format market caps and volumes consistently: $2.3M, $450K
- Use bullet point: \u2022 (not -)
- Use <b> tags for token symbols in Smart Money Flows section
- NO explanations, NO commentary
- Output raw HTML text only
- Complete the ENTIRE template
- Always start a sentence or bullet point with a capitalised letter`;

export function buildDayAUserPrompt(data: {
  dexTrades: NansenDEXTrade[];
  transfers: NansenTransfer[];
  flowIntelligence: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Generate today's smart money digest analyzing the past 24 hours.\n\nHere is the pre-fetched data:\n\n`;

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
    prompt += `No screener data available.\n`;
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
    prompt += `No DEX trade data available.\n`;
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

  prompt += `Requirements:\n`;
  prompt += `1. Top 5 Smart Money net inflows (exclude stables/BTC/ETH/SOL) - include MC and 24h volume\n`;
  prompt += `2. Top 5 High Conviction tokens (3+ unique smart entities accumulating)\n`;
  prompt += `Output raw HTML for Telegram.`;

  return prompt;
}
