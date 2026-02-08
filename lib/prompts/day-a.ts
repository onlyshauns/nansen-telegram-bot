import type { NansenDEXTrade, NansenTransfer, NansenFlowIntelligence, NansenTokenScreenerItem } from '../types';
import { formatUsd } from '../formatting';

// Tokens to exclude from smart money flows and high conviction
const EXCLUDED_SYMBOLS = new Set([
  'BTC', 'WBTC', 'BTCB', 'TBTC',
  'ETH', 'WETH', 'STETH', 'RETH', 'CBETH', 'WSTETH', 'METH', 'EETH', 'WEETH',
  'SOL', 'WSOL', 'MSOL', 'JITOSOL', 'BSOL', 'DZSOL', 'JITOOSOL',
  'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'USDP', 'GUSD', 'PYUSD', 'USDS', 'USDE', 'FDUSD', 'CRVUSD', 'GHO',
  'BNB', 'WBNB',
]);

function isExcluded(symbol: string | undefined | null): boolean {
  if (!symbol) return true; // Exclude undefined/null symbols
  const upper = symbol.toUpperCase();
  if (EXCLUDED_SYMBOLS.has(upper)) return true;
  // Exclude wrapped/LST patterns
  if (upper.startsWith('W') && EXCLUDED_SYMBOLS.has(upper.slice(1))) return true;
  if (upper.endsWith('ETH') && upper !== 'ETH' && upper.length > 3) return true;
  if (upper.endsWith('SOL') && upper !== 'SOL' && upper.length > 3) return true;
  return false;
}

export const DAY_A_SYSTEM_PROMPT = `You are a marketing content creator for web platforms specializing in crypto/DeFi market analysis. Your ONLY job is to output HTML formatted text for Telegram.

TASK: Analyze smart money activity in the past 24 hours and generate a market digest.

You will be given pre-fetched data including:
- Smart money net flow data (token balances and flows)
- Token screener data with market caps and volumes
- High conviction transfer data
- Smart money DEX trades

All stablecoins, BTC, ETH, SOL, and wrapped/staking versions have ALREADY been filtered out of the data.

From this data, extract:
1. TOP 5 tokens by smart money net flow
2. HIGH CONVICTION tokens where 2+ unique smart money entities are accumulating

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
<i>2+ Smart Entities buying same token</i>
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
- If fewer than 5 tokens exist, show however many are available (minimum 3)
- If fewer than 5 High Conviction tokens exist, show however many qualify
- NEVER output "DATA UNAVAILABLE" — always use the provided data to fill entries
- Do NOT include stablecoins, BTC, ETH, SOL, or wrapped tokens — they have already been filtered out
- Output raw HTML text only`;

export function buildDayAUserPrompt(data: {
  dexTrades: NansenDEXTrade[];
  transfers: NansenTransfer[];
  flowIntelligence: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Here is today's smart money activity data from the past 24 hours. Generate the Daily Onchain Digest.\n\n`;

  // Pre-filter screener data to exclude stablecoins/majors
  const filteredScreener = data.screenerData.filter((t) => !isExcluded(t.symbol));

  // Smart Money Screener Data (net flows + market data)
  prompt += `## Token Screener Data (Smart Money Net Flows, Market Cap, Volume)\n`;
  if (filteredScreener.length > 0) {
    filteredScreener.forEach((token) => {
      const chain = (token.chain || 'unknown').toUpperCase().replace('ETHEREUM', 'ETH').replace('SOLANA', 'SOL');
      prompt += `- ${token.symbol} (${chain}): Net Flow ${formatUsd(token.net_flow_usd)}, MC: ${formatUsd(token.market_cap_usd)}, Vol: ${formatUsd(token.volume_usd)}, Price Change: ${(token.price_change_percentage ?? 0).toFixed(1)}%`;
      if (token.sectors?.length > 0) prompt += `, Sectors: ${token.sectors.join(', ')}`;
      prompt += `\n`;
    });
  } else {
    prompt += `No screener data available — use DEX trades and flow intelligence data below instead.\n`;
  }
  prompt += `\n`;

  // Pre-filter DEX trades
  const filteredTrades = data.dexTrades.filter((t) => !isExcluded(t.token_bought_symbol));

  // Smart Money DEX Trades (for high conviction detection)
  prompt += `## Smart Money DEX Trades (Last 24h) - Use to identify High Conviction tokens\n`;
  if (filteredTrades.length > 0) {
    const tokenBuyers: Record<string, { entities: Set<string>; totalUsd: number; chain: string }> = {};
    filteredTrades.forEach((trade) => {
      const symbol = trade.token_bought_symbol;
      if (!tokenBuyers[symbol]) {
        tokenBuyers[symbol] = { entities: new Set(), totalUsd: 0, chain: trade.chain || 'unknown' };
      }
      const entity = trade.trader_label || trade.trader_address;
      tokenBuyers[symbol].entities.add(entity);
      tokenBuyers[symbol].totalUsd += trade.trade_value_usd;
    });

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

  // Flow Intelligence (filter out excluded)
  const filteredFlows = data.flowIntelligence.filter((fi) => !isExcluded(fi.symbol));
  prompt += `## Flow Intelligence Summary\n`;
  if (filteredFlows.length > 0) {
    filteredFlows.forEach((fi) => {
      prompt += `- ${fi.symbol} (${fi.chain}): Smart Trader flow: ${formatUsd(fi.flows.smart_trader_net_flow_usd)}, Whale flow: ${formatUsd(fi.flows.whale_net_flow_usd)}, Exchange flow: ${formatUsd(fi.flows.exchange_net_flow_usd)}\n`;
    });
  } else {
    prompt += `No flow intelligence data available.\n`;
  }
  prompt += `\n`;

  // High Conviction Transfers (filter out excluded)
  const filteredTransfers = data.transfers.filter((t) => !isExcluded(t.token_symbol));
  prompt += `## High Conviction Transfers\n`;
  if (filteredTransfers.length > 0) {
    filteredTransfers.slice(0, 20).forEach((t) => {
      prompt += `- ${t.token_symbol}: ${formatUsd(t.transfer_value_usd)} from ${t.from_address_label || 'Unknown'} to ${t.to_address_label || 'Unknown'}\n`;
    });
  } else {
    prompt += `No transfer data available.\n`;
  }
  prompt += `\n`;

  prompt += `IMPORTANT: Use ALL available data sources above to populate both sections. If one data source is empty, rely on the others. Always fill out the full template with real data from the sources provided.\n`;
  prompt += `1. Top 5 Smart Money net inflows - include MC and 24h volume\n`;
  prompt += `2. Top 5 High Conviction tokens (2+ unique smart entities accumulating)\n`;
  prompt += `Output raw HTML for Telegram.`;

  return prompt;
}
