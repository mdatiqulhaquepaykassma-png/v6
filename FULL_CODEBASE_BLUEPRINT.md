# APEX CASINO — FULL_CODEBASE_BLUEPRINT

## Complete File-by-File Blueprint

### 1. Root & Configuration
- `/package.json`: NPM package manifest, scripts, and runtime dependencies.
- `/tsconfig.json`: TypeScript compiler options and module resolution settings.
- `/vite.config.ts`: Vite bundling configuration with React, Tailwind, and VitePWA plugins.
- `/index.html`: Entry HTML document with viewport settings, PWA meta tags, font preloads, and app mount.
- `/metadata.json`: Application metadata, version, and platform capability flags.
- `/.env.example`: Safe environment variable blueprint with no secrets.
- `/server.ts`: Full-stack backend server containing Express REST endpoints, WebSocket broadcast server, Provably Fair RNG, active rooms state machine, dedicated deposit/withdraw endpoints (`/api/wallet/deposit`, `/api/wallet/withdraw`), and transaction ledger.

### 2. Frontend Configuration & Utilities (`/src`)
- `/src/main.tsx`: React DOM mount point initializing the root component and registering the PWA service worker (`registerSW({ immediate: true })`).
- `/src/App.tsx`: Top-level router, persistent authentication session coordinator, dynamic `100dvh` mobile viewport styling, modal triggers, mobile navigation, PWA install modal, and persistent `RegulatoryFooter`.
- `/src/index.css`: Global stylesheet with `@import "tailwindcss";` and custom animations.
- `/src/config/version.ts`: Single source of truth for `BUILD_NUMBER`, `BUILD_DATE`, and `BUILD_BRANCH`.
- `/src/types/index.ts`: TypeScript contracts for `UserWallet`, `TableRound`, `LiveBetRecord`, `RoadmapItem`, `GlobalTransaction`, etc.
- `/src/utils/audio.ts`: Synthesized audio system with dual-language (EN/BN) voice synthesis, casino chip sound effects (`playCoinsClinking`), and HTML5 audio SFX.
- `/src/utils/currency.ts`: Multi-currency conversion engine with support for BDT, INR, USD, EUR, GBP, AED, SAR, and USDT.
- `/src/utils/usePWAInstall.ts`: Custom React hook managing PWA installation prompts, standalone detection, and launch triggers.
- `/src/utils/useSoundManager.ts`: Custom React hook providing sound toggles and volume control.

### 3. Core Gaming Components (`/src/components`)
- `GameTable.tsx`: The primary live arena featuring real-time dealer canvas, table roadmap history (Bead Road, Big Road), Smart Chips grid, 1-tap multipliers, Pro Auto Bet Engine 2.0, mobile-optimized header/toolbar, dynamic `[0.55, 1.15]` card auto-scaling via `ResizeObserver`, multi-market P2P matching (Dragon, Tiger, Odd, Even, Small, Big at 1.9x), 5% platform rake, and 100% tie capture.
- `OneOnOneArena.tsx`: Dedicated 1v1 P2P duel challenge table with card peeking/squeezing physics, check/call/raise turn-based betting, live taunts, and 100% human-to-human matching (zero bots allowed).
- `P2PLobby.tsx`: Multiplayer challenge lobby listing open 1v1 rooms, room creation dialogs, anti-spam frequency shields, and activity filters.
- `PlayingCard.tsx`: High-fidelity card rendering component supporting 3D flip animations and custom card back skins.
- `LiveBetFeed.tsx`: Real-time scrolling feed of all active player bets with currency formatting and side badges.
- `LiveAction.tsx`: Action timeline showing live player joins, card flips, win announcements, and tie refunds.
- `LiveChat.tsx`: Real-time table chat with quick phrases, emojis, and player badge flair.
- `P2PTableChat.tsx`: Dedicated room chat for 1v1 duel opponents.

### 4. Financial & Transparency Components
- `WalletModal.tsx`: Redesigned zero-scroll cashier supporting deposits via bKash, Nagad, Rocket, UPI, crypto; withdrawals; direct P2P transfers; quick amount chips (`+500`, `+1,000`, `+2,500`, `+5,000`); audio feedback; and the Public Transparency Ledger.
- `SiteLiquidityModal.tsx`: Real-time audit modal revealing total site reserves, escrow locked funds, and daily commission.
- `TransparencyCharterModal.tsx`: Proof-of-Reserves charter, comparative edge analysis, and provably fair explanation.
- `UserBetHistoryModal.tsx`: Individual player bet history with profit/loss metrics, dispute filing, and seed verifier links.
- `ProvablyFairModal.tsx`: Interactive verification tool allowing players to input server seed, client seed, and nonce to independently verify any past round's card outcomes.

### 5. Administrative & Governance Components
- `AdminDashboard.tsx`: God-Mode administrative dashboard for managing user accounts, auditing ledger transactions, reviewing player disputes, and managing table limits.
- `AdminLogin.tsx`: Standalone login portal for administrators.
- `AdminModal.tsx`: Quick admin overlay dialog.
- `AdminReportManagementModal.tsx`: Player report moderation and investigation interface.

### 6. Navigation, PWA & Shell Components
- `Navbar.tsx`: Double-row responsive header featuring brand identity, table switcher, live balance display, direct 1-tap install app button, and drawer toggle.
- `MobileBottomNav.tsx`: Fixed mobile bottom navigation with quick access to Arena, Dual, Elite, direct Install App in center, and Wallet.
- `SideNavDrawer.tsx`: Sliding drawer containing audio toggles, language selector (EN/BN), rules, fair play links, direct mobile app install trigger, system version build number badge (`{BUILD_NUMBER}`), and logout.
- `PWAInstallModal.tsx`: Device-aware installation and launch guide modal with Android Chrome, iOS Safari, and Desktop tabs, 1-tap install trigger, copy link, and explanation on how to open from phone Home Screen.
- `RegulatoryFooter.tsx`: Official licensing badges (Curaçao, iTech Labs, BMM Testlabs), 18+ notice, and SLA status.
- `LoginScreen.tsx`: Public login and registration screen with Instant Guest Play, zero-scroll `100dvh` mobile layout, credential authentication, install app link, and persistent `BUILD_NUMBER` badge.

### 7. Documentation Architecture
- `/prompt.md`: System specifications, operating rules, zero-bot & zero-bonus constraints, PWA installation & launch mechanics, 1.9x payouts, and mobile standards.
- `/business_logic.md`: Comprehensive business logic, financial models, multi-market matching pools, 5% rake, and 100% tie capture rules.
- `/Architecture.md`: High-level system architecture, client-server topology, and communication protocols.
- `/CODING.md`: Coding standards, directory layout, and frontend engineering rules.
- `/CODING_LOGIC.md`: Data flows, WebSocket loops, auto-bet state machine, and mobile layout pipeline.
- `/SYSTEM_CODING_LOGIC.md`: Runtime governance, cryptographic seed derivation, and cashier state sync.
- `/TECHNICAL_BLUEPRINT.md`: Cryptographic Provably Fair algorithm, modulo bias rejection, and PWA technical specs.
- `/STRATEGY.md`: Automated betting strategies, risk management, and mathematical expectation analysis.
- `/FULL_CODEBASE_BLUEPRINT.md`: Complete file-by-file blueprint of the platform.
