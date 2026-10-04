export * from '../config/constants.js';

export const CARD_RANKS = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'
] as const;

export const CARD_SUIT_SYMBOLS: Record<string, string> = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
};

export const CHIP_PRESETS = [10, 50, 100, 500, 1000, 5000, 10000] as const;
