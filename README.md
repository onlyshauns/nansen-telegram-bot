# Nansen Telegram Bot

Automated crypto/DeFi market intelligence bot that fetches on-chain data from Nansen, generates analysis via Claude, and publishes to Telegram.

## Content Schedule

| Day | Type | Content |
|-----|------|---------|
| Sun, Mon, Wed | **Day A** | Smart Money Flows + High Conviction Signals |
| Tue, Thu, Sat | **Day B** | Memecoin Activity + Hyperliquid Perps |
| Fri | **Day C** | Weekly Roundup |
| Daily (10pm SGT) | **News** | Crypto News Summary |

Day A/B/C posts at 10am SGT (02:00 UTC). News posts at 10pm SGT (14:00 UTC).

## Architecture

```
GitHub Actions Cron (minute-precise scheduling)
  -> POST /api/generate/day-x (with Bearer auth)
    -> Fetch data from Nansen REST API (parallel across chains)
    -> Build structured prompt from fetched data
    -> Generate content via Claude API (claude-sonnet-4-20250514)
    -> Append random Nansen Academy article link
    -> Send to Telegram via Bot API (HTML parse mode)
    -> Return result
```

## Tech Stack

- **Next.js 15** (App Router) on Vercel
- **GitHub Actions** for cron scheduling (minute-level precision)
- **Anthropic Claude API** for content generation
- **Nansen REST API** for on-chain data (smart money trades, token screener, flow intelligence, perp trades)
- **Telegram Bot API** for publishing (HTML parse mode, auto-split for long messages)
- **RSS feeds** for crypto news aggregation
- Tailwind CSS v4

## Project Structure

```
.github/
  workflows/
    cron.yml                    # GitHub Actions cron (4 schedules + manual dispatch)
app/
  page.tsx                      # Web UI with 4 trigger buttons + preview
  api/
    generate/
      day-a/route.ts            # Smart Money + High Conviction (Bearer auth)
      day-b/route.ts            # Memecoin + Hyperliquid Perps (Bearer auth)
      day-c/route.ts            # Weekly Roundup (Bearer auth)
      news/route.ts             # News Summary (Bearer auth)
    cron/
      day-a/route.ts            # Legacy Vercel cron routes (CRON_SECRET auth)
      day-b/route.ts
      day-c/route.ts
      news/route.ts
lib/
  nansen.ts                     # Nansen REST API client with retry + normalizers
  claude.ts                     # Anthropic SDK wrapper
  telegram.ts                   # Telegram Bot API + message splitting
  news.ts                       # RSS feed aggregator (8 sources)
  articles.ts                   # 52 Nansen Academy articles + category randomizer
  formatting.ts                 # USD formatting, HTML escaping helpers
  types.ts                      # Shared TypeScript types
  prompts/
    day-a.ts                    # Smart money system/user prompts
    day-b.ts                    # Memecoin + perps prompts
    day-c.ts                    # Weekly roundup prompts
    news.ts                     # News summary prompts
```

## Environment Variables

### Vercel

```
NANSEN_API_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=                    # Shared secret for endpoint auth
NEXT_PUBLIC_CRON_SECRET=        # Same value, exposed to web UI
```

### GitHub Actions

```
CRON_SECRET=                    # Set in repo Settings > Secrets > Actions
```

## Scheduling

Cron scheduling is handled by GitHub Actions (`.github/workflows/cron.yml`) for minute-level precision. Vercel's Hobby plan only guarantees +/-59 min accuracy, so GitHub Actions is used instead.

You can also manually trigger any endpoint from the GitHub **Actions** tab > **Telegram Bot Cron** > **Run workflow** and select the endpoint.

## Development

```bash
npm install
npm run dev
```

Manual triggers available at `http://localhost:3000` via the web UI, or via POST to `/api/generate/{day-a,day-b,day-c,news}` with `Authorization: Bearer <CRON_SECRET>`.

## Deployment

Deployed on Vercel, auto-deploys on push to `main` via GitHub integration.
