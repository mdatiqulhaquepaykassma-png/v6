import { useState, useEffect } from "react";

/**
 * Comprehensive Multi-Currency Engine & Centralized Currency Utility
 * Supports 40+ Fiat Currencies (INR, BDT, USD, EUR, GBP, AED, SAR, etc.) & Crypto (USDT, BTC, ETH)
 * Handles live conversions, proper international/regional locales, thousands separators,
 * compact abbreviations, and local storage persistence.
 */

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
  /** Exchange rate relative to base currency (INR = 1.0) */
  rateFromBase: number;
  decimals: number;
  symbolPosition: "prefix" | "suffix";
  category: "popular" | "asia" | "mideast" | "global" | "crypto";
  isCrypto?: boolean;
}

export const BASE_CURRENCY_CODE = "USD";

export const CURRENCIES: Record<string, CurrencyConfig> = {
  // POPULAR / REGIONAL CORE
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    flag: "🇺🇸",
    locale: "en-US",
    rateFromBase: 1.0,
    decimals: 2,
    symbolPosition: "prefix",
    category: "popular",
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    flag: "🇮🇳",
    locale: "en-IN",
    rateFromBase: 86.2,
    decimals: 2,
    symbolPosition: "prefix",
    category: "popular",
  },
  BDT: {
    code: "BDT",
    name: "Bangladeshi Taka",
    symbol: "৳",
    flag: "🇧🇩",
    locale: "bn-BD",
    rateFromBase: 122.5,
    decimals: 2,
    symbolPosition: "prefix",
    category: "popular",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    flag: "🇪🇺",
    locale: "de-DE",
    rateFromBase: 0.93,
    decimals: 2,
    symbolPosition: "prefix",
    category: "popular",
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    flag: "🇬🇧",
    locale: "en-GB",
    rateFromBase: 0.79,
    decimals: 2,
    symbolPosition: "prefix",
    category: "popular",
  },
  USDT: {
    code: "USDT",
    name: "Tether USD",
    symbol: "₮",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 1.0,
    decimals: 2,
    symbolPosition: "prefix",
    category: "popular",
    isCrypto: true,
  },

  // MIDDLE EAST & GULF
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "د.إ",
    flag: "🇦🇪",
    locale: "ar-AE",
    rateFromBase: 3.67,
    decimals: 2,
    symbolPosition: "suffix",
    category: "mideast",
  },
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "﷼",
    flag: "🇸🇦",
    locale: "ar-SA",
    rateFromBase: 3.75,
    decimals: 2,
    symbolPosition: "suffix",
    category: "mideast",
  },
  QAR: {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "QR",
    flag: "🇶🇦",
    locale: "ar-QA",
    rateFromBase: 3.64,
    decimals: 2,
    symbolPosition: "prefix",
    category: "mideast",
  },
  KWD: {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "KD",
    flag: "🇰🇼",
    locale: "ar-KW",
    rateFromBase: 0.307,
    decimals: 3,
    symbolPosition: "prefix",
    category: "mideast",
  },
  OMR: {
    code: "OMR",
    name: "Omani Rial",
    symbol: "OMR",
    flag: "🇴🇲",
    locale: "ar-OM",
    rateFromBase: 0.385,
    decimals: 3,
    symbolPosition: "prefix",
    category: "mideast",
  },
  BHD: {
    code: "BHD",
    name: "Bahraini Dinar",
    symbol: "BD",
    flag: "🇧🇭",
    locale: "ar-BH",
    rateFromBase: 0.377,
    decimals: 3,
    symbolPosition: "prefix",
    category: "mideast",
  },

  // ASIA & PACIFIC
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "₨",
    flag: "🇵🇰",
    locale: "ur-PK",
    rateFromBase: 280.0,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  NPR: {
    code: "NPR",
    name: "Nepalese Rupee",
    symbol: "रू",
    flag: "🇳🇵",
    locale: "ne-NP",
    rateFromBase: 138.0,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  LKR: {
    code: "LKR",
    name: "Sri Lankan Rupee",
    symbol: "Rs",
    flag: "🇱🇰",
    locale: "si-LK",
    rateFromBase: 297.0,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  MYR: {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    flag: "🇲🇾",
    locale: "ms-MY",
    rateFromBase: 0.052,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    flag: "🇸🇬",
    locale: "en-SG",
    rateFromBase: 0.0155,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  THB: {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    flag: "🇹🇭",
    locale: "th-TH",
    rateFromBase: 0.405,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  IDR: {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    flag: "🇮🇩",
    locale: "id-ID",
    rateFromBase: 188.5,
    decimals: 0,
    symbolPosition: "prefix",
    category: "asia",
  },
  PHP: {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    flag: "🇵🇭",
    locale: "en-PH",
    rateFromBase: 0.67,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },
  VND: {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    flag: "🇻🇳",
    locale: "vi-VN",
    rateFromBase: 295.0,
    decimals: 0,
    symbolPosition: "suffix",
    category: "asia",
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    flag: "🇯🇵",
    locale: "ja-JP",
    rateFromBase: 1.78,
    decimals: 0,
    symbolPosition: "prefix",
    category: "asia",
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    flag: "🇰🇷",
    locale: "ko-KR",
    rateFromBase: 16.2,
    decimals: 0,
    symbolPosition: "prefix",
    category: "asia",
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    flag: "🇨🇳",
    locale: "zh-CN",
    rateFromBase: 0.084,
    decimals: 2,
    symbolPosition: "prefix",
    category: "asia",
  },

  // GLOBAL / AMERICAS & EUROPE & AFRICA
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    flag: "🇨🇦",
    locale: "en-CA",
    rateFromBase: 0.0162,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "AU$",
    flag: "🇦🇺",
    locale: "en-AU",
    rateFromBase: 0.0182,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  NZD: {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    flag: "🇳🇿",
    locale: "en-NZ",
    rateFromBase: 0.0201,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    flag: "🇨🇭",
    locale: "de-CH",
    rateFromBase: 0.0102,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    flag: "🇧🇷",
    locale: "pt-BR",
    rateFromBase: 0.068,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "Mex$",
    flag: "🇲🇽",
    locale: "es-MX",
    rateFromBase: 0.235,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    flag: "🇹🇷",
    locale: "tr-TR",
    rateFromBase: 0.42,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  RUB: {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    flag: "🇷🇺",
    locale: "ru-RU",
    rateFromBase: 1.15,
    decimals: 2,
    symbolPosition: "suffix",
    category: "global",
  },
  ZAR: {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    flag: "🇿🇦",
    locale: "en-ZA",
    rateFromBase: 0.215,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    flag: "🇳🇬",
    locale: "en-NG",
    rateFromBase: 18.2,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    flag: "🇰🇪",
    locale: "en-KE",
    rateFromBase: 1.51,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  GHS: {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "GH₵",
    flag: "🇬🇭",
    locale: "en-GH",
    rateFromBase: 0.178,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },
  EGP: {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    flag: "🇪🇬",
    locale: "ar-EG",
    rateFromBase: 0.58,
    decimals: 2,
    symbolPosition: "prefix",
    category: "global",
  },

  // CRYPTO & DIGITAL ASSETS
  BTC: {
    code: "BTC",
    name: "Bitcoin",
    symbol: "₿",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.00000012,
    decimals: 6,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
  ETH: {
    code: "ETH",
    name: "Ethereum",
    symbol: "Ξ",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.0000035,
    decimals: 4,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
  BNB: {
    code: "BNB",
    name: "BNB",
    symbol: "BNB",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.000018,
    decimals: 4,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
  SOL: {
    code: "SOL",
    name: "Solana",
    symbol: "SOL",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.000075,
    decimals: 3,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
  TRX: {
    code: "TRX",
    name: "TRON",
    symbol: "TRX",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.051,
    decimals: 2,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
  DOGE: {
    code: "DOGE",
    name: "Dogecoin",
    symbol: "Ð",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.062,
    decimals: 2,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
  TON: {
    code: "TON",
    name: "Toncoin",
    symbol: "TON",
    flag: "🪙",
    locale: "en-US",
    rateFromBase: 0.0022,
    decimals: 3,
    symbolPosition: "prefix",
    category: "crypto",
    isCrypto: true,
  },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export const CURRENCY_STORAGE_KEY = "dt_selected_currency";

/**
 * Get active user-selected currency code from storage or default to INR
 */
export function getStoredCurrencyCode(): string {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && CURRENCIES[stored]) {
      return stored;
    }
  } catch {
    // fallback
  }
  return BASE_CURRENCY_CODE;
}

/**
 * Save user-selected currency code
 */
export function setStoredCurrencyCode(code: string): void {
  try {
    if (CURRENCIES[code]) {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      // Dispatch custom event for cross-component reactive updates
      window.dispatchEvent(new CustomEvent("currency-change", { detail: { code } }));
    }
  } catch {
    // fallback
  }
}

/**
 * React hook to get the active currency config and re-render on currency switch
 */
export function useActiveCurrency(): CurrencyConfig {
  const [currencyCode, setCurrencyCode] = useState<string>(getStoredCurrencyCode);

  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string }>;
      if (customEvent.detail?.code) {
        setCurrencyCode(customEvent.detail.code);
      }
    };
    window.addEventListener("currency-change", handleCurrencyChange);
    return () => window.removeEventListener("currency-change", handleCurrencyChange);
  }, []);

  return CURRENCIES[currencyCode] || CURRENCIES.INR;
}

/**
 * Get active currency symbol immediately
 */
export function getActiveCurrencySymbol(currencyCode?: string): string {
  const code = currencyCode || getStoredCurrencyCode();
  return CURRENCIES[code]?.symbol || "₹";
}

export interface FormatOptions {
  /** Override currency code (defaults to active user selection) */
  currencyCode?: string;
  /** Whether to show currency symbol/code (default: true) */
  showSymbol?: boolean;
  /** Show explicit plus sign for positive numbers (+₹500) */
  showPositiveSign?: boolean;
  /** Convert from base currency (INR) using exchange rate (default: false for raw values, true if input is in base INR) */
  convertFromBase?: boolean;
  /** Custom minimum fraction digits */
  minFractionDigits?: number;
  /** Custom maximum fraction digits */
  maxFractionDigits?: number;
  /** Compact representation (e.g., 1.5M, 2.4L, 10K) */
  compact?: boolean;
  /** Fallback string if value is null/undefined/NaN */
  fallback?: string;
}

/**
 * Format any currency value with proper international locale and symbol
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  const activeCode = options.currencyCode || getStoredCurrencyCode();
  const config = CURRENCIES[activeCode] || CURRENCIES.INR;

  const {
    showSymbol = true,
    showPositiveSign = false,
    convertFromBase = false,
    compact = false,
    fallback = showSymbol ? `${config.symbol}0` : "0",
  } = options;

  if (amount === null || amount === undefined || amount === "") {
    return fallback;
  }

  let numeric = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : amount;
  if (isNaN(numeric)) {
    return fallback;
  }

  // Convert if required
  if (convertFromBase && config.rateFromBase !== 1.0) {
    numeric = numeric * config.rateFromBase;
  }

  const isNegative = numeric < 0;
  const absValue = Math.abs(numeric);

  // Determine decimals
  let maxDecimals = options.maxFractionDigits !== undefined ? options.maxFractionDigits : config.decimals;
  let minDecimals = options.minFractionDigits !== undefined ? options.minFractionDigits : (config.isCrypto ? 2 : 0);

  // For whole numbers in fiat, keep it clean (0 decimals) unless explicit
  if (!config.isCrypto && options.minFractionDigits === undefined && Number.isInteger(absValue)) {
    minDecimals = 0;
  }

  if (compact) {
    return formatCompactCurrency(numeric, config, { showSymbol, showPositiveSign });
  }

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
      useGrouping: true,
    });

    const formattedNumber = formatter.format(absValue);
    const sym = showSymbol ? config.symbol : "";
    const sign = isNegative ? "-" : showPositiveSign && numeric > 0 ? "+" : "";

    if (config.symbolPosition === "suffix") {
      return `${sign}${formattedNumber} ${sym}`.trim();
    }
    return `${sign}${sym}${formattedNumber}`;
  } catch {
    const formatted = absValue.toFixed(maxDecimals);
    const sym = showSymbol ? config.symbol : "";
    const sign = isNegative ? "-" : showPositiveSign && numeric > 0 ? "+" : "";
    return `${sign}${sym}${formatted}`;
  }
}

/**
 * Compact currency formatting (e.g. $1.5M, ₹2.5L, ฿10K)
 */
function formatCompactCurrency(
  numeric: number,
  config: CurrencyConfig,
  opts: { showSymbol?: boolean; showPositiveSign?: boolean }
): string {
  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? "-" : opts.showPositiveSign && numeric > 0 ? "+" : "";
  const sym = opts.showSymbol !== false ? config.symbol : "";

  let formatted = "";
  if (config.code === "INR" || config.code === "BDT" || config.code === "PKR" || config.code === "NPR") {
    // South Asian Lakhs/Crores
    if (abs >= 10000000) {
      formatted = (abs / 10000000).toFixed(abs % 10000000 === 0 ? 0 : 2).replace(/\.00$/, "") + "Cr";
    } else if (abs >= 100000) {
      formatted = (abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 2).replace(/\.00$/, "") + "L";
    } else if (abs >= 1000) {
      formatted = (abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "K";
    } else {
      formatted = abs.toLocaleString(config.locale);
    }
  } else {
    // International K / M / B
    if (abs >= 1000000000) {
      formatted = (abs / 1000000000).toFixed(abs % 1000000000 === 0 ? 0 : 2).replace(/\.00$/, "") + "B";
    } else if (abs >= 1000000) {
      formatted = (abs / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 2).replace(/\.00$/, "") + "M";
    } else if (abs >= 1000) {
      formatted = (abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "K";
    } else {
      formatted = abs.toLocaleString(config.locale);
    }
  }

  if (config.symbolPosition === "suffix") {
    return `${sign}${formatted} ${sym}`.trim();
  }
  return `${sign}${sym}${formatted}`;
}

/**
 * Backward-compatible helper that automatically formats using the user's active currency
 */
export function formatINR(
  amount: number | string | null | undefined,
  options: FormatOptions = {}
): string {
  return formatCurrency(amount, { convertFromBase: true, ...options });
}

/**
 * Helper for formatting profit/loss with color class and directional +/-
 */
export function formatProfitLoss(
  amount: number,
  currencyCode?: string
): {
  text: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
  colorClass: string;
} {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const isZero = amount === 0;

  const text = formatCurrency(amount, {
    currencyCode,
    showSymbol: true,
    showPositiveSign: true,
    maxFractionDigits: 2,
  });

  const colorClass = isPositive
    ? "text-emerald-400"
    : isNegative
    ? "text-rose-400"
    : "text-neutral-400";

  return { text, isPositive, isNegative, isZero, colorClass };
}

/**
 * Convert an amount from base currency (INR) to target currency
 */
export function convertCurrency(amountInBase: number, targetCode: string): number {
  const target = CURRENCIES[targetCode];
  if (!target) return amountInBase;
  return amountInBase * target.rateFromBase;
}

/**
 * Convert an amount from target currency back into base currency (INR)
 */
export function convertToBaseCurrency(amountInTarget: number, fromCode: string): number {
  const from = CURRENCIES[fromCode];
  if (!from || from.rateFromBase === 0) return amountInTarget;
  return amountInTarget / from.rateFromBase;
}

/**
 * Category labels for the selector modal
 */
export const CURRENCY_CATEGORIES: { id: CurrencyConfig["category"]; label: string; icon: string }[] = [
  { id: "popular", label: "Popular", icon: "⭐" },
  { id: "asia", label: "Asia & Pacific", icon: "🌏" },
  { id: "mideast", label: "Middle East & Gulf", icon: "🕌" },
  { id: "global", label: "Global Fiat", icon: "🌐" },
  { id: "crypto", label: "Crypto & Web3", icon: "🪙" },
];
