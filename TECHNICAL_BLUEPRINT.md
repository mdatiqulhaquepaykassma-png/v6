# APEX CASINO — TECHNICAL_BLUEPRINT

## 1. Cryptographic Provably Fair Architecture
The platform implements a verifiable Provably Fair algorithm utilizing **HMAC-SHA512** with strict modulo bias rejection.

### Seed Generation & Pre-commitment:
1. **Server Seed**: A high-entropy 256-bit cryptographic hex string generated on the server prior to round initiation.
2. **Server Seed Hash**: A SHA-256 hash of the server seed is broadcast to all players before betting opens.
3. **Client Seed**: A player-supplied or table-derived entropy string.
4. **Nonce**: An incrementing round index.

### Derivation Algorithm:
$$\text{Hash} = \text{HMAC-SHA512}(\text{serverSeed}, \text{clientSeed} + \text{"-"} + \text{nonce})$$

### Modulo Bias Rejection:
To convert the resulting 128-character hex string into uniform card values without statistical skew:
```typescript
function deriveCard(hashSlice: string): { suit: string; rank: number } {
  const intVal = parseInt(hashSlice.substring(0, 8), 16);
  // Rejection sampling against 2^32 bias
  const maxUnbiased = Math.floor(0xffffffff / 52) * 52;
  if (intVal >= maxUnbiased) {
    return deriveCard(hashSlice.substring(8)); // Re-sample next slice
  }
  const cardIndex = intVal % 52;
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  return {
    suit: suits[Math.floor(cardIndex / 13)],
    rank: (cardIndex % 13) + 1, // Ace (1) to King (13)
  };
}
```

---

## 2. Matchmaking & Escrow Protocol (Zero-Bot Authenticity)
- **Multi-Market P2P Matching**:
  - Independent peer-to-peer liquidity matching pools:
    1. `DRAGON` vs `TIGER`
    2. `DRAGON_EVEN` vs `DRAGON_ODD`
    3. `DRAGON_SML` vs `DRAGON_BIG`
    4. `TIGER_EVEN` vs `TIGER_ODD`
    5. `TIGER_SML` vs `TIGER_BIG`
    6. `EVEN` vs `ODD`
    7. `SML` vs `BIG`
  - For each pair: $\text{Matched Amount} = \min(\text{Side A Pool}, \text{Side B Pool})$.
  - Unmatched stakes in each market are refunded 100% with zero commission.
  - Winning matched bets pay a fixed **1.90x** multiplier (`matchedStake * 1.9`).
  - The company retains a flat 5% platform rake on the total matched pot (`matchedStake * 0.10`).
  - On **TIE** outcomes, all bets on all markets lose; 100% of matched stakes are captured by the platform treasury.
- **P2P 1v1 Arena State Machine**:
  - `ROOM_CREATED` $\rightarrow$ `WAITING_FOR_REAL_OPPONENT` $\rightarrow$ `ROLE_COIN_FLIP` $\rightarrow$ `PEEK_CARDS` $\rightarrow$ `BETTING_PHASE` (Check / Call / Raise) $\rightarrow$ `SHOWDOWN` $\rightarrow$ `SETTLED`.
  - Zero simulated bots or bot auto-acceptors: rooms await authentic peer challenge acceptance.

---

## 3. Financial Infrastructure & Dedicated Cashier Endpoints
- **Dedicated Wallet Endpoints**:
  - `POST /api/wallet/deposit`: Authenticates deposit, updates cash balance, logs audit trail, publishes to transparency ledger.
  - `POST /api/wallet/withdraw`: Verifies cash solvency, deducts balance, and submits to processing queue.
  - `POST /api/wallet/transfer`: Peer-to-peer transfer between users.
- **Global Transparency Ledger**: Every deposit, withdrawal, and peer-to-peer transfer generates a unique SHA-256 transaction hash (`txHash`), recorded immutably in memory and publicly queryable via `GET /api/transparency/transactions`.
- **Atomic Operations**: All balance modifications occur within synchronous transaction wrappers preventing race conditions or double-spending.

---

## 4. PWA Web App Manifest & Service Worker Pipeline
- **Web App Manifest (`/public/manifest.json`)**:
  - `id: '/'`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`
  - High-resolution compliant icons: `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`.
- **Active Registration**:
  - `registerSW({ immediate: true })` registered in `src/main.tsx` ensures instant background precaching and enables `beforeinstallprompt` on Chromium browsers.
- **Install & Launch Coordination**:
  - `usePWAInstall.ts` manages install state without false localStorage locks.
  - `PWAInstallModal.tsx` handles fallback installation steps and explains how to open the installed app from Home Screen / App Drawer.

---

## 5. Responsive Viewport & ResizeObserver Card Auto-Scaling
- **Container Observability**: A dedicated `ResizeObserver` monitors the primary `GameTable` DOM container bounds (`entry.contentRect`).
- **Aspect & Dimension Calculation**:
  - Scale factor: $\text{scale} = \min\left(\frac{\text{width}}{750}, \frac{\text{height}}{580}\right)$.
  - Clamping: $\text{scale} = \max(0.55, \min(1.15, \text{scale}))$.
- **CSS Transform Optimization**: Card elements apply `transform: scale(scale)` with `transformOrigin: 'center center'` to ensure zero horizontal or vertical clipping on narrow mobile viewports (< 380px).
