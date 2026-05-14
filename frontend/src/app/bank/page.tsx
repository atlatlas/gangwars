"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { bank as bankApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { Building, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, Shield } from "lucide-react";

export default function BankPage() {
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [bankData, setBankData] = useState<{ bank: number; cash: number; totalNetworth: number } | null>(null);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchBank = async () => {
    try {
      const data = await bankApi.get();
      setBankData(data);
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBank();
  }, []);

  const handleDeposit = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) { showNotification("Enter a valid amount", "error"); return; }
    setProcessing(true);
    try {
      await bankApi.deposit(val);
      await Promise.all([fetchBank(), refreshUser()]);
      setAmount("");
      showNotification("Deposited successfully!", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const val = parseInt(amount);
    if (!val || val <= 0) { showNotification("Enter a valid amount", "error"); return; }
    setProcessing(true);
    try {
      await bankApi.withdraw(val);
      await Promise.all([fetchBank(), refreshUser()]);
      setAmount("");
      showNotification("Withdrawn successfully!", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <GameLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 reveal">
          <div>
            <h1 className="text-lg font-mono tracking-wider text-white/90 flex items-center gap-2 uppercase">
              <Building size={16} className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)]" /> Bank
            </h1>
            <p className="text-xs font-mono text-white/30 tracking-wider mt-1">Secure your cash from mugging</p>
          </div>
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 reveal reveal-delay-1">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-pink-400" />
              <span className="text-xs font-mono text-white/35 uppercase tracking-wider">Pocket Cash</span>
            </div>
            <p className="text-xl font-mono text-white font-bold">
              ${(bankData?.cash ?? user.cash).toLocaleString()}
            </p>
            <p className="text-xs font-mono text-white/20 mt-1">Vulnerable to mugging</p>
          </div>

          <div className="rounded-sm border border-cyan-500/20 bg-bg-dark/80 p-4 reveal reveal-delay-2">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">Bank Balance</span>
            </div>
            <p className="text-xl font-mono text-cyan-300 font-bold">
              ${(bankData?.bank ?? 0).toLocaleString()}
            </p>
            <p className="text-xs font-mono text-cyan-400/20 mt-1">Safe from theft</p>
          </div>

          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 reveal reveal-delay-3">
            <div className="flex items-center gap-2 mb-1">
              <Building size={14} className="text-purple-400" />
              <span className="text-xs font-mono text-white/35 uppercase tracking-wider">Net Worth</span>
            </div>
            <p className="text-xl font-mono text-purple-300 font-bold">
              ${(bankData?.totalNetworth ?? 0).toLocaleString()}
            </p>
            <p className="text-xs font-mono text-white/20 mt-1">Cash + Bank</p>
          </div>
        </div>

        {/* Action panel */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-5 reveal reveal-delay-4">
          <h2 className="text-sm font-mono text-white/40 uppercase tracking-wider mb-4">Manage Funds</h2>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-mono text-white/30">$</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="flex-1 bg-black/30 border border-white/10 rounded-sm px-3 py-2 font-mono text-sm text-white/80 placeholder-white/20 outline-none focus:border-cyan-500/40 transition-colors"
            />
            <span className="text-xs font-mono text-white/20">
              Bal: ${(bankData?.bank ?? 0).toLocaleString()}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDeposit}
              disabled={processing || !amount}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs uppercase tracking-wider hover:bg-cyan-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {processing ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
              Deposit
            </button>
            <button
              onClick={handleWithdraw}
              disabled={processing || !amount}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-pink-500/10 border border-pink-500/30 text-pink-300 font-mono text-xs uppercase tracking-wider hover:bg-pink-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {processing ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownRight size={14} />}
              Withdraw
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs font-mono text-white/15 leading-relaxed">
              Money in the bank is safe from mugging and crime failure cash losses. Each transaction costs 1 turn.
            </p>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
