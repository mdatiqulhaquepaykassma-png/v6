# Implementation Plan: Guest Mode (Browse Everything Without Login, Login Required to Bet)

## Overview
Allow all visitors to access and explore the entire platform without authentication—including live game tables with real-time card dealing, roadmaps, 1v1 duel arenas, leaderboards, and site transparency. Require authentication only when performing monetary actions (betting, creating/accepting duels) or posting messages, redirecting unauthenticated guests directly to the dedicated login page.

---

## 1. App-Level Authentication & Navigation (`App.tsx`)
- **Allow Guest State**: Enable `user` state to be `null` without blocking the screen with a mandatory login screen or blocking modal.
- **Top Navigation Bar for Guests**:
  - When `user === null`, render sleek "লগইন" (Login) and "রেজিস্টার" (Sign Up) action buttons in the header instead of wallet balances.
  - Provide a dedicated login/signup screen tab (`setCurrentTab("login")` / `setCurrentTab("signup")`) with clean form switches.
- **Dedicated Login Page**:
  - Keep the full-screen dedicated login and signup view accessible via header buttons and automatic redirection.
  - Include a "← অতিথি হিসেবে গেম দেখুন" (Browse as Guest) back-link allowing users to return to live tables anytime.

---

## 2. Table & Betting Interception (`TableArena.tsx` / `ClassicBettingArena.tsx`)
- **Full Guest Spectator Experience**:
  - Guests can observe real-time cards, countdown timer, sound effects, chip volume on Dragon/Tiger/Tie, and live roadmaps (Big Road, Bead Plate, Cockroach Pig).
- **Bet Interception**:
  - When an unauthenticated visitor clicks any betting spot ("DRAGON", "TIGER", "TIE") or chip button:
    - Display toast notification: *"বেট ধরতে অনুগ্রহ করে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন।"*
    - Redirect the user directly to the dedicated login page (`setCurrentTab("login")`).
    - Save target table route so the user can be returned to their table upon logging in.

---

## 3. P2P Duel Arena & Challenge Interception (`OneOnOneArena.tsx` / `P2PLobby.tsx`)
- **Guest Viewing**:
  - Unauthenticated guests can view open duel rooms, spectator counts, pot sizes, and watch active duels.
- **Action Interception**:
  - Clicking "Create Room", "Accept Challenge", "Direct Challenge", or "Quick Match" immediately redirects to the dedicated login page with an alert.

---

## 4. Live Table Chat Interception
- **Guest Viewing**: Guests can read all live community messages in real-time.
- **Sending Restriction**: Attempting to type or send a chat message redirects the user to the login page.

---

## 5. Backend Authorization Hardening (`server.ts`)
- Ensure `/api/bet`, `/api/rooms/create`, and `/api/rooms/accept` strictly require valid player credentials (`requireUser`), returning `401 Unauthorized` with `{ error: "Authentication required to place bets" }` if no session is present.

---

## 6. Verification Steps
1. **Verification 1**: Run `lint_applet` and `compile_applet` to ensure zero compilation or type errors.
2. **Verification 2**: Log out and verify the user can navigate between tables, view live card deals, roadmaps, and 1v1 arenas as a guest.
3. **Verification 3**: Attempt to place a bet on Dragon/Tiger and verify instant, seamless redirection to the dedicated login page.
