import type { NansenDEXTrade, NansenTransfer, NansenFlowIntelligence } from '../types';
import { formatUsd, truncateAddress, formatTimestamp } from '../formatting';

// TODO: Replace with your actual system prompt
export const DAY_A_SYSTEM_PROMPT = `You are a professional crypto analyst writing concise, data-driven Telegram posts for the Nansen community channel.

Your task is to analyze Smart Money flows and High Conviction onchain movements, then produce a well-formatted Telegram post.

Guidelines:
- Use plain text formatting (no HTML tags). Use emoji sparingly for visual structure.
- Keep the post between 1500-3000 characters
- Focus on the most significant and interesting movements
- Highlight notable wallet labels, large trades, and unusual patterns
- Group findings by theme (e.g., accumulation signals, rotation patterns, notable exits)
- End with a brief takeaway or sentiment summary
- Be factual and data-driven, avoid speculation`;

export function buildDayAUserPrompt(data: {
  dexTrades: NansenDEXTrade[];
  transfers: NansenTransfer[];
  flowIntelligence: { chain: string; symbol: string; flows: NansenFlowIntelligence }[];
}): string {
  let prompt = `Here is today's onchain data. Please analyze and create a Telegram post.\n\n`;

  // Smart Money DEX Trades
  prompt += `## Smart Money DEX Trades (Last 24h)\n`;
  if (data.dexTrades.length === 0) {
    prompt += `No significant smart money DEX trades detected.\n\n`;
  } else {
    data.dexTrades.slice(0, 30).forEach((trade) => {
      const label = trade.trader_label || truncateAddress(trade.trader_address);
      const smLabel = trade.smart_money_label ? ` [${trade.smart_money_label}]` : '';
      prompt += `- ${label}${smLabel} bought ${trade.token_bought_symbol} with ${trade.token_sold_symbol} (${formatUsd(trade.trade_value_usd)}) on ${trade.chain} via ${trade.dex_name || 'DEX'} at ${formatTimestamp(trade.block_timestamp)}\n`;
    });
    prompt += `\n`;
  }

  // High Conviction Transfers
  prompt += `## High Conviction Transfers\n`;
  if (data.transfers.length === 0) {
    prompt += `No high-value transfers detected.\n\n`;
  } else {
    data.transfers.slice(0, 20).forEach((t) => {
      const from = t.from_address_label || truncateAddress(t.from_address);
      const to = t.to_address_label || truncateAddress(t.to_address);
      prompt += `- ${from} -> ${to}: ${formatUsd(t.transfer_value_usd)} ${t.token_symbol} on ${t.chain} at ${formatTimestamp(t.block_timestamp)}\n`;
    });
    prompt += `\n`;
  }

  // Flow Intelligence
  prompt += `## Flow Intelligence Summary\n`;
  if (data.flowIntelligence.length === 0) {
    prompt += `No flow intelligence data available.\n\n`;
  } else {
    data.flowIntelligence.forEach((fi) => {
      prompt += `### ${fi.chain} - ${fi.symbol}\n`;
      prompt += `- Whale net flow: ${formatUsd(fi.flows.whale_net_flow_usd)} (${fi.flows.whale_wallet_count} wallets)\n`;
      prompt += `- Smart Trader net flow: ${formatUsd(fi.flows.smart_trader_net_flow_usd)} (${fi.flows.smart_trader_wallet_count} wallets)\n`;
      prompt += `- Exchange net flow: ${formatUsd(fi.flows.exchange_net_flow_usd)} (${fi.flows.exchange_wallet_count} wallets)\n`;
      prompt += `- Fresh Wallets net flow: ${formatUsd(fi.flows.fresh_wallets_net_flow_usd)} (${fi.flows.fresh_wallets_wallet_count} wallets)\n\n`;
    });
  }

  prompt += `\nPlease create a formatted Telegram post summarizing the key Smart Money flows and High Conviction movements for today.`;

  return prompt;
}
