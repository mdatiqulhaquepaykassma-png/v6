# APEX CASINO — SYSTEM_CODING_LOGIC & RUNTIME GOVERNANCE

## 1. Zero-Bot, Zero-Bonus & Zero-Fake-Data Integrity Rule
- **No Bots Allowed (`no bot allow`)**:
  - The entire gaming core operates on 100% human-to-human matching.
  - Automated bot generators, artificial table fillers, simulated players, and bot auto-acceptors (`ai_bot_opponent`, `TigerLord_Bot`, `DragonMaster_AI`) are strictly prohibited and purged from the codebase.
  - When a player starts matchmaking without an available peer, the system places them into the authentic server room queue awaiting another real player.
  - The server employs an anti-spam rate limiter on private challenge creation (`recentRoomAttempts`) to prevent script abuse.
- **No Bonuses Allowed (`no bonus allow`)**:
  - Synthetic deposit bonuses, artificial wagering multipliers, and phantom credits are barred from the platform ledger.
  - User real balance strictly corresponds 1:1 to verified deposits or P2P winnings less platform rake.
  - Social cosmetics, titles, and card skins are 100% free rewards earned through actual gameplay hands.
- **Zero Fake Data & Demo Data Policy (`no fake data / demo data`)**:
  - All fake numbers, simulated capacity waves, hardcoded fallback numbers (e.g. 284592), mock win rates, and voice simulated betting samples have been purged from the entire codebase.
  - Telemetry, online counts, leaderboard entries, active room trends, and user statistics are computed 100% from genuine live connections and verified database/in-memory records.

---

## 2. Cashier Architecture & Dedicated Routes
- **Dedicated Deposit & Withdraw APIs**:
  - `POST /api/wallet/deposit`: Credits real user balance, updates user transaction history, and records entry on the public transparency ledger.
  - `POST /api/wallet/withdraw`: Verifies available funds, deducts balance, and logs withdrawal request.
  - Client interface (`WalletModal.tsx`) maintains a strict zero-scroll fixed layout with tactile quick chips (`+500`, `+1,000`, `+2,500`, `+5,000`) and audio confirmation (`sound.playCoinsClinking()`).

---

## 3. Server-Authoritative State Synchronization
The backend (`server.ts`) is the single source of truth for:
1. **RNG Derivation**: Cards are pre-committed cryptographically using HMAC-SHA512 with modulo bias rejection before betting begins.
2. **Escrow Pool Custody**: When a bet is placed, funds are deducted from the user's active balance and committed to the table's escrow pool.
3. **Round Settlement**:
   - **Multi-Market Matching**: Every betting market pair (`DRAGON` vs `TIGER`, `DRAGON_EVEN` vs `DRAGON_ODD`, `DRAGON_SML` vs `DRAGON_BIG`, `TIGER_EVEN` vs `TIGER_ODD`, `TIGER_SML` vs `TIGER_BIG`, `EVEN` vs `ODD`, `SML` vs `BIG`) has an independent peer-to-peer matching pool where opposing stakes are matched.
   - **1.90x Payout & 5% Platform Rake**: Winning matched bets pay 1.90x (`matchedStake * 1.9`). The company retains a 5% commission of the total matched pot (`matchedStake * 0.10`).
   - **Unmatched Refunds**: Any stake amount exceeding the opponent pool is immediately returned to the player's wallet with zero deductions.
   - **Tie Resolution**: On a TIE outcome, all matched bets on all markets lose. 100% of matched funds are captured by the company treasury (`round.tieRevenue = totalMatched * 2`). Unmatched bets are refunded.

---

## 4. Mobile Zero-Scroll Viewport Governance
- **`100dvh` Viewport Discipline**:
  - Root viewport uses `h-[100dvh]` to align strictly with modern mobile browsers without overflow or bounce.
  - Double bottom padding eliminated: parent uses `pb-14 md:pb-0` to compensate for fixed `MobileBottomNav` without stacking extra bottom margin.
- **Dynamic Element Scaling**:
  - `ResizeObserver` applies dynamic `transform: scale()` bounded between `[0.55, 1.15]` to ensure cards never clip on narrow screens.
  - Header controls and toolbar buttons are sized to guarantee zero collisions on mobile viewports.
  - Roadmaps collapsed by default on mobile (`< 1024px`), with quick toggle available.

---

## 5. Strict Build Number Visibility Governance
As per system directive (`show build number only login page and menu button`), the build identifier (`BUILD_NUMBER`) is rendered **ONLY** on:
- The **Login Screen** bottom status bar (`LoginScreen.tsx`).
- The **Navbar Menu Button** (`Navbar.tsx`) with visible build badge and tooltip.
- The **Side Navigation Drawer Menu** (`SideNavDrawer.tsx`).
It is stripped from all other UI components (all page footers, tables, HUDs, lobbies, leaderboards, mobile bottom nav) to ensure pristine, uncluttered gameplay.

---

## 6. PWA Installation & Launch Governance
- **Browser Execution vs Standalone**:
  - Browsers sandboxes do not allow web scripts to programmatically spawn installed PWAs without user interaction on the OS level.
  - The UI cleanly differentiates between browser mode and standalone mode.
  - If a user clicks "Install", it triggers the browser install prompt if available; if prompt is unavailable or on iOS, the system opens `PWAInstallModal.tsx` detailing exact steps on how to install and how to open from phone's Home Screen or App Drawer.
