"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import GameLayout from "@/components/GameLayout";
import { gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { GangDetail, GangMember, GangOperationsData, TurfDistrict, GangTurfEntry } from "@/types";
import { Shield, Users, Crown, LogOut, Skull, ArrowLeft, Star, ChevronUp, ChevronDown, Plus, X, Check, Send, DollarSign, TrendingUp, Landmark, Map, Swords, Crosshair, Eye, Wrench, Trophy, Camera, Image as ImageIcon } from "lucide-react";

const ROLE_CONFIG: Record<string, { icon: typeof Crown; color: string; label: string }> = {
  leader: { icon: Crown, color: "text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.3)]", label: "Leader" },
  lieutenant: { icon: Star, color: "text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.3)]", label: "Lieutenant" },
  enforcer: { icon: Shield, color: "text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]", label: "Enforcer" },
  member: { icon: Users, color: "text-white/20", label: "Member" },
};

const ROLE_BADGE: Record<string, { color: string }> = {
  leader: { color: "text-yellow-500/80 bg-yellow-500/10" },
  lieutenant: { color: "text-purple-400/80 bg-purple-500/10" },
  enforcer: { color: "text-cyan-400/80 bg-cyan-500/10" },
  member: { color: "text-white/40 bg-white/5" },
};

const ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  enforcer: 1,
  lieutenant: 2,
  leader: 3,
};

export default function GangDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const [gang, setGang] = useState<GangDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [showInvites, setShowInvites] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [payAmount, setPayAmount] = useState<Record<number, string>>({});
  const [paying, setPaying] = useState<number | null>(null);
  const [levelingUp, setLevelingUp] = useState(false);
  const [opData, setOpData] = useState<GangOperationsData | null>(null);
  const [opLoading, setOpLoading] = useState(false);
  const [confirmOp, setConfirmOp] = useState<string | null>(null);
  const [opActionLoading, setOpActionLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [bannerSetting, setBannerSetting] = useState(false);
  const [customBannerUrl, setCustomBannerUrl] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [settingAccountant, setSettingAccountant] = useState(false);
  const [settingSalary, setSettingSalary] = useState<number | null>(null);
  const [salaryInput, setSalaryInput] = useState<Record<number, string>>({});
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [opNotif, setOpNotif] = useState<{ id: number; title: string; message: string; type: string; exiting?: boolean } | null>(null);
  const opNotifKey = useRef(0);
  const [expandedOp, setExpandedOp] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"operations" | "turf" | "arsenal" | "accountant" | "requests">("operations");

  // Turf state
  const [districts, setDistricts] = useState<(TurfDistrict & { owner: GangTurfEntry | null })[]>([]);
  const [turfVault, setTurfVault] = useState(0);
  const [turfLoading, setTurfLoading] = useState(false);
  const [turfActionLoading, setTurfActionLoading] = useState<string | null>(null);

  // Arsenal state
  const [arsenalData, setArsenalData] = useState<any>(null);
  const [arsenalLoading, setArsenalLoading] = useState(false);
  const [arsenalActionLoading, setArsenalActionLoading] = useState<string | null>(null);

  // Join requests state
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsActionLoading, setRequestsActionLoading] = useState<number | null>(null);

  const gangId = parseInt(params.id as string);

  useEffect(() => {
    loadGang();
    loadPendingInvites();
    loadOperations();
  }, [gangId]);

  // Auto-dismiss operation notification
  useEffect(() => {
    if (!opNotif) return;
    const t = setTimeout(() => setOpNotif((p) => p ? { ...p, exiting: true } : null), 4000);
    const t2 = setTimeout(() => setOpNotif(null), 4200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [opNotif?.id]);

  const loadGang = async () => {
    setError("");
    try {
      const data = await gangsApi.get(gangId);
      setGang(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const data = await gangsApi.gangInvites(gangId);
      setPendingInvites(data);
    } catch {}
  };

  const membership = gang?.members.find((m) => m.userId === user?.id);
  const isLeader = user?.gangId === gangId && user?.gangRole === "leader";
  const isLieutenant = user?.gangId === gangId && user?.gangRole === "lieutenant";
  const isEnforcer = user?.gangId === gangId && user?.gangRole === "enforcer";
  const canInviteMembers = isLeader || isLieutenant;
  const canManageVault = isLeader || isEnforcer;
  const isOwnGang = user?.gangId === gangId;

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await gangsApi.leave(gangId);
      await refreshUser();
      showNotif("Leave Gang", "Left the gang", "success");
      router.push("/gangs");
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      await gangsApi.kick(gangId, targetId);
      await refreshUser();
      showNotif("Kick", `${name} kicked from the gang`, "success");
      loadGang();
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handleTransfer = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      await gangsApi.transfer(gangId, targetId);
      await refreshUser();
      showNotif("Transfer", `Leadership transferred to ${name}`, "success");
      loadGang();
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handleDisband = async () => {
    setActionLoading(true);
    try {
      await gangsApi.disband(gangId);
      await refreshUser();
      showNotif("Disband", "Gang disbanded", "success");
      router.push("/gangs");
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

  const handlePromote = async (targetId: number, name: string) => {
    setActionLoading(true);
    try {
      const data = await gangsApi.promote(gangId, targetId);
      showNotif("Promotion", `${name} promoted to ${data.newRole}`, "success");
      loadGang();
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setActionLoading(false);
      setConfirming(null);
    }
  };

const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      // Search for the user first
      const results = await gangsApi.searchUsers(inviteUsername.trim());
      const target = results.find(
        (u: any) => u.username.toLowerCase() === inviteUsername.trim().toLowerCase()
      );
      if (!target) {
        showNotif("Invite", "User not found", "error");
        setInviting(false);
        return;
      }
      await gangsApi.invite(gangId, target.id);
      showNotif("Invite", `Invite sent to ${target.username}`, "success");
      setInviteUsername("");
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    try {
      await gangsApi.cancelInvite(gangId, inviteId);
      showNotif("Cancel Invite", "Invite cancelled", "success");
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    }
  };

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotif("Deposit", "Enter a valid amount", "error");
      return;
    }
    setDepositing(true);
    try {
      const result = await gangsApi.deposit(gangId, amount);
      await refreshUser();
      showNotif("Deposit", `Deposited $${result.amount.toLocaleString()} to gang vault`, "success");
      setGang((prev) => prev ? { ...prev, vault: result.vault } : prev);
      setDepositAmount("");
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotif("Withdraw", "Enter a valid amount", "error");
      return;
    }
    setWithdrawing(true);
    try {
      const result = await gangsApi.withdraw(gangId, amount);
      await refreshUser();
      showNotif("Withdraw", `Withdrew $${result.amount.toLocaleString()} from gang vault`, "success");
      setGang((prev) => prev ? { ...prev, vault: result.vault } : prev);
      setWithdrawAmount("");
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setWithdrawing(false);
    }
  };

  const handlePayMember = async (targetId: number, targetName: string) => {
    const amount = parseInt(payAmount[targetId] ?? "");
    if (isNaN(amount) || amount <= 0) {
      showNotif("Pay", "Enter a valid amount", "error");
      return;
    }
    setPaying(targetId);
    try {
      const result = await gangsApi.payMember(gangId, targetId, amount);
      await refreshUser();
      showNotif("Payment", `Paid $${result.amount.toLocaleString()} to ${result.targetUsername}`, "success");
      setGang((prev) => prev ? { ...prev, vault: result.vault } : prev);
      setPayAmount((prev) => ({ ...prev, [targetId]: "" }));
    } catch (err: any) {
      showNotif("Error", err.message, "error");
    } finally {
      setPaying(null);
    }
  };

  const handleLevelUp = async () => {
    setLevelingUp(true);
    try {
      const result = await gangsApi.levelUp(gangId);
      await refreshUser();
      showNotif("Level Up", `Gang reached level ${result.level}!`, "success");
      loadGang();
    } catch (err: any) {
      showNotif("Level Up", err.message || "Failed to level up", "error");
    } finally {
      setLevelingUp(false);
    }
  };

  const loadOperations = async () => {
    setOpLoading(true);
    try {
      const data = await gangsApi.operations(gangId);
      setOpData(data);
    } catch {}
    setOpLoading(false);
  };

  const handleStartOperation = async (opDefId: number, memberIds: number[]) => {
    setOpActionLoading(true);
    try {
      await gangsApi.startOperation(gangId, opDefId, memberIds);
      showNotif("Operation", "Operation started!", "success");
      loadGang();
      loadOperations();
      setSelectedMemberIds([]);
    } catch (err: any) {
      showNotif("Operation", err.message, "error");
    } finally {
      setOpActionLoading(false);
      setConfirmOp(null);
    }
  };

  const handleStopOperation = async (activeOperationId: number) => {
    setOpActionLoading(true);
    try {
      await gangsApi.stopOperation(gangId, activeOperationId);
      showNotif("Operation", "Operation stopped", "success");
      loadGang();
      loadOperations();
    } catch (err: any) {
      showNotif("Operation", err.message, "error");
    } finally {
      setOpActionLoading(false);
      setConfirmOp(null);
    }
  };

  const handleCollectPayout = async (activeOperationId: number) => {
    setOpActionLoading(true);
    try {
      const result = await gangsApi.collectPayout(gangId, activeOperationId);
      showNotif("Payout", `Collected $${result.collected.toLocaleString()} to gang vault!`, "success");
      setGang((prev) => prev ? { ...prev, vault: result.vault } : prev);
      loadOperations();
    } catch (err: any) {
      showNotif("Payout", err.message, "error");
    } finally {
      setOpActionLoading(false);
    }
  };

  const handleLevelUpOperation = async (activeOperationId: number) => {
    setOpActionLoading(true);
    try {
      const data = await gangsApi.levelUpOperation(gangId, activeOperationId);
      showNotif("Upgrade", `Operation upgraded to level ${data.level}!`, "success");
      loadGang();
      loadOperations();
    } catch (err: any) {
      showNotif("Upgrade Failed", err.message, "error");
    } finally {
      setOpActionLoading(false);
      setConfirmOp(null);
    }
  };

  const handleCompleteTask = async (activeOperationId: number) => {
    setOpActionLoading(true);
    try {
      await gangsApi.completeTask(gangId, activeOperationId);
      showNotif("Task", "Daily task completed!", "success");
      loadOperations();
    } catch (err: any) {
      showNotif("Task", err.message, "error");
    } finally {
      setOpActionLoading(false);
    }
  };

  // Turf handlers
  const loadTurf = async () => {
    if (!gangId) return;
    setTurfLoading(true);
    try {
      const data = await gangsApi.turf.list(gangId);
      setDistricts(data.districts);
      setTurfVault(data.vault);
    } catch (err: any) {
      showNotif("Turf", err.message || "Failed to load turf", "error");
    }
    setTurfLoading(false);
  };

  const handleClaim = async (districtId: number, name: string) => {
    if (!gangId) return;
    setTurfActionLoading(`claim-${districtId}`);
    try {
      await gangsApi.turf.claim(gangId, districtId);
      showNotif("Turf", `Claimed ${name}!`, "success");
      await refreshUser();
      loadTurf();
    } catch (err: any) {
      showNotif("Turf", err.message || "Failed to claim district", "error");
    }
    setTurfActionLoading(null);
  };

  const handleChallenge = async (districtId: number, name: string) => {
    if (!gangId) return;
    setTurfActionLoading(`challenge-${districtId}`);
    try {
      const result = await gangsApi.turf.challenge(gangId, districtId);
      showNotif("Turf", result.message || `Challenged for ${name}!`, "success");
      await refreshUser();
      loadTurf();
    } catch (err: any) {
      showNotif("Turf", err.message || "Failed to challenge", "error");
    }
    setTurfActionLoading(null);
  };

  const handleAbandon = async (districtId: number, name: string) => {
    if (!gangId) return;
    setTurfActionLoading(`abandon-${districtId}`);
    try {
      const result = await gangsApi.turf.abandon(gangId, districtId);
      showNotif("Turf", result.message || `Abandoned ${name}`, "success");
      await refreshUser();
      loadTurf();
    } catch (err: any) {
      showNotif("Turf", err.message || "Failed to abandon", "error");
    }
    setTurfActionLoading(null);
  };

  // Arsenal handlers
  const loadArsenal = async () => {
    if (!gangId) return;
    setArsenalLoading(true);
    try {
      const result = await gangsApi.arsenal.list(gangId);
      setArsenalData(result);
    } catch (err: any) {
      showNotif("Arsenal", err.message || "Failed to load arsenal", "error");
    }
    setArsenalLoading(false);
  };

  // Join requests handlers
  const loadRequests = async () => {
    if (!gangId) return;
    setRequestsLoading(true);
    try {
      const data = await gangsApi.requests.list(gangId);
      setRequests(data);
    } catch {}
    setRequestsLoading(false);
  };

  const handleAcceptRequest = async (userId: number) => {
    setRequestsActionLoading(userId);
    try {
      await gangsApi.requests.accept(gangId, userId);
      showNotif("Join Request", "Player joined the gang!", "success");
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
      loadGang();
    } catch (err: any) {
      showNotif("Join Request", err.message || "Failed to accept request", "error");
    } finally {
      setRequestsActionLoading(null);
    }
  };

  const handleDeclineRequest = async (userId: number) => {
    setRequestsActionLoading(userId);
    try {
      await gangsApi.requests.decline(gangId, userId);
      showNotif("Join Request", "Join request declined", "success");
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
    } catch (err: any) {
      showNotif("Join Request", err.message || "Failed to decline request", "error");
    } finally {
      setRequestsActionLoading(null);
    }
  };

  const handleBuy = async (name: string) => {
    if (!gangId) return;
    setArsenalActionLoading(`buy-${name}`);
    try {
      await gangsApi.arsenal.buy(gangId, name);
      showNotif("Arsenal", `Purchased ${name}!`, "success");
      await refreshUser();
      loadArsenal();
    } catch (err: any) {
      showNotif("Arsenal", err.message || "Failed to purchase", "error");
    }
    setArsenalActionLoading(null);
  };

  const handleAssignTurf = async (arsenalId: number, turfId: number) => {
    if (!gangId) return;
    setArsenalActionLoading(`assign-${arsenalId}`);
    try {
      await gangsApi.arsenal.assignTurf(gangId, arsenalId, turfId);
      showNotif("Arsenal", "Item assigned to turf!", "success");
      loadArsenal();
    } catch (err: any) {
      showNotif("Arsenal", err.message || "Failed to assign", "error");
    }
    setArsenalActionLoading(null);
  };

  const handleUnassignTurf = async (arsenalId: number) => {
    if (!gangId) return;
    setArsenalActionLoading(`unassign-${arsenalId}`);
    try {
      await gangsApi.arsenal.unassignTurf(gangId, arsenalId);
      showNotif("Arsenal", "Item unassigned from turf!", "success");
      loadArsenal();
    } catch (err: any) {
      showNotif("Arsenal", err.message || "Failed to unassign", "error");
    }
    setArsenalActionLoading(null);
  };

  const handleRepair = async (arsenalId: number) => {
    if (!gangId) return;
    setArsenalActionLoading(`repair-${arsenalId}`);
    try {
      await gangsApi.arsenal.repair(gangId, arsenalId);
      showNotif("Repair", "Item repaired!", "success");
      await refreshUser();
      loadArsenal();
    } catch (err: any) {
      showNotif("Repair", err.message || "Failed to repair", "error");
    }
    setArsenalActionLoading(null);
  };

  const TYPE_ICONS: Record<string, typeof Swords> = {
    melee: Swords,
    firearm: Crosshair,
    explosive: Eye,
    armor: Shield,
  };

  const TYPE_COLORS: Record<string, string> = {
    melee: "text-orange-400",
    firearm: "text-red-400",
    explosive: "text-yellow-400",
    armor: "text-cyan-400",
  };

  const getNextRole = (currentRole: string): string | null => {
    const rank = ROLE_HIERARCHY[currentRole];
    if (rank === 0) return "enforcer";
    if (rank === 1) return "lieutenant";
    return null;
  };

  const showNotif = (title: string, message: string, type: "success" | "error") => {
    opNotifKey.current++;
    setOpNotif({ id: opNotifKey.current, title, message, type });
  };

  /** Resize & compress an image file to a base64 data URL */
  function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else if (height > maxDim) {
            width = (width / height) * maxDim;
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const dataUrl = await compressImage(file, 1200, 0.85);
      await gangsApi.setBanner(gangId, dataUrl);
      setGang((prev) => prev ? { ...prev, bannerUrl: dataUrl } : prev);
      showNotif("Banner", "Banner updated!", "success");
      setShowBannerPicker(false);
    } catch (err: any) {
      showNotif("Banner", err?.message || "Failed to upload image", "error");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSetBannerUrl = async () => {
    if (!customBannerUrl.trim()) return;
    setBannerSetting(true);
    try {
      await gangsApi.setBanner(gangId, customBannerUrl.trim());
      setGang((prev) => prev ? { ...prev, bannerUrl: customBannerUrl.trim() } : prev);
      showNotif("Banner", "Banner updated!", "success");
      setShowBannerPicker(false);
      setCustomBannerUrl("");
    } catch (err: any) {
      showNotif("Banner", err.message, "error");
    } finally {
      setBannerSetting(false);
    }
  };

  const handleRemoveBanner = async () => {
    setBannerSetting(true);
    try {
      await gangsApi.setBanner(gangId, null);
      setGang((prev) => prev ? { ...prev, bannerUrl: null } : prev);
      showNotif("Banner", "Banner removed", "success");
      setShowBannerPicker(false);
    } catch (err: any) {
      showNotif("Banner", err.message, "error");
    } finally {
      setBannerSetting(false);
    }
  };

  const handleSetAccountant = async (hire: boolean) => {
    setSettingAccountant(true);
    try {
      await gangsApi.setAccountant(gangId, hire);
      showNotif("Accountant", hire ? "Accountant bot hired" : "Accountant bot fired", "success");
      loadGang();
    } catch (err: any) {
      showNotif("Accountant", err.message, "error");
    } finally {
      setSettingAccountant(false);
    }
  };

  const handleSetSalary = async (userId: number) => {
    const amount = parseInt(salaryInput[userId] ?? "0");
    if (isNaN(amount) || amount < 0) {
      showNotif("Salary", "Enter a valid amount", "error");
      return;
    }
    setSettingSalary(userId);
    try {
      await gangsApi.setSalary(gangId, userId, amount);
      const name = gang?.members.find((m) => m.userId === userId)?.username;
      showNotif("Salary", amount > 0 ? `${name} salary set to $${amount}/day` : `Salary removed for ${name}`, "success");
      loadGang();
      setSalaryInput((prev) => ({ ...prev, [userId]: "" }));
    } catch (err: any) {
      showNotif("Salary", err.message, "error");
    } finally {
      setSettingSalary(null);
    }
  };

  const hasAccountant = gang?.accountantId != null;

  return (
    <GameLayout>
      {/* Top notification overlay — portaled to body */}
      {opNotif && createPortal(
        <div
          className={`fixed top-0 left-0 right-0 z-[200] h-12 flex items-center justify-center gap-3 px-4 font-mono text-xs tracking-wider backdrop-blur-xl border-b ${
            opNotif.exiting ? "animate-slide-up-out" : "animate-slide-in"
          } ${
            opNotif.type === "error"
              ? "bg-red-500/8 text-red-300 border-red-500/15"
              : "bg-emerald-500/8 text-emerald-300 border-emerald-500/15"
          }`}
        >
          {opNotif.type === "error" ? (
            <Skull size={14} className="text-red-300" />
          ) : (
            <Trophy size={14} className="text-emerald-300" />
          )}
          <span className="font-semibold">{opNotif.title}</span>
          <span className="opacity-40 mx-0.5">—</span>
          <span className="opacity-70">{opNotif.message}</span>
        </div>,
        document.body
      )}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => router.push("/gangs")}
          className="flex items-center gap-1.5 text-xs font-mono text-white/30 hover:text-white/60 transition-colors mb-4"
        >
          <ArrowLeft size={12} /> Back to Gangs
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-400/30 border-t-pink-400" />
          </div>
        )}

        {/* Error / Not found */}
        {!loading && error && (
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-8 text-center">
            <Skull size={32} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm font-mono text-white/30">Gang not found</p>
            <p className="text-xs font-mono text-white/20 mt-1">{error}</p>
          </div>
        )}

        {/* Gang detail */}
        {!loading && !error && gang && (
          <>
            {/* Banner */}
            <div className="relative mb-4 rounded-sm overflow-hidden border border-white/5 reveal">
              {gang.bannerUrl ? (
                <div className="relative">
                  <img
                    src={gang.bannerUrl}
                    alt="Gang banner"
                    className="w-full h-32 md:h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="w-full h-24 md:h-32 bg-gradient-to-r from-purple-900/20 via-pink-900/10 to-cyan-900/20 flex items-center justify-center">
                  <Shield size={32} className="text-white/10" />
                </div>
              )}
              {isLeader && (
                <button
                  onClick={() => setShowBannerPicker(!showBannerPicker)}
                  className="absolute bottom-2 right-2 text-[10px] font-mono text-white/40 hover:text-white/70 bg-black/60 border border-white/10 rounded-sm px-2 py-1 transition-colors"
                >
                  {gang.bannerUrl ? "Change Banner" : "Set Banner"}
                </button>
              )}
            </div>

            {/* Banner picker — leader only */}
            {isLeader && showBannerPicker && (
              <div className="mb-4 rounded-sm border border-white/5 bg-bg-dark/80 p-4 animate-slide-in reveal">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider">Set Gang Banner</h2>
                  {gang.bannerUrl && (
                    <button
                      onClick={handleRemoveBanner}
                      disabled={bannerSetting}
                      className="text-[10px] font-mono text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      Remove Banner
                    </button>
                  )}
                </div>

                {/* Upload from file */}
                <div className="mb-4">
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Upload an image</p>
                  <button
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-pink-400/30 rounded-sm px-4 py-6 transition-all text-white/40 hover:text-pink-300"
                  >
                    {uploadingBanner ? (
                      <div className="animate-spin h-5 w-5 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                    ) : (
                      <><Camera size={18} /> Click to upload banner image</>
                    )}
                  </button>
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                </div>

                {/* Or paste URL */}
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">Or paste an image URL</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customBannerUrl}
                      onChange={(e) => setCustomBannerUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSetBannerUrl()}
                      placeholder="https://example.com/my-banner.jpg"
                      className="flex-1 bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all"
                    />
                    <button
                      onClick={handleSetBannerUrl}
                      disabled={bannerSetting || !customBannerUrl.trim()}
                      className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {bannerSetting ? "..." : "Set"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Shield size={20} className="text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg font-mono text-white/90 truncate">{gang.name}</h1>
                      <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-sm">
                        [{gang.tag}]
                      </span>
                    </div>
                    <p className="text-xs font-mono text-white/30 mt-0.5">
                      Level {gang.level} &middot; {gang.memberCount}/{gang.maxMembers} members
                    </p>
                    {gang.levelBenefits && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-cyan-400/60 bg-cyan-500/5 px-1.5 py-0.5 rounded-sm">
                          Vault ${(gang.levelBenefits.vaultCapacity ?? 100000).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono text-green-400/60 bg-green-500/5 px-1.5 py-0.5 rounded-sm">
                          +{gang.levelBenefits.crimeBonus ?? 0}% Crime
                        </span>
                        <span className="text-[10px] font-mono text-orange-400/60 bg-orange-500/5 px-1.5 py-0.5 rounded-sm">
                          +{gang.levelBenefits.pvpBonus ?? 0}% PvP
                        </span>
                        {gang.levelBenefits.tagColor !== "purple" && (
                          <span className="text-[10px] font-mono text-purple-400/60 bg-purple-500/5 px-1.5 py-0.5 rounded-sm">
                            Tag: {gang.levelBenefits.tagColor}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isOwnGang && membership && membership.role !== "leader" && (
                  <button
                    onClick={() => setConfirming("leave")}
                    disabled={actionLoading}
                    className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 hover:shadow-[0_0_8px_rgba(236,72,153,0.1)] flex items-center gap-1.5 shrink-0"
                  >
                    <LogOut size={12} /> {actionLoading && confirming === "leave" ? "Leaving..." : "Leave Gang"}
                  </button>
                )}
                {isOwnGang && isLeader && (
                  <button
                    onClick={() => setConfirming("disband")}
                    disabled={actionLoading}
                    className="font-mono tracking-wider text-xs uppercase text-red-400/70 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-sm px-3 py-1.5 transition-all duration-150 flex items-center gap-1.5 shrink-0"
                  >
                    <Skull size={12} /> {actionLoading && confirming === "disband" ? "Disbanding..." : "Disband Gang"}
                  </button>
                )}
              </div>
              {gang.description && (
                <p className="text-xs font-mono text-white/40 border-t border-white/5 pt-3 mt-1">
                  {gang.description}
                </p>
              )}
              {isOwnGang && (
                <div className="border-t border-white/5 mt-3 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark size={12} className="text-white/30" />
                    <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Vault</span>
                  </div>
                  <p className="font-mono text-sm text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.15)] mb-2">
                    ${gang.vault?.toLocaleString() ?? 0}
                  </p>
                  {/* Deposit - everyone */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDeposit()}
                      placeholder="Deposit amount..."
                      min={1}
                      className="flex-1 bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all"
                    />
                    <button
                      onClick={handleDeposit}
                      disabled={depositing || !depositAmount || parseInt(depositAmount) <= 0}
                      className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-2 transition-all duration-150 hover:shadow-[0_0_8px_rgba(236,72,153,0.1)] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {depositing ? (
                        <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                      ) : (
                        <DollarSign size={12} />
                      )}
                      Deposit
                    </button>
                  </div>
                  {/* Withdraw - leader/enforcer only */}
                  {canManageVault && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleWithdraw()}
                        placeholder="Withdraw amount..."
                        min={1}
                        max={gang.vault ?? 0}
                        className="flex-1 bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30 transition-all"
                      />
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawing || !withdrawAmount || parseInt(withdrawAmount) <= 0 || parseInt(withdrawAmount) > (gang.vault ?? 0)}
                        className="font-mono tracking-wider text-xs uppercase text-cyan-400/70 hover:text-cyan-300 border border-cyan-400/20 hover:border-cyan-400/40 rounded-sm px-3 py-2 transition-all duration-150 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {withdrawing ? (
                          <div className="animate-spin h-3 w-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full" />
                        ) : (
                          <DollarSign size={12} />
                        )}
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Accountant info */}
              {isOwnGang && hasAccountant && (
                <div className="border-t border-white/5 mt-3 pt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={12} className="text-emerald-400/60" />
                    <span className="text-xs font-mono text-emerald-400/60 uppercase tracking-wider">Accountant</span>
                  </div>
                  <p className="text-xs font-mono text-white/70">
                    Bot Accountant <span className="text-white/30">(takes 2% fee on all salary payouts)</span>
                  </p>
                </div>
              )}

              {/* Gang Reputation */}
              {gang.reputation !== undefined && (
                <div className="border-t border-white/5 mt-3 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={12} className="text-cyan-400/60" />
                    <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Gang Reputation</span>
                    {gang.reputation >= gang.reputationToNext && (
                      <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-sm border border-yellow-500/20 ml-auto">
                        Contract Required
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        gang.reputation >= gang.reputationToNext
                          ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                          : "bg-gradient-to-r from-cyan-500 to-blue-400"
                      }`}
                      style={{ width: `${Math.min(100, (gang.reputation / gang.reputationToNext) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs font-mono text-white/30">
                    {gang.reputation.toLocaleString()} / {gang.reputationToNext.toLocaleString()} GR
                    {gang.reputation < gang.reputationToNext && (
                      <span className="text-white/20 ml-1">
                        ({Math.floor((gang.reputation / gang.reputationToNext) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Active Contract */}
              {gang.contract && (
                <div className={`border-t border-white/5 mt-3 pt-3 ${gang.contract.completed ? "" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Active Contract</span>
                      {!gang.contract.completed && (
                        <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-sm border border-yellow-500/20">
                          {(() => {
                            const msLeft = new Date(gang.contract.deadline).getTime() - Date.now();
                            const daysLeft = Math.ceil(msLeft / 86400000);
                            return daysLeft <= 1 ? "DUE SOON" : `${daysLeft} DAYS LEFT`;
                          })()}
                        </span>
                      )}
                      {gang.contract.completed && (
                        <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-sm border border-green-500/20">
                          COMPLETED
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-mono text-white/60 mb-2">
                    {gang.contract.type === "earn_cash" && `Earn $${gang.contract.target.toLocaleString()} from crimes`}
                    {gang.contract.type === "pvp_wins" && `Win ${gang.contract.target} PvP battles`}
                    {gang.contract.type === "vault_deposits" && `Deposit $${gang.contract.target.toLocaleString()} to the gang vault`}
                    {gang.contract.type === "crimes" && `Commit ${gang.contract.target} crimes`}
                  </p>
                  <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        gang.contract.completed
                          ? "bg-gradient-to-r from-green-500 to-emerald-400"
                          : "bg-gradient-to-r from-yellow-500 to-orange-400"
                      }`}
                      style={{ width: `${Math.min(100, (gang.contract.progress / gang.contract.target) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs font-mono text-white/30 mb-2">
                    {gang.contract.type === "earn_cash" && `$${gang.contract.progress.toLocaleString()} / $${gang.contract.target.toLocaleString()}`}
                    {gang.contract.type === "pvp_wins" && `${gang.contract.progress} / ${gang.contract.target} wins`}
                    {gang.contract.type === "vault_deposits" && `$${gang.contract.progress.toLocaleString()} / $${gang.contract.target.toLocaleString()}`}
                    {gang.contract.type === "crimes" && `${gang.contract.progress} / ${gang.contract.target} crimes`}
                  </p>

                  {/* Contributors */}
                  {gang.contract.contributors.length > 0 && (
                    <div className="space-y-0.5 mb-2 max-h-24 overflow-y-auto">
                      <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-1">Contributors</p>
                      {gang.contract.contributors.map((c: any) => (
                        <div key={c.userId} className="flex items-center justify-between text-[10px] font-mono text-white/40">
                          <span>{c.username}{c.userId === user?.id ? " (you)" : ""}</span>
                          <span className="text-green-400/60">
                            {gang.contract!.type === "earn_cash" || gang.contract!.type === "vault_deposits"
                              ? `+$${c.contribution.toLocaleString()}`
                              : `+${c.contribution}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Level Up button — leader only, contract must be completed */}
                  {isLeader && gang.contract.completed && gang.reputation >= gang.reputationToNext && (
                    <button
                      onClick={handleLevelUp}
                      disabled={levelingUp}
                      className="w-full font-mono text-xs uppercase text-green-400/80 hover:text-green-300 border border-green-400/30 hover:border-green-400/50 rounded-sm px-3 py-2 transition-all bg-green-500/5 flex items-center justify-center gap-2"
                    >
                      {levelingUp ? (
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full" />
                      ) : (
                        <>
                          <Trophy size={13} /> Level Up to {gang.level + 1}!
                        </>
                      )}
                    </button>
                  )}
                  {isLeader && !gang.contract.completed && (
                    <p className="text-[10px] font-mono text-yellow-400/60 text-center">
                      Complete the contract to unlock level {gang.level + 1}
                    </p>
                  )}
                </div>
              )}

              {/* At threshold but no contract generated yet */}
              {gang.reputation >= gang.reputationToNext && !gang.contract && (
                <div className="border-t border-white/5 mt-3 pt-3">
                  <p className="text-xs font-mono text-yellow-400/60 text-center">
                    Preparing contract... refresh to generate.
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation dialogs */}
            {confirming === "leave" && (
              <div className="mb-4 rounded-sm border border-pink-500/20 bg-pink-500/5 p-3 flex items-center justify-between animate-slide-in">
                <p className="text-xs font-mono text-pink-300">Are you sure you want to leave this gang?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(null)} className="text-xs font-mono text-white/40 hover:text-white/70 px-2 py-1">Cancel</button>
                  <button onClick={handleLeave} className="text-xs font-mono text-pink-400 hover:text-pink-300 px-2 py-1">Confirm</button>
                </div>
              </div>
            )}

            {confirming === "disband" && (
              <div className="mb-4 rounded-sm border border-red-500/20 bg-red-500/5 p-3 flex items-center justify-between animate-slide-in">
                <p className="text-xs font-mono text-red-300">Permanently disband the gang? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(null)} className="text-xs font-mono text-white/40 hover:text-white/70 px-2 py-1">Cancel</button>
                  <button onClick={handleDisband} className="text-xs font-mono text-red-400 hover:text-red-300 px-2 py-1">Confirm</button>
                </div>
              </div>
            )}

            {/* Invite section — leader/lieutenant only */}
            {canInviteMembers && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal reveal-delay-1">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Send size={12} /> Invite Player
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    placeholder="Enter username..."
                    className="flex-1 bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 transition-all"
                    maxLength={20}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteUsername.trim()}
                    className="font-mono tracking-wider text-xs uppercase text-pink-400/70 hover:text-pink-300 border border-pink-400/20 hover:border-pink-400/40 rounded-sm px-3 py-2 transition-all duration-150 hover:shadow-[0_0_8px_rgba(236,72,153,0.1)] flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {inviting ? (
                      <div className="animate-spin h-3 w-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                    ) : (
                      <Send size={12} />
                    )}
                    Invite
                  </button>
                </div>
              </div>
            )}

            {/* Pending invites — leader/lieutenant only */}
            {canInviteMembers && pendingInvites.length > 0 && (
              <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal reveal-delay-1">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Send size={12} /> Pending Invites ({pendingInvites.length})
                </h2>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between bg-black/20 rounded-sm px-3 py-2 border border-white/5">
                      <div>
                        <p className="font-mono text-xs text-white/80">{invite.username}</p>
                        <p className="text-[10px] font-mono text-white/30">Invited {new Date(invite.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-[10px] font-mono text-red-400/60 hover:text-red-400 px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member list */}
            <div className="rounded-sm border border-white/5 bg-bg-dark/80 reveal reveal-delay-2">
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2">
                  <Users size={12} /> Members ({gang.memberCount})
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3">
                {gang.members.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                  const RoleIcon = roleConfig.icon;
                  const badgeConfig = ROLE_BADGE[member.role] || ROLE_BADGE.member;
                  const currentRank = ROLE_HIERARCHY[member.role];
                  const nextRole = getNextRole(member.role);
                  const isMemberLeader = member.role === "leader";

                  return (
                    <div key={member.userId} className="bg-black/20 rounded-sm border border-white/5 p-2 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <RoleIcon size={12} className={`${roleConfig.color} shrink-0`} />
                        <span className="font-mono text-xs text-white/80 truncate">{member.username}</span>
                        {member.userId === user?.id && (
                          <span className="text-[10px] font-mono text-white/20 shrink-0">(you)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-mono ${badgeConfig.color} px-1.5 py-0.5 rounded-sm`}>
                          {roleConfig.label}
                        </span>
                        <span className="text-xs font-mono text-white/25">Lv.{member.level}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-white/20">
                        <span className="flex items-center gap-0.5"><DollarSign size={9} />{member.netWorth?.toLocaleString() ?? 0}</span>
                        <span className="flex items-center gap-0.5"><TrendingUp size={9} />{member.respect ?? 0}</span>
                        {(member.salary ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-emerald-400/60"><DollarSign size={9} />{member.salary}/d</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pt-1 border-t border-white/5 min-h-[20px]">
                        {isLeader && !isMemberLeader && member.userId !== user?.id && (
                          <>
                            {confirming === `kick-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleKick(member.userId, member.username)} disabled={actionLoading} className="text-[10px] font-mono text-pink-400">Confirm</button>
                                <button onClick={() => setConfirming(null)} className="text-[10px] font-mono text-white/30">No</button>
                              </div>
                            ) : confirming === `transfer-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleTransfer(member.userId, member.username)} disabled={actionLoading} className="text-[10px] font-mono text-yellow-400">Confirm</button>
                                <button onClick={() => setConfirming(null)} className="text-[10px] font-mono text-white/30">No</button>
                              </div>
                            ) : confirming === `promote-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button onClick={() => handlePromote(member.userId, member.username)} disabled={actionLoading} className="text-[10px] font-mono text-green-400">Confirm</button>
                                <button onClick={() => setConfirming(null)} className="text-[10px] font-mono text-white/30">No</button>
                              </div>
                            ) : (
                              <>
                                {nextRole && <button onClick={() => setConfirming(`promote-${member.userId}`)} className="text-[10px] font-mono text-green-500/50 hover:text-green-400" title={`Promote to ${nextRole}`}><ChevronUp size={10} /></button>}
<button onClick={() => setConfirming(`transfer-${member.userId}`)} className="text-[10px] font-mono text-yellow-500/50 hover:text-yellow-400" title="Transfer"><Crown size={10} /></button>
                                <button onClick={() => setConfirming(`kick-${member.userId}`)} className="text-[10px] font-mono text-red-400/50 hover:text-red-400" title="Kick"><LogOut size={10} /></button>
                              </>
                            )}
                          </>
                        )}
                        {isLieutenant && currentRank === 0 && member.userId !== user?.id && (
                          <>
                            {confirming === `kick-${member.userId}` ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleKick(member.userId, member.username)} disabled={actionLoading} className="text-[10px] font-mono text-pink-400">Confirm</button>
                                <button onClick={() => setConfirming(null)} className="text-[10px] font-mono text-white/30">No</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirming(`kick-${member.userId}`)} className="text-[10px] font-mono text-red-400/50 hover:text-red-400" title="Kick"><LogOut size={10} /></button>
                            )}
                          </>
                        )}
                        {/* Salary set — leader only */}
                        {isLeader && member.userId !== user?.id && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={salaryInput[member.userId] ?? (member.salary ?? 0).toString()}
                              onChange={(e) => setSalaryInput((prev) => ({ ...prev, [member.userId]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && handleSetSalary(member.userId)}
                              placeholder="$"
                              min={0}
                              max={1000000}
                              className="w-14 bg-black/30 border border-white/5 rounded-sm px-1.5 py-0.5 text-[10px] font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/30 transition-all text-right"
                            />
                            <button
                              onClick={() => handleSetSalary(member.userId)}
                              disabled={settingSalary === member.userId}
                              className="text-[10px] font-mono text-emerald-400/60 hover:text-emerald-300 transition-colors disabled:opacity-30"
                            >
                              {settingSalary === member.userId ? "..." : "Sal"}
                            </button>
                          </div>
                        )}
                        {/* Pay member — leader/enforcer only */}
                        {canManageVault && member.userId !== user?.id && (
                          <div className="flex items-center gap-1 ml-auto">
                            <input
                              type="number"
                              value={payAmount[member.userId] ?? ""}
                              onChange={(e) => setPayAmount((prev) => ({ ...prev, [member.userId]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && handlePayMember(member.userId, member.username)}
                              placeholder="Pay $"
                              min={1}
                              max={gang?.vault ?? 0}
                              className="w-14 bg-black/30 border border-white/5 rounded-sm px-1.5 py-0.5 text-[10px] font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30 transition-all text-right"
                            />
                            <button
                              onClick={() => handlePayMember(member.userId, member.username)}
                              disabled={paying === member.userId || !payAmount[member.userId] || parseInt(payAmount[member.userId] ?? "0") <= 0}
                              className="text-[10px] font-mono text-cyan-400/60 hover:text-cyan-300 transition-colors disabled:opacity-30"
                            >
                              {paying === member.userId ? "..." : "Pay"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab Bar + Content */}
            {isOwnGang && (
              <>
                <div className="flex gap-0 border-b border-white/5 mb-4 reveal">
                  <button
                    onClick={() => setActiveTab("operations")}
                    className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all ${
                      activeTab === "operations"
                        ? "text-pink-400 border-b-2 border-pink-400"
                        : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
                    }`}
                  >
                    Operations
                  </button>
                  <button
                    onClick={() => { setActiveTab("turf"); if (districts.length === 0) loadTurf(); }}
                    className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeTab === "turf"
                        ? "text-pink-400 border-b-2 border-pink-400"
                        : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
                    }`}
                  >
                    <Map size={12} /> Turf
                  </button>
                  <button
                    onClick={() => { setActiveTab("arsenal"); if (!arsenalData) loadArsenal(); }}
                    className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeTab === "arsenal"
                        ? "text-pink-400 border-b-2 border-pink-400"
                        : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
                    }`}
                  >
                    <Swords size={12} /> Arsenal
                  </button>
                  <button
                    onClick={() => setActiveTab("accountant")}
                    className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeTab === "accountant"
                        ? "text-pink-400 border-b-2 border-pink-400"
                        : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
                    }`}
                  >
                    <DollarSign size={12} /> Accountant
                  </button>
                  {(isLeader || isLieutenant) && (
                    <button
                      onClick={() => { setActiveTab("requests"); if (requests.length === 0) loadRequests(); }}
                      className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        activeTab === "requests"
                          ? "text-pink-400 border-b-2 border-pink-400"
                          : "text-white/30 hover:text-white/60 border-b-2 border-transparent"
                      }`}
                    >
                      <Send size={12} /> Requests
                      {gang && (gang.pendingRequestCount ?? 0) > 0 && (
                        <span className="bg-pink-500/20 text-pink-300 text-[9px] font-mono px-1.5 py-0.5 rounded-sm">
                          {gang.pendingRequestCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {activeTab === "operations" && (
                  <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4 reveal reveal-delay-1">
                <h2 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <DollarSign size={12} /> Operations
                </h2>

                {opLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin h-5 w-5 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                  </div>
                ) : (
                  <>
                    {/* Active Operations */}
                    {opData?.activeOperations && opData.activeOperations.length > 0 ? (
                      opData.activeOperations.map((op: any) => {
                        const opUpgradeCost = op.upgradeCost ?? 0;
                        const canAffordOpUpgrade = opUpgradeCost > 0 && (gang?.vault ?? 0) >= opUpgradeCost;
                        return (
                          <div key={op.id} className="bg-black/20 rounded-sm p-3 mb-3 border border-green-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-mono text-sm text-green-400">{op.name} (Lv.{op.level})</p>
                                <p className="text-xs font-mono text-white/35">Started {new Date(op.startedAt).toLocaleDateString()}</p>
                              </div>
                              <span className="text-sm font-mono text-cyan-300">${op.currentIncome}/member/day</span>
                            </div>

                            {/* Requirements & Daily task */}
                            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-sm p-2 mb-2 text-xs font-mono space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-white/40">Requires:</span>
                                {op.requirements?.map((r: any) => (
                                  <span key={r.sortOrder} className={r.satisfied ? "text-green-400/80" : "text-orange-400/80"}>
                                    {r.skillName} Lv.{r.minLevel}{r.satisfied ? " ✅" : " ❌"}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white/40">Daily task:</span>
                                <span className="text-yellow-300/80">{op.dailyTaskDescription}</span>
                              </div>
                            </div>

                            {/* Daily progress */}
                            <div className="mb-2">
                              <div className="flex justify-between text-xs font-mono text-white/35 mb-1">
                                <span>Daily: {op.dailyProgress.completed}/{op.dailyProgress.total}</span>
                                <span>${op.totalDailyIncome}/day</span>
                              </div>
                              <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                                {(() => {
                                  const pct = op.dailyProgress.total > 0
                                    ? (op.dailyProgress.completed / op.dailyProgress.total) * 100
                                    : 0;
                                  const barColor = pct >= 80 ? "from-green-500 to-cyan-400"
                                    : pct >= 40 ? "from-yellow-500 to-orange-400"
                                    : "from-red-500 to-red-400";
                                  return (
                                    <div
                                      className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Assigned Members */}
                            <div className="space-y-0.5 mb-3 max-h-28 overflow-y-auto">
                              <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-1">Assigned Members</p>
                              {op.assignedMembers?.length > 0 ? (
                                op.assignedMembers.map((m: any) => (
                                  <div key={m.userId} className="flex items-center justify-between text-xs font-mono">
                                    <span className={m.completed ? "text-green-400" : "text-white/70"}>{m.username}</span>
                                    <span className={m.completed ? "text-green-400" : "text-yellow-400/60"}>
                                      {m.completed ? "Done" : "Pending"}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs font-mono text-white/30">No members assigned</p>
                              )}
                            </div>

                            {/* My task CTA */}
                            {(() => {
                              const myStatus = op.assignedMembers?.find((m: any) => m.userId === user?.id);
                              if (myStatus && !myStatus.completed) {
                                return (
                                  <button
                                    onClick={() => handleCompleteTask(op.id)}
                                    disabled={opActionLoading}
                                    className="w-full font-mono text-xs uppercase text-pink-400/70 border border-pink-400/20 rounded-sm px-3 py-1.5 hover:border-pink-400/40 transition-all mb-2"
                                  >
                                    {opActionLoading ? "Verifying..." : `Complete Task: ${op.dailyTaskDescription}`}
                                  </button>
                                );
                              }
                              if (myStatus?.completed) {
                                return <p className="text-xs font-mono text-green-400/60 mb-2">Daily task completed today!</p>;
                              }
                              return null;
                            })()}

                            {/* Collect payout button */}
                            {op.pendingPayout > 0 && (
                              <button
                                onClick={() => handleCollectPayout(op.id)}
                                disabled={opActionLoading}
                                className="w-full font-mono text-xs uppercase text-cyan-300 border border-cyan-400/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400/50 rounded-sm px-3 py-2 transition-all flex items-center justify-center gap-2 disabled:opacity-40 mb-2"
                              >
                                {opActionLoading ? (
                                  <div className="animate-spin h-3.5 w-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full" />
                                ) : (
                                  <><DollarSign size={13} /> Collect ${op.pendingPayout.toLocaleString()} to Vault</>
                                )}
                              </button>
                            )}

                            {/* Payout history */}
                            {opData.payoutHistory && opData.payoutHistory.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-1">Recent Payouts</p>
                                <div className="space-y-0.5">
                                  {opData.payoutHistory.slice(0, 3).map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between text-[10px] font-mono text-white/30">
                                      <span>Lv.{p.level} &middot; {p.eligibleMemberCount} members &middot; {new Date(p.paidAt).toLocaleDateString()}</span>
                                      <span className="text-green-400/60">+${p.totalPayout.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Leader controls */}
                            {isLeader && (
                              <div className="flex gap-2 mt-3 border-t border-white/5 pt-3">
                                {confirmOp === `stop-${op.id}` ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => setConfirmOp(null)} className="text-xs font-mono text-white/40 px-2 py-1">Cancel</button>
                                    <button onClick={() => handleStopOperation(op.id)} className="text-xs font-mono text-red-400 px-2 py-1">Confirm Stop</button>
                                  </div>
                                ) : confirmOp === `levelup-${op.id}` ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => setConfirmOp(null)} className="text-xs font-mono text-white/40 px-2 py-1">Cancel</button>
                                    <button onClick={() => handleLevelUpOperation(op.id)} disabled={!canAffordOpUpgrade} className={`text-xs font-mono px-2 py-1 ${canAffordOpUpgrade ? "text-green-400" : "text-red-400"}`}>Confirm Upgrade (${opUpgradeCost?.toLocaleString()})</button>
                                  </div>
                                ) : (
                                  <>
                                    <button onClick={() => setConfirmOp(`stop-${op.id}`)} className="font-mono text-xs uppercase text-red-400/60 border border-red-400/20 rounded-sm px-2 py-1">Stop</button>
                                    {op.level < 3 && (
                                      <button onClick={() => setConfirmOp(`levelup-${op.id}`)} className={`font-mono text-xs uppercase rounded-sm px-2 py-1 border ${canAffordOpUpgrade ? "text-green-400/60 border-green-400/20" : "text-red-400/60 border-red-400/20"}`}>
                                        Level Up — ${opUpgradeCost?.toLocaleString()}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs font-mono text-white/30 mb-3">No active operations. {isLeader ? "Select one below to start." : "Ask the leader to start one."}</p>
                    )}

                    {/* Operation catalog */}
                    <div className="space-y-2">
                      {opData?.catalog.map((entry: any) => {
                        const def = entry.def;
                        return (
                          <div key={def.id} className={`bg-black/20 rounded-sm p-3 border ${entry.isActive ? "border-green-500/20" : "border-white/5"}`}>
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-sm text-white/90">{def.name}</p>
                                <p className="text-xs font-mono text-white/40 leading-relaxed">{def.description}</p>
                              </div>
                              <div className="text-right text-sm font-mono shrink-0">
                                <p className="text-cyan-300 font-semibold">${def.incomePerMemberL1}/d</p>
                                <p className="text-white/30 text-xs">{entry.eligibleMemberCount} eligible</p>
                              </div>
                            </div>

                            {/* Your Status — personal eligibility */}
                            <div className="bg-black/30 rounded-sm p-2 mb-2 border border-white/5">
                              <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-0.5">Your Status</p>
                              {(() => {
                                const myEntry = entry.memberEligibility?.find((m: any) => m.userId === user?.id);
                                return (
                                  <div className="space-y-0.5">
                                    {def.requirements?.map((r: any) => {
                                      const meets = myEntry?.satisfiedReqs?.includes(r.sortOrder);
                                      return (
                                        <div key={r.sortOrder} className="flex items-center gap-1.5 text-xs font-mono">
                                          <span className={meets ? "text-green-400" : "text-white/40"}>{r.skillName}</span>
                                          <span className={meets ? "text-green-400/80" : "text-yellow-400/60"}>Lv.{r.minLevel}</span>
                                          <span className="text-white/20">(yours: {r.userLevel ?? 0})</span>
                                          <span>{meets ? " ✅" : " ❌"}</span>
                                        </div>
                                      );
                                    })}
                                    <p className={`text-xs font-mono mt-0.5 ${myEntry?.isEligible ? "text-green-400" : "text-yellow-400"}`}>
                                      {(() => {
                                        if (!myEntry?.isEligible) return "Meet at least 1 requirement to qualify";
                                        if (entry.allRequirementsSatisfied) return "You qualify!";
                                        const missing = def.requirements?.filter((r: any) => !r.satisfied) ?? [];
                                        const names = missing.map((r: any) => `${r.skillName} Lv.${r.minLevel}`).join(", ");
                                        return `You qualify! Need a member with ${names} to start.`;
                                      })()}
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Daily Task */}
                            <div className="mb-2">
                              <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-0.5">Daily Task</p>
                              <p className="text-sm font-mono text-yellow-300/90">{def.dailyTaskDescription}</p>
                              <p className="text-xs font-mono text-white/30 mt-0.5">
                                {def.dailyTaskType === "pvp_win" ? "→ Fight another player on the Fight page and win." :
                                 def.dailyTaskType === "crime" ? "→ Commit any crime on the Crimes page." :
                                 def.dailyTaskType === "train_skill" ? "→ Train any required skill on the Skills page." :
                                 "→ Deposit cash to the gang vault (above). This is auto-tracked."}
                              </p>
                            </div>

                            {/* Member eligibility — leader can see who needs what */}
                            {isLeader && (
                              <div className="mb-2">
                                <button
                                  onClick={() => setExpandedOp(expandedOp === def.id ? null : def.id)}
                                  className="flex items-center gap-1.5 text-xs font-mono text-white/40 hover:text-white/60 transition-colors"
                                >
                                  {expandedOp === def.id ? "▾" : "▸"} Member eligibility ({entry.eligibleMemberCount}/{entry.memberEligibility?.length ?? 0})
                                </button>
                                {expandedOp === def.id && entry.memberEligibility && (
                                  <div className="mt-1 bg-black/30 rounded-sm p-2 border border-white/5 space-y-1 max-h-40 overflow-y-auto">
                                    {entry.memberEligibility.map((em: any) => (
                                      <div key={em.userId} className="flex items-center justify-between text-xs font-mono">
                                        <span className={em.isEligible ? "text-green-400/80" : "text-white/50"}>
                                          {em.username} {em.userId === user?.id && "(you)"}
                                        </span>
                                        <span className={em.isEligible ? "text-green-400/60" : "text-yellow-400/60"}>
                                          {em.isEligible
                                            ? `${em.satisfiedReqs.length} req(s) ✅`
                                            : `${em.skillLevel} max lv`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Upgrade Path — compact */}
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs font-mono text-white/30 mb-2">
                              <span>L2: ${def.incomePerMemberL2}/d (${def.upgradeCostL1toL2?.toLocaleString()} to upgrade)</span>
                              <span>L3: ${def.incomePerMemberL3}/d (${def.upgradeCostL2toL3?.toLocaleString()} to upgrade)</span>
                            </div>

                            {/* Action */}
                            {isLeader && !entry.isActive && (
                              confirmOp === `start-${def.id}` ? (
                                <div className="mt-2">
                                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-1.5">Select members to assign:</p>
                                  <div className="max-h-32 overflow-y-auto space-y-1 mb-2 bg-black/30 rounded-sm p-2 border border-white/5">
                                    {entry.memberEligibility
                                      .filter((em: any) => em.isEligible && !em.isAssigned)
                                      .map((em: any) => (
                                        <label key={em.userId} className="flex items-center gap-2 text-xs font-mono cursor-pointer hover:text-white/80 transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={selectedMemberIds.includes(em.userId)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedMemberIds((prev) => [...prev, em.userId]);
                                              } else {
                                                setSelectedMemberIds((prev) => prev.filter((id) => id !== em.userId));
                                              }
                                            }}
                                            className="accent-pink-400"
                                          />
                                          <span className="text-white/70">{em.username}</span>
                                          <span className="text-white/30">({em.satisfiedReqs.length} req(s))</span>
                                        </label>
                                      ))}
                                    {entry.memberEligibility.filter((em: any) => em.isEligible && !em.isAssigned).length === 0 && (
                                      <p className="text-xs font-mono text-yellow-400/60">No eligible unassigned members available</p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => { setConfirmOp(null); setSelectedMemberIds([]); }} className="text-xs font-mono text-white/40">Cancel</button>
                                    <button
                                      onClick={() => handleStartOperation(def.id, selectedMemberIds)}
                                      disabled={opActionLoading || selectedMemberIds.length === 0}
                                      className="text-xs font-mono text-green-400 disabled:opacity-40"
                                    >
                                      {opActionLoading ? "..." : `Confirm Start (${selectedMemberIds.length} member${selectedMemberIds.length !== 1 ? "s" : ""})`}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setConfirmOp(`start-${def.id}`); setSelectedMemberIds([]); }}
                                  disabled={false}
                                  className={`mt-2 font-mono text-xs uppercase rounded-sm px-2 py-1 transition-all ${
                                    entry.allRequirementsSatisfied
                                      ? "text-pink-400/50 border border-pink-400/20 hover:border-pink-400/40"
                                      : "text-orange-400/50 border border-orange-400/20 hover:border-orange-400/40"
                                  }`}
                                >
                                  {entry.allRequirementsSatisfied ? "Start Operation" : "Start (requirements not met)"}
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
                )}

                {/* Turf tab */}
                {activeTab === "turf" && (
                  <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Map size={20} className="text-purple-400" />
                      <div>
                        <h2 className="text-lg font-mono text-white/90">Turf</h2>
                        <p className="text-xs font-mono text-white/30">Claim districts for your gang</p>
                      </div>
                    </div>

                    {turfLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-6 w-6 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {districts.map((district) => {
                          const owned = district.owner && gangId && district.owner.gangId === gangId;
                          const otherOwned = district.owner && !owned;

                          return (
                            <div
                              key={district.id}
                              className={`rounded-sm border p-4 ${
                                owned ? "border-green-500/30 bg-green-500/5" :
                                otherOwned ? "border-red-500/20 bg-red-500/5" :
                                "border-white/5 bg-black/20"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-mono text-sm text-white/90">{district.name}</h3>
                                  <p className="text-xs font-mono text-white/40 leading-relaxed">{district.description}</p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  {district.owner ? (
                                    <div className="flex items-center gap-1 text-xs font-mono">
                                      <Crown size={10} className={owned ? "text-green-400" : "text-red-400"} />
                                      <span className={owned ? "text-green-400" : "text-red-400"}>
                                        [{district.owner.gangTag}]
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-mono text-white/25">Unowned</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3 mb-3 text-[10px] font-mono">
                                {district.crimeBonus > 0 && (
                                  <span className="text-green-400/70">+{district.crimeBonus}% Crime</span>
                                )}
                                {district.pvpBonus > 0 && (
                                  <span className="text-orange-400/70">+{district.pvpBonus}% PvP</span>
                                )}
                                {district.incomeBonus > 0 && (
                                  <span className="text-cyan-400/70">+{district.incomeBonus}% Income</span>
                                )}
                                {owned && (district as any).owner?.defensePower > 0 && (
                                  <span className="text-amber-400/70">
                                    Defense: <span className="text-amber-300">+{(district as any).owner.defensePower}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {!district.owner && (
                                  <button
                                    onClick={() => handleClaim(district.id, district.name)}
                                    disabled={turfActionLoading?.startsWith("claim")}
                                    className="font-mono text-xs uppercase text-green-400/70 border border-green-400/20 rounded-sm px-3 py-1.5 hover:border-green-400/40 transition-all disabled:opacity-30"
                                  >
                                    {turfActionLoading === `claim-${district.id}` ? (
                                      <div className="animate-spin h-3 w-3 border-2 border-green-400/30 border-t-green-400 rounded-full" />
                                    ) : (
                                      `Claim $${district.claimCost.toLocaleString()}`
                                    )}
                                  </button>
                                )}

                                {otherOwned && (
                                  <button
                                    onClick={() => handleChallenge(district.id, district.name)}
                                    disabled={turfActionLoading?.startsWith("challenge")}
                                    className="font-mono text-xs uppercase text-orange-400/70 border border-orange-400/20 rounded-sm px-3 py-1.5 hover:border-orange-400/40 transition-all disabled:opacity-30"
                                  >
                                    {turfActionLoading === `challenge-${district.id}` ? (
                                      <div className="animate-spin h-3 w-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full" />
                                    ) : (
                                      "Challenge"
                                    )}
                                  </button>
                                )}

                                {owned && (
                                  <button
                                    onClick={() => handleAbandon(district.id, district.name)}
                                    disabled={turfActionLoading?.startsWith("abandon")}
                                    className="font-mono text-xs uppercase text-red-400/60 border border-red-400/20 rounded-sm px-3 py-1.5 hover:border-red-400/40 transition-all disabled:opacity-30"
                                  >
                                    {turfActionLoading === `abandon-${district.id}` ? (
                                      <div className="animate-spin h-3 w-3 border-2 border-red-400/30 border-t-red-400 rounded-full" />
                                    ) : (
                                      "Abandon"
                                    )}
                                  </button>
                                )}

                                {otherOwned && district.owner?.challengedBy && (
                                  <span className="text-[10px] font-mono text-yellow-400/60">Under challenge</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!turfLoading && districts.length === 0 && (
                      <div className="text-center py-8">
                        <Map size={24} className="mx-auto text-white/10 mb-2" />
                        <p className="text-xs font-mono text-white/30">No districts available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Arsenal tab */}
                {activeTab === "arsenal" && (
                  <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Swords size={20} className="text-purple-400" />
                      <div>
                        <h2 className="text-lg font-mono text-white/90">Arsenal</h2>
                        <p className="text-xs font-mono text-white/30">Shared weapons and equipment</p>
                      </div>
                    </div>

                    {arsenalLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-6 w-6 border-2 border-pink-400/30 border-t-pink-400 rounded-full" />
                      </div>
                    ) : arsenalData ? (
                      <>
                        {/* Two-panel: Inventory + Turf Defense */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* Left: Arsenal Inventory */}
                          <div>
                            <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <Shield size={12} /> Arsenal Inventory ({arsenalData.items.filter((i: any) => !i.assignedTurfId).length})
                            </h3>
                            {arsenalData.items.filter((i: any) => !i.assignedTurfId).length === 0 ? (
                              <p className="text-xs font-mono text-white/25 py-4 text-center">All items assigned to turfs.</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {arsenalData.items.filter((i: any) => !i.assignedTurfId).map((item: any) => {
                                  const TypeIcon = TYPE_ICONS[item.type] || Swords;
                                  const typeColor = TYPE_COLORS[item.type] || "text-white/40";
                                  const isBroken = item.durability <= 0;
                                  const dmgPct = item.maxDurability > 0 ? (item.durability / item.maxDurability) * 100 : 0;
                                  const durColor = dmgPct > 50 ? "bg-green-500" : dmgPct > 25 ? "bg-yellow-500" : "bg-red-500";
                                  const canAssign = isLeader || isLieutenant || isEnforcer;

                                  return (
                                    <div
                                      key={item.id}
                                      draggable={canAssign && !isBroken}
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", String(item.id));
                                        e.dataTransfer.effectAllowed = "move";
                                      }}
                                      className={`bg-black/20 rounded-sm p-2 border border-white/5 ${canAssign && !isBroken ? "cursor-grab" : "cursor-default"} active:cursor-grabbing transition-all hover:border-white/20 ${isBroken ? "opacity-50" : ""}`}
                                    >
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <TypeIcon size={11} className={typeColor} />
                                        <span className="font-mono text-xs text-white/80 truncate">{item.name}</span>
                                        <span className="text-orange-400/70 text-[10px] font-mono ml-auto">+{item.pvpPower}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
                                          <div className={`h-full ${durColor} rounded-full`} style={{ width: `${dmgPct}%` }} />
                                        </div>
                                        <span className="text-[8px] font-mono text-white/20">{item.durability}%</span>
                                      </div>
                                      {isBroken && <span className="text-[9px] font-mono text-red-400/60">Broken</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Right: Turf Defense */}
                          <div>
                            <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <Map size={12} /> Turf Defense
                            </h3>
                            {districts.filter((d) => d.owner?.gangId === gangId).length === 0 ? (
                              <p className="text-xs font-mono text-white/25 py-4 text-center">No turfs owned. Claim districts from the Turf tab.</p>
                            ) : (
                              <div className="space-y-3">
                                {districts.filter((d) => d.owner?.gangId === gangId).map((turf) => {
                                  const assignedItems = arsenalData.items.filter((i: any) => i.assignedTurfId === turf.id);
                                  const defensePower = assignedItems.reduce((s: number, i: any) => s + i.pvpPower, 0);
                                  const canAssign = isLeader || isLieutenant || isEnforcer;

                                  return (
                                    <div
                                      key={turf.id}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        e.currentTarget.classList.add("ring-1", "ring-amber-400/50");
                                      }}
                                      onDragLeave={(e) => {
                                        e.currentTarget.classList.remove("ring-1", "ring-amber-400/50");
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove("ring-1", "ring-amber-400/50");
                                        const itemId = parseInt(e.dataTransfer.getData("text/plain"));
                                        if (itemId && canAssign) handleAssignTurf(itemId, turf.id);
                                      }}
                                      className={`rounded-sm border p-3 transition-all ${defensePower > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-green-500/20 bg-green-500/5"}`}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-sm text-white/90">{turf.name}</span>
                                          <span className="text-[10px] font-mono text-amber-400 font-semibold">
                                            Defense: <span className="text-amber-300">+{defensePower}</span>
                                          </span>
                                        </div>
                                        {canAssign && assignedItems.length > 0 && (
                                          <span className="text-[9px] font-mono text-white/25">{assignedItems.length} items</span>
                                        )}
                                      </div>

                                      {assignedItems.length === 0 ? (
                                        <p className="text-[10px] font-mono text-white/20 text-center py-2 border border-dashed border-white/5 rounded-sm">
                                          {canAssign ? "Drag items here" : "No items assigned"}
                                        </p>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                          {assignedItems.map((item: any) => {
                                            const TypeIcon = TYPE_ICONS[item.type] || Swords;
                                            const typeColor = TYPE_COLORS[item.type] || "text-white/40";
                                            return (
                                              <div key={item.id} className="flex items-center gap-1 bg-black/30 rounded-sm px-1.5 py-1 group">
                                                <TypeIcon size={10} className={typeColor} />
                                                <span className="text-[10px] font-mono text-white/70">{item.name}</span>
                                                <span className="text-[9px] font-mono text-orange-400/70">+{item.pvpPower}</span>
                                                {canAssign && (
                                                  <button
                                                    onClick={() => handleUnassignTurf(item.id)}
                                                    className="text-white/20 hover:text-red-400 ml-0.5 transition-colors"
                                                  >
                                                    ✕
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Repair section for leader/lieutenant/enforcer: show broken items inline */}
                        {arsenalData.items.filter((i: any) => !i.assignedTurfId || true).some((i: any) => i.durability < i.maxDurability) && (isLeader || isLieutenant) && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {arsenalData.items.filter((i: any) => !i.assignedTurfId && !(i.durability <= 0)).map((item: any) => (
                              item.durability < item.maxDurability && !item.assignedTurfId && (
                                <button
                                  key={item.id}
                                  onClick={() => handleRepair(item.id)}
                                  disabled={arsenalActionLoading?.startsWith("repair")}
                                  className="font-mono text-[10px] text-cyan-400/60 border border-cyan-400/20 rounded-sm px-2 py-0.5 hover:border-cyan-400/40 transition-all disabled:opacity-30"
                                >
                                  Repair {item.name} ({item.durability}/{item.maxDurability})
                                </button>
                              )
                            ))}
                          </div>
                        )}

                        {/* Buy Catalog */}
                        {(isLeader || isLieutenant) && (
                          <div className="mb-4">
                            <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <DollarSign size={12} /> Buy Arsenal
                            </h3>
                            <div className="space-y-2">
                              {arsenalData.catalog.map((item: any) => (
                                <div key={item.name} className="bg-black/20 rounded-sm p-3 border border-white/5">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm text-white/90">{item.name}</span>
                                      <span className="text-[10px] font-mono text-white/30 uppercase">{item.type}</span>
                                    </div>
                                    <button
                                      onClick={() => handleBuy(item.name)}
                                      disabled={arsenalActionLoading === `buy-${item.name}` || (arsenalData.vault ?? 0) < item.price}
                                      className="font-mono text-xs uppercase text-pink-400/70 border border-pink-400/20 rounded-sm px-3 py-1.5 hover:border-pink-400/40 transition-all disabled:opacity-30"
                                    >
                                      {arsenalActionLoading === `buy-${item.name}` ? "..." : `$${item.price.toLocaleString()}`}
                                    </button>
                                  </div>
                                  <div className="flex gap-3 text-[10px] font-mono">
                                    <span className="text-orange-400/70">+{item.pvpPower} PvP</span>
                                    {item.crimeBonus > 0 && (
                                      <span className="text-green-400/70">+{item.crimeBonus} Crime</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Activity Log */}
                        {arsenalData.logs.length > 0 && (
                          <div>
                            <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <Eye size={12} /> Activity Log
                            </h3>
                            <div className="space-y-0.5 max-h-48 overflow-y-auto">
                              {arsenalData.logs.map((log: any) => (
                                <div key={log.id} className="flex items-center justify-between text-[10px] font-mono text-white/30 py-0.5">
                                  <span>{log.details || log.action}</span>
                                  <span className="text-white/15">{new Date(log.createdAt).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Swords size={24} className="mx-auto text-white/10 mb-2" />
                        <p className="text-xs font-mono text-white/30">Failed to load arsenal</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "accountant" && (
                  <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <DollarSign size={16} className="text-emerald-400" />
                      <div>
                        <h2 className="text-sm font-mono text-white/90">Accountant</h2>
                        <p className="text-xs font-mono text-white/30">Bot handles daily salary payouts (2% fee)</p>
                      </div>
                    </div>

                    {/* Hire / Fire */}
                    {isLeader && (
                      <div className="bg-black/20 rounded-sm border border-white/5 p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasAccountant ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "bg-white/10"}`} />
                            <span className="text-xs font-mono text-white/70">
                              {hasAccountant ? "Accountant bot is active" : "No accountant hired"}
                            </span>
                          </div>
                          <button
                            onClick={() => handleSetAccountant(!hasAccountant)}
                            disabled={settingAccountant}
                            className={`text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                              hasAccountant
                                ? "text-red-400/70 hover:text-red-300 border border-red-400/20 hover:border-red-400/40"
                                : "text-emerald-400/70 hover:text-emerald-300 border border-emerald-400/20 hover:border-emerald-400/40"
                            }`}
                          >
                            {settingAccountant ? (
                              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                            ) : hasAccountant ? (
                              <><X size={10} /> Fire</>
                            ) : (
                              <><Check size={10} /> Hire</>
                            )}
                          </button>
                        </div>
                        {gang?.lastSalaryPayout && (
                          <p className="text-[10px] font-mono text-white/20 mt-2">
                            Last payout: {new Date(gang.lastSalaryPayout).toLocaleDateString()} {new Date(gang.lastSalaryPayout).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Salary overview */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1 py-1.5 border-b border-white/5 mb-1">
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">Member</span>
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">Daily Salary</span>
                      </div>
                      {gang?.members.map((m) => (
                        <div key={m.userId} className="flex items-center justify-between px-2 py-2 rounded-sm hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-white/80">{m.username}</span>
                            {m.role === "leader" && <Crown size={10} className="text-yellow-500" />}
                            <span className="text-[10px] font-mono text-white/20">Lv.{m.level}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isLeader ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-white/30">$</span>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder={m.salary ? m.salary.toString() : "0"}
                                    value={salaryInput[m.userId] ?? ""}
                                    onChange={(e) => setSalaryInput((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                                    className="w-20 bg-black/30 border border-white/5 rounded-sm px-2 py-1 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30 text-right"
                                  />
                                </div>
                                <button
                                  onClick={() => handleSetSalary(m.userId)}
                                  disabled={settingSalary === m.userId || !salaryInput[m.userId]}
                                  className="text-[10px] font-mono text-cyan-400/60 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1"
                                >
                                  {settingSalary === m.userId ? (
                                    <div className="animate-spin h-3 w-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full" />
                                  ) : (
                                    "Set"
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className={`text-xs font-mono ${m.salary && m.salary > 0 ? "text-emerald-400/70" : "text-white/20"}`}>
                                {m.salary && m.salary > 0 ? `$${m.salary.toLocaleString()}/d` : "—"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "requests" && (
                  <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Send size={16} className="text-yellow-400" />
                      <div>
                        <h2 className="text-sm font-mono text-white/90">Join Requests</h2>
                        <p className="text-xs font-mono text-white/30">Review players who want to join</p>
                      </div>
                    </div>

                    {requestsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-6 w-6 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full" />
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="text-center py-8">
                        <Send size={24} className="mx-auto text-white/10 mb-2" />
                        <p className="text-xs font-mono text-white/30">No pending join requests</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {requests.map((req: any) => (
                          <div key={req.userId} className="bg-black/20 rounded-sm border border-white/5 p-3">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Users size={14} className="text-white/40" />
                                <span className="font-mono text-sm text-white/90">{req.username}</span>
                                <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-sm">Lv.{req.level}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-mono">
                                {req.hp !== undefined && (
                                  <span className={`${req.hp > 50 ? "text-green-400/70" : "text-red-400/70"}`}>
                                    {req.hp}/{req.maxHp} HP
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono mb-2">
                              <span className="text-pink-400/70">STR: {req.stats?.strength ?? "?"}</span>
                              <span className="text-cyan-400/70">AGI: {req.stats?.agility ?? "?"}</span>
                              <span className="text-cyan-400/70">INT: {req.stats?.intelligence ?? "?"}</span>
                              <span className="text-yellow-400/70">CHA: {req.stats?.charisma ?? "?"}</span>
                              <span className="text-purple-400/70">END: {req.stats?.endurance ?? "?"}</span>
                              <span className="text-green-400/70">${req.cash?.toLocaleString() ?? 0}</span>
                              <span className="text-white/40">{req.respect?.toLocaleString() ?? 0} respect</span>
                            </div>

                            {/* Skills */}
                            {req.skills && req.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {req.skills.map((sk: any) => (
                                  <span key={sk.skillId} className="text-[10px] font-mono bg-white/5 border border-white/5 rounded-sm px-1.5 py-0.5 text-white/50">
                                    {sk.name} Lv.{sk.level}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptRequest(req.userId)}
                                disabled={requestsActionLoading === req.userId}
                                className="text-xs font-mono uppercase text-green-400/80 hover:text-green-300 border border-green-400/20 hover:border-green-400/40 rounded-sm px-3 py-1.5 transition-all flex items-center gap-1.5 disabled:opacity-40"
                              >
                                {requestsActionLoading === req.userId ? (
                                  <div className="animate-spin h-3 w-3 border-2 border-green-400/30 border-t-green-400 rounded-full" />
                                ) : (
                                  <><Check size={10} /> Accept</>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(req.userId)}
                                disabled={requestsActionLoading === req.userId}
                                className="text-xs font-mono uppercase text-red-400/60 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-sm px-3 py-1.5 transition-all flex items-center gap-1.5 disabled:opacity-40"
                              >
                                <X size={10} /> Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

          </>
        )}
      </div>
    </GameLayout>
  );
}
