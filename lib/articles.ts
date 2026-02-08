import type { AcademyArticle, ArticleCategory, DayType } from './types';

export const ACADEMY_ARTICLES: AcademyArticle[] = [
  // ===== Smart Money =====
  { title: 'Smart Money 101', url: 'https://academy.nansen.ai/en/articles/2132837-smart-money-101', category: 'smart-money' },
  { title: 'Finding Consistent Winners with Smart Money Leaderboard', url: 'https://academy.nansen.ai/en/articles/9672038-finding-consistent-winners-with-smart-money-leaderboard', category: 'smart-money' },
  { title: 'High-Conviction Entry Signal via Smart Money Live Trades', url: 'https://academy.nansen.ai/en/articles/9297913-high-conviction-entry-signal-via-smart-money-live-trades', category: 'smart-money' },
  { title: 'Tracking Smart Money Soaking Up Supply', url: 'https://academy.nansen.ai/en/articles/0752627-tracking-smart-money-soaking-up-supply', category: 'smart-money' },
  { title: 'Track Smart Money Accumulation Early Using Token God Mode', url: 'https://academy.nansen.ai/en/articles/6611574-track-smart-money-accumulation-early-using-token-god-mode-profiler', category: 'smart-money' },

  // ===== Smart Alerts =====
  { title: 'Monitor Onchain Moves with Smart Alerts', url: 'https://academy.nansen.ai/en/articles/2912237-monitor-onchain-moves-with-smart-alerts', category: 'alerts' },
  { title: 'Setting Up Smart Money Alerts', url: 'https://academy.nansen.ai/en/articles/9591962-setting-up-smart-money-alerts', category: 'alerts' },
  { title: 'Portfolio Defense: Exit Triggers Using Smart Alerts', url: 'https://academy.nansen.ai/en/articles/6329340-portfolio-defense-exit-triggers-using-smart-alerts-on-top-holders', category: 'alerts' },
  { title: 'Automating Token Discovery with Smart Alerts', url: 'https://academy.nansen.ai/en/articles/1310547-automating-token-discovery-with-smart-alerts', category: 'alerts' },
  { title: 'AI Smart Alerts 101', url: 'https://academy.nansen.ai/en/articles/6239622-ai-smart-alerts-101', category: 'alerts' },

  // ===== Token Screener =====
  { title: 'Token Screener 101', url: 'https://academy.nansen.ai/en/articles/6974360-token-screener-101', category: 'token-screener' },
  { title: 'Finding High-Potential Tokens with Token Screener', url: 'https://academy.nansen.ai/en/articles/2643723-finding-high-potential-tokens-with-token-screener', category: 'token-screener' },
  { title: 'Discovering Fresh Memecoins with Token Screener', url: 'https://academy.nansen.ai/en/articles/5534599-discovering-fresh-memecoins-with-token-screener', category: 'token-screener' },
  { title: 'Identifying High-Signal Tokens with Token Screener', url: 'https://academy.nansen.ai/en/articles/2429283-identifying-high-signal-tokens-with-token-screener', category: 'token-screener' },
  { title: 'Daily Token Discovery Using Nansen Homepage', url: 'https://academy.nansen.ai/en/articles/5116740-daily-token-discovery-using-nansen-homepage', category: 'token-screener' },

  // ===== Trading =====
  { title: 'Nansen Trading 101', url: 'https://academy.nansen.ai/en/articles/3306593-nansen-trading-101', category: 'trading' },
  { title: 'About Nansen Trading', url: 'https://academy.nansen.ai/en/articles/0162796-about-nansen-trading', category: 'trading' },
  { title: 'Get Started with Nansen Trading', url: 'https://academy.nansen.ai/en/articles/9215495-get-started-with-nansen-trading', category: 'trading' },
  { title: 'Crypto Trading for Beginners', url: 'https://academy.nansen.ai/en/articles/6851806-crypto-trading-for-beginners', category: 'trading' },
  { title: 'Buying/Selling Crypto for Beginners', url: 'https://academy.nansen.ai/en/articles/6857553-buyingselling-crypto-for-beginners', category: 'trading' },

  // ===== Playbook (Token God Mode) =====
  { title: 'Token God Mode 101', url: 'https://academy.nansen.ai/en/articles/3874203-token-god-mode-101', category: 'playbook' },
  { title: 'Layered Due Diligence with Token God Mode', url: 'https://academy.nansen.ai/en/articles/3081640-layered-due-diligence-with-token-god-mode', category: 'playbook' },
  { title: 'How to Use Token God Mode to Compare Holder Distribution', url: 'https://academy.nansen.ai/en/articles/0479852-how-to-use-token-god-mode-to-compare-holder-distribution', category: 'playbook' },
  { title: 'Detecting Accumulation Patterns in Token God Mode', url: 'https://academy.nansen.ai/en/articles/1129448-detecting-accumulation-patterns-in-token-god-mode', category: 'playbook' },
  { title: 'Using Balance Divergences in Token God Mode', url: 'https://academy.nansen.ai/en/articles/7583890-using-balance-divergences-in-token-god-mode', category: 'playbook' },
  { title: "Using Token God Mode's Top Holders Tab to Spot Exit", url: 'https://academy.nansen.ai/en/articles/9054931-using-token-god-modes-top-holders-tab-to-spot-exit', category: 'playbook' },

  // ===== Playbook (Other Features) =====
  { title: 'Using AI Signals to Filter High-Signal Tokens', url: 'https://academy.nansen.ai/en/articles/0412066-using-ai-signals-to-filter-high-signal-tokens', category: 'playbook' },
  { title: 'Smart Segments: Build Your Own Alpha Wallet Tracker', url: 'https://academy.nansen.ai/en/articles/3746755-smart-segments-build-your-own-alpha-wallet-tracker', category: 'playbook' },
  { title: 'Building Watchlists with Smart Segments', url: 'https://academy.nansen.ai/en/articles/7953263-building-watchlists-with-smart-segments', category: 'playbook' },
  { title: 'Use Smart Segments to Filter for New Narratives', url: 'https://academy.nansen.ai/en/articles/9658122-use-smart-segments-to-filter-for-new-narratives', category: 'playbook' },
  { title: 'Using Hot Contracts for Token Discovery', url: 'https://academy.nansen.ai/en/articles/5206357-using-hot-contracts-for-token-discovery', category: 'playbook' },
  { title: 'Monitoring Your Portfolio and Exporting Data', url: 'https://academy.nansen.ai/en/articles/1437225-monitoring-your-portfolio-and-exporting-data', category: 'playbook' },

  // ===== Profiler =====
  { title: 'Nansen Profiler 101', url: 'https://academy.nansen.ai/en/articles/0002013-nansen-profiler-101', category: 'profiler' },
  { title: 'Track Individual Wallets Over Time with Profiler', url: 'https://academy.nansen.ai/en/articles/7644156-track-individual-wallets-over-time-with-profiler', category: 'profiler' },
  { title: 'Evaluating Wallet Conviction Using Profiler PnL Analysis', url: 'https://academy.nansen.ai/en/articles/5835705-evaluating-wallet-conviction-using-profiler-pnl-analysis', category: 'profiler' },
  { title: 'Confirm Conviction by Identifying Holding Patterns', url: 'https://academy.nansen.ai/en/articles/0252026-how-to-confirm-conviction-by-identifying-holding-patterns-with-profiler', category: 'profiler' },
  { title: 'Use Transaction History and Reverse-Engineer Entry Points', url: 'https://academy.nansen.ai/en/articles/8002716-use-transaction-history-and-reverse-engineer-entry-points', category: 'profiler' },

  // ===== 101 Series =====
  { title: 'About Nansen', url: 'https://academy.nansen.ai/en/articles/9113359-about-nansen', category: '101' },
  { title: 'Who is Nansen For?', url: 'https://academy.nansen.ai/en/articles/0560433-who-is-nansen-for', category: '101' },
  { title: 'Nansen AI 101', url: 'https://academy.nansen.ai/en/articles/4676097-nansen-ai-101', category: '101' },
  { title: 'Nansen Points 101', url: 'https://academy.nansen.ai/en/articles/3715302-nansen-points-101', category: '101' },
  { title: 'Nansen Staking 101', url: 'https://academy.nansen.ai/en/articles/4748110-nansen-staking-101', category: '101' },
  { title: 'Nansen Portfolio 101', url: 'https://academy.nansen.ai/en/articles/8816201-nansen-portfolio-101', category: '101' },
  { title: 'AI Signals 101', url: 'https://academy.nansen.ai/en/articles/0601583-ai-signals-101', category: '101' },
  { title: 'Deep Research 101', url: 'https://academy.nansen.ai/en/articles/1725366-deep-research-101', category: '101' },
  { title: 'Nansen API/MCP 101', url: 'https://academy.nansen.ai/en/articles/8404875-nansen-apimcp-101', category: '101' },
  { title: 'Labels & Watchlists 101', url: 'https://academy.nansen.ai/en/articles/2149924-labels-and-watchlists-101', category: '101' },
  { title: 'Chains Growth 101', url: 'https://academy.nansen.ai/en/articles/1025513-chains-growth-101', category: '101' },
  { title: 'Playbook Levels', url: 'https://academy.nansen.ai/en/articles/3704489-playbook-levels', category: '101' },

  // ===== General / Beginners =====
  { title: 'Onchain Glossary for Beginners', url: 'https://academy.nansen.ai/en/articles/4406510-onchain-glossary-for-beginners', category: 'general' },
  { title: 'Onchain Explained', url: 'https://academy.nansen.ai/en/articles/1243861-onchain-explained', category: 'general' },
  { title: 'Crypto Investing for Beginners', url: 'https://academy.nansen.ai/en/articles/6068483-crypto-investing-for-beginners', category: 'general' },
  { title: 'Staking Crypto for Beginners', url: 'https://academy.nansen.ai/en/articles/2174127-staking-crypto-for-beginners', category: 'general' },
];

// Category relevance mapping per day type
const DAY_CATEGORY_MAP: Record<DayType, ArticleCategory[]> = {
  'day-a': ['smart-money', 'alerts', 'profiler'],
  'day-b': ['token-screener', 'trading', 'playbook'],
  'day-c': ['playbook', '101', 'profiler', 'smart-money'],
  news: ['101', 'general', 'playbook', 'smart-money'],
};

export function getRandomArticle(dayType: DayType): AcademyArticle {
  const relevantCategories = DAY_CATEGORY_MAP[dayType];

  const candidates = ACADEMY_ARTICLES.filter((a) =>
    relevantCategories.includes(a.category)
  );

  const pool = candidates.length > 0 ? candidates : ACADEMY_ARTICLES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function formatArticleFooter(article: AcademyArticle): string {
  return `\n\n---\nLearn more: ${article.title}\n${article.url}`;
}
