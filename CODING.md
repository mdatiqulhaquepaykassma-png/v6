# APEX CASINO — CODING ARCHITECTURE & FRONTEND STANDARDS

## 1. Overview
APEX Dragon Tiger is an enterprise-grade, high-frequency Peer-to-Peer (P2P) live gaming and cashier exchange. The system is engineered as a Vite + React + Express full-stack single-page application (SPA) with native WebSocket real-time event broadcasting, cryptographic Provably Fair verification, and Progressive Web App (PWA) native installation.

---

## 2. Directory Layout & Source Tree
```text
/
├── server.ts                       # Express backend server with WebSocket server & game loop
├── src/
│   ├── main.tsx                    # React client entry point + PWA registerSW({ immediate: true })
│   ├── App.tsx                     # Top-level state coordinator, routing, modals, & footer
│   ├── index.css                   # Global Tailwind CSS directives & custom styling
│   ├── config/
│   │   └── version.ts              # Global build constants & active BUILD_NUMBER
│   ├── types/
│   │   └── index.ts                # TypeScript interface definitions & data contracts
│   ├── utils/
│   │   ├── audio.ts                # HTML5 Audio + SpeechSynthesis voice manager & SFX
│   │   ├── currency.ts             # Exchange rate converter & multi-currency formatter
│   │   ├── usePWAInstall.ts        # Hook managing beforeinstallprompt & installation state
│   │   └── useSoundManager.ts      # Custom React hook for ambient audio & SFX
│   └── components/
│       ├── Navbar.tsx              # Double-row optimized responsive header & wallet summary
│       ├── MobileBottomNav.tsx     # Fixed bottom navigation bar with micro build badge
│       ├── SideNavDrawer.tsx       # Comprehensive drawer with audio, language, & build badge
│       ├── PWAInstallModal.tsx     # Device-aware PWA install & launch guide (Android/iOS/PC)
│       ├── GameTable.tsx           # Live Dragon Tiger card table, Smart Chips, & HUD build line
│       ├── OneOnOneArena.tsx       # 1v1 P2P duel table with zero bots & arena build footer
│       ├── P2PLobby.tsx            # P2P challenges, anti-spam shields, & lobby build footer
│       ├── WalletModal.tsx         # Zero-scroll Cashier (Deposit, Withdraw, Transfer, Ledger)
│       ├── LoginScreen.tsx         # Auth screen with 100dvh layout & build number footer
│       ├── AdminDashboard.tsx      # God-mode admin console with user management & build stamp
│       ├── AdminLogin.tsx          # Dedicated admin authentication gate with build stamp
│       ├── AdminModal.tsx          # Quick admin parameter overlay with build badge
│       ├── UserProfileModal.tsx    # Cosmetics, frames, card skins, ELO rank (100% free earned)
│       ├── Leaderboard.tsx         # High rollers, ELO rankers, & leaderboard build footer
│       ├── RegulatoryFooter.tsx    # Official licenses, SSL badges, & global build badge
│       └── ...                     # Additional utility modals
├── Architecture.md                 # System architecture & high-level component blueprint
├── CODING.md                       # Coding standards and frontend guidelines
├── CODING_LOGIC.md                 # Data flow and automated strategy logic
├── FULL_CODEBASE_BLUEPRINT.md      # Exhaustive codebase file-by-file blueprint
├── prompt.md                       # Operational prompt & system rules
├── STRATEGY.md                     # Casino betting strategies & risk management
├── SYSTEM_CODING_LOGIC.md          # Server-client synchronization & state machine logic
└── TECHNICAL_BLUEPRINT.md          # Cryptographic RNG, matchmaking, & protocol specs
```

---

## 3. Strict Development Rules

### 1. Zero Bots Allowed (`no bot allow`)
- Automated simulated bots are prohibited across the entire codebase.
- All table bets and P2P challenges must originate from real, authenticated user sessions.
- P2P Matchmaking in `OneOnOneArena.tsx` creates authentic rooms on `/api/rooms/create` that wait for real peers (all mock bot auto-acceptors removed).
- Frequency-based anti-bot detection rate-limits rapid room creation and protects matchmaking integrity.

### 2. Zero Bonuses Allowed (`no bonus allow`)
- Artificial promotional bonus balances, fake signup bonuses, and lock-in deposit bonuses are strictly prohibited.
- User balances represent 100% real capital or isolated demo credits.
- All cosmetics (card backs, player frames, badges) are unlocked through actual gameplay achievements without bonus purchase friction.

### 3. Zero Fake Data & Real Data Only (`no fake data / demo data`)
- All fake numbers, simulated capacity waves, hardcoded fallback numbers (such as 284592), mock win rates, and voice simulated betting samples have been purged from the entire codebase.
- Real-time active player counts, TPS, and room metrics reflect 100% genuine live WebSocket connections and verified player records.
- The global leaderboard lists exclusively authentic players with recorded hands played.

### 4. Build Number Visibility (`show build number only login page and menu button`)
- The active `BUILD_NUMBER` imported from `src/config/version.ts` is rendered **ONLY** on:
  1. `LoginScreen.tsx`: Login page bottom status bar.
  2. `Navbar.tsx`: Menu button with visible build badge and tooltip.
  3. `SideNavDrawer.tsx`: Dedicated system version block.
- Stripped from all other pages, footers, tables, and mobile bottom navigation for a clean UI.

### 5. PWA Installation & Launch Mechanics
- **Why "Open" previously failed**: Standard web browsers forbid web pages from programmatically launching installed external apps via `window.location.href`. Navigating to `/` merely reloads the browser tab.
- **The Modern Approach**:
  - `usePWAInstall.ts`: Detects true standalone execution (`isStandalone`) via `(display-mode: standalone)`.
  - Inside standalone mode, the app is already open, so install prompts are hidden.
  - In browser mode, clicking "Install App" triggers `deferredPrompt.prompt()` if available.
  - If `deferredPrompt` is not yet available, or on iOS Safari, or if user requests guidance, `PWAInstallModal.tsx` opens:
    - Provides device-specific instructions for Android (Chrome 3 dots ➔ Install app), iOS (Share ➔ Add to Home Screen), and Desktop.
    - Explicitly explains how to open the app from phone's Home Screen / App Drawer.
    - Provides a "Copy App Link" button for in-app webviews (WhatsApp, Facebook, Telegram).

---

## 4. Frontend Component Guidelines
- **Responsive Viewport (`100dvh`)**: Mobile containers must use dynamic viewport height `h-[100dvh]` to avoid mobile address bar overlap.
- **Zero Inline Styles**: Use Tailwind CSS utility classes exclusively.
- **Audio Feedback**: All user actions (button clicks, chips, deals, wins, losses, coin deposits) are bound to `sound.*` utilities.
- **Typography & Aesthetics**: High-contrast gold (`amber-400`), emerald (`emerald-400`), and crimson accents on dark luxury obsidian backgrounds.
