import type {
  NansenDEXTrade,
  NansenDEXTradesResponse,
  NansenTransfer,
  NansenTransfersResponse,
  NansenFlowIntelligence,
  NansenFlowIntelligenceResponse,
  NansenPerpTrade,
  NansenTokenScreenerItem,
} from './types';
import { hoursAgo } from './formatting';

type Chain = 'ethereum' | 'solana' | 'base';

const CHAIN_MAP: Record<Chain, string> = {
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
};

// Key token addresses for flow intelligence queries
const KEY_TOKENS: Record<Chain, { address: string; symbol: string }[]> = {
  ethereum: [
    { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
    { address: '0x514910771af9ca656af840dff83e8264ecf986ca', symbol: 'LINK' },
  ],
  solana: [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
    { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF' },
  ],
  base: [
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
    { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC' },
    { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO' },
  ],
};

/**
 * Normalize DEX trade response: map trader_address_label -> trader_label
 */
function normalizeDEXTrade(trade: NansenDEXTrade): NansenDEXTrade {
  return {
    ...trade,
    trader_label: trade.trader_address_label || trade.trader_label,
  };
}

/**
 * Normalize perp trade response: map API field names to our aliases
 */
function normalizePerpTrade(trade: NansenPerpTrade): NansenPerpTrade {
  return {
    ...trade,
    timestamp: trade.block_timestamp || trade.timestamp,
    token: trade.token_symbol || trade.token,
    size: trade.token_amount ?? trade.size ?? 0,
    trader: trade.trader_address_label || trade.trader || trade.trader_address || 'Unknown',
    tx_hash: trade.transaction_hash || trade.tx_hash,
  };
}

/**
 * Normalize screener item: map API field names to our aliases
 * API returns: token_symbol, price_change, volume, netflow, liquidity, buy_volume, sell_volume
 * Our prompts use: symbol, price_change_percentage, volume_usd, net_flow_usd, liquidity_usd, buy_volume_usd, sell_volume_usd
 */
function normalizeScreenerItem(item: NansenTokenScreenerItem): NansenTokenScreenerItem {
  return {
    ...item,
    symbol: item.token_symbol || item.symbol,
    price_change_percentage: item.price_change ?? item.price_change_percentage ?? 0,
    volume_usd: item.volume ?? item.volume_usd ?? 0,
    net_flow_usd: item.netflow ?? item.net_flow_usd ?? 0,
    liquidity_usd: item.liquidity ?? item.liquidity_usd ?? 0,
    buy_volume_usd: item.buy_volume ?? item.buy_volume_usd ?? 0,
    sell_volume_usd: item.sell_volume ?? item.sell_volume_usd ?? 0,
    sectors: item.sectors || [],
  };
}

export class NansenClient {
  private baseUrl = 'https://api.nansen.ai/api/v1';
  private betaUrl = 'https://api.nansen.ai/api/beta';
  private apiKey: string;
  private maxRetries = 3;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.includes('your_')) {
      throw new Error('Invalid Nansen API key');
    }
    this.apiKey = apiKey;
  }

  // ============================================
  // Day A: Smart Money Flows + High Conviction
  // ============================================

  async getSmartMoneyDEXTrades(
    chains: Chain[] = ['ethereum', 'solana', 'base'],
    options: { minUsd?: number; limit?: number } = {}
  ): Promise<NansenDEXTrade[]> {
    const { minUsd = 1000, limit = 50 } = options;

    try {
      // NOTE: /smart-money/dex-trades does NOT accept a date field.
      // It returns recent trades automatically.
      const response = await this.post<NansenDEXTradesResponse>(
        '/smart-money/dex-trades',
        {
          chains: chains.map((c) => CHAIN_MAP[c]),
          filters: {
            trade_value_usd: { min: minUsd },
          },
          pagination: { page: 1, per_page: limit },
        }
      );

      return (response.data || []).map(normalizeDEXTrade);
    } catch (error) {
      console.error('[Nansen] getSmartMoneyDEXTrades error:', error);
      return [];
    }
  }

  async getHighConvictionTransfers(
    chains: Chain[] = ['ethereum', 'solana', 'base'],
    options: { minUsd?: number; limit?: number } = {}
  ): Promise<NansenTransfer[]> {
    const { minUsd = 100000, limit = 30 } = options;

    // Fetch transfers for key tokens across chains in parallel
    const promises = chains.flatMap((chain) =>
      KEY_TOKENS[chain].slice(0, 3).map((token) =>
        this.fetchTokenTransfers(chain, token.address, minUsd, limit)
      )
    );

    const results = await Promise.allSettled(promises);

    return results
      .filter(
        (r): r is PromiseFulfilledResult<NansenTransfer[]> =>
          r.status === 'fulfilled'
      )
      .flatMap((r) => r.value)
      .sort((a, b) => b.transfer_value_usd - a.transfer_value_usd)
      .slice(0, limit);
  }

  async getFlowIntelligence(
    chain: Chain,
    tokenAddress: string,
    timeframe: string = '1d'
  ): Promise<NansenFlowIntelligence | null> {
    try {
      const response = await this.post<NansenFlowIntelligenceResponse>(
        '/tgm/flow-intelligence',
        {
          chain: CHAIN_MAP[chain],
          token_address: tokenAddress,
          timeframe,
        }
      );

      return response.data?.[0] || null;
    } catch (error) {
      console.error('[Nansen] getFlowIntelligence error:', error);
      return null;
    }
  }

  async getMultiTokenFlowIntelligence(
    chains: Chain[] = ['ethereum', 'solana', 'base']
  ): Promise<
    { chain: Chain; symbol: string; flows: NansenFlowIntelligence }[]
  > {
    const results: {
      chain: Chain;
      symbol: string;
      flows: NansenFlowIntelligence;
    }[] = [];

    for (const chain of chains) {
      const tokens = KEY_TOKENS[chain].slice(0, 2);
      for (const token of tokens) {
        const flows = await this.getFlowIntelligence(
          chain,
          token.address,
          '1d'
        );
        if (flows) {
          results.push({ chain, symbol: token.symbol, flows });
        }
      }
    }

    return results;
  }

  // ============================================
  // Day B: Memecoin Flows + Hyperliquid
  // ============================================

  async getMemecoinDEXTrades(
    chains: Chain[] = ['ethereum', 'solana', 'base'],
    options: { minUsd?: number; limit?: number } = {}
  ): Promise<NansenDEXTrade[]> {
    const { minUsd = 500, limit = 50 } = options;

    try {
      // NOTE: /smart-money/dex-trades does NOT accept a date field.
      const response = await this.post<NansenDEXTradesResponse>(
        '/smart-money/dex-trades',
        {
          chains: chains.map((c) => CHAIN_MAP[c]),
          filters: {
            trade_value_usd: { min: minUsd },
          },
          pagination: { page: 1, per_page: limit },
        }
      );

      // Filter for likely memecoins: low market cap tokens, non-stablecoin
      const stablecoins = new Set([
        'USDC',
        'USDT',
        'DAI',
        'BUSD',
        'TUSD',
        'FRAX',
        'USDP',
        'GUSD',
        'PYUSD',
      ]);
      const majorTokens = new Set([
        'WETH',
        'ETH',
        'WBTC',
        'BTC',
        'SOL',
        'WSOL',
        'LINK',
        'UNI',
        'AAVE',
        'MKR',
        'CRV',
      ]);

      return (response.data || [])
        .map(normalizeDEXTrade)
        .filter((trade) => {
          const boughtSymbol = trade.token_bought_symbol?.toUpperCase();
          const soldSymbol = trade.token_sold_symbol?.toUpperCase();
          return (
            !stablecoins.has(boughtSymbol) &&
            !majorTokens.has(boughtSymbol) &&
            !stablecoins.has(soldSymbol)
          );
        });
    } catch (error) {
      console.error('[Nansen] getMemecoinDEXTrades error:', error);
      return [];
    }
  }

  async getSmartMoneyPerpTrades(
    options: { limit?: number } = {}
  ): Promise<NansenPerpTrade[]> {
    const { limit = 25 } = options;

    try {
      // order_by must be an array of { field, direction }
      // field names must be snake_case: value_usd, block_timestamp, token_amount, price_usd
      const response = await this.post<{ data: NansenPerpTrade[] }>(
        '/smart-money/perp-trades',
        {
          pagination: { page: 1, per_page: limit },
          order_by: [{ field: 'value_usd', direction: 'DESC' }],
        }
      );

      return (response.data || []).map(normalizePerpTrade);
    } catch (error) {
      console.error('[Nansen] getSmartMoneyPerpTrades error:', error);
      return [];
    }
  }

  async getTokenScreener(
    chains: Chain[] = ['ethereum', 'solana', 'base'],
    options: {
      timeframe?: string;
      minVolume?: number;
      minLiquidity?: number;
      onlySmartMoney?: boolean;
      limit?: number;
    } = {}
  ): Promise<NansenTokenScreenerItem[]> {
    const {
      timeframe = '24h',
      minVolume = 100000,
      minLiquidity = 50000,
      onlySmartMoney = false,
      limit = 25,
    } = options;

    try {
      // API requires flat structure: chains and timeframe at top level
      // Filters use min/max (not from/to)
      // order_by is an array of { field, direction }
      const filters: Record<string, unknown> = {
        volume: { min: minVolume },
        liquidity: { min: minLiquidity },
      };

      if (onlySmartMoney) {
        filters.only_smart_money = true;
      }

      const body: Record<string, unknown> = {
        chains,
        timeframe,
        filters,
        pagination: { page: 1, per_page: limit },
        order_by: [{ field: 'netflow', direction: 'DESC' }],
      };

      const response = await this.post<{ data: NansenTokenScreenerItem[] }>(
        '/token-screener',
        body
      );

      return (response.data || []).map(normalizeScreenerItem);
    } catch (error) {
      console.error('[Nansen] getTokenScreener error:', error);
      return [];
    }
  }

  // ============================================
  // Day C: Weekly Roundup
  // ============================================

  async getWeeklyDEXTrades(
    chains: Chain[] = ['ethereum', 'solana', 'base'],
    options: { minUsd?: number; limit?: number } = {}
  ): Promise<NansenDEXTrade[]> {
    const { minUsd = 5000, limit = 100 } = options;

    try {
      // NOTE: /smart-money/dex-trades does NOT accept a date field.
      // We fetch the max number of recent trades and they cover recent activity.
      const response = await this.post<NansenDEXTradesResponse>(
        '/smart-money/dex-trades',
        {
          chains: chains.map((c) => CHAIN_MAP[c]),
          filters: {
            trade_value_usd: { min: minUsd },
          },
          pagination: { page: 1, per_page: limit },
        }
      );

      return (response.data || []).map(normalizeDEXTrade);
    } catch (error) {
      console.error('[Nansen] getWeeklyDEXTrades error:', error);
      return [];
    }
  }

  async getWeeklyFlowIntelligence(
    chains: Chain[] = ['ethereum', 'solana', 'base']
  ): Promise<
    { chain: Chain; symbol: string; flows: NansenFlowIntelligence }[]
  > {
    const results: {
      chain: Chain;
      symbol: string;
      flows: NansenFlowIntelligence;
    }[] = [];

    for (const chain of chains) {
      const tokens = KEY_TOKENS[chain].slice(0, 3);
      for (const token of tokens) {
        const flows = await this.getFlowIntelligence(
          chain,
          token.address,
          '7d'
        );
        if (flows) {
          results.push({ chain, symbol: token.symbol, flows });
        }
      }
    }

    return results;
  }

  // ============================================
  // Private helpers
  // ============================================

  private async fetchTokenTransfers(
    chain: Chain,
    tokenAddress: string,
    minUsd: number,
    limit: number
  ): Promise<NansenTransfer[]> {
    try {
      const response = await this.post<NansenTransfersResponse>(
        '/tgm/transfers',
        {
          chain: CHAIN_MAP[chain],
          token_address: tokenAddress,
          filters: {
            transfer_value_usd: { min: minUsd },
          },
          date: {
            from: hoursAgo(24).toISOString(),
            to: new Date().toISOString(),
          },
          pagination: { page: 1, per_page: limit },
        }
      );

      return response.data || [];
    } catch (error) {
      console.error(
        `[Nansen] fetchTokenTransfers error (${chain}/${tokenAddress}):`,
        error
      );
      return [];
    }
  }

  private async post<T>(
    endpoint: string,
    body: Record<string, unknown>,
    useBeta: boolean = false
  ): Promise<T> {
    const baseUrl = useBeta ? this.betaUrl : this.baseUrl;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`[Nansen] POST ${endpoint} body:`, JSON.stringify(body).slice(0, 500));
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          const backoff = Math.pow(2, attempt) * 1000;
          console.warn(
            `[Nansen] Rate limited, retrying in ${backoff}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );
          await this.sleep(backoff);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Nansen] API error ${response.status} for ${endpoint}: ${errorText}`);
          throw new Error(
            `Nansen API error ${response.status}: ${errorText}`
          );
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          throw error;
        }
        await this.sleep(1000 * (attempt + 1));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton
let clientInstance: NansenClient | null = null;

export function getNansenClient(): NansenClient {
  if (!clientInstance) {
    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) {
      throw new Error('NANSEN_API_KEY not configured');
    }
    clientInstance = new NansenClient(apiKey);
  }
  return clientInstance;
}
