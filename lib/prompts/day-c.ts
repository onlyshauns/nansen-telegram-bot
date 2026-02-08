import type { NansenDEXTrade, NansenFlowIntelligence } from '../types';
import { formatUsd, truncateAddress } from '../formatting';

// TODO: Replace with your actual system prompt
export const DAY_C_SYSTEM_PROMPT = `You are a professional crypto analyst writing a weekly roundup Telegram post for the Nansen community channel.

Your task is to create a comprehensive weekly summary of Smart Money activity, highlighting the biggest moves, emerging trends, and key narratives.

Guidelines:
- Use plain text formatting (no HTML tags). Use emoji sparingly for visual structure.
- Keep the post between 2000-3500 characters
- Structure as a clear weekly roundup with sections
- Highlight the week's biggest smart money moves
- Identify accumulation/distribution patterns across the week
- Note any emerging narratives or sector rotations
- Compare this week's activity to general market context
- End with a forward-looking summary
- Be factual and data-driven, avoid speculation`;

export function buildDayCUserPrompt(data: {
  weeklyTrades: NansenDEXTrade[];
  weeklyFlows: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
}): string {
  let prompt = `Here is this week's onchain data for the weekly roundup. Please create a comprehensive Telegram post.\n\n`;

  // Weekly DEX Trades Summary
  prompt += `## Smart Money DEX Trades This Week\n`;
  if (data.weeklyTrades.length === 0) {
    prompt += `No significant trades this week.\n\n`;
  } else {
    // Aggregate by token bought
    const tokenBuys: Record<string, { count: number; totalUsd: number; traders: Set<string> }> = {};
    data.weeklyTrades.forEach((trade) => {
      const symbol = trade.token_bought_symbol;
      if (!tokenBuys[symbol]) {
        tokenBuys[symbol] = { count: 0, totalUsd: 0, traders: new Set() };
      }
      tokenBuys[symbol].count++;
      tokenBuys[symbol].totalUsd += trade.trade_value_usd;
      tokenBuys[symbol].traders.add(trade.trader_label || truncateAddress(trade.trader_address));
    });

    const sortedTokens = Object.entries(tokenBuys)
      .sort(([, a], [, b]) => b.totalUsd - a.totalUsd)
      .slice(0, 20);

    prompt += `### Top Tokens by Smart Money Buy Volume\n`;
    sortedTokens.forEach(([symbol, data]) => {
      prompt += `- ${symbol}: ${formatUsd(data.totalUsd)} total buys, ${data.count} trades by ${data.traders.size} unique traders\n`;
    });
    prompt += `\n`;

    // Top individual trades
    prompt += `### Biggest Individual Trades\n`;
    data.weeklyTrades
      .sort((a, b) => b.trade_value_usd - a.trade_value_usd)
      .slice(0, 10)
      .forEach((trade) => {
        const label = trade.trader_label || truncateAddress(trade.trader_address);
        prompt += `- ${label} bought ${trade.token_bought_symbol} (${formatUsd(trade.trade_value_usd)}) on ${trade.chain}\n`;
      });
    prompt += `\n`;
  }

  // Weekly Flow Intelligence
  prompt += `## Weekly Flow Intelligence\n`;
  if (data.weeklyFlows.length === 0) {
    prompt += `No flow intelligence data available for this week.\n\n`;
  } else {
    data.weeklyFlows.forEach((fi) => {
      prompt += `### ${fi.chain} - ${fi.symbol} (7d)\n`;
      prompt += `- Whale net flow: ${formatUsd(fi.flows.whale_net_flow_usd)} (${fi.flows.whale_wallet_count} wallets)\n`;
      prompt += `- Smart Trader net flow: ${formatUsd(fi.flows.smart_trader_net_flow_usd)} (${fi.flows.smart_trader_wallet_count} wallets)\n`;
      prompt += `- Exchange net flow: ${formatUsd(fi.flows.exchange_net_flow_usd)}\n\n`;
    });
  }

  prompt += `\nPlease create a formatted weekly roundup Telegram post summarizing the key Smart Money activity this week.`;

  return prompt;
}
