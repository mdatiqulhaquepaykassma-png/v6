# APEX CASINO — CODING_LOGIC & DATA FLOW BLUEPRINT

## 1. High-Frequency Game Loop & WebSocket Flow
```text
Client Application                                Server (server.ts)
      |                                                   |
      | ----------> [WebSocket Connection] -------------> |
      |                                                   |
      | <---------- TIMER_TICK (Every 1s) <-------------- |
      |             (Seconds remaining, Pool volumes)     |
      |                                                   |
      | ----------> Place Bet (POST /api/game/bet) -----> |
      |             { userId, side, amount, type }        |
      |                                                   |
      | <---------- NEW_BET broadcast <------------------ |
      |                                                   |
      | <---------- ROUND_PHASE: MATCHING <-------------- |
      |             (Calculate matched vs unmatched)      |
      |                                                   |
      | <---------- ROUND_DEALING <---------------------- |
      |             (Dragon Card, Tiger Card, Result)     |
      |                                                   |
      | <---------- ROUND_SETTLED <---------------------- |
      |             (Winners paid, Unmatched refunded)    |
      |                                                   |
      | <---------- NEW_ROUND <-------------------------- |
```

---

## 2. Dedicated Cashier & Wallet Logic (`WalletModal.tsx` & `server.ts`)
```text
Client Modal (WalletModal.tsx)                     Server (server.ts)
      |                                                   |
      | --- (1) User Selects Method & Amount -----------> |
      |     (bKash / Nagad / Rocket / UPI / Card / USDT)  |
      |     Quick Chips: +500, +1,000, +2,500, +5,000     |
      |                                                   |
      | --- (2) POST /api/wallet/deposit ---------------> |
      |     { userId, username, amount, method }          |
      |                                                   |
      | <-- (3) 200 OK + Updated User Balance <---------- |
      |                                                   |
      | --- (4) Client Actions: ------------------------> |
      |     ├── sound.playCoinsClinking()                 |
      |     ├── onUpdateWallet(user)                      |
      |     ├── fetchGlobalLedger()                       |
      |     └── Set Zero-Scroll Success State             |
```

---

## 3. PWA Installation & Launch Logic
```text
User Clicks "Install App" / Mobile Nav
      │
      ├── Case A: App Running in Standalone Window (isStandalone = true)
      │     └── Install trigger is suppressed; app is already running natively.
      │
      └── Case B: User Browsing in Web Browser (isStandalone = false)
            │
            ├── 1. Check if browser fired `beforeinstallprompt` (hasPrompt = true)
            │      └── YES: Call `deferredPrompt.prompt()` directly!
            │               ├── User accepts: App installs, sets standalone mode!
            │               └── User dismisses or cancels: Proceed to Step 2.
            │
            └── 2. If prompt unavailable or dismissed (hasPrompt = false)
                   └── Open `PWAInstallModal.tsx`:
                       ├── Detect Device OS (Android, iOS Safari, Desktop PC)
                       ├── Render exact step-by-step visual instructions in BN/EN
                       ├── Provide "How to Open" guidance: Tap APEX Casino icon on phone's Home Screen
                       └── Provide "Copy App Link" for social in-app webviews (WhatsApp, Telegram)
```

---

## 4. Strict Real-Player P2P Matchmaking Logic (Zero Bots)
```text
User Initiates Matchmaking (OneOnOneArena.tsx)
      │
      ├── 1. Query Existing Rooms (GET /api/rooms)
      │      └── If open room from real peer exists → Accept and Start Duel
      │
      └── 2. If No Open Room Exists:
             ├── POST /api/rooms/create (Creates authentic server room)
             ├── Anti-Bot Spam Check: Rate limits creation frequency
             ├── Real Room Enters Waiting State (Status: "open")
             ├── Real Peer Browsing Lobby Joins via POST /api/rooms/join
             └── WebSocket Broadcasts MATCH_FOUND to both players!
```

---

## 5. Mobile Layout & Auto-Scaling Pipeline
```text
GameTable Mounts / Window Resizes
      │
      ├── ResizeObserver observes container entry (.contentRect)
      │
      ├── Calculate scale = min(width / 750, height / 580)
      │
      ├── Clamp scale strictly within [0.55, 1.15]
      │
      └── Apply transform: scale(clampedScale) to card felt container:
            ├── Prevents card overlap on narrow screens (< 380px)
            ├── Preserves crisp text without clipping
            └── Keeps chips and action buttons comfortably in thumb reach!
```

---

## 6. Distinct Market Matching, 1.90x Payout & 100% Tie Company Capture

```text
BETTING PHASE (30s)
      │
      ├── Bets accepted across all valid markets:
      │     ├── Main: DRAGON, TIGER
      │     ├── Dragon Side: DRAGON_EVEN, DRAGON_ODD, DRAGON_SML, DRAGON_BIG
      │     └── Tiger Side: TIGER_EVEN, TIGER_ODD, TIGER_SML, TIGER_BIG
      │
MATCHING PHASE (Instant)
      │
      ├── Distinct Opposing Market Matching ("ALADA ALADA MATCHING"):
      │     ├── Pair 1: DRAGON vs TIGER ➔ matched = min(poolDragon, poolTiger)
      │     ├── Pair 2: DRAGON_EVEN vs DRAGON_ODD ➔ matched = min(poolEven, poolOdd)
      │     ├── Pair 3: DRAGON_SML vs DRAGON_BIG ➔ matched = min(poolSml, poolBig)
      │     ├── Pair 4: TIGER_EVEN vs TIGER_ODD ➔ matched = min(poolEven, poolOdd)
      │     └── Pair 5: TIGER_SML vs TIGER_BIG ➔ matched = min(poolSml, poolBig)
      │
      ├── Unmatched Stakes: Instantly refunded 100% to player wallets with zero fee
      │
SETTLING PHASE (After Provably Fair Card Reveal)
      │
      ├── Case A: Result is TIE (dragonCard.value === tigerCard.value)
      │     ├── "tie hole sob tk company pabe"
      │     ├── 100% of all matched stakes on all markets are captured by Company Ledger
      │     ├── round.tieRevenue = totalMatched * 2; round.commission = 0;
      │     └── All bets marked LOST, zero player refunds on Tie
      │
      └── Case B: Non-Tie Outcome (Dragon or Tiger Win)
            ├── "5% company pabe"
            │     └── Company retains 5% of total matched pot: round.commission = totalMatched * 2 * 0.05
            ├── "1.9 fix koren sob jaygay"
            │     └── Every winning bet receives 1.90x payout: payout = floor(matchedStake * 1.9)
            └── Losing bets forfeit their matched stake
```

