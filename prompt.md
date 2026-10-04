# PROMPT.MD — SYSTEM SPECIFICATION & OPERATIONAL GUIDELINES

## Core Directive
Build, maintain, and operate the **APEX Dragon Tiger P2P Casino Platform** under strict zero-bot, zero-bonus, maximum mobile optimization, centralized build number visibility (Login page and Menu drawer only), and complete transparency principles.

---

## 1. Operating Rules & Constraints

### 1. NO BOTS ALLOWED (`no bot allow`)
- **Zero Bot Policy**: Absolutely zero automated bots, simulated opponents, virtual high-frequency bot bettors, or AI auto-acceptors are permitted anywhere in the codebase.
- **100% Real Player Matchmaking**: All wagering and room challenges in `OneOnOneArena.tsx` and `P2PLobby.tsx` must take place between authentic, authenticated player accounts.
- **Server Room Queuing**: When a player starts matchmaking on `/api/rooms/create`, the room enters an authentic waiting queue awaiting a real peer; all mock bot auto-accept mocks (`ai_bot_opponent`, `TigerLord_Bot`, `DragonMaster_AI`) are strictly prohibited and eliminated.
- **Anti-Bot Defense**: IP-based frequency limiters and anti-bot spam tracking (`recentRoomAttempts`) detect and throttle automated scripts and malicious bot flooding.

### 2. NO BONUSES ALLOWED (`no bonus allow`)
- **Zero Synthetic Balance**: Zero deposit match bonuses, welcome signup bonuses, promo code balances, or artificial multiplier inflations.
- **1:1 Verifiable Accounting**: Real balance strictly reflects 1:1 verified player deposits and peer-to-peer winnings less the fixed 5% platform settlement rake.
- **Strict Demo Separation**: Demo credits are segregated from real funds with zero bleed-through.
- **Earned Gameplay Cosmetics**: Frames, card skins, ELO titles, and badges are 100% free achievement unlocks earned purely through verified gameplay hands, never sold via bonus mechanics.

### 3. NO FAKE DATA & NO DEMO DATA ALLOWED (`all real data show everywhere`)
- **Complete Elimination of Fake Data**: All mock fallbacks, simulated player waves, fake voice betting auto-simulations, and hardcoded count fallbacks (like 284592) are strictly prohibited and purged from the codebase.
- **Real Verified Leaderboard**: The leaderboard displays 100% genuine player data based exclusively on actual verified games played (`gamesPlayed > 0`), with zero simulated bot entries.
- **Authentic Telemetry**: Online player counts, TPS, and room capacity trends reflect 100% genuine live WebSocket connections and actual active rooms.

### 4. BUILD NUMBER VISIBILITY (`remove buildnumber from menubar`)
- The active build identifier (`BUILD_NUMBER`) sourced from `/src/config/version.ts` is displayed **ONLY** on:
  1. **Login Page** (`LoginScreen.tsx`): Bottom status bar with status indicator and build badge (`Build #{BUILD_NUMBER}`).
  2. **Side Navigation Menu Drawer** (`SideNavDrawer.tsx`): Dedicated "SYSTEM VERSION" badge with active build number (`{BUILD_NUMBER}`).
- **Removed from Menubar & All Other Surfaces**: The top navigation bar (`Navbar.tsx`) features a clean, minimal icon-only menu button without any build number badge. All other footers, lobbies, arenas, and bottom bars remain completely clean and distraction-free.

### 5. NAVIGATION BARS & INSTALL BUTTON POSITIONING
- **Dual Navigation Consistency**:
  - Top Navigation Bar (`Navbar.tsx`) is permanently accessible across all views.
  - Mobile Bottom Navigation Bar (`MobileBottomNav.tsx`) is permanently accessible across mobile viewports.
- **Install Button Centered Placement**:
  - The **Install Mobile App** button is placed directly in the center between **1v1 Dual** and **Elite** tabs:
    - `[Arena]` ➔ `[1v1 Dual]` ➔ `[📱 Install App (Center)]` ➔ `[Elite]` ➔ `[Wallet]`

### 5. PWA INSTALLATION & OPEN MECHANICS ("Open" & "Install App")
- **Root Cause of "Open doesn't launch app"**:
  - Web browser security standards strictly prohibit web pages from force-launching installed external PWA applications via standard Javascript (`window.location.href`). Doing `window.location.href = '/'` simply reloads the existing web page inside the browser tab.
- **Enterprise Solution**:
  1. **Accurate State Detection**: `isStandalone` detects if the user is currently inside the standalone installed window (`(display-mode: standalone)`). In standalone mode, the app is already open!
  2. **1-Tap Direct Browser Install**: When the browser has `deferredPrompt` available, clicking "Install App" triggers `deferredPrompt.prompt()`.
  3. **Interactive Launch & Install Guide (`PWAInstallModal`)**: When `deferredPrompt` is not yet available, or on iOS Safari, or if the user taps to open/install:
     - Automatically detects the user's OS (Android, iOS Safari, Desktop PC).
     - Provides crystal-clear step-by-step instructions in Bengali and English.
     - **For Android Chrome**: (Tap ⋮ menu ➔ Tap "Install app" / "Add to Home Screen" ➔ Launch from Home Screen).
     - **For iPhone Safari**: (Tap Share 📤 ➔ Tap "Add to Home Screen" ➕ ➔ Launch from Home Screen).
     - **How to Open**: Explicitly instructs users who already installed the app to tap the **APEX Casino** gold icon directly from their phone's **Home Screen** or **App Drawer** for 100% full-screen native performance.
     - Provides a 1-tap "Copy App Link" button for users browsing inside restricted social webviews (Telegram, Facebook, WhatsApp).
  4. **Active Service Worker**: Service worker is registered immediately on mount (`registerSW({ immediate: true })` from `virtual:pwa-register`) to satisfy all PWA install criteria.

### 6. DEDICATED CASHIER (ZERO-SCROLL WALLET)
- Dedicated endpoints: `POST /api/wallet/deposit` and `POST /api/wallet/withdraw` alongside `POST /api/wallet/transfer`.
- Multi-rail cashier supporting bKash, Nagad, Rocket, UPI, Cards, and USDT TRC20/ERC20.
- Zero-scroll cashier modal layout with quick chip selectors (`+500`, `+1,000`, `+2,500`, `+5,000`), tactile audio feedback (`sound.playCoinsClinking()`), and real-time ledger auditing.

### 7. FULL-SITE MOBILE OPTIMIZATION (`100dvh` ZERO SCROLL)
- Dynamic Viewport: Container roots enforce `h-[100dvh]` to eliminate mobile URL bar bouncing and bottom bar clipping.
- Dynamic Element Scaling: `ResizeObserver` card auto-scaling bounded in `[0.55, 1.15]` ensures cards never overlap on small screens.
- Compact Touch Targets: Header controls and Iconic21 toolbar enforce minimum 28–44px touch ergonomics.
- Gesture Navigation: Touch-drag horizontal swiping between tabs with `@use-gesture/react` and Framer Motion spring physics.

### 8. 1.90X FIXED PAYOUT, 5% COMPANY COMMISSION & 100% TIE COMPANY CAPTURE
- **Fixed 1.90x Payout Across All Markets**:
  - Main bets: `DRAGON` (1.90x), `TIGER` (1.90x).
  - Side bets: `DRAGON_EVEN` (1.90x), `DRAGON_ODD` (1.90x), `DRAGON_SML` (1.90x), `DRAGON_BIG` (1.90x), `TIGER_BIG` (1.90x), `TIGER_SML` (1.90x), `TIGER_ODD` (1.90x), `TIGER_EVEN` (1.90x).
  - Generic bets: `EVEN` (1.90x), `ODD` (1.90x), `SML` (1.90x), `BIG` (1.90x).
  - Payout calculation: `payout = Math.floor(matchedStake * 1.9);` and `profit = Math.floor(matchedStake * 0.9);`.
- **5% Company Fee ("5% company pabe")**:
  - Total matched pot is `2 * matchedStake`. The winner receives `1.9 * matchedStake` and the company keeps `0.10 * matchedStake` (5% of the total matched pool).
- **100% Company Capture on TIE ("tie hole sob tk company pabe")**:
  - When round result is `TIE` (`dragonCard.value === tigerCard.value`), **all bets on all markets lose**; 100% of all matched stakes are locked and retained by the company ledger (`round.tieRevenue = matchedM * 2;`). Zero player refunds on Tie.
- **Separate Matching for Each Side Bet Market ("PROTI TAR JONNO ALADA ALADA MATCHING HOTE HOBE")**:
  - Independent peer-to-peer matching pools:
    1. `DRAGON` vs `TIGER`
    2. `DRAGON_EVEN` vs `DRAGON_ODD`
    3. `DRAGON_SML` vs `DRAGON_BIG`
    4. `TIGER_EVEN` vs `TIGER_ODD`
    5. `TIGER_SML` vs `TIGER_BIG`
    6. `EVEN` vs `ODD`
    7. `SML` vs `BIG`
  - Unmatched stakes in each pair are refunded instantly to player wallets with zero fee.

