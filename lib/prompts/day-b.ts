import type { NansenDEXTrade, NansenPerpTrade, NansenTokenScreenerItem } from '../types';
import { formatUsd, truncateAddress, formatTimestamp } from '../formatting';

// TODO: Replace with your actual system prompt
export const DAY_B_SYSTEM_PROMPT = `You are a professional crypto analyst writing concise, data-driven Telegram posts for the Nansen community channel.

Your task is to analyze Smart Money memecoin activity and Hyperliquid perpetual futures positions, then produce a well-formatted Telegram post.

Guidelines:
- Use plain text formatting (no HTML tags). Use emoji sparingly for visual structure.
- Keep the post between 1500-3000 characters
- For memecoins: highlight which tokens smart money is buying/selling, rotation patterns, and emerging narratives
- For Hyperliquid: highlight notable large positions, leveraged bets, and directional conviction
- Group findings clearly into memecoin section and Hyperliquid section
- End with a brief takeaway or sentiment summary
- Be factual and data-driven, avoid speculation`;

export function buildDayBUserPrompt(data: {
  memecoinTrades: NansenDEXTrade[];
  perpTrades: NansenPerpTrade[];
  screenerData: NansenTokenScreenerItem[];
}): string {
  let prompt = `Here is today's onchain data. Please analyze and create a Telegram post.\n\n`;

  // Memecoin Smart Money Trades
  prompt += `## Smart Money Memecoin Trades (Last 24h)\n`;
  if (data.memecoinTrades.length === 0) {
    prompt += `No significant memecoin trades by smart money detected.\n\n`;
  } else {
    data.memecoinTrades.slice(0, 25).forEach((trade) => {
      const label = trade.trader_label || truncateAddress(trade.trader_address);
      const smLabel = trade.smart_money_label ? ` [${trade.smart_money_label}]` : '';
      prompt += `- ${label}${smLabel} bought ${trade.token_bought_symbol} with ${trade.token_sold_symbol} (${formatUsd(trade.trade_value_usd)}) on ${trade.chain} at ${formatTimestamp(trade.block_timestamp)}\n`;
    });
    prompt += `\n`;
  }

  // Token Screener - Top movers
  if (data.screenerData.length > 0) {
    prompt += `## Top Tokens by Smart Money Net Flow\n`;
    data.screenerData.slice(0, 15).forEach((token) => {
      prompt += `- ${token.symbol} (${token.chain}): Net Flow ${formatUsd(token.net_flow_usd)}, Volume ${formatUsd(token.volume_usd)}, Price Change ${token.price_change_percentage.toFixed(1)}%\n`;
    });
    prompt += `\n`;
  }

  // Hyperliquid Perp Trades
  prompt += `## Hyperliquid Smart Money Perp Trades\n`;
  if (data.perpTrades.length === 0) {
    prompt += `No significant Hyperliquid perp trades detected.\n\n`;
  } else {
    data.perpTrades.slice(0, 20).forEach((trade) => {
      prompt += `- ${trade.trader} ${trade.action} ${trade.side} ${trade.token} (${formatUsd(trade.value_usd)}) at ${formatUsd(trade.price_usd)} - ${formatTimestamp(trade.timestamp)}\n`;
    });
    prompt += `\n`;
  }

  prompt += `\nPlease create a formatted Telegram post covering Smart Money memecoin flows and Hyperliquid positions for today.`;

  return prompt;
}
