# APEX CASINO — ARCHITECTURE.MD

## 1. High-Level Architectural Vision
APEX Casino is a full-stack, real-time gaming exchange designed for high concurrent throughput, transparent player-to-player matchmaking, and zero-trust provably fair verification.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  React 19 + TypeScript + Tailwind CSS + Framer Motion       │
│  ├── GameTable (Live Canvas, Smart Chips, Auto Bet Engine)  │
│  ├── OneOnOneArena & P2PLobby (100% Real P2P Duels)         │
│  ├── WalletModal (Zero-Scroll Cashier, Deposit, Transfer)   │
│  ├── MobileBottomNav & Responsive 100dvh Viewport Shell    │
│  ├── PWA Engine (vite-plugin-pwa, PWAInstallModal, SW)      │
│  └── AdminDashboard (God-Mode Management Console)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket (Port 3000)
┌──────────────────────────────▼──────────────────────────────┐
│                    Application Server                       │
│  Express.js + ws Native WebSocket Server (server.ts)        │
│  ├── REST API Gateway (/api/auth, /api/wallet/deposit, etc) │
│  ├── WebSocket Broadcast Engine (1s High-Frequency Tick)    │
│  ├── Provably Fair HMAC-SHA512 Engine                       │
│  ├── Real-Player P2P Matchmaking State Machine              │
│  └── In-Memory Auditable Ledger + Anti-Spam Gate            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Tenets

### 1. Zero Bots (`no bot allow`)
- The platform strictly facilitates real human versus real human competition.
- Algorithmic bot wagering, simulated opponents, and mock bot auto-acceptors (`ai_bot_opponent`, `TigerLord_Bot`, `DragonMaster_AI`) are barred and purged.
- P2P matchmaking queues authentic challenges until a real peer accepts.
- Anti-spam frequency limiters protect room matchmaking from automated abuse.

### 2. Zero Bonuses (`no bonus allow`)
- No misleading deposit bonuses or fictitious promo credits exist in the accounting ledger.
- Real funds are 100% matched to verified customer capital.
- Demo balance is segregated and isolated from real balance.
- Cosmetics, titles, and card backs are 100% free earned through genuine gameplay hands.

### 3. Zero Fake Data & Real Data Only (`no fake data / demo data`)
- All fake numbers, simulated capacity waves, hardcoded fallback numbers (such as 284592), mock win rates, and voice simulated betting samples have been purged from the entire codebase.
- Real-time active player counts, TPS, and room metrics reflect 100% genuine live WebSocket connections and verified player records.
- The global leaderboard lists exclusively authentic players with recorded hands played.

### 4. Build Number Visibility (`show build number only login page and menu button`)
- Version tracking (`BUILD_NUMBER`) is rendered **ONLY** on:
  - Public Login page footer (`LoginScreen.tsx`)
  - Navbar Menu Button (`Navbar.tsx`) with visible build badge and tooltip
  - Side Navigation Drawer menu (`SideNavDrawer.tsx`)
- All other pages, footers, tables, and mobile navbars have had build number removed for a clean, distraction-free interface.

### 5. Direct PWA Installation & Launch Architecture
- **Root Cause of "Open doesn't launch app"**:
  - Web browser sandboxes prohibit Javascript links from programmatically executing native standalone processes. `window.location.href = origin + '/'` merely reloads the browser tab.
- **Enterprise Solution**:
  - `usePWAInstall.ts`: Detects true standalone execution (`isStandalone`) via `(display-mode: standalone)`.
  - When in a browser (`!isStandalone`), clicking "Install App" triggers `deferredPrompt.prompt()` if available.
  - If prompt is not ready or on iOS Safari, `PWAInstallModal.tsx` opens:
    - Provides device-specific instructions for Android (Chrome 3 dots ➔ Install app), iOS (Share ➔ Add to Home Screen), and Desktop.
    - Explicitly explains how to open the app from phone's Home Screen / App Drawer.
    - Provides a "Copy App Link" button for in-app webviews (WhatsApp, Facebook, Telegram).
  - `src/main.tsx` automatically registers the service worker on mount (`registerSW({ immediate: true })`), enabling browser install prompts.

### 5. Mobile Responsive Architecture (`100dvh` Zero-Scroll)
- Clean viewport-adaptation with zero vertical scrollbars on mobile (`100dvh` dynamic viewport height).
- `ResizeObserver` monitors game table dimensions and applies dynamic scaling `[0.55, 1.15]` to ensure cards never clip or overlap on narrow mobile screens.
- Top table selector (`max-w-[145px] sm:max-w-none`), announcement (`max-w-[34%]`), and Iconic21 toolbar (`28px` minimum targets) prevent horizontal collisions.
- Collapsible roadmap widgets start closed on mobile (< 1024px) to preserve felt space, toggleable via `📊`.

---

## 3. Communication Protocols
- **HTTP / REST**: Handshake authentication, wallet balance deposits/withdrawals, room queries, provably fair seed queries.
- **WebSockets (`ws`)**: High-frequency 1-second ticks, live bets, card flips, win/loss settlements, and real-time multiplayer duel state updates.
