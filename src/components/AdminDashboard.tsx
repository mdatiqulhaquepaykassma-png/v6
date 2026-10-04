import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  BarChart3,
  Users,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Coins,
  CreditCard,
  Power,
  RefreshCw,
  Clock,
  FileText,
  UserCheck,
  UserX,
  Folder,
  FolderOpen,
  Tag,
  Gift,
  Activity,
  Plus,
  Search,
  Filter,
  Eye,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { AdminGrant, TagFolderSummary, UserActivityLog, RoundDispute, PlayerReport } from "../types";
import { AdminReportManagementModal } from "./AdminReportManagementModal";
import { motion, AnimatePresence } from "framer-motion";

interface AdminDashboardProps {
  onLogout?: () => void;
  onExit?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onExit }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return localStorage.getItem("admin_token") !== null || sessionStorage.getItem("admin_authorized") === "true";
  });
  const [stats, setStats] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const [viewingHistoryUser, setViewingHistoryUser] = useState<any | null>(null);
  const [historySubTab, setHistorySubTab] = useState<"overview" | "bets" | "transactions" | "adminGrants" | "activity">("overview");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Player Reports state
  const [reportsSummary, setReportsSummary] = useState<{
    totalCount: number;
    counts: { pending: number; investigated: number; resolved: number };
    reports: PlayerReport[];
  }>({
    totalCount: 0,
    counts: { pending: 0, investigated: 0, resolved: 0 },
    reports: [],
  });

  // Round Disputes state
  const [disputesSummary, setDisputesSummary] = useState<{
    totalCount: number;
    counts: { pending: number; resolved: number; refunded: number };
    disputes: RoundDispute[];
  }>({
    totalCount: 0,
    counts: { pending: 0, resolved: 0, refunded: 0 },
    disputes: [],
  });

  // Admin Grants & Tag Folders state
  const [grantsSummary, setGrantsSummary] = useState<{
    totalAmount: number;
    totalRecipientsCount: number;
    totalGrantsCount: number;
    tagFolders: TagFolderSummary[];
    grants: AdminGrant[];
  }>({
    totalAmount: 0,
    totalRecipientsCount: 0,
    totalGrantsCount: 0,
    tagFolders: [],
    grants: [],
  });
  const [selectedTagFolder, setSelectedTagFolder] = useState<string | null>(null);
  const [showGrantModal, setShowGrantModal] = useState<boolean>(false);
  const [grantForm, setGrantForm] = useState<{
    userId: string;
    amount: string;
    tag: string;
    customTag: string;
    reason: string;
    isDemo: boolean;
  }>({
    userId: "",
    amount: "",
    tag: "Welcome Deposit",
    customTag: "",
    reason: "",
    isDemo: false,
  });

  // Custom Prompt/Confirm Modal state
  const [modalAction, setModalAction] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    showInput: boolean;
    inputPlaceholder: string;
    defaultValue: string;
    onConfirm: (input?: string) => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    showInput: false,
    inputPlaceholder: "",
    defaultValue: "",
    onConfirm: () => {},
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalAction({
      isOpen: true,
      title,
      message,
      showInput: false,
      inputPlaceholder: "",
      defaultValue: "",
      onConfirm: () => {
        onConfirm();
        setModalAction((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const openPrompt = (title: string, message: string, defaultValue: string, placeholder: string, onConfirm: (val: string) => void) => {
    setModalAction({
      isOpen: true,
      title,
      message,
      showInput: true,
      inputPlaceholder: placeholder,
      defaultValue,
      onConfirm: (val) => {
        if (val !== undefined) {
          onConfirm(val);
          setModalAction((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const [activeAdminTab, setActiveAdminTab] = useState<
    "overview" | "deposits" | "withdrawals" | "users" | "grants" | "disputes" | "reports" | "tables" | "auditLogs"
  >("overview");
  const [loading, setLoading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string>("");
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");

  const PRESET_TAGS = [
    "Welcome Deposit",
    "Manual Deposit Verification",
    "Compensation / Refund",
    "VIP Loyalty Reward",
    "Tournament Prize",
    "System Correction",
    "CUSTOM",
  ];

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("admin_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token && sessionStorage.getItem("admin_authorized") !== "true") {
      window.location.hash = "#/admin/login";
    } else {
      setIsAuthorized(true);
      fetchStats();
      fetchDeposits();
      fetchWithdrawals();
      fetchUsers();
      fetchGrants();
      fetchDisputes();
      fetchReports();
    }
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/admin/reports", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setReportsSummary(data);
      }
    } catch (e) {
      console.error("Failed to load player reports:", e);
    }
  };

  const handleReportAction = async (
    reportId: string,
    action: "BAN" | "SUSPEND" | "DISMISS" | "INVESTIGATE",
    reportedUsername: string
  ) => {
    const confirmMsg =
      action === "BAN"
        ? `Are you sure you want to BAN player @${reportedUsername}?`
        : action === "SUSPEND"
        ? `Are you sure you want to SUSPEND player @${reportedUsername}?`
        : `Mark report #${reportId} as ${action}?`;

    openPrompt(
      "Admin Action",
      confirmMsg,
      `Action ${action} taken via security report`,
      "Enter admin reason / note...",
      async (notes) => {
        if (!notes) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/reports/${reportId}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
            body: JSON.stringify({ action, notes }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setActionMsg(data.message || `Action ${action} executed for @${reportedUsername}`);
            fetchReports();
            fetchUsers();
            fetchStats();
          } else {
            alert(data.error || "Failed to execute report action");
          }
        } catch {
          alert("Network error executing report action");
        } finally {
          setLoading(false);
        }
      }
    );
  };


  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  };

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/admin/disputes", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setDisputesSummary(data);
      }
    } catch (e) {
      console.error("Failed to load round disputes:", e);
    }
  };

  const handleResolveDispute = async (
    disputeId: string,
    action: "REFUND" | "RESOLVE" | "REJECT" | "REVIEW",
    defaultBetAmount = 0
  ) => {
    const resolveWithNote = (refundAmt: number) => {
      openPrompt(
        "Resolve Dispute",
        "Enter Admin Note / Resolution Message for this dispute:",
        action === "REFUND" ? "Approved dispute refund" : "Verified based on server logs",
        "Admin note...",
        async (note) => {
          if (!note) return;
          setLoading(true);
          try {
            const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...getAuthHeader() },
              body: JSON.stringify({
                action,
                adminNotes: note,
                refundAmount: refundAmt,
              }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              setActionMsg(data.message || `Dispute status updated to ${action}`);
              fetchDisputes();
              fetchUsers();
              fetchStats();
            } else {
              alert(data.error || "Failed to update dispute");
            }
          } catch {
            alert("Network error updating dispute");
          } finally {
            setLoading(false);
          }
        }
      );
    };

    if (action === "REFUND") {
      openPrompt(
        "Refund Dispute",
        "Enter refund amount to credit user wallet (৳):",
        String(defaultBetAmount),
        "Amount",
        (inputAmt) => {
          const refundAmount = parseFloat(inputAmt);
          if (isNaN(refundAmount) || refundAmount <= 0) {
            alert("Invalid refund amount.");
            return;
          }
          resolveWithNote(refundAmount);
        }
      );
    } else {
      resolveWithNote(0);
    }
  };

  const fetchGrants = async () => {
    try {
      const res = await fetch("/api/admin/grants", { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setGrantsSummary(data);
      }
    } catch (e) {
      console.error("Failed to load admin grants:", e);
    }
  };

  const fetchUserHistory = async (userId: string) => {
    setLoading(true);
    setHistorySubTab("overview");
    try {
      const res = await fetch(`/api/admin/users/${userId}/history`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setViewingHistoryUser(data);
      }
    } catch {
      alert("Failed to load user history");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantForm.userId) {
      alert("Please select a target user.");
      return;
    }
    const amt = parseFloat(grantForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid deposit amount greater than 0.");
      return;
    }
    const finalTag = grantForm.tag === "CUSTOM" ? grantForm.customTag.trim() : grantForm.tag;
    if (!finalTag) {
      alert("Please select or specify a Tag Folder category.");
      return;
    }
    if (!grantForm.reason.trim()) {
      alert("Please provide the cause or reason for granting this deposit.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${grantForm.userId}/grant-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          amount: amt,
          tag: finalTag,
          reason: grantForm.reason.trim(),
          isDemo: grantForm.isDemo,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(data.message || `Deposit of ৳${amt.toLocaleString()} granted successfully!`);
        setShowGrantModal(false);
        setGrantForm({
          userId: "",
          amount: "",
          tag: "Welcome Deposit",
          customTag: "",
          reason: "",
          isDemo: false,
        });
        fetchUsers();
        fetchGrants();
        fetchStats();
      } else {
        alert(data.error || "Failed to grant deposit.");
      }
    } catch {
      alert("Network error granting deposit.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserBalance = async (userId: string, username: string) => {
    openPrompt(
      "Adjust Balance",
      `Enter amount to add (positive) or deduct (negative) for @${username}:`,
      "0",
      "Amount (e.g. 500 or -500)",
      (amountStr) => {
        const amountNum = parseFloat(amountStr);
        if (isNaN(amountNum)) {
          alert("Invalid amount");
          return;
        }
        openPrompt(
          "Adjustment Reason",
          `Specify reason/note for this balance adjustment:`,
          "Admin direct adjustment",
          "Reason...",
          async (reasonNote) => {
            const type = amountNum >= 0 ? "add" : "sub";
            const absAmount = Math.abs(amountNum);

            setLoading(true);
            try {
              const res = await fetch(`/api/admin/users/${userId}/balance`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeader() },
                body: JSON.stringify({ type, amount: absAmount, isDemo: false, reason: reasonNote }),
              });
              const data = await res.json();
              if (res.ok && data.success) {
                setActionMsg(`Balance updated successfully for @${username}`);
                fetchUsers();
                fetchStats();
              } else {
                alert(data.error || "Failed to update balance");
              }
            } catch {
              alert("Network error updating balance");
            } finally {
              setLoading(false);
            }
          }
        );
      }
    );
  };

  const handleUserStatus = async (userId: string, currentStatus: string, username: string) => {
    const newStatus = currentStatus === "BANNED" ? "ACTIVE" : "BANNED";
    openConfirm(
      "Change Status",
      `Are you sure you want to change status of @${username} to ${newStatus}?`,
      async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) {
            setActionMsg(`User @${username} status changed to ${newStatus}`);
            fetchUsers();
          }
        } catch {
          alert("Error updating user status");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleUserKyc = async (userId: string, currentKyc: string, username: string) => {
    const newKyc = currentKyc === "verified" ? "none" : "verified";
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ kycStatus: newKyc }),
      });
      if (res.ok) {
        setActionMsg(`KYC status for @${username} updated to ${newKyc}`);
        fetchUsers();
      }
    } catch {
      alert("Error updating KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.userId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          username: editingUser.username,
          balance: editingUser.balance,
          demoBalance: editingUser.demoBalance,
          kycStatus: editingUser.kycStatus,
          status: editingUser.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`User @${editingUser.username} updated successfully!`);
        setEditingUser(null);
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || "Failed to update user");
      }
    } catch {
      alert("Network error updating user");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: getAuthHeader(),
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to load admin stats:", e);
    }
  };

  const fetchDeposits = async () => {
    try {
      const res = await fetch("/api/admin/deposits", {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits || []);
      }
    } catch (e) {
      console.error("Failed to load deposits:", e);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (e) {
      console.error("Failed to load withdrawals:", e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs", {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
  };

  const handleSaveTableConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/table/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          slug: editingTable.slug,
          minBet: editingTable.minBet,
          maxBet: editingTable.maxBet,
          timer: editingTable.timer,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`Table limits updated for ${editingTable.name}!`);
        setEditingTable(null);
        fetchStats();
      } else {
        alert(data.error || "Failed to update table configuration");
      }
    } catch {
      alert("Network error updating table configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (id: number) => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await fetch(`/api/admin/deposits/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`Deposit #${id} approved and credited to player balance.`);
        fetchDeposits();
        fetchStats();
      } else {
        setActionMsg(`Failed: ${data.error || "Could not approve deposit."}`);
      }
    } catch {
      setActionMsg("Network error approving deposit.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDeposit = async (id: number) => {
    openPrompt(
      "Reject Deposit",
      "Reason for rejection:",
      "Invalid transaction details",
      "Reason...",
      async (note) => {
        setLoading(true);
        setActionMsg("");
        try {
          const res = await fetch(`/api/admin/deposits/${id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
            body: JSON.stringify({ note }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setActionMsg(`Deposit #${id} rejected.`);
            fetchDeposits();
          } else {
            setActionMsg(`Failed: ${data.error || "Could not reject deposit."}`);
          }
        } catch {
          setActionMsg("Network error rejecting deposit.");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleApproveWithdrawal = async (id: number) => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`Withdrawal #${id} marked as fulfilled.`);
        fetchWithdrawals();
        fetchStats();
      } else {
        setActionMsg(`Failed: ${data.error || "Could not approve withdrawal."}`);
      }
    } catch {
      setActionMsg("Network error approving withdrawal.");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithdrawal = async (id: number) => {
    openPrompt(
      "Reject Withdrawal",
      "Reason for rejection (funds will be refunded):",
      "Invalid account details",
      "Reason...",
      async (note) => {
        setLoading(true);
        setActionMsg("");
        try {
          const res = await fetch(`/api/admin/withdrawals/${id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeader() },
            body: JSON.stringify({ note }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setActionMsg(`Withdrawal #${id} rejected and refunded to player balance.`);
            fetchWithdrawals();
            fetchStats();
          } else {
            setActionMsg(`Failed: ${data.error || "Could not reject withdrawal."}`);
          }
        } catch {
          setActionMsg("Network error rejecting withdrawal.");
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_authorized");
    sessionStorage.removeItem("admin_user");
    if (onLogout) {
      onLogout();
    } else {
      window.location.hash = "#/admin/login";
    }
  };

  const openGrantModalForUser = (userId: string) => {
    setGrantForm({
      userId,
      amount: "",
      tag: "Welcome Deposit",
      customTag: "",
      reason: "",
      isDemo: false,
    });
    setShowGrantModal(true);
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearchTerm.trim()) return true;
    const term = userSearchTerm.toLowerCase();
    return (
      u.username?.toLowerCase().includes(term) ||
      u.userId?.toLowerCase().includes(term)
    );
  });

  const filteredGrants = selectedTagFolder
    ? grantsSummary.grants.filter((g) => g.tag === selectedTagFolder)
    : grantsSummary.grants;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white">Administrator Access Required</h2>
        <p className="text-xs text-neutral-400 max-w-sm">
          Please log in with administrator credentials to manage users, tables, and disputes.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (onLogout) onLogout();
              else window.location.hash = "#/admin/login";
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs hover:bg-amber-400 transition-all cursor-pointer"
          >
            Go to Admin Login
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="px-5 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-700 transition-all cursor-pointer"
            >
              Return to Casino
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050608] text-neutral-100 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-amber-500 tracking-wide">
                ENTERPRISE ADMIN PORTAL
              </h1>
              <p className="text-xs text-neutral-400">
                Full User Control • Deposit Tracking & Tag Folders • Live History & Audit Trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExit && (
              <button
                onClick={onExit}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                title="Return to Player Arena"
              >
                <span>🎮 Return to Casino</span>
              </button>
            )}
            <button
              onClick={() => {
                fetchStats();
                fetchDeposits();
                fetchWithdrawals();
                fetchUsers();
                fetchGrants();
                if (activeAdminTab === "auditLogs") fetchAuditLogs();
              }}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {actionMsg && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg("")} className="text-neutral-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ADMIN NAV TABS */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveAdminTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === "overview"
                ? "bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveAdminTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "users"
                ? "bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Balances ({users.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveAdminTab("grants");
              fetchGrants();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "grants"
                ? "bg-emerald-500 text-neutral-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Admin Deposits & Tag Folders</span>
            {grantsSummary.totalGrantsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400 text-neutral-950 font-black">
                {grantsSummary.totalGrantsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveAdminTab("disputes");
              fetchDisputes();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "disputes"
                ? "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Round Disputes & Complaints</span>
            {disputesSummary.counts.pending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
                {disputesSummary.counts.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveAdminTab("reports");
              fetchReports();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "reports"
                ? "bg-purple-500 text-white font-black shadow-md shadow-purple-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-purple-400" />
            <span>Player Reports</span>
            {reportsSummary.counts.pending > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500 text-white font-black animate-pulse">
                {reportsSummary.counts.pending}
              </span>
            )}
          </button>


          <button
            onClick={() => {
              setActiveAdminTab("deposits");
              fetchDeposits();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "deposits"
                ? "bg-blue-500 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Deposit Requests</span>
            {deposits.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-400 text-neutral-950 font-black">
                {deposits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveAdminTab("withdrawals");
              fetchWithdrawals();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "withdrawals"
                ? "bg-blue-500 text-white font-black shadow-md shadow-blue-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Withdrawal Requests</span>
            {withdrawals.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-300 text-neutral-950 font-black">
                {withdrawals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveAdminTab("tables")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeAdminTab === "tables"
                ? "bg-amber-500 text-neutral-950 font-black shadow-md shadow-amber-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Game Tables
          </button>
          <button
            onClick={() => {
              setActiveAdminTab("auditLogs");
              fetchAuditLogs();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeAdminTab === "auditLogs"
                ? "bg-purple-500 text-white font-black shadow-md shadow-purple-500/20"
                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className="bg-[#0B0E14] p-6 rounded-2xl border border-white/10 min-h-[450px]">
          {/* 1. OVERVIEW TAB */}
          {activeAdminTab === "overview" && !stats && (
            <div className="text-center py-20 text-neutral-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-bold">Loading system metrics and ledger data...</span>
            </div>
          )}
          {activeAdminTab === "overview" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Real Balance</span>
                  <div className="text-2xl font-black text-emerald-400">
                    ৳{Number(stats.liquidReserves || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-neutral-500">Player held funds in ledger</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Admin Deposits Given</span>
                  <div className="text-2xl font-black text-amber-400">
                    ৳{Number(grantsSummary.totalAmount || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-neutral-500">Given across {grantsSummary.totalRecipientsCount} users</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Company Commission</span>
                  <div className="text-2xl font-black text-blue-400">
                    ৳{Number(stats.todayCommission || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-neutral-500">5% rake on matched decided rounds</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Registered Users</span>
                  <div className="text-2xl font-black text-purple-400">
                    {users.length}
                  </div>
                  <span className="text-[10px] text-neutral-500">Active player accounts in DB</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-950 p-5 rounded-xl border border-white/5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    System Ledger & Control Verification
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">User History & Activity Logs</span>
                      <span className="text-emerald-400 font-bold">100% Comprehensive</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Admin Deposits Tracking</span>
                      <span className="text-emerald-400 font-bold">Tag Folders Active</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Full Edit & Control</span>
                      <span className="text-emerald-400 font-bold">Enabled for Super Admin</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Database Engine</span>
                      <span className="text-blue-400 font-bold">LibSQL / SQLite (WAL Mode, ACID)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-950 p-5 rounded-xl border border-white/5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-emerald-400" />
                    Admin Deposit Tag Categories Breakdown
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {grantsSummary.tagFolders.map((tf) => (
                      <div key={tf.tag} className="flex items-center justify-between p-2 bg-neutral-900 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-white">{tf.tag}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-emerald-400 font-bold">৳{tf.totalAmount.toLocaleString()}</div>
                          <div className="text-[10px] text-neutral-400">{tf.userCount} user(s) • {tf.grantsCount} grant(s)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. USERS TAB (FULL CONTROL & ALL USER HISTORY) */}
          {activeAdminTab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    Database User Accounts ({filteredUsers.length} of {users.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search user or ID..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setGrantForm({
                        userId: users[0]?.userId || "",
                        amount: "",
                        tag: "Welcome Deposit",
                        customTag: "",
                        reason: "",
                        isDemo: false,
                      });
                      setShowGrantModal(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Grant Deposit</span>
                  </button>
                  <button
                    onClick={fetchUsers}
                    className="bg-neutral-800 hover:bg-neutral-700 text-xs px-3 py-1.5 rounded-xl font-bold text-neutral-200"
                  >
                    Reload
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400">
                      <th className="pb-3 font-semibold">User Details</th>
                      <th className="pb-3 font-semibold">Real Balance</th>
                      <th className="pb-3 font-semibold">Demo Balance</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">KYC Status</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u: any) => (
                      <tr key={u.userId} className="hover:bg-neutral-900/50">
                        <td className="py-3 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">@{u.username}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">({u.userId})</span>
                          </div>
                        </td>
                        <td className="py-3 font-mono font-bold text-emerald-400">
                          ৳{Number(u.balance || 0).toLocaleString()}
                        </td>
                        <td className="py-3 font-mono text-neutral-400">
                          ৳{Number(u.demoBalance || 0).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              (u.status || "ACTIVE") === "ACTIVE"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {u.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.kycStatus === "verified"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {u.kycStatus || "none"}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            disabled={loading}
                            onClick={() => openGrantModalForUser(u.userId)}
                            className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all"
                            title="Grant Deposit with Tag Reason"
                          >
                            + Deposit
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => fetchUserHistory(u.userId)}
                            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Full History
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => setEditingUser({ ...u })}
                            className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => handleUserBalance(u.userId, u.username)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all"
                          >
                            Adjust
                          </button>
                          <button
                            disabled={loading}
                            onClick={() => handleUserStatus(u.userId, u.status || "ACTIVE", u.username)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              (u.status || "ACTIVE") === "BANNED"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                            }`}
                          >
                            {(u.status || "ACTIVE") === "BANNED" ? "Unban" : "Ban"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. ADMIN DEPOSITS & TAG FOLDERS TAB */}
          {activeAdminTab === "grants" && (
            <div className="space-y-6">
              {/* STATS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Admin Deposit Given</span>
                  <div className="text-2xl font-black text-emerald-400">
                    ৳{grantsSummary.totalAmount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-neutral-500">Total admin credited balance</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Recipients Count</span>
                  <div className="text-2xl font-black text-amber-400">
                    {grantsSummary.totalRecipientsCount} Users
                  </div>
                  <span className="text-[10px] text-neutral-500">Unique user accounts credited</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Grant Events</span>
                  <div className="text-2xl font-black text-blue-400">
                    {grantsSummary.totalGrantsCount} Grants
                  </div>
                  <span className="text-[10px] text-neutral-500">Total individual grant allocations</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Tag Folders</span>
                  <div className="text-2xl font-black text-purple-400">
                    {grantsSummary.tagFolders.length} Folders
                  </div>
                  <span className="text-[10px] text-neutral-500">Reason / Tag categories</span>
                </div>
              </div>

              {/* ACTION HEADER */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-neutral-950 p-4 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-emerald-400" />
                    <span>Admin Deposits Tag Folders Directory (ট্যাগ ফোল্ডার ক্যাটাগরি)</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Filter admin deposit grants by specific cause, tag folder, or reason description.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGrantForm({
                      userId: users[0]?.userId || "",
                      amount: "",
                      tag: "Welcome Deposit",
                      customTag: "",
                      reason: "",
                      isDemo: false,
                    });
                    setShowGrantModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Grant New Deposit</span>
                </button>
              </div>

              {/* TAG FOLDER CARDS DIRECTORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedTagFolder(null)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedTagFolder === null
                      ? "bg-amber-500/10 border-amber-500/50 text-white"
                      : "bg-neutral-950 border-white/5 hover:border-white/20 text-neutral-300"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm">📁 All Tag Folders</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-bold">
                      {grantsSummary.grants.length}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    Total Given: <span className="font-mono text-emerald-400 font-bold">৳{grantsSummary.totalAmount.toLocaleString()}</span>
                  </div>
                </button>

                {grantsSummary.tagFolders.map((tf) => {
                  const isSelected = selectedTagFolder === tf.tag;
                  return (
                    <button
                      key={tf.tag}
                      onClick={() => setSelectedTagFolder(isSelected ? null : tf.tag)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                          : "bg-neutral-950 border-white/5 hover:border-white/20 text-neutral-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Folder className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-amber-400"}`} />
                          <span className="font-bold text-sm">{tf.tag}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-emerald-400 font-mono font-bold">
                          {tf.grantsCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-neutral-400">
                        <span>{tf.userCount} user(s) received</span>
                        <span className="font-mono text-emerald-400 font-bold">৳{tf.totalAmount.toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* GRANTS DETAILED LOG TABLE */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {selectedTagFolder ? `Tag Folder: '${selectedTagFolder}' Grants` : "All Admin Deposit Grants History"}
                    </span>
                    <span className="text-xs text-neutral-500">({filteredGrants.length} items)</span>
                  </h4>
                  {selectedTagFolder && (
                    <button
                      onClick={() => setSelectedTagFolder(null)}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Clear Tag Filter
                    </button>
                  )}
                </div>

                {filteredGrants.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    No admin deposit grants found under this tag folder.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-neutral-400">
                          <th className="pb-3 font-semibold">Recipient User</th>
                          <th className="pb-3 font-semibold">Tag Folder</th>
                          <th className="pb-3 font-semibold">Amount Given</th>
                          <th className="pb-3 font-semibold">Cause / Reason Note</th>
                          <th className="pb-3 font-semibold">Granted By</th>
                          <th className="pb-3 font-semibold">Date & Time</th>
                          <th className="pb-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredGrants.map((g) => (
                          <tr key={g.id} className="hover:bg-neutral-900/50">
                            <td className="py-3 font-bold text-white">
                              @{g.username} <span className="text-[10px] text-neutral-500 font-normal">({g.userId})</span>
                            </td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 w-fit">
                                <Folder className="w-3 h-3" />
                                <span>{g.tag}</span>
                              </span>
                            </td>
                            <td className="py-3 font-mono font-bold text-emerald-400">
                              ৳{g.amount.toLocaleString()}
                            </td>
                            <td className="py-3 text-neutral-300 max-w-xs truncate" title={g.reason}>
                              {g.reason}
                            </td>
                            <td className="py-3 text-neutral-400">{g.adminUsername || "admin"}</td>
                            <td className="py-3 text-neutral-400 font-mono">{new Date(g.timestamp).toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => fetchUserHistory(g.userId)}
                                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold"
                              >
                                View User
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

          {/* 4. DEPOSITS QUEUE TAB */}
          {/* ROUND DISPUTES & COMPLAINTS TAB */}
          {activeAdminTab === "disputes" && (
            <div className="space-y-6">
              {/* STATS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Disputes Submitted</span>
                  <div className="text-2xl font-black text-rose-400">
                    {disputesSummary.totalCount}
                  </div>
                  <span className="text-[10px] text-neutral-500">Player round complaints</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Pending Review</span>
                  <div className="text-2xl font-black text-amber-400">
                    {disputesSummary.counts.pending}
                  </div>
                  <span className="text-[10px] text-neutral-500">Awaiting admin investigation</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Resolved Valid</span>
                  <div className="text-2xl font-black text-blue-400">
                    {disputesSummary.counts.resolved}
                  </div>
                  <span className="text-[10px] text-neutral-500">Investigated & decided</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Refunded Disputes</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {disputesSummary.counts.refunded}
                  </div>
                  <span className="text-[10px] text-neutral-500">Wallet balance credited</span>
                </div>
              </div>

              {/* ACTION HEADER */}
              <div className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>User Round Complaints & Dispute Management (রাউন্ড ডিসপিউট সেন্টার)</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Inspect user round complaints, review cryptographically logged cards, and refund or resolve disputes.
                  </p>
                </div>
                <button
                  onClick={fetchDisputes}
                  className="bg-neutral-800 hover:bg-neutral-700 text-xs px-3 py-1.5 rounded-xl font-bold text-neutral-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Disputes</span>
                </button>
              </div>

              {/* DISPUTES TABLE */}
              {disputesSummary.disputes.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs bg-neutral-950 rounded-xl border border-white/5">
                  No round disputes or complaints reported by users.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400">
                        <th className="pb-3 font-semibold">User Details</th>
                        <th className="pb-3 font-semibold">Round & Table</th>
                        <th className="pb-3 font-semibold">Issue Category & Description</th>
                        <th className="pb-3 font-semibold">Bet & Cards</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Admin Notes</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {disputesSummary.disputes.map((d) => (
                        <tr key={d.id} className="hover:bg-neutral-900/50">
                          <td className="py-3 font-bold text-white">
                            <div>@{d.username}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">({d.userId})</div>
                            <div className="text-[10px] text-neutral-400 mt-1">{new Date(d.timestamp).toLocaleString()}</div>
                          </td>
                          <td className="py-3">
                            <div className="font-bold text-amber-400 font-mono">
                              Round #{d.roundNumber || d.roomId || "N/A"}
                            </div>
                            <div className="text-[10px] text-neutral-400">{d.tableName || d.tableSlug || "P2P Duel"}</div>
                          </td>
                          <td className="py-3 max-w-xs">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-300 block w-fit mb-1">
                              {d.issueType}
                            </span>
                            <p className="text-neutral-200 text-xs whitespace-normal" title={d.description}>
                              {d.description}
                            </p>
                          </td>
                          <td className="py-3 font-mono">
                            {d.betAmount && (
                              <div className="font-bold text-emerald-400">
                                ৳{d.betAmount.toLocaleString()} ({d.side || "N/A"})
                              </div>
                            )}
                            {d.roundDetails?.dragonCard && (
                              <div className="text-[10px] text-neutral-400">
                                🐉 {d.roundDetails.dragonCard} vs 🐯 {d.roundDetails.tigerCard} ({d.roundDetails.result})
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                                d.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : d.status === "UNDER_REVIEW"
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : d.status === "REFUNDED"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : d.status === "RESOLVED_VALID"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-3 text-neutral-300 max-w-xs text-[11px]" title={d.adminNotes || ""}>
                            {d.adminNotes || "—"}
                          </td>
                          <td className="py-3 text-right space-y-1">
                            <div className="flex flex-col gap-1 items-end">
                              <button
                                disabled={loading || d.status === "REFUNDED"}
                                onClick={() => handleResolveDispute(d.id, "REFUND", d.betAmount || 0)}
                                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold w-full max-w-[110px] transition-all disabled:opacity-40"
                              >
                                Refund Player
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => handleResolveDispute(d.id, "RESOLVE", d.betAmount || 0)}
                                className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold w-full max-w-[110px] transition-all"
                              >
                                Mark Valid
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => handleResolveDispute(d.id, "REJECT", d.betAmount || 0)}
                                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold w-full max-w-[110px] transition-all"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => fetchUserHistory(d.userId)}
                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-bold w-full max-w-[110px] transition-all"
                              >
                                Inspect User
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PLAYER REPORTS & SECURITY ACTIONS TAB */}
          {activeAdminTab === "reports" && (
            <div className="space-y-6">
              {/* STATS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Reports</span>
                  <div className="text-2xl font-black text-purple-400">
                    {reportsSummary.totalCount}
                  </div>
                  <span className="text-[10px] text-neutral-500">Submitted player reports</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Pending Review</span>
                  <div className="text-2xl font-black text-amber-400">
                    {reportsSummary.counts.pending}
                  </div>
                  <span className="text-[10px] text-neutral-500">Awaiting security action</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Under Investigation</span>
                  <div className="text-2xl font-black text-blue-400">
                    {reportsSummary.counts.investigated}
                  </div>
                  <span className="text-[10px] text-neutral-500">Active monitoring</span>
                </div>
                <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Resolved / Actioned</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {reportsSummary.counts.resolved}
                  </div>
                  <span className="text-[10px] text-neutral-500">Banned, suspended, or closed</span>
                </div>
              </div>

              {/* ACTION HEADER */}
              <div className="flex justify-between items-center bg-neutral-950 p-4 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserX className="w-4 h-4 text-purple-400" />
                    <span>Player Reports & Anti-Cheat Moderation Center (ইউজার রিপোর্ট ও নিরাপত্তা কেন্দ্র)</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Review user complaints against other players and execute immediate ban, suspension, or dismissal.
                  </p>
                </div>
                <button
                  onClick={fetchReports}
                  className="bg-neutral-800 hover:bg-neutral-700 text-xs px-3 py-1.5 rounded-xl font-bold text-neutral-200 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Reports</span>
                </button>
              </div>

              {/* REPORTS TABLE */}
              {reportsSummary.reports.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs bg-neutral-950 rounded-xl border border-white/5">
                  No player reports submitted.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400">
                        <th className="pb-3 font-semibold">Reported Player</th>
                        <th className="pb-3 font-semibold">Reported By</th>
                        <th className="pb-3 font-semibold">Violation Reason & Details</th>
                        <th className="pb-3 font-semibold">Submitted Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {reportsSummary.reports.map((r) => (
                        <tr key={r.id} className="hover:bg-neutral-900/50">
                          <td className="py-3 font-bold text-white">
                            <div className="text-rose-400 font-bold">@{r.reportedUsername}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">ID: {r.reportedUserId}</div>
                          </td>
                          <td className="py-3 font-bold text-neutral-300">
                            <div>@{r.reporterUsername}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">ID: {r.reporterUserId}</div>
                          </td>
                          <td className="py-3 max-w-xs">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 block w-fit mb-1">
                              {r.reason}
                            </span>
                            <p className="text-neutral-200 text-xs whitespace-normal" title={r.details}>
                              {r.details || "No details provided."}
                            </p>
                          </td>
                          <td className="py-3 text-neutral-400 font-mono">
                            {new Date(r.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                                r.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : r.status === "INVESTIGATED"
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 text-right space-y-1">
                            <div className="flex flex-col gap-1 items-end">
                              <button
                                disabled={loading}
                                onClick={() => handleReportAction(r.id, "BAN", r.reportedUsername)}
                                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold w-full max-w-[120px] transition-all"
                              >
                                🚫 Ban Player
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => handleReportAction(r.id, "SUSPEND", r.reportedUsername)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold w-full max-w-[120px] transition-all"
                              >
                                Suspend Player
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => handleReportAction(r.id, "INVESTIGATE", r.reportedUsername)}
                                className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold w-full max-w-[120px] transition-all"
                              >
                                Mark Investigated
                              </button>
                              <button
                                onClick={() => fetchUserHistory(r.reportedUserId)}
                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[10px] font-bold w-full max-w-[120px] transition-all"
                              >
                                Inspect User History
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. DEPOSITS QUEUE TAB */}
          {activeAdminTab === "deposits" && (


            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Manual Deposit Verification Queue
                </h3>
                <span className="text-xs text-neutral-400">{deposits.length} pending request(s)</span>
              </div>

              {deposits.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  No pending deposit requests. All deposits have been verified.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400">
                        <th className="pb-3 font-semibold">User</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Method</th>
                        <th className="pb-3 font-semibold">UTR / Trx ID</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {deposits.map((dep) => (
                        <tr key={dep.id} className="hover:bg-neutral-900/50">
                          <td className="py-3 font-bold text-white">
                            {dep.username || `User #${dep.user_id || dep.userId}`}
                          </td>
                          <td className="py-3 font-mono font-bold text-emerald-400">
                            ৳{Number(dep.amount).toLocaleString()}
                          </td>
                          <td className="py-3 text-neutral-300">{dep.method || dep.payment_method || "bKash"}</td>
                          <td className="py-3 font-mono text-amber-300">{dep.trxId || dep.utr_number || "N/A"}</td>
                          <td className="py-3 text-neutral-400">{new Date(dep.timestamp || dep.created_at || Date.now()).toLocaleString()}</td>
                          <td className="py-3 text-right space-x-2">
                            <button
                              disabled={loading}
                              onClick={() => handleApproveDeposit(dep.id)}
                              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Approve & Credit
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleRejectDeposit(dep.id)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. WITHDRAWALS QUEUE TAB */}
          {activeAdminTab === "withdrawals" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-400" />
                  Player Withdrawal Processing Queue
                </h3>
                <span className="text-xs text-neutral-400">{withdrawals.length} pending request(s)</span>
              </div>

              {withdrawals.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  No pending withdrawal requests. All payouts processed.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400">
                        <th className="pb-3 font-semibold">User</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Method</th>
                        <th className="pb-3 font-semibold">Account Details</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-neutral-900/50">
                          <td className="py-3 font-bold text-white">
                            {w.username || `User #${w.user_id || w.userId}`}
                          </td>
                          <td className="py-3 font-mono font-bold text-blue-400">
                            ৳{Number(w.amount).toLocaleString()}
                          </td>
                          <td className="py-3 text-neutral-300">{w.method || w.payment_method || "bKash"}</td>
                          <td className="py-3 font-mono text-neutral-300">{w.accountNumber || w.account_details || "N/A"}</td>
                          <td className="py-3 text-neutral-400">{new Date(w.timestamp || w.created_at || Date.now()).toLocaleString()}</td>
                          <td className="py-3 text-right space-x-2">
                            <button
                              disabled={loading}
                              onClick={() => handleApproveWithdrawal(w.id)}
                              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Mark Fulfilled
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleRejectWithdrawal(w.id)}
                              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              Reject & Refund
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 6. TABLES TAB */}
          {activeAdminTab === "tables" && !stats && (
            <div className="text-center py-20 text-neutral-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-bold">Loading table engine status...</span>
            </div>
          )}
          {activeAdminTab === "tables" && stats && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Live Table Engine Nodes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.tables?.map((tbl: any) => (
                  <div key={tbl.slug} className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-white text-sm">{tbl.name}</h4>
                        <span className="text-xs text-emerald-400 font-medium">● ACTIVE</span>
                      </div>
                      <span className="text-xs font-mono bg-neutral-900 px-2 py-1 rounded text-amber-400">
                        {tbl.timer}s
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-neutral-400">
                        <span>Min/Max Bet:</span>
                        <span className="text-white font-mono">৳{tbl.minBet} - ৳{tbl.maxBet}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Matched Pool:</span>
                        <span className="text-emerald-400 font-mono">৳{Number(tbl.matchedAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Players Online:</span>
                        <span className="text-amber-400 font-mono">{tbl.playersOnline || 1} active</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTable({ ...tbl })}
                      className="w-full py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configure Limits & Timer</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. AUDIT LOGS TAB */}
          {activeAdminTab === "auditLogs" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Tamper-Evident System Audit Trail
                </h3>
              </div>
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  No recent audit logs recorded.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between text-neutral-400">
                        <span className="font-bold text-white">{log.action}</span>
                        <span className="font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-neutral-400">
                        Entity: <span className="text-neutral-200">{log.entity_type} #{log.entity_id}</span> • Admin: <span className="text-neutral-200">User #{log.user_id || "System"}</span>
                      </div>
                      {log.new_values && (
                        <pre className="text-[10px] text-neutral-500 bg-neutral-900 p-1.5 rounded overflow-x-auto">
                          {log.new_values}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* GRANT DEPOSIT MODAL WITH TAG & CAUSE */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Grant Admin Deposit</h3>
              </div>
              <button onClick={() => setShowGrantModal(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleGrantDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Select Recipient User</label>
                <select
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                  required
                >
                  <option value="" disabled>-- Select Player Account --</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      @{u.username} (ID: {u.userId}) - Real: ৳{u.balance}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Deposit Amount (৳)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 5000"
                  value={grantForm.amount}
                  onChange={(e) => setGrantForm({ ...grantForm, amount: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Tag Folder Category (ক্যাটাগরি বা ট্যাগ ফোল্ডার)</label>
                <select
                  value={grantForm.tag}
                  onChange={(e) => setGrantForm({ ...grantForm, tag: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {PRESET_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t === "CUSTOM" ? "📁 + Create Custom Tag Folder..." : `📁 ${t}`}
                    </option>
                  ))}
                </select>
              </div>

              {grantForm.tag === "CUSTOM" && (
                <div>
                  <label className="block text-amber-400 mb-1 font-bold">Custom Tag Folder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tournament Prize or System Adjustment"
                    value={grantForm.customTag}
                    onChange={(e) => setGrantForm({ ...grantForm, customTag: e.target.value })}
                    className="w-full bg-neutral-950 border border-amber-500/40 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Cause / Reason Note (কী কারণে দেওয়া হলো)</label>
                <textarea
                  rows={3}
                  placeholder="State clearly why this deposit is given to the user..."
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDemoGrant"
                  checked={grantForm.isDemo}
                  onChange={(e) => setGrantForm({ ...grantForm, isDemo: e.target.checked })}
                  className="rounded border-white/20"
                />
                <label htmlFor="isDemoGrant" className="text-neutral-300">Credit to Demo Balance instead of Real Balance</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-500 text-neutral-950 rounded-xl font-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                >
                  {loading ? "Processing..." : "Confirm & Credit Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Edit User: @{editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Username</label>
                <input
                  type="text"
                  value={editingUser.username || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Real Balance (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingUser.balance ?? 0}
                  onChange={(e) => setEditingUser({ ...editingUser, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Demo Balance (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingUser.demoBalance ?? 0}
                  onChange={(e) => setEditingUser({ ...editingUser, demoBalance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Account Status</label>
                <select
                  value={editingUser.status || "ACTIVE"}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BANNED">BANNED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">KYC Status</label>
                <select
                  value={editingUser.kycStatus || "none"}
                  onChange={(e) => setEditingUser({ ...editingUser, kycStatus: e.target.value })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="none">None</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-500 text-neutral-950 rounded-xl font-black hover:bg-amber-400"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GAME TABLE LIMITS MODAL */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Configure: {editingTable.name}</h3>
              </div>
              <button onClick={() => setEditingTable(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveTableConfig} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Minimum Bet (৳)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editingTable.minBet || 10}
                  onChange={(e) => setEditingTable({ ...editingTable, minBet: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Maximum Bet (৳)</label>
                <input
                  type="number"
                  step="1"
                  min="10"
                  value={editingTable.maxBet || 10000}
                  onChange={(e) => setEditingTable({ ...editingTable, maxBet: parseFloat(e.target.value) || 10 })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">Round Betting Timer (seconds)</label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="60"
                  value={editingTable.timer || 15}
                  onChange={(e) => setEditingTable({ ...editingTable, timer: parseInt(e.target.value) || 15 })}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-amber-500 text-neutral-950 rounded-xl font-black hover:bg-amber-400 cursor-pointer"
                >
                  {loading ? "Saving..." : "Save Table Limits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW COMPREHENSIVE USER HISTORY MODAL */}
      {viewingHistoryUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-4">
            {/* MODAL HEADER */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Full User Record: @{viewingHistoryUser.user?.username}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    viewingHistoryUser.user?.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {viewingHistoryUser.user?.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">User ID: {viewingHistoryUser.user?.userId}</p>
              </div>
              <button onClick={() => setViewingHistoryUser(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            {/* SUB-TABS */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3 text-xs">
              <button
                onClick={() => setHistorySubTab("overview")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  historySubTab === "overview" ? "bg-amber-500 text-neutral-950 font-black" : "bg-neutral-950 text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Overview & Stats
              </button>
              <button
                onClick={() => setHistorySubTab("bets")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  historySubTab === "bets" ? "bg-amber-500 text-neutral-950 font-black" : "bg-neutral-950 text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Betting History ({viewingHistoryUser.bets?.length || 0})
              </button>
              <button
                onClick={() => setHistorySubTab("transactions")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  historySubTab === "transactions" ? "bg-amber-500 text-neutral-950 font-black" : "bg-neutral-950 text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Transactions ({viewingHistoryUser.transactions?.length || 0})
              </button>
              <button
                onClick={() => setHistorySubTab("adminGrants")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  historySubTab === "adminGrants" ? "bg-emerald-500 text-neutral-950 font-black" : "bg-neutral-950 text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Admin Deposits ({viewingHistoryUser.adminGrants?.length || 0})
              </button>
              <button
                onClick={() => setHistorySubTab("activity")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  historySubTab === "activity" ? "bg-purple-500 text-white font-black" : "bg-neutral-950 text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Activity Log ({viewingHistoryUser.activityLogs?.length || 0})
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* SUBTAB 1: OVERVIEW */}
              {historySubTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-950 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-neutral-400 font-bold uppercase">Real Balance</div>
                      <div className="text-lg font-mono font-bold text-emerald-400">৳{Number(viewingHistoryUser.user?.balance || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-neutral-400 font-bold uppercase">Demo Balance</div>
                      <div className="text-lg font-mono font-bold text-neutral-300">৳{Number(viewingHistoryUser.user?.demoBalance || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-neutral-400 font-bold uppercase">Total Games Played</div>
                      <div className="text-lg font-mono font-bold text-amber-400">{viewingHistoryUser.user?.gamesPlayed || 0}</div>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] text-neutral-400 font-bold uppercase">Net Profit / Loss</div>
                      <div className={`text-lg font-mono font-bold ${
                        (viewingHistoryUser.user?.totalWon - viewingHistoryUser.user?.totalLost || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        ৳{(viewingHistoryUser.user?.totalWon - viewingHistoryUser.user?.totalLost || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-2">
                    <h4 className="font-bold text-white text-sm">Player Account Profile</h4>
                    <div className="grid grid-cols-2 gap-2 text-neutral-400">
                      <div>KYC Verification: <strong className="text-white">{viewingHistoryUser.user?.kycStatus || "none"}</strong></div>
                      <div>Account Status: <strong className="text-white">{viewingHistoryUser.user?.status || "ACTIVE"}</strong></div>
                      <div>Total Won: <strong className="text-emerald-400 font-mono">৳{viewingHistoryUser.user?.totalWon || 0}</strong></div>
                      <div>Total Lost: <strong className="text-red-400 font-mono">৳{viewingHistoryUser.user?.totalLost || 0}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: BETS */}
              {historySubTab === "bets" && (
                <div className="space-y-2">
                  {viewingHistoryUser.bets?.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No gameplay bet records found for this user.</div>
                  ) : (
                    <div className="space-y-2">
                      {viewingHistoryUser.bets.map((b: any, idx: number) => (
                        <div key={idx} className="p-3 bg-neutral-950 border border-white/5 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white">
                              {b.tableName || b.tableSlug?.toUpperCase()} • Round #{b.roundNumber}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              Side: <span className={b.side === "DRAGON" ? "text-red-400 font-bold" : "text-blue-400 font-bold"}>{b.side}</span> • Time: {new Date(b.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-white">৳{b.amount}</div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              b.status === "WON" ? "bg-emerald-500/20 text-emerald-400" : b.status === "LOST" ? "bg-red-500/20 text-red-400" : "bg-neutral-800 text-neutral-400"
                            }`}>
                              {b.status} {b.payout > 0 ? `(+৳${b.payout})` : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: TRANSACTIONS */}
              {historySubTab === "transactions" && (
                <div className="space-y-2">
                  {viewingHistoryUser.transactions?.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No transaction records.</div>
                  ) : (
                    <div className="space-y-2">
                      {viewingHistoryUser.transactions.map((tx: any, idx: number) => (
                        <div key={idx} className="p-3 bg-neutral-950 border border-white/5 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white">{tx.description || tx.type}</div>
                            <div className="text-[11px] text-neutral-400">{new Date(tx.timestamp).toLocaleString()}</div>
                          </div>
                          <div className="font-mono font-bold text-emerald-400">
                            ৳{tx.amount?.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: ADMIN DEPOSITS RECEIVED */}
              {historySubTab === "adminGrants" && (
                <div className="space-y-2">
                  {viewingHistoryUser.adminGrants?.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No admin deposit grants given to this user yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {viewingHistoryUser.adminGrants.map((g: AdminGrant) => (
                        <div key={g.id} className="p-3 bg-neutral-950 border border-white/5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                              📁 Tag Folder: {g.tag}
                            </span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">৳{g.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-white font-medium">
                            Cause / Reason: <span className="text-neutral-300">{g.reason}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-neutral-500 pt-1">
                            <span>Granted By: {g.adminUsername}</span>
                            <span>{new Date(g.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 5: ACTIVITY LOGS */}
              {historySubTab === "activity" && (
                <div className="space-y-2">
                  {viewingHistoryUser.activityLogs?.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">No activity logs recorded.</div>
                  ) : (
                    <div className="space-y-2">
                      {viewingHistoryUser.activityLogs.map((log: UserActivityLog) => (
                        <div key={log.id} className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between text-neutral-400">
                            <span className="font-bold text-amber-400">{log.action}</span>
                            <span className="font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-neutral-200">{log.details}</div>
                          {log.ipAddress && (
                            <div className="text-[10px] text-neutral-500 font-mono">IP: {log.ipAddress}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <button
                onClick={() => openGrantModalForUser(viewingHistoryUser.user?.userId)}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs"
              >
                + Grant Deposit To This User
              </button>
              <button
                onClick={() => setViewingHistoryUser(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700 text-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN REPORT MANAGEMENT MODAL */}
      {/* Custom Action Modal (Confirm/Prompt) */}
      <AnimatePresence>
        {modalAction.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">{modalAction.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{modalAction.message}</p>
              </div>

              {modalAction.showInput && (
                <div className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    defaultValue={modalAction.defaultValue}
                    placeholder={modalAction.inputPlaceholder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        modalAction.onConfirm((e.target as HTMLInputElement).value);
                      }
                      if (e.key === 'Escape') {
                        setModalAction((prev) => ({ ...prev, isOpen: false }));
                      }
                    }}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition-all"
                    id="admin-modal-input"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    if (modalAction.showInput) {
                      const input = document.getElementById('admin-modal-input') as HTMLInputElement;
                      modalAction.onConfirm(input.value);
                    } else {
                      modalAction.onConfirm();
                    }
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-2.5 rounded-xl text-sm transition-all"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setModalAction((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-2.5 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AdminReportManagementModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
        }}
        onUpdate={() => {
          fetchReports();
          fetchUsers();
        }}
      />

      {/* Admin Console Footer */}
      <footer className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 pb-6">
        <div className="flex items-center gap-2">
          <span>APEX God-Mode Administration Console</span>
          <span>·</span>
          <span>Authorized Personnel Only</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">System Healthy</span>
        </div>
      </footer>
    </div>
  );
};
