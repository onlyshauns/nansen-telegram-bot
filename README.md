# Nansen Telegram Bot

Automated crypto/DeFi market intelligence bot that fetches on-chain data from Nansen, generates analysis via Claude, and publishes to Telegram.

## Content Schedule

| Day | Type | Content |
|-----|------|---------|
| Sun, Mon, Wed | **Day A** | Smart Money Flows + High Conviction Signals |
| Tue, Thu, Sat | **Day B** | Memecoin Activity + Hyperliquid Perps |
| Fri | **Day C** | Weekly Roundup |
| Daily (10pm SGT) | **News** | Crypto News Summary |

All content posts are scheduled via Vercel Cron at 10am SGT (02:00 UTC), except News which runs at 10pm SGT.

## Architecture

```
Vercel Cron / Manual Trigger (POST /api/generate/day-x)
  -> Fetch data from Nansen REST API (parallel across chains)
  -> Build structured prompt from fetched data
  -> Generate content via Claude API (claude-sonnet-4-20250514)
  -> Append random Nansen Academy article link
  -> Send to Telegram via Bot API (HTML parse mode)
  -> Return result to UI for preview
```

## Tech Stack

- **Next.js 15** (App Router) on Vercel
- **Anthropic Claude API** for content generation
- **Nansen REST API** for on-chain data (smart money trades, token screener, flow intelligence, perp trades)
- **Telegram Bot API** for publishing (HTML parse mode, auto-split for long messages)
- **RSS feeds** for crypto news aggregation
- Tailwind CSS v4

## Project Structure

```
app/
  page.tsx                    # Web UI with 4 trigger buttons + preview
  api/
    generate/
      day-a/route.ts          # Smart Money + High Conviction
      day-b/route.ts          # Memecoin + Hyperliquid Perps
      day-c/route.ts          # Weekly Roundup
      news/route.ts           # News Summary
    cron/
      day-a/route.ts          # Cron-triggered (auth via CRON_SECRET)
      day-b/route.ts
      day-c/route.ts
      news/route.ts
lib/
  nansen.ts                   # Nansen REST API client with retry + normalizers
  claude.ts                   # Anthropic SDK wrapper
  telegram.ts                 # Telegram Bot API + message splitting
  news.ts                     # RSS feed aggregator (8 sources)
  articles.ts                 # 52 Nansen Academy articles + category randomizer
  formatting.ts               # USD formatting, HTML escaping helpers
  types.ts                    # Shared TypeScript types
  prompts/
    day-a.ts                  # Smart money system/user prompts
    day-b.ts                  # Memecoin + perps prompts
    day-c.ts                  # Weekly roundup prompts
    news.ts                   # News summary prompts
```

## Environment Variables

```
NANSEN_API_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=
```

## Development

```bash
npm install
npm run dev
```

Manual triggers available at `http://localhost:3000` via the web UI, or via POST to `/api/generate/day-a`, `/api/generate/day-b`, `/api/generate/day-c`, `/api/generate/news`.

## Deployment

Deployed on Vercel with cron schedules defined in `vercel.json`. Set all environment variables in the Vercel dashboard.
