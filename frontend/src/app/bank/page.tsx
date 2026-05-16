"use client";

import { useEffect, useState } from "react";
import GameLayout from "@/components/GameLayout";
import { bank as bankApi, gangs as gangsApi } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useTopNotification } from "@/components/TopNotification";
import { Building, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, Shield, TrendingUp, Users, TrendingDown, Search, SortAsc, Package, Crosshair, Skull, Hand, VenetianMask, Gem } from "lucide-react";

// ─── Interest Projection Chart ───

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function InterestChart({ bankBalance }: { bankBalance: number }) {
  const dailyRate = 0.004; // 0.4%
  const days = 30;
  const data: { day: number; balance: number }[] = [];
  let balance = bankBalance;
  for (let d = 0; d <= days; d++) {
    data.push({ day: d, balance: Math.floor(balance) });
    if (d < days) {
      // Jitter the daily rate so the curve looks organic (±40% of base rate)
      const jitter = 0.6 + seededRandom(d * 7 + 13) * 0.8;
      balance = balance * (1 + dailyRate * jitter);
    }
  }

  const finalBalance = data[days].balance;
  const totalInterest = finalBalance - bankBalance;
  if (bankBalance <= 0) return null;

  // Wider viewBox for full-width horizontal spread
  const w = 600;
  const h = 140;
  const pad = { top: 8, right: 8, bottom: 22, left: 44 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const values = data.map((d) => d.balance);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const x = (d: number) => pad.left + (d / days) * chartW;
  const y = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

  const points = data.map((d) => `${x(d.day)},${y(d.balance)}`).join(" ");
  const area = `${x(0)},${h - pad.bottom} ${points} ${x(days)},${h - pad.bottom}`;

  // Y axis ticks (3 labels)
  const yTicks = [minVal, Math.floor((minVal + maxVal) / 2), maxVal];

  return (
    <div className="rounded-sm border border-cyan-500/10 bg-bg-dark/80 p-4 reveal">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-cyan-400" />
          <span className="text-xs font-mono text-cyan-400/70 uppercase tracking-wider">30-Day Interest Projection</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-mono text-cyan-300">+${totalInterest.toLocaleString()}</p>
          <p className="text-[9px] font-mono text-white/20">at 0.4% daily</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="interest-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((v) => (
          <line key={v} x1={pad.left} y1={y(v)} x2={w - pad.right} y2={y(v)} stroke="#ffffff08" strokeWidth={1} />
        ))}

        {/* Area fill */}
        <polygon points={area} fill="url(#interest-fill)" />

        {/* Line */}
        <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Y axis labels */}
        {yTicks.map((v) => (
          <text key={v} x={pad.left - 4} y={y(v) + 2} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">
            ${(v / 1000).toFixed(0)}k
          </text>
        ))}

        {/* X axis labels */}
        {[0, 10, 20, 30].map((d) => (
          <text key={d} x={x(d)} y={h - 4} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="7" fontFamily="monospace">
            d{d}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function BankPage() {
  const { user, refreshUser } = useUser();
  const { showNotification } = useTopNotification();
  const [bankData, setBankData] = useState<{
    bank: number; cash: number; totalNetworth: number; totalInterestEarned: number;
    blackMarket?: { total: number; drugs: number; arms: number; footmen: number; dealers: number; hoes: number; pimps: number };
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Investment state
  const [openGangs, setOpenGangs] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [investAmounts, setInvestAmounts] = useState<Record<number, string>>({});
  const [investingId, setInvestingId] = useState<number | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [collectingId, setCollectingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"totalInvestments" | "dailyReturn" | "level" | "name">("totalInvestments");

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
    loadOpenGangs();
  }, []);

  const loadOpenGangs = async () => {
    setInvLoading(true);
    try {
      const data = await gangsApi.investments.open();
      setOpenGangs(data.gangs ?? []);
    } catch {}
    setInvLoading(false);
  };

  const handleInvest = async (gangId: number) => {
    const val = parseInt(investAmounts[gangId] ?? "");
    if (!val || val < 10000) { showNotification("Minimum investment is $10,000", "error"); return; }
    setInvestingId(gangId);
    try {
      const data = await gangsApi.investments.invest(gangId, val);
      await refreshUser();
      showNotification(`Invested $${data.amount.toLocaleString()}`, "success");
      setInvestAmounts((prev) => ({ ...prev, [gangId]: "" }));
      loadOpenGangs();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setInvestingId(null);
    }
  };

  const handleInvestWithdraw = async (gangId: number) => {
    setWithdrawingId(gangId);
    try {
      const data = await gangsApi.investments.withdraw(gangId);
      await refreshUser();
      showNotification(`Withdrew $${data.refunded.toLocaleString()}`, "success");
      loadOpenGangs();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleCollect = async (gangId: number) => {
    setCollectingId(gangId);
    try {
      const data = await gangsApi.investments.collect(gangId);
      await refreshUser();
      showNotification(`Collected $${data.collected.toLocaleString()} returns!`, "success");
      loadOpenGangs();
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setCollectingId(null);
    }
  };

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

  // Filter + sort open gangs
  const filteredGangs = openGangs
    .filter((g: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return g.name?.toLowerCase().includes(q) || g.tag?.toLowerCase().includes(q);
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "totalInvestments": return (b.totalInvestments ?? 0) - (a.totalInvestments ?? 0);
        case "dailyReturn": return (b.dailyInvestorReturn ?? 0) - (a.dailyInvestorReturn ?? 0);
        case "level": return (b.level ?? 0) - (a.level ?? 0);
        case "name": return (a.name ?? "").localeCompare(b.name ?? "");
        default: return 0;
      }
    });

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
            {bankData && bankData.totalInterestEarned > 0 && (
              <p className="text-[10px] font-mono text-cyan-400/40 mt-0.5">
                +${bankData.totalInterestEarned.toLocaleString()} interest earned
              </p>
            )}
          </div>

          <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 reveal reveal-delay-3">
            <div className="flex items-center gap-2 mb-1">
              <Building size={14} className="text-purple-400" />
              <span className="text-xs font-mono text-white/35 uppercase tracking-wider">Net Worth</span>
            </div>
            <p className="text-xl font-mono text-purple-300 font-bold">
              ${(bankData?.totalNetworth ?? 0).toLocaleString()}
            </p>
            <p className="text-xs font-mono text-white/20 mt-1">Cash + Bank + Black Market</p>
          </div>
        </div>

        {/* Black Market card */}
        {bankData?.blackMarket && (
          <div className="rounded-sm border border-amber-500/10 bg-bg-dark/80 p-4 mb-6 reveal">
            <div className="flex items-center gap-2 mb-3">
              <Package size={14} className="text-amber-400" />
              <span className="text-xs font-mono text-amber-400/70 uppercase tracking-wider">Black Market Assets</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-black/30 rounded-sm px-3 py-2 flex items-center justify-between">
                <span className="text-white/40 flex items-center gap-1.5"><Gem size={11} /> Drugs</span>
                <span className="text-white/80">${bankData.blackMarket.drugs.toLocaleString()}</span>
              </div>
              <div className="bg-black/30 rounded-sm px-3 py-2 flex items-center justify-between">
                <span className="text-white/40 flex items-center gap-1.5"><Crosshair size={11} /> Arms</span>
                <span className="text-white/80">${bankData.blackMarket.arms.toLocaleString()}</span>
              </div>
              <div className="bg-black/30 rounded-sm px-3 py-2 flex items-center justify-between">
                <span className="text-white/40 flex items-center gap-1.5"><Skull size={11} /> Footmen</span>
                <span className="text-white/80">${bankData.blackMarket.footmen.toLocaleString()}</span>
              </div>
              <div className="bg-black/30 rounded-sm px-3 py-2 flex items-center justify-between">
                <span className="text-white/40 flex items-center gap-1.5"><Hand size={11} /> Dealers</span>
                <span className="text-white/80">${bankData.blackMarket.dealers.toLocaleString()}</span>
              </div>
              <div className="bg-black/30 rounded-sm px-3 py-2 flex items-center justify-between">
                <span className="text-white/40 flex items-center gap-1.5"><VenetianMask size={11} /> Hoes</span>
                <span className="text-white/80">${bankData.blackMarket.hoes.toLocaleString()}</span>
              </div>
              <div className="bg-black/30 rounded-sm px-3 py-2 flex items-center justify-between">
                <span className="text-white/40 flex items-center gap-1.5"><Users size={11} /> Pimps</span>
                <span className="text-white/80">${bankData.blackMarket.pimps.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400/60">Total Black Market Value</span>
              <span className="text-amber-300 font-bold">${bankData.blackMarket.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Interest projection chart */}
        {bankData && <InterestChart bankBalance={bankData.bank} />}

        {/* Action panel */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 reveal reveal-delay-4">
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

          <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
            <p className="text-xs font-mono text-white/15 leading-relaxed">
              Money in the bank is safe from mugging and crime failure cash losses. Each transaction costs 1 turn.
            </p>
            <p className="text-xs font-mono text-cyan-400/30">
              Earns 0.4% interest daily, paid automatically on each turn refresh.
            </p>
          </div>
        </div>

        {/* ─── Gang Investments ─── */}
        <div className="rounded-sm border border-white/5 bg-bg-dark/80 p-4 mt-6 reveal reveal-delay-5">
          <h2 className="text-sm font-mono text-white/40 uppercase tracking-wider mb-1 flex items-center gap-2">
            <TrendingUp size={14} className="text-cyan-400" /> Gang Investments
          </h2>
          <p className="text-xs font-mono text-white/20 mb-4">Invest cash in gangs and earn a share of their daily operation income</p>

          {/* Search + Sort */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gangs..."
                className="w-full bg-black/30 border border-white/5 rounded-sm pl-8 pr-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 outline-none focus:border-cyan-400/30 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <SortAsc size={12} className="text-white/20 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-black/30 border border-white/5 rounded-sm px-2 py-2 text-xs font-mono text-white/50 outline-none focus:border-cyan-400/30 transition-all"
              >
                <option value="totalInvestments">Total Invested</option>
                <option value="dailyReturn">Daily Return</option>
                <option value="level">Level</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {invLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-white/20" />
            </div>
          ) : openGangs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/5 rounded-sm">
              <TrendingDown size={24} className="mx-auto text-white/10 mb-2" />
              <p className="text-xs font-mono text-white/20">No gangs are currently accepting investments</p>
              <p className="text-[10px] font-mono text-white/15 mt-1">Check back later or ask a gang leader to open investments</p>
            </div>
          ) : filteredGangs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/5 rounded-sm">
              <Search size={24} className="mx-auto text-white/10 mb-2" />
              <p className="text-xs font-mono text-white/20">No gangs match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGangs.map((gang: any) => {
                const hasInvest = gang.investment && gang.investment.amount > 0;
                return (
                  <div key={gang.id} className="rounded-sm border border-white/5 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building size={14} className="text-purple-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-white/80 truncate">
                            {gang.name} <span className="text-purple-400">[{gang.tag}]</span>
                          </p>
                          <p className="text-xs font-mono text-white/25">Level {gang.level}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono text-cyan-300">{gang.investorShare}% of income</p>
                        <p className="text-[10px] font-mono text-white/25">{gang.investorCount} investor{gang.investorCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-mono text-white/30">
                        Total invested: <span className="text-cyan-300">${(gang.totalInvestments ?? 0).toLocaleString()}</span>
                      </p>
                      {gang.dailyInvestorReturn > 0 && (
                        <p className="text-xs font-mono text-emerald-400/60">
                          ~${(gang.dailyInvestorReturn).toLocaleString()}/day return
                        </p>
                      )}
                    </div>

                    {hasInvest ? (
                      <div className="bg-black/30 rounded-sm border border-cyan-500/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-white/70">Your investment</span>
                          <span className="text-sm font-mono text-cyan-300">${gang.investment.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-white/30">Returns earned</span>
                          <span className="text-sm font-mono text-green-400">+${gang.investment.returnsEarned.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                          {gang.investment.returnsEarned > 0 && (
                            <button
                              onClick={() => handleCollect(gang.id)}
                              disabled={collectingId === gang.id}
                              className="flex-1 text-xs font-mono text-emerald-400/70 border border-emerald-400/20 rounded-sm px-3 py-1.5 hover:border-emerald-400/40 transition-all disabled:opacity-30"
                            >
                              {collectingId === gang.id ? "Collecting..." : "Collect Returns"}
                            </button>
                          )}
                          <button
                            onClick={() => handleInvestWithdraw(gang.id)}
                            disabled={withdrawingId === gang.id}
                            className="flex-1 text-xs font-mono text-pink-400/70 border border-pink-400/20 rounded-sm px-3 py-1.5 hover:border-pink-400/40 transition-all disabled:opacity-30"
                          >
                            {withdrawingId === gang.id ? "Withdrawing..." : "Withdraw"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={10000}
                          value={investAmounts[gang.id] ?? ""}
                          onChange={(e) => setInvestAmounts((prev) => ({ ...prev, [gang.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleInvest(gang.id)}
                          placeholder="Amount (min $10,000)..."
                          className="flex-1 bg-black/30 border border-white/5 rounded-sm px-3 py-2 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30 transition-all"
                        />
                        <button
                          onClick={() => handleInvest(gang.id)}
                          disabled={investingId === gang.id || !investAmounts[gang.id] || parseInt(investAmounts[gang.id]) < 10000}
                          className="font-mono tracking-wider text-xs uppercase text-cyan-400/70 hover:text-cyan-300 border border-cyan-400/20 hover:border-cyan-400/40 rounded-sm px-3 py-2 transition-all disabled:opacity-30 flex items-center gap-1.5"
                        >
                          {investingId === gang.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <><ArrowUpRight size={12} /> Invest</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}
