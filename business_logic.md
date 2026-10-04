# Business Logic & Financial Model (Sanctum Arena)

## 1. Core Principles
1. **Zero Bots Policy**: All players in the arena and lobby are 100% authentic human users connected via persistent WebSockets. Simulated bot activity is strictly prohibited in production.
2. **Zero Bonus Exploit Policy**: No artificial or unbacked bonus credits. Financial transactions are strictly denominated in authentic currency (BDT, INR, USD, EUR, etc.) or explicitly isolated Demo Play mode.
3. **P2P Matching Architecture**:
   - The game operates as a peer-to-peer wagering exchange.
   - For every market pair (Dragon vs Tiger, Even vs Odd, Small vs Big), opposing stakes are matched: `matchedAmount = min(sideA, sideB)`.
   - Any excess unmatched stakes are automatically refunded to players at round resolution.

## 2. Payouts & Commission Structure
- **Multiplier**: **1.9x** on all winning matched bets (Dragon, Tiger, Odd, Even, Small, Big).
- **House Commission**: The company retains a **5% fee** on the matched pot:
  - Total matched stake = `matchedAmount * 2`
  - Winner receives = `matchedAmount * 1.9`
  - House fee = `matchedAmount * 0.1` (5% of the total 2x pot).
- **Tie Resolution**:
  - In the event of a **TIE**, the company captures **100% of all matched stakes**.
  - All matched bets are forfeited to the house reserve.
  - Unmatched portions are refunded to players.

## 3. Market Pairs & Rules
1. **DRAGON vs TIGER**: Standard comparison (Ace = 1, ..., King = 13). Higher card wins.
2. **DRAGON_EVEN vs DRAGON_ODD**: Dragon card numeric parity. Ace(1)=Odd, 2=Even, ..., King(13)=Odd.
3. **DRAGON_SML vs DRAGON_BIG**: Small = Ace through 6 (1-6). Big = 8 through King (8-13). Card value 7 is house capture.
4. **TIGER_BIG vs TIGER_SML**: Same criteria applied to Tiger card.
5. **TIGER_ODD vs TIGER_EVEN**: Same parity criteria applied to Tiger card.
6. **EVEN vs ODD / SML vs BIG**: Global card markets with independent matching pools.

## 4. Provably Fair Protocol
- Cryptographic SHA-256 / HMAC-SHA256 pre-commitments for card generation.
- Server seed and client seed combined to derive card indices before betting commences.
- Players can audit any historic round using the provably fair verification modal.

## 5. UI Presentation & Privacy
- **Build Number**: Rendered exclusively on `LoginScreen.tsx` and inside `SideNavDrawer.tsx` menu. Suppressed everywhere else.
- **Mobile First**: Viewport locked (`h-[100dvh]`), no horizontal scrolling, touch-optimized chips and steppers.
