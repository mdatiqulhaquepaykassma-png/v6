import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Check,
  Globe,
  ArrowRightLeft,
  Coins,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  CURRENCIES,
  CURRENCY_LIST,
  CURRENCY_CATEGORIES,
  CurrencyConfig,
  formatCurrency,
} from "../utils/currency";
import { sound } from "../utils/audio";

interface CurrencySelectorModalProps {
  selectedCurrency: string;
  onSelectCurrency: (code: string) => void;
  onClose: () => void;
  baseBalance?: number;
}

export const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({
  selectedCurrency,
  onSelectCurrency,
  onClose,
  baseBalance = 50000,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredCurrencies = useMemo(() => {
    return CURRENCY_LIST.filter((curr) => {
      const matchesSearch =
        curr.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        curr.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "all" || curr.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const activeCurr = CURRENCIES[selectedCurrency] || CURRENCIES.INR;

  const handleSelect = (code: string) => {
    sound.playButtonClick();
    onSelectCurrency(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0e131f] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#141b2d] via-[#101726] to-[#141b2d] border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-wide flex items-center gap-2">
                Currency & Region
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  40+ Supported
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Choose your display currency for live balances, chips, and stakes
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Banner */}
        <div className="px-5 py-3 bg-[#131929] border-b border-neutral-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeCurr.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{activeCurr.name}</span>
                <span className="text-xs font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                  {activeCurr.code} ({activeCurr.symbol})
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Current selection • Rate: 1 USD = {activeCurr.rateFromBase} {activeCurr.code}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Preview Balance</span>
            <span className="text-sm font-black text-emerald-400 font-mono">
              {formatCurrency(baseBalance, {
                currencyCode: activeCurr.code,
                convertFromBase: true,
              })}
            </span>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 bg-[#0b0f19] border-b border-neutral-800 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search currency by name, symbol, or country (e.g. USD, ₹, BDT, Dirham, Bitcoin)..."
              className="w-full bg-[#151c2e] border border-neutral-700/80 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Categories Tab Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeCategory === "all"
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                  : "bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              All ({CURRENCY_LIST.length})
            </button>
            {CURRENCY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                    : "bg-neutral-800/60 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Currency Grid List */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[420px] divide-y divide-neutral-800/40 space-y-1">
          {filteredCurrencies.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <Coins className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="text-sm font-medium">No currencies match "{searchQuery}"</p>
              <p className="text-xs text-neutral-500 mt-1">Try searching by 3-letter code or country name</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredCurrencies.map((curr) => {
                const isSelected = curr.code === selectedCurrency;
                const convertedPreview = formatCurrency(baseBalance, {
                  currencyCode: curr.code,
                  convertFromBase: true,
                });

                return (
                  <button
                    key={curr.code}
                    onClick={() => handleSelect(curr.code)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
                        : "bg-[#141b2c]/60 hover:bg-[#192237] border-neutral-800/80 hover:border-amber-500/40 text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                        {curr.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold truncate text-white">
                            {curr.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                              isSelected
                                ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                                : "bg-neutral-800 text-neutral-400 border-neutral-700"
                            }`}
                          >
                            {curr.code}
                          </span>
                          {curr.isCrypto && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                              CRYPTO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-amber-300/80 font-bold">{curr.symbol}</span>
                          <span>•</span>
                          <span className="truncate">Preview: {convertedPreview}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center font-bold">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-neutral-700 group-hover:border-amber-400 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors">
                          <ArrowRightLeft className="w-3 h-3 text-neutral-500 group-hover:text-amber-400" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0b0f19] border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            Live rates calculated automatically
          </span>
          <span className="text-neutral-500 font-mono">Base: INR (₹)</span>
        </div>
      </div>
    </div>
  );
};
