# CHUKO Desk

Sandbox desk for buying and selling stablecoins through the [Breet API](https://docs.breet.io). The Next.js server holds the app credentials and calls `https://api.breet.io/v1`. The browser only talks to this app.

## Desk

- **Buy** withdraws USDT or USDC to an external wallet (`POST /payments/withdraw/address`). Networks and fees come from `GET /payments/supported-assets-info`. USDT can use ERC20, TRC20, BSC, SOL, and TON. USDC can use ERC20, TRC20, BSC, SOL, and BASE.
- **Sell** generates a permanent deposit address (`POST /trades/sell/assets/{id}/generate-address`) and can simulate a deposit with `POST /trades/sell/mock-trade`. Mock trades run only when `X-Breet-Env` is `sandbox`.
- **Activity** lists crypto deposits (`GET /trades/transactions`) and withdrawals (`GET /payments/withdrawals`).

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Variable | Purpose |
| --- | --- |
| `BREET_APP_ID` | App ID from Breet → Settings → For Developer |
| `BREET_APP_SECRET` | App secret. Server only. |
| `BREET_ENV` | `sandbox` (default) or `production` |
| `BREET_PIN` | Dashboard withdrawal PIN, added by the server on Buy |

Every Breet request sends `x-app-id`, `x-app-secret`, and `X-Breet-Env`. Leave secrets out of git. `.env.example` has empty values only.

Account responses drop the webhook secret, app id, and user contact fields before they reach the browser.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```
