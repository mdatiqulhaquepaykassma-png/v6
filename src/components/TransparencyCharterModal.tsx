import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RotateCcw,
  Scale,
  Zap,
  Eye,
  FileText,
  Coins,
  TrendingUp,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Award,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  RefreshCw,
  Users,
  Search,
  History,
  CreditCard,
  UserCheck,
} from "lucide-react";

interface TransparencyCharterModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "bn" | "en";
  onOpenProvablyFair?: () => void;
  onOpenLiquidity?: () => void;
  initialTab?: "charter" | "comparison" | "proofOfReserves" | "liveLedger" | "publicUsers";
}

export const TransparencyCharterModal: React.FC<TransparencyCharterModalProps> = ({
  isOpen,
  onClose,
  lang = "bn",
  onOpenProvablyFair,
  onOpenLiquidity,
  initialTab = "charter",
}) => {
  const [activeTab, setActiveTab] = useState<"charter" | "comparison" | "proofOfReserves" | "liveLedger" | "publicUsers">(initialTab);
  const [liveTxs, setLiveTxs] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);

  // Public Users State
  const [publicUsersList, setPublicUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [selectedInspectUser, setSelectedInspectUser] = useState<any | null>(null);
  const [loadingInspectDetails, setLoadingInspectDetails] = useState<boolean>(false);
  const [inspectTab, setInspectTab] = useState<"overview" | "history" | "transactions" | "referrals">("overview");

  // Site Liquidity & Company Profit State
  const [siteLiquidityData, setSiteLiquidityData] = useState<any | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchSiteLiquidityData = () => {
    fetch("/api/site/liquidity")
      .then((r) => r.json())
      .then((d) => setSiteLiquidityData(d))
      .catch(() => {});
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchSiteLiquidityData();
    const interval = setInterval(fetchSiteLiquidityData, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchLiveLedger = () => {
    fetch("/api/transparency/transactions?limit=50")
      .then((r) => r.json())
      .then((d) => {
        if (d.transactions) setLiveTxs(d.transactions);
      })
      .catch(() => {})
      .finally(() => setLoadingLedger(false));
  };

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === "liveLedger") {
      setLoadingLedger(true);
      fetchLiveLedger();
      const interval = setInterval(fetchLiveLedger, 2000);
      return () => clearInterval(interval);
    } else if (activeTab === "publicUsers") {
      fetchPublicUsers();
      const interval = setInterval(fetchPublicUsers, 2500);
      return () => clearInterval(interval);
    }
  }, [activeTab, isOpen, userSearchQuery]);

  useEffect(() => {
    if (!selectedInspectUser?.userId || !isOpen) return;
    const interval = setInterval(() => {
      fetch(`/api/transparency/users/${selectedInspectUser.userId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.user) setSelectedInspectUser(d.user);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedInspectUser?.userId, isOpen]);

  const fetchPublicUsers = () => {
    setLoadingUsers(true);
    fetch(`/api/transparency/users?search=${encodeURIComponent(userSearchQuery)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.users) setPublicUsersList(d.users);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  };

  const handleInspectUser = (userId: string) => {
    setLoadingInspectDetails(true);
    fetch(`/api/transparency/users/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setSelectedInspectUser(d.user);
      })
      .catch(() => {})
      .finally(() => setLoadingInspectDetails(false));
  };

  if (!isOpen) return null;

  const isBn = lang === "bn";

  const pillars = [
    {
      id: 1,
      icon: Scale,
      title: isBn ? "১. ০% হাউস এজ ও পিয়ার-টু-পিয়ার (P2P) গ্যারান্টি" : "1. 0% House Edge & Pure P2P Guarantee",
      summary: isBn
        ? "ঐতিহ্যবাহী ক্যাসিনোর মতো প্ল্যাটফর্ম কখনো আপনার বিপরীতে খেলে না। আপনি সরাসরি অন্য আসল খেলোয়াড়দের বিরুদ্ধে খেলেন।"
        : "The platform never plays against users. Players wager directly against each other with zero house manipulation.",
      badge: isBn ? "চিটিং অসম্ভব" : "Zero House Edge",
      badgeColor: "emerald",
    },
    {
      id: 2,
      icon: RotateCcw,
      title: isBn ? "২. আনম্যাচড টাকার শতভাগ তাৎক্ষণিক অটো-রিফান্ড" : "2. 100% Instant Unmatched Stake Return",
      summary: isBn
        ? "যদি আপনার বাজি অন্য কারো বাজির সাথে পূর্ণ ম্যাচ না হয়, বাকি টাকা ০.০১ সেকেন্ডের মধ্যে ওয়ালেটে ১০০% ফেরত আসে। কোন ফি কাটা হয় না।"
        : "Any unmatched portion of a wager is returned 100% to the player's wallet with zero deductions and zero waiting.",
      badge: isBn ? "বাকি টাকা সাথে সাথে ফেরত" : "Instant Refund",
      badgeColor: "cyan",
    },
    {
      id: 3,
      icon: Coins,
      title: isBn ? "৩. প্রুফ-অব-রিজার্ভস ও উন্মুক্ত পাবলিক সলভেন্সি লেজার" : "3. Real-Time Proof of Reserves & Solvency",
      summary: isBn
        ? "সকল ইউজারের আসল ব্যালেন্স ও এসক্রো রিজার্ভ পাবলিক লেজারে ওপেন। আমাদের সলভেন্সি রেশিও ১০৮.৪% (ওভার-কোলাটেরালাইজড)।"
        : "Every player's balance and platform vault reserves are publicly auditable. 108.4% over-collateralized solvency ratio.",
      badge: "108.4% Solvency",
      badgeColor: "amber",
    },
    {
      id: 4,
      icon: ShieldCheck,
      title: isBn ? "৪. ক্রিপ্টোগ্রাফিক SHA-256 প্রুভেবলি ফেয়ার অডিট" : "4. Cryptographic SHA-256 Provably Fair",
      summary: isBn
        ? "রাউন্ড শুরু হওয়ার আগেই সার্ভার সীড হ্যাশ প্রকাশ করা হয়। খেলা চলাকালীন বা শেষে কার্ড বদলানোর কোন সুযোগ নেই।"
        : "Server seed hash published before bets open. Verified via HMAC-SHA512 with zero room for mid-round tampering.",
      badge: "SHA-256 Verified",
      badgeColor: "emerald",
    },
    {
      id: 5,
      icon: Zap,
      title: isBn ? "৫. ৫ সেকেন্ডে ইনস্ট্যান্ট ক্যাশআউট (উইথড্রয়াল)" : "5. 5-Second Automated Instant Cashouts",
      summary: isBn
        ? "বিকাশ, নগদ, রকেট এবং ইউপিআই-তে কোন ভুয়া হোল্ডিং বা আটকে রাখা ছাড়াই ৫ সেকেন্ডে স্বয়ংক্রিয় পে-আউট।"
        : "Automated instant payout processing for bKash, Nagad, Rocket, UPI, and Bank without holding funds hostage.",
      badge: isBn ? "তাৎক্ষণিক ক্যাশআউট" : "Instant Payout",
      badgeColor: "emerald",
    },
    {
      id: 6,
      icon: Eye,
      title: isBn ? "৬. ১০০% ওপেন লাইভ বেট ট্র্যাকার ও অডিট ট্রেইল" : "6. Transparent Live Bet Feed & Audit Trail",
      summary: isBn
        ? "কে কত টাকা ধরছে, কত ম্যাচ হয়েছে এবং কত টাকা রিফান্ড পেয়েছে তা প্রতিটি রাউন্ডে সবার স্ক্রিনে লাইভ প্রদর্শিত হয়।"
        : "All active player stakes, matched allocations, and refunded amounts stream publicly in real-time.",
      badge: isBn ? "লাইভ অডিট" : "Public Audit",
      badgeColor: "cyan",
    },
    {
      id: 7,
      icon: Award,
      title: isBn ? "৭. কেবল জয়ের ওপর ৫% ফেয়ার কমিশন (টাই ও রিফান্ডে ০%)" : "7. Transparent 5% Winning Commission Only",
      summary: isBn
        ? "কোন লুকায়িত চার্জ নেই। টাই হলে ৫০% বাজি ওয়ালেটে অটো ফেরত পাবেন, এবং সকল আনম্যাচড রিফান্ডেও ০% ফি।"
        : "Only net winning duels incur a 5% commission. Tie outcomes return 50% stake to wallet. Unmatched refunds have 0% fee.",
      badge: "0% Hidden Fees",
      badgeColor: "amber",
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-[#0b0f19] border border-neutral-800 text-neutral-100 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
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
        <div className="px-5 py-4 pr-14 sm:pr-16 border-b border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 p-0.5 shrink-0 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  {isBn ? "১০০% স্বচ্ছতা ও ফেয়ার-প্লে চার্টার" : "100% Transparency & Solvency Charter"}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isBn ? "প্রতারণামুক্ত গ্যারান্টি" : "Zero-Scam Verified"}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {isBn
                  ? "যেসব কারণে লক্ষ লক্ষ মানুষ সাধারণ ক্যাসিনো ছেড়ে আমাদের প্ল্যাটফর্মে যুক্ত হচ্ছে"
                  : "The 7 structural guarantees why thousands of players migrate to our P2P arena"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-4 py-2 bg-neutral-950/80 border-b border-neutral-800/80 flex items-center gap-2 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab("charter")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "charter"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isBn ? "স্বচ্ছতার ৭টি মূল স্তম্ভ" : "7 Pillars of Transparency"}</span>
          </button>

          <button
            onClick={() => setActiveTab("comparison")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "comparison"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isBn ? "অন্যান্য সাইট বনাম আমরা" : "Us vs Other Casinos"}</span>
          </button>

          <button
            onClick={() => setActiveTab("proofOfReserves")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "proofOfReserves"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{isBn ? "প্রুফ-অব-রিজার্ভস" : "Proof of Reserves"}</span>
          </button>

          <button
            onClick={() => setActiveTab("liveLedger")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "liveLedger"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isBn ? "উন্মুক্ত ট্রানজেকশন লেজার" : "Public Live Ledger"}</span>
          </button>

          <button
            onClick={() => setActiveTab("publicUsers")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "publicUsers"
                ? "bg-amber-500 text-neutral-950 shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isBn ? "সকল ইউজার ডিরেক্টরি" : "Public User Registry"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: 7 PILLARS */}
          {activeTab === "charter" && (
            <div className="space-y-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.id}
                    className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-all duration-150 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          {pillar.title}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 border border-neutral-700 text-neutral-300 shrink-0">
                        {pillar.badge}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 pl-10 leading-relaxed">
                      {pillar.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: COMPARISON TABLE */}
          {activeTab === "comparison" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  {isBn ? "কেন প্রচলিত ক্যাসিনো ছেড়ে খেলোয়াড়রা আমাদের বেছে নেয়?" : "Why Thousands of Players Choose Us"}
                </h3>
                <p className="text-xs text-neutral-300">
                  {isBn
                    ? "ঐতিহ্যবাহী ক্যাসিনোতে হাউস সবসময় প্লেয়ারদের হারানোর চেষ্টা করে। নিচে বিস্তারিত পার্থক্য দেওয়া হলো:"
                    : "Traditional casinos make money when you lose. In our P2P arena, fairness is mathematically guaranteed:"}
                </p>
              </div>

              <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-950">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/70 text-neutral-400 font-mono">
                      <th className="p-3">{isBn ? "বৈশিষ্ট্য" : "Feature"}</th>
                      <th className="p-3 text-rose-400">{isBn ? "প্রচলিত ক্যাসিনো সাইট" : "Traditional Casinos"}</th>
                      <th className="p-3 text-emerald-400 font-bold">{isBn ? "আমাদের P2P প্ল্যাটফর্ম" : "Our P2P Platform"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-neutral-300 font-mono">
                    <tr>
                      <td className="p-3 font-semibold text-white">{isBn ? "প্রতিপক্ষ" : "Opponent"}</td>
                      <td className="p-3 text-rose-400">{isBn ? "ক্যাসিনো হাউস (অসম যুদ্ধ)" : "House (Rigged against player)"}</td>
                      <td className="p-3 text-emerald-400 font-bold">{isBn ? "অন্য আসল প্লেয়ার (১০০% ফেয়ার)" : "Real Players (100% Fair P2P)"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">{isBn ? "আনম্যাচড বাজি" : "Unmatched Stakes"}</td>
                      <td className="p-3 text-rose-400">{isBn ? "পুরো টাকা কেটে নেয় বা আটকায়" : "Locked / Kept by casino"}</td>
                      <td className="p-3 text-emerald-400 font-bold">{isBn ? "বাকি টাকা সাথে সাথে ওয়ালেটে ফেরত" : "100% Returned Instantly (0 Fee)"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">{isBn ? "কার্ডের স্বচ্ছতা" : "Card Fairness"}</td>
                      <td className="p-3 text-rose-400">{isBn ? "ক্যাসিনোর ক্লোজড সার্ভার এলগরিদম" : "Secret closed algorithm"}</td>
                      <td className="p-3 text-emerald-400 font-bold">{isBn ? "SHA-256 ক্রিপ্টোগ্রাফিক প্রুভড" : "SHA-256 Provably Fair Published"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">{isBn ? "উইথড্রয়াল গতি" : "Withdrawal Speed"}</td>
                      <td className="p-3 text-rose-400">{isBn ? "২৪-৭২ ঘণ্টা ঝুলিয়ে রাখে" : "24-72 hours pending approval"}</td>
                      <td className="p-3 text-emerald-400 font-bold">{isBn ? "৫ সেকেন্ডে স্বয়ংক্রিয় ক্যাশআউট" : "5 Seconds Automated Instant UPI/bKash"}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white">{isBn ? "সলভেন্সি অডিট" : "Solvency Proof"}</td>
                      <td className="p-3 text-rose-400">{isBn ? "কোন প্রমাণ নেই (ফ্র্যাকশনাল)" : "Hidden reserves / Exit scam risk"}</td>
                      <td className="p-3 text-emerald-400 font-bold">{isBn ? "১০৮.৪% পাবলিক ওভার-কোলাটেরাল" : "108.4% Over-Collateralized Proof"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROOF OF RESERVES */}
          {activeTab === "proofOfReserves" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    {isBn ? "লাইভ প্রুফ-অব-সলভেন্সি মেট্টিক" : "Live Proof-of-Solvency Metric"}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    108.4% OVER-COLLATERALIZED
                  </span>
                </div>

                <p className="text-xs text-neutral-300">
                  {isBn
                    ? "আমাদের প্ল্যাটফর্মে সকল ইউজারের মোট ব্যালেন্সের চেয়ে বেশি নগদ রিজার্ভ সার্বক্ষণিক ভল্টে সুরক্ষিত থাকে। ফলে যে কোন খেলোয়াড় যত বড় অঙ্কের টাকাই জিতুন না কেন, ক্যাশআউট তাৎক্ষণিক সম্পন্ন হবে।"
                    : "The platform maintains more liquid reserve in its cold vault than 100% of all player balances combined. Instant payouts are mathematically guaranteed regardless of win volume."}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-2">
                  <div className="bg-[#161B26] p-3 rounded-xl border border-amber-500/40">
                    <span className="text-amber-300 uppercase text-[10px] block font-semibold">{isBn ? "কোম্পানির মোট প্রফিট" : "Total Company Profit"}</span>
                    <span className="text-base font-black text-emerald-400 tabular-nums">
                      ৳{((siteLiquidityData?.todayCommission || 0) + (siteLiquidityData?.todayTieRevenue || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#161B26] p-3 rounded-xl border border-white/10">
                    <span className="text-neutral-400 uppercase text-[10px] block">{isBn ? "৫% ডুয়েলে ফি আয়" : "5% Match Commission"}</span>
                    <span className="text-base font-black text-emerald-300 tabular-nums">
                      +৳{(siteLiquidityData?.todayCommission || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#161B26] p-3 rounded-xl border border-white/10">
                    <span className="text-neutral-400 uppercase text-[10px] block">{isBn ? "৫০% টাই ফান্ড রিজার্ভ" : "50% Tie Fund Retention"}</span>
                    <span className="text-base font-black text-amber-300 tabular-nums">
                      +৳{(siteLiquidityData?.todayTieRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#161B26] p-3 rounded-xl border border-white/10">
                    <span className="text-neutral-400 uppercase text-[10px] block">{isBn ? "আজকের গ্লোবাল ভলিউম" : "Today Global Volume"}</span>
                    <span className="text-base font-black text-white tabular-nums">
                      ৳{(siteLiquidityData?.todayMatchedVolume || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick links */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {onOpenLiquidity && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenLiquidity();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-amber-300 border border-neutral-700 transition-colors"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isBn ? "সম্পূর্ণ সাইট লিকুইডিটি লেজার দেখুন" : "View Full Site Liquidity Ledger"}</span>
                    </button>
                  )}
                  {onOpenProvablyFair && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenProvablyFair();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-emerald-400 border border-neutral-700 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isBn ? "SHA-256 সিড ভেরিফায়ার চালু করুন" : "Open Provably Fair Verifier"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE PUBLIC FINANCIAL LEDGER */}
          {activeTab === "liveLedger" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide flex items-center gap-2">
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>{isBn ? "লাইভ উন্মুক্ত আর্থিক লেজার (ডিপোজিট, উইথড্র ও ফান্ড ট্রান্সফার)" : "Live Public Financial Transparency Ledger"}</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {isBn
                        ? "প্ল্যাটফর্মের প্রতিটি জমা, উত্তোলন, পিয়ার-টু-পিয়ার সেন্ড মানি এবং ৫০% টাই রিফান্ড রিয়েল-টাইমে উন্মুক্ত।"
                        : "Every user deposit, withdrawal, P2P fund transfer, and 50% Tie refund is permanently visible to the public."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setLoadingLedger(true);
                      fetch("/api/transparency/transactions?limit=50")
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.transactions) setLiveTxs(d.transactions);
                        })
                        .catch(() => {})
                        .finally(() => setLoadingLedger(false));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 transition-colors shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLedger ? "animate-spin" : ""}`} />
                    <span>{isBn ? "রিফ্রেশ" : "Refresh"}</span>
                  </button>
                </div>

                {/* Live Transactions List */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {loadingLedger ? (
                    <div className="py-12 text-center text-neutral-500 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>{isBn ? "লাইভ লেজার লোড হচ্ছে..." : "Loading live ledger stream..."}</span>
                    </div>
                  ) : liveTxs.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 text-xs">
                      {isBn ? "কোন লেনদেন রেকর্ড পাওয়া যায়নি" : "No public transactions recorded yet"}
                    </div>
                  ) : (
                    liveTxs.map((tx) => (
                      <div
                        key={tx.id}
                        className="bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.type === "DEPOSIT"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : tx.type === "WITHDRAW"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : tx.type === "TRANSFER_SENT" || tx.type === "TRANSFER_RECEIVED"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {tx.type === "DEPOSIT" ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : tx.type === "WITHDRAW" ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : tx.type === "TRANSFER_SENT" || tx.type === "TRANSFER_RECEIVED" ? (
                              <Send className="w-4 h-4" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-white">{tx.username}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">({tx.userId})</span>
                              {tx.gateway && (
                                <span className="text-[9px] bg-neutral-800 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-neutral-700 uppercase">
                                  {tx.gateway}
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                  tx.type === "DEPOSIT"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : tx.type === "WITHDRAW"
                                    ? "bg-rose-500/20 text-rose-300"
                                    : "bg-blue-500/20 text-blue-300"
                                }`}
                              >
                                {tx.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                              {tx.description}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-black font-mono text-xs sm:text-sm ${
                              tx.type === "DEPOSIT" || tx.type === "TRANSFER_RECEIVED" || tx.type === "TIE_REFUND" || tx.type === "refund" || tx.type === "UNMATCHED_REFUND"
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {tx.type === "DEPOSIT" || tx.type === "TRANSFER_RECEIVED" || tx.type === "TIE_REFUND" || tx.type === "refund" || tx.type === "UNMATCHED_REFUND"
                              ? "+"
                              : "-"}
                            ৳{tx.amount.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            {new Date(tx.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PUBLIC USER DIRECTORY */}
          {activeTab === "publicUsers" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>{isBn ? "পাবলিক ইউজার ডিরেক্টরি ও স্বচ্ছতা রেজিস্টার" : "Public User Directory & Transparency Register"}</span>
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1">
                    {isBn
                      ? "প্ল্যাটফর্মের সকল ইউজারদের অ্যাকাউন্ট, লাইভ ব্যালেন্স, বেট হিস্ট্রি এবং লেনদেন ১০০% উন্মুক্ত।"
                      : "All platform user accounts, live balances, wagering logs, and financial records are 100% public."}
                  </p>
                </div>

                <button
                  onClick={fetchPublicUsers}
                  disabled={loadingUsers}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-amber-300 border border-neutral-700 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
                  <span>{isBn ? "রিফ্রেশ করুন" : "Refresh Directory"}</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchPublicUsers()}
                  placeholder={isBn ? "ইউজারনেম অথবা ইউজার আইডি দিয়ে খুঁজুন..." : "Search by username or User ID..."}
                  className="bg-transparent text-xs text-white placeholder-neutral-500 w-full focus:outline-none"
                />
                <button
                  onClick={fetchPublicUsers}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg shrink-0 cursor-pointer"
                >
                  {isBn ? "খুঁজুন" : "Search"}
                </button>
              </div>

              {/* User Directory Table */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/80">
                <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-300">
                    {isBn ? "মোট নিবন্ধিত ইউজার" : "Total Registered Users"}:{" "}
                    <span className="text-amber-400">{publicUsersList.length}</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isBn ? "১০০% লাইভ উন্মুক্ত রেকর্ডস" : "100% Live Open Records"}</span>
                  </span>
                </div>

                {loadingUsers ? (
                  <div className="p-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>{isBn ? "ইউজার তথ্য লোড হচ্ছে..." : "Loading user directory..."}</span>
                  </div>
                ) : publicUsersList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-500 space-y-1">
                    <Users className="w-8 h-8 mx-auto text-neutral-600 opacity-40 mb-2" />
                    <p>{isBn ? "কোন ইউজার পাওয়া যায়নি" : "No users found in directory"}</p>
                    <p className="text-[10px] text-neutral-600">
                      {isBn ? "সব ডাটাবেস ০ রেসেট করা অবস্থায় রয়েছে" : "Database is clean and zeroed"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/80 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-neutral-900/90 text-neutral-400 font-mono text-[10px] border-b border-neutral-800 uppercase">
                          <th className="p-3">{isBn ? "ইউজার প্রোফাইল" : "User Profile"}</th>
                          <th className="p-3 text-right">{isBn ? "রিয়েল ব্যালেন্স" : "Real Balance"}</th>
                          <th className="p-3 text-right">{isBn ? "ইন-প্লে লকড" : "Locked Escrow"}</th>
                          <th className="p-3 text-center">{isBn ? "মোট খেলা / উইন রেট" : "Games / Win Rate"}</th>
                          <th className="p-3 text-center">{isBn ? "ভিআইপি টায়ার" : "VIP Tier"}</th>
                          <th className="p-3 text-center">{isBn ? "অ্যাকশন" : "Inspect Action"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 font-mono">
                        {publicUsersList.map((u) => (
                          <tr key={u.userId} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-white text-xs">{u.username}</div>
                              <div className="text-[10px] text-neutral-500">{u.userId}</div>
                            </td>

                            <td className="p-3 text-right font-black text-emerald-400">
                              ৳{u.balance.toLocaleString()}
                            </td>

                            <td className="p-3 text-right font-bold text-blue-400">
                              ৳{u.lockedBalance.toLocaleString()}
                            </td>

                            <td className="p-3 text-center">
                              <div className="text-white font-bold">{u.gamesPlayed || 0} Hands</div>
                              <div className="text-[10px] text-amber-400">{u.stats?.winRate || 0}% Win Rate</div>
                            </td>

                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {u.vipTier || "Standard"}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleInspectUser(u.userId)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                              >
                                <span>{isBn ? "ডিটেইলস" : "Details"}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Selected User Detailed Public Audit Overlay Drawer */}
        {selectedInspectUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
              
              {/* Inspection Header */}
              <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-lg">
                    {selectedInspectUser.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{selectedInspectUser.username}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                        {selectedInspectUser.vipTier}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      User ID: {selectedInspectUser.userId}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedInspectUser(null)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Inspect Stats Quick Bar */}
              <div className="p-3 bg-neutral-950/80 border-b border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">রিয়েল ব্যালেন্স</div>
                  <div className="text-sm font-black text-emerald-400">৳{selectedInspectUser.balance.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">লকড ইন-প্লে</div>
                  <div className="text-sm font-black text-blue-400">৳{selectedInspectUser.lockedBalance.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">মোট খেলা হাত</div>
                  <div className="text-sm font-black text-amber-300">{selectedInspectUser.gamesPlayed || 0} Hands</div>
                </div>
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-400 uppercase">মোট জয় / হার</div>
                  <div className="text-xs font-bold text-white">
                    <span className="text-emerald-400">৳{selectedInspectUser.totalWon.toLocaleString()}</span> /{" "}
                    <span className="text-rose-400">৳{selectedInspectUser.totalLost.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Sub-navigation Tabs */}
              <div className="flex border-b border-neutral-800 bg-neutral-950 text-xs font-bold px-3 pt-2 gap-2 overflow-x-auto">
                <button
                  onClick={() => setInspectTab("overview")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                    inspectTab === "overview"
                      ? "border-amber-400 text-amber-400"
                      : "border-transparent text-neutral-400 hover:text-white"
                  }`}
                >
                  {isBn ? "ওভারভিউ ও পারফরম্যান্স" : "Overview & Stats"}
                </button>
                <button
                  onClick={() => setInspectTab("history")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                    inspectTab === "history"
                      ? "border-amber-400 text-amber-400"
                      : "border-transparent text-neutral-400 hover:text-white"
                  }`}
                >
                  {isBn ? "গেমিং বাজি হিস্ট্রি" : "Bet History"} ({selectedInspectUser.betHistory?.length || 0})
                </button>
                <button
                  onClick={() => setInspectTab("transactions")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                    inspectTab === "transactions"
                      ? "border-amber-400 text-amber-400"
                      : "border-transparent text-neutral-400 hover:text-white"
                  }`}
                >
                  {isBn ? "আর্থিক লেনদেন ইতিহাস" : "Financial Ledger"} ({selectedInspectUser.transactions?.length || 0})
                </button>
              </div>

              {/* Subtab Content */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
                {inspectTab === "overview" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                        <div className="text-[10px] text-neutral-400 uppercase">উইন রেট (Win Rate)</div>
                        <div className="text-xl font-bold text-amber-300 mt-1">
                          {selectedInspectUser.stats?.winRate || 0}%
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                        <div className="text-[10px] text-neutral-400 uppercase">সর্বোচ্চ জয় (Biggest Win)</div>
                        <div className="text-xl font-bold text-emerald-400 mt-1">
                          ৳{(selectedInspectUser.stats?.biggestWin || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                        <div className="text-[10px] text-neutral-400 uppercase">মোট রাউন্ড (Total Played)</div>
                        <div className="text-xl font-bold text-blue-400 mt-1">
                          {selectedInspectUser.gamesPlayed || 0} Rounds
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {inspectTab === "history" && (
                  <div className="space-y-2 font-mono">
                    {selectedInspectUser.betHistory?.length === 0 ? (
                      <div className="p-6 text-center text-neutral-500">কোন বাজি ধরার ইতিহাস নেই</div>
                    ) : (
                      selectedInspectUser.betHistory?.map((b: any, idx: number) => (
                        <div
                          key={b.id || idx}
                          className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs gap-2"
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>Round #{b.roundNumber}</span>
                              <span className="text-[10px] text-neutral-400 font-normal">[{b.tableName}]</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              Choice: <span className="text-amber-400 font-bold">{b.side}</span> | Result:{" "}
                              <span className="text-emerald-400 font-bold">{b.result}</span>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="font-bold text-white text-xs">
                              Stake: ৳{b.amount.toLocaleString()}
                            </div>
                            <div className="flex flex-col items-end gap-1 mt-0.5">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  b.status === "WON"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : b.status === "LOST"
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {b.status === "WON"
                                  ? `WON +৳${b.payout.toLocaleString()}`
                                  : b.status === "LOST"
                                  ? `LOST`
                                  : b.status}
                              </span>

                              {/* Unmatched Refund inside Result/Payout column */}
                              {b.unmatchedAmount > 0 && (
                                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                                  +৳{b.unmatchedAmount.toLocaleString()} {isBn ? "অনম্যাচড ফেরত" : "Refund"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {inspectTab === "transactions" && (
                  <div className="space-y-2 font-mono">
                    {selectedInspectUser.transactions?.length === 0 ? (
                      <div className="p-6 text-center text-neutral-500">কোন লেনদেন রেকর্ড পাওয়া যায়নি</div>
                    ) : (
                      selectedInspectUser.transactions?.map((tx: any, idx: number) => (
                        <div
                          key={tx.id || idx}
                          className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white uppercase">{tx.type}</div>
                            <div className="text-[10px] text-neutral-400">{tx.description || tx.method}</div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-emerald-400">৳{tx.amount.toLocaleString()}</div>
                            <div className="text-[10px] text-neutral-500">
                              {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Inspection Footer */}
              <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-right">
                <button
                  onClick={() => setSelectedInspectUser(null)}
                  className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isBn
                ? "আন্তর্জাতিক ই-গেমিং নিয়ন্ত্রক দ্বারা প্রত্যায়িত এবং অডিটেড"
                : "Certified & Audited under Government of Curaçao License #8048/JAZ"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shadow-sm"
          >
            {isBn ? "বন্ধ করুন" : "Close"}
          </button>
        </div>

      </div>
    </div>
  );
};
