// ============================================
// Nansen API Response Types
// Adapted from /Users/shaun/onchain-flows/src/lib/nansen/types.ts
// ============================================

export interface NansenDEXTrade {
  chain: string;
  transaction_hash: string;
  block_timestamp: string;
  trader_address: string;
  trader_label?: string;
  smart_money_label?: string;
  token_bought_address: string;
  token_bought_symbol: string;
  token_bought_name?: string;
  token_bought_amount: string;
  token_sold_address: string;
  token_sold_symbol: string;
  token_sold_name?: string;
  token_sold_amount: string;
  trade_value_usd: number;
  dex_name?: string;
}

export interface NansenDEXTradesResponse {
  data: NansenDEXTrade[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

export interface NansenTransfer {
  chain: string;
  transaction_hash: string;
  block_timestamp: string;
  from_address: string;
  from_address_label?: string;
  to_address: string;
  to_address_label?: string;
  token_address: string;
  token_symbol: string;
  token_name?: string;
  transfer_amount: string;
  transfer_value_usd: number;
  exchange_type?: 'DEX' | 'CEX' | 'Direct';
  transaction_type?: string;
}

export interface NansenTransfersResponse {
  data: NansenTransfer[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

export interface NansenFlowIntelligence {
  whale_net_flow_usd: number;
  whale_avg_flow_usd: number;
  whale_wallet_count: number;
  smart_trader_net_flow_usd: number;
  smart_trader_avg_flow_usd: number;
  smart_trader_wallet_count: number;
  public_figure_net_flow_usd: number;
  public_figure_avg_flow_usd: number;
  public_figure_wallet_count: number;
  top_pnl_net_flow_usd: number;
  top_pnl_avg_flow_usd: number;
  top_pnl_wallet_count: number;
  exchange_net_flow_usd: number;
  exchange_avg_flow_usd: number;
  exchange_wallet_count: number;
  fresh_wallets_net_flow_usd: number;
  fresh_wallets_avg_flow_usd: number;
  fresh_wallets_wallet_count: number;
}

export interface NansenFlowIntelligenceResponse {
  data: NansenFlowIntelligence[];
}

export interface NansenPerpTrade {
  timestamp: string;
  side: string;
  action: string;
  token: string;
  size: number;
  price_usd: number;
  value_usd: number;
  trader: string;
  tx_hash: string;
}

export interface NansenTokenScreenerItem {
  token_address: string;
  symbol: string;
  chain: string;
  price_usd: number;
  price_change_percentage: number;
  market_cap_usd: number;
  volume_usd: number;
  buy_volume_usd: number;
  sell_volume_usd: number;
  net_flow_usd: number;
  liquidity_usd: number;
  token_age_days: number;
  sectors: string[];
}

// ============================================
// Academy Article Types
// ============================================

export type ArticleCategory =
  | 'smart-money'
  | 'token-screener'
  | 'trading'
  | 'playbook'
  | '101'
  | 'alerts'
  | 'profiler'
  | 'general';

export interface AcademyArticle {
  title: string;
  url: string;
  category: ArticleCategory;
}

// ============================================
// News Article Types
// ============================================

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url: string;
  timestamp: string;
  description?: string;
}

// ============================================
// Generation Result Types
// ============================================

export type DayType = 'day-a' | 'day-b' | 'day-c' | 'news';

export interface GenerationResult {
  content: string;
  telegramMessageIds: number[];
  articleAppended: AcademyArticle;
  generatedAt: string;
}

export interface GenerateResponse {
  success: boolean;
  result?: GenerationResult;
  error?: string;
}
