const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator;

export const haptics = {
  tap: () => canVibrate && navigator.vibrate(10),
  cardFlip: () => canVibrate && navigator.vibrate(18),
  cardWinnerReveal: () => canVibrate && navigator.vibrate([25, 45, 35]),
  win: () => canVibrate && navigator.vibrate([0, 35, 60, 35]),
  lose: () => canVibrate && navigator.vibrate(140),
  urgent: () => canVibrate && navigator.vibrate([0, 20, 80, 20]),
};
