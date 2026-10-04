import React, { useState } from "react";
import {
  X,
  BookOpen,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Scale,
  Zap,
} from "lucide-react";

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "bn" | "en";
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  lang = "bn",
}) => {
  const [activeSection, setActiveSection] = useState<
    "overview" | "matching" | "payouts" | "roadmaps" | "provablyFair"
  >("overview");

  if (!isOpen) return null;

  const isBn = lang === "bn";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-[#0b0f19] border border-neutral-800 text-neutral-100 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Fixed Top-Right High Contrast Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border-2 border-neutral-600 hover:border-amber-400 shadow-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Close modal"
          title="Close"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0 pr-14 sm:pr-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                {isBn ? "ড্রাগন টাইগার খেলার অফিশিয়াল নিয়মাবলী" : "Dragon Tiger Official Game Rules"}
              </h2>
              <p className="text-xs text-neutral-400">
                {isBn
                  ? "P2P ম্যাচিং ইঞ্জিন, আনম্যাচড রিফান্ড নীতি এবং পে-আউট কাঠামোর সম্পূর্ণ গাইড"
                  : "Complete guide to P2P matching, unmatched stake refunds, and payouts"}
              </p>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="px-4 py-2 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveSection("overview")}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeSection === "overview"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isBn ? "কার্ডের মান ও নিয়ম" : "Card Rankings"}</span>
          </button>

          <button
            onClick={() => setActiveSection("matching")}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeSection === "matching"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isBn ? "P2P ম্যাচিং ও রিফান্ড" : "Matching & Refund"}</span>
          </button>

          <button
            onClick={() => setActiveSection("payouts")}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeSection === "payouts"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isBn ? "পে-আউট টেবিল" : "Payout Table"}</span>
          </button>

          <button
            onClick={() => setActiveSection("roadmaps")}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeSection === "roadmaps"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isBn ? "রোডম্যাপ বিশ্লেষণ" : "Roadmaps"}</span>
          </button>

          <button
            onClick={() => setActiveSection("provablyFair")}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
              activeSection === "provablyFair"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? "প্রুভেবলি ফেয়ার" : "Provably Fair"}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-neutral-300">
          
          {/* SECTION 1: OVERVIEW & CARD RANKINGS */}
          {activeSection === "overview" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  {isBn ? "খেলার মূল উদ্দেশ্য" : "Game Objective"}
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  {isBn
                    ? "ড্রাগন টাইগার হলো বিশ্বের সবচেয়ে দ্রুতগতির ও জনপ্রিয় দুই-কার্ডের এশিয়ান লাইভ ক্যাসিনো গেম। প্রতিটি রাউন্ডে ড্রাগন (Dragon) ও টাইগার (Tiger) উভয় পাশে একটি করে কার্ড ডিল করা হয়। যে পাশের কার্ডের মান বড় হবে, সেই পাশ জয়ী হবে।"
                    : "Dragon Tiger is the fastest and most popular two-card Asian live casino game. Each round, one card is dealt to Dragon and one to Tiger. The side with the higher card value wins the round."}
                </p>
              </div>

              {/* Hierarchy */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  {isBn ? "কার্ডের মানের ক্রম (Rank Hierarchy)" : "Card Value Ranking"}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="bg-neutral-950 border border-amber-500/40 p-2.5 rounded-lg">
                    <span className="text-[10px] text-neutral-500 uppercase block">{isBn ? "সর্বোচ্চ কার্ড" : "Highest Card"}</span>
                    <span className="text-lg font-black text-amber-400">King (K)</span>
                    <span className="text-[11px] text-neutral-400 block">{isBn ? "মান: ১৩" : "Value: 13"}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg">
                    <span className="text-[10px] text-neutral-500 uppercase block">{isBn ? "কোর্ট কার্ড" : "Court Cards"}</span>
                    <span className="text-lg font-black text-neutral-200">Q, J, 10</span>
                    <span className="text-[11px] text-neutral-400 block">{isBn ? "মান: ১২, ১১, ১০" : "Values: 12, 11, 10"}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg">
                    <span className="text-[10px] text-neutral-500 uppercase block">{isBn ? "সংখ্যা কার্ড" : "Number Cards"}</span>
                    <span className="text-lg font-black text-neutral-200">9 - 2</span>
                    <span className="text-[11px] text-neutral-400 block">{isBn ? "মান: ৯ থেকে ২" : "Values: 9 down to 2"}</span>
                  </div>
                  <div className="bg-neutral-950 border border-rose-500/40 p-2.5 rounded-lg">
                    <span className="text-[10px] text-neutral-500 uppercase block">{isBn ? "সর্বনিম্ন কার্ড" : "Lowest Card"}</span>
                    <span className="text-lg font-black text-rose-400">Ace (A)</span>
                    <span className="text-[11px] text-neutral-400 block">{isBn ? "মান: ১" : "Value: 1"}</span>
                  </div>
                </div>

                <div className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {isBn
                      ? "কার্ডের স্যুট (♠ Spades, ♥ Hearts, ♦ Diamonds, ♣ Clubs) ফলাফলে কোন প্রভাব ফেলে না। শুধুমাত্র কার্ডের সংখ্যা বা ফেস ভ্যালু গণনা করা হয়।"
                      : "Card suits (Spades, Hearts, Diamonds, Clubs) have no ranking effect. Only the numerical card rank determines the winner."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: P2P MATCHING & REFUND SYSTEM */}
          {activeSection === "matching" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase">
                  <Scale className="w-4 h-4" />
                  <span>{isBn ? "১০০% পিয়ার-টু-পিয়ার (P2P) ফেয়ার ম্যাচিং নীতি" : "100% P2P Fair Matching Engine"}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  {isBn
                    ? "ঐতিহ্যবাহী ক্যাসিনোতে হাউস বা ক্যাসিনো আপনার প্রতিপক্ষ হয় এবং তারা ইচ্ছেমতো কার্ড ম্যানিপুলেট করতে পারে। কিন্তু আমাদের প্ল্যাটফর্মে ক্যাসিনোর কোন হাউস এজ নেই! আপনি সরাসরি অন্য আসল খেলোয়াড়দের বিরুদ্ধে বাজি ধরেন।"
                    : "Unlike traditional casinos where the house plays against you and can manipulate cards, our platform features 0% House Edge! Players bet directly against other real human players."}
                </p>
              </div>

              {/* Instant Refund Mechanics */}
              <div className="bg-neutral-900/60 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  {isBn ? "আনম্যাচড টাকার শতভাগ তাৎক্ষণিক রিফান্ড গ্যারান্টি" : "Automatic Unmatched Stake Refund Guarantee"}
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  {isBn
                    ? "যদি ড্রাগন পুলে মোট ৫,০০,০০০ টাকা এবং টাইগার পুলে ৪,৫০,০০০ টাকা বাজি ধরা হয়, তবে ঠিক ৪,৫০,০০০ টাকা ১:১ অনুপাতে ম্যাচ হবে। ড্রাগনের বাকি ৫০,০০০ টাকা সাথে সাথে কোন চার্জ ছাড়াই স্বয়ংক্রিয়ভাবে খেলোয়াড়দের ওয়ালেটে ফেরত (Auto-Refund) দেওয়া হয়!"
                    : "If the Dragon pool has ৳500,000 and the Tiger pool has ৳450,000, exactly ৳450,000 is matched 1:1. The remaining ৳50,000 unmatched Dragon stake is instantly returned 100% to players' balances without any fee or deduction!"}
                </p>

                {/* Example diagram */}
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>{isBn ? "ড্রাগন পুল মোট:" : "Dragon Total Pool:"} ৳5,00,000</span>
                    <span>{isBn ? "টাইগার পুল মোট:" : "Tiger Total Pool:"} ৳4,50,000</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-3 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full w-[90%]" title="Matched 90%" />
                    <div className="bg-cyan-400 h-full w-[10%]" title="Auto-Refund 10%" />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">✔ ৳4,50,000 {isBn ? "ম্যাচ হয়ে খেলায় থাকবে" : "Matched In Play"}</span>
                    <span className="text-cyan-400 font-bold">↺ ৳50,000 {isBn ? "ইনস্ট্যান্ট রিফান্ড" : "100% Instant Refund"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PAYOUT TABLE */}
          {activeSection === "payouts" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  {isBn ? "অফিশিয়াল পে-আউট রেট (Payout Odds)" : "Official Payout Rates"}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400">
                        <th className="pb-2">{isBn ? "বাজির ধরণ" : "Bet Side"}</th>
                        <th className="pb-2">{isBn ? "শর্ত" : "Condition"}</th>
                        <th className="pb-2">{isBn ? "পে-আউট গুণক" : "Payout Multiplier"}</th>
                        <th className="pb-2">{isBn ? "কমিশন" : "Commission"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      <tr>
                        <td className="py-2.5 font-bold text-red-400">DRAGON</td>
                        <td className="py-2.5 text-neutral-300">{isBn ? "ড্রাগন কার্ড টাইগারের চেয়ে বড়" : "Dragon Card > Tiger Card"}</td>
                        <td className="py-2.5 font-bold text-emerald-400">1.90x</td>
                        <td className="py-2.5 text-neutral-400">{isBn ? "৫% কোম্পানি ফি" : "5% Company Fee"}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-amber-400">TIGER</td>
                        <td className="py-2.5 text-neutral-300">{isBn ? "টাইগার কার্ড ড্রাগনের চেয়ে বড়" : "Tiger Card > Dragon Card"}</td>
                        <td className="py-2.5 font-bold text-emerald-400">1.90x</td>
                        <td className="py-2.5 text-neutral-400">{isBn ? "৫% কোম্পানি ফি" : "5% Company Fee"}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-purple-400">ODD / EVEN</td>
                        <td className="py-2.5 text-neutral-300">{isBn ? "কার্ড জোড় বা বিজোড় (আলাদা ম্যাচিং)" : "Odd or Even (Separate Matching)"}</td>
                        <td className="py-2.5 font-bold text-emerald-400">1.90x</td>
                        <td className="py-2.5 text-neutral-400">{isBn ? "৫% কোম্পানি ফি" : "5% Company Fee"}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-cyan-400">SML / BIG</td>
                        <td className="py-2.5 text-neutral-300">{isBn ? "ছোট (A-6) বা বড় (8-K) (আলাদা ম্যাচিং)" : "Small (A-6) or Big (8-K) (Separate Matching)"}</td>
                        <td className="py-2.5 font-bold text-emerald-400">1.90x</td>
                        <td className="py-2.5 text-neutral-400">{isBn ? "৫% কোম্পানি ফি" : "5% Company Fee"}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-neutral-400">TIE (ফলাফল)</td>
                        <td className="py-2.5 text-neutral-300">{isBn ? "উভয় কার্ড সমান (নো-বেট জোন)" : "Equal ranks (Outcome only)"}</td>
                        <td className="py-2.5 font-bold text-red-400">{isBn ? "১০০% বাজেয়াপ্ত (Loss)" : "100% Loss"}</td>
                        <td className="py-2.5 text-neutral-400">{isBn ? "১০০% কোম্পানি পাবে" : "100% Company Capture"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tie 100% Loss (Bajeapto) Policy */}
                <div className="mt-3 p-3 bg-gradient-to-r from-red-500/10 via-neutral-900 to-red-500/10 border border-red-500/40 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-red-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-red-300">
                      {isBn ? "🚫 Tie-তে বাজি ধরা যাবে না & ১০০% বাজেয়াপ্ত নীতি" : "🚫 Tie is Non-Bettable & 100% Loss Rule"}
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-neutral-300 leading-relaxed">
                    {isBn
                      ? "আমাদের প্ল্যাটফর্মে Tie-তে সরাসরি বাজি ধরা সম্পূর্ণ নিষিদ্ধ। খেলোয়াড়রা শুধুমাত্র Dragon অথবা Tiger-এ বাজি ধরতে পারবেন। যদি রাউন্ডের ফলাফল TIE (উভয় কার্ড সমান) হয়, তবে আন্তর্জাতিক হাই-এন্ড গেমিং রুলস অনুযায়ী ড্রাগন এবং টাইগার উভয় পক্ষের সমস্ত বাজি বাজেয়াপ্ত (100% Loss) হবে এবং সম্পূর্ণ টাকা কোম্পানির প্রফিট ফান্ডে চলে যাবে।"
                      : "Direct betting on Tie is prohibited. Players only wager on Dragon or Tiger. If a round results in a TIE (both cards equal), all Dragon and Tiger matched bets are forfeited (100% Loss) as platform yield, and 100% goes to the company fund."}
                  </p>
                </div>
              </div>

              {/* Table Limits */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                  {isBn ? "টেবিল লিমিট ও সময়সীমা" : "Table Limits & Timing"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-amber-400 font-bold block">⚡ Express Arena</span>
                    <span className="text-neutral-400 block">{isBn ? "টাইমার: ১০ সেকেন্ড" : "Timer: 10s"}</span>
                    <span className="text-white block font-bold">৳10 - ৳5,000</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-amber-400 font-bold block">🎯 Classic High Table</span>
                    <span className="text-neutral-400 block">{isBn ? "টাইমার: ১৫ সেকেন্ড" : "Timer: 15s"}</span>
                    <span className="text-white block font-bold">৳50 - ৳50,000</span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                    <span className="text-amber-400 font-bold block">👑 VIP Diamond Lounge</span>
                    <span className="text-neutral-400 block">{isBn ? "টাইমার: ২০ সেকেন্ড" : "Timer: 20s"}</span>
                    <span className="text-white block font-bold">৳500 - ৳5,00,000</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: ROADMAPS */}
          {activeSection === "roadmaps" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  {isBn ? "ক্যাসিনো রোডম্যাপ কি ও কিভাবে পড়তে হয়?" : "Understanding Asian Casino Roadmaps"}
                </h3>
                <p className="text-neutral-300 leading-relaxed">
                  {isBn
                    ? "ম্যাকাও ও লাস ভেগাসের আন্তর্জাতিক ক্যাসিনোর মতো আমাদের টেবিলেও লাইভ ৫টি অফিশিয়াল রোডম্যাপ চালু আছে যা অতীতের রাউন্ডের প্যাটার্ন ও ট্রেন্ড বিশ্লেষণ করতে সাহায্য করে।"
                    : "Just like VIP tables in Macau and Las Vegas, our platform renders all 5 official Asian scoreboards to track past patterns and outcome trends."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <h4 className="font-bold text-red-400">1. Bead Plate (珠盘)</h4>
                  <p className="text-neutral-400">
                    {isBn
                      ? "প্রতিটি রাউন্ডের ফলাফল ক্রমানুসারে ওপর থেকে নিচে ৬টি সারিতে সাজানো থাকে।"
                      : "Shows the exact chronological sequence of round winners top-to-bottom in 6-row columns."}
                  </p>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <h4 className="font-bold text-amber-400">2. Big Road (大路)</h4>
                  <p className="text-neutral-400">
                    {isBn
                      ? "ধারাবাহিক জয় ট্র্যাক করে। প্রতিবার জয়ী পরিবর্তন হলে নতুন কলাম শুরু হয়।"
                      : "Tracks consecutive runs. Each column represents consecutive wins for Dragon or Tiger."}
                  </p>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <h4 className="font-bold text-blue-400">3. Big Eye Boy (大眼仔)</h4>
                  <p className="text-neutral-400">
                    {isBn
                      ? "বিগ রোডের ট্রেন্ডের পুনরাবৃত্তি বা সমতা বিশ্লেষণ করে।"
                      : "Derived road measuring regularity and pattern repetition of the Big Road."}
                  </p>
                </div>

                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <h4 className="font-bold text-emerald-400">4. Small Road & Cockroach Pig</h4>
                  <p className="text-neutral-400">
                    {isBn
                      ? "গভীর ট্রেন্ড অ্যানালাইসিস যা প্রফেশনাল খেলোয়াড়দের পরবর্তী বাজি নির্ধারণে সহায়তা করে।"
                      : "Advanced derivative scoreboards comparing columns separated by 2 and 3 columns."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: PROVABLY FAIR */}
          {activeSection === "provablyFair" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isBn ? "প্রুভেবলি ফেয়ার ক্রিপ্টোগ্রাফিক গ্যারান্টি" : "SHA-256 Provably Fair Verification"}</span>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  {isBn
                    ? "প্রতিটি রাউন্ড শুরুর পূর্বেই সার্ভার একটি গোপন সীড তৈরি করে এবং তার SHA-256 হ্যাশ জনসমক্ষে প্রকাশ করে। কার্ড ডিল হওয়ার পর মূল সীডটি উন্মুক্ত করা হয়, যাতে যে কেউ স্বাধীনভাবে হ্যাশ ক্যালকুলেটর দিয়ে যাচাই করে নিশ্চিত হতে পারে যে খেলায় কোন পূর্বনির্ধারিত জালিয়াতি বা পরিবর্তন হয়নি।"
                    : "Before bets open, a cryptographic server seed is generated and its SHA-256 hash is published publicly. After cards are dealt, the seed is revealed so any player can independently verify that cards were never manipulated."}
                </p>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
                <span className="text-amber-400 font-bold block">{isBn ? "যাচাইকরণ অ্যালগরিদম:" : "Verification Formula:"}</span>
                <code className="text-neutral-300 block bg-neutral-900 p-2 rounded border border-neutral-800">
                  HMAC_SHA512(ServerSeed, ClientSeed + ":" + Nonce)
                </code>
                <p className="text-[11px] text-neutral-400">
                  {isBn
                    ? "মডুলো বায়াস প্রতিরোধের মাধ্যমে সম্পূর্ণ নিরপেক্ষভাবে ৫২টি কার্ডের শু থেকে কার্ড নির্বাচন করা হয়।"
                    : "Modulo bias rejection ensures mathematical randomness across an 8-deck shoe without house interference."}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isBn ? "আন্তর্জাতিক ক্যাসিনো স্ট্যান্ডার্ড ও লাইসেন্সকৃত" : "Official Global Casino Standards & Licensed"}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shadow-sm"
          >
            {isBn ? "ঠিক আছে" : "Got It"}
          </button>
        </div>

      </div>
    </div>
  );
};
