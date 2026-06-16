"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity, Search, Shield, TrendingUp, AlertTriangle,
  CheckCircle, ArrowRight, RefreshCw, Users, BarChart3
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import { api } from "@/lib/api"
import { cn, formatDate, riskColor, statusColor, confidenceColor } from "@/lib/utils"

/* ─── Types ───────────────────────────────────────────────────────────── */
interface CaseSummary {
  id: string
  status: string
  customer_name: string
  risk_score: number
  decision: string | null
  trace_id?: string
  created_at: string
  updated_at?: string
}

interface Metrics {
  total_cases: number
  decisions: { APPROVE: number; REVIEW: number; ESCALATE: number }
  avg_risk: number
  avg_confidence: number
}

/* ─── Agent dot simulation (7 pipeline agents) ────────────────────────── */
const AGENT_NAMES = [
  "DocVerify", "BiometricAI", "PEP-Screen", "TxAnalyzer",
  "GeoRisk", "BehaviorAI", "FinalArbiter",
]

function agentStatusFromCase(c: CaseSummary): { name: string; status: "success" | "warning" | "error" | "pending" }[] {
  // Derive a deterministic agent status from the case risk score + decision
  const seed = c.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return AGENT_NAMES.map((name, i) => {
    if (!c.decision) return { name, status: "pending" as const }
    const hash = (seed * (i + 1)) % 100
    if (c.decision === "ESCALATE" || c.decision === "ESCALATED") {
      return { name, status: hash < 40 ? "error" : hash < 65 ? "warning" : "success" as const }
    }
    if (c.decision === "REVIEW") {
      return { name, status: hash < 15 ? "error" : hash < 45 ? "warning" : "success" as const }
    }
    return { name, status: hash < 5 ? "warning" : "success" as const }
  })
}

const agentDotColor: Record<string, string> = {
  success: "bg-emerald-400 shadow-emerald-400/50",
  warning: "bg-amber-400 shadow-amber-400/50",
  error: "bg-red-400 shadow-red-400/50",
  pending: "bg-slate-500 shadow-none",
}

/* ─── Stat card config ────────────────────────────────────────────────── */
const statCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
}

/* ─── Custom tooltip for chart ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-text mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs text-text-muted">
          <span className="font-mono font-bold text-accent">{p.value}</span> cases
        </p>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  DASHBOARD PAGE                                                       */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [pollingActive, setPollingActive] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [pulseKey, setPulseKey] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ─── Data fetching ──────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    try {
      const [casesData, metricsData] = await Promise.all([
        api.getCases(),
        api.getMetrics(),
      ])
      setCases(casesData)
      setMetrics(metricsData)
      setLastUpdated(new Date())
      setPulseKey((k) => k + 1)
    } catch (e) {
      console.error("Dashboard polling error:", e)
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  /* ─── 5-second polling ───────────────────────────────────────────── */
  useEffect(() => {
    if (!pollingActive) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(fetchData, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [pollingActive, fetchData])

  /* ─── Derived data ───────────────────────────────────────────────── */
  const filtered = cases.filter((c) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  const riskChartData = (() => {
    const buckets = [
      { range: "0–20", risk: 0 },
      { range: "21–40", risk: 0 },
      { range: "41–60", risk: 0 },
      { range: "61–80", risk: 0 },
      { range: "81–100", risk: 0 },
    ]
    cases.forEach((c) => {
      const r = c.risk_score
      if (r <= 20) buckets[0].risk++
      else if (r <= 40) buckets[1].risk++
      else if (r <= 60) buckets[2].risk++
      else if (r <= 80) buckets[3].risk++
      else buckets[4].risk++
    })
    return buckets
  })()

  const pieData = metrics
    ? [
        { name: "Approved", value: metrics.decisions.APPROVE, color: "#10b981" },
        { name: "Under Review", value: metrics.decisions.REVIEW, color: "#f59e0b" },
        { name: "Escalated", value: metrics.decisions.ESCALATE, color: "#ef4444" },
      ]
    : []

  const statCards = [
    {
      label: "Total Cases",
      value: metrics?.total_cases ?? cases.length,
      icon: BarChart3,
      gradient: "from-indigo-600/30 via-indigo-500/10 to-transparent",
      border: "border-indigo-500/25",
      iconBg: "bg-indigo-500/15 text-indigo-400",
      glow: "glow-indigo",
    },
    {
      label: "Approved",
      value: metrics?.decisions.APPROVE ?? 0,
      icon: CheckCircle,
      gradient: "from-emerald-600/30 via-emerald-500/10 to-transparent",
      border: "border-emerald-500/25",
      iconBg: "bg-emerald-500/15 text-emerald-400",
      glow: "glow-emerald",
    },
    {
      label: "Under Review",
      value: metrics?.decisions.REVIEW ?? 0,
      icon: Shield,
      gradient: "from-amber-600/30 via-amber-500/10 to-transparent",
      border: "border-amber-500/25",
      iconBg: "bg-amber-500/15 text-amber-400",
      glow: "glow-amber",
    },
    {
      label: "Escalated",
      value: metrics?.decisions.ESCALATE ?? 0,
      icon: AlertTriangle,
      gradient: "from-red-600/30 via-red-500/10 to-transparent",
      border: "border-red-500/25",
      iconBg: "bg-red-500/15 text-red-400",
      glow: "glow-red",
    },
  ]

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* ── Background grid ────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#14141d_1px,transparent_1px),linear-gradient(to_bottom,#14141d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      {/* Radial accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/[0.07] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm glow-indigo">
              K
            </div>
            <span className="font-semibold text-lg text-text tracking-wide">
              KAIROS
            </span>
            <span className="text-xs text-text-muted bg-surface-2 px-2.5 py-0.5 rounded-full border border-border hidden sm:inline-block">
              KYC Intelligence Dashboard
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Live Sync Indicator */}
            <button
              onClick={() => setPollingActive((p) => !p)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase transition-all duration-300 border",
                pollingActive
                  ? "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-400"
                  : "border-border bg-surface-2/50 text-text-muted hover:text-text"
              )}
            >
              <span className="relative flex h-2 w-2">
                {pollingActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    pollingActive ? "bg-emerald-400" : "bg-slate-500"
                  )}
                />
              </span>
              {pollingActive ? "Live Sync Active" : "Sync Paused"}
            </button>
            <RefreshCw
              onClick={() => fetchData()}
              className={cn(
                "w-4 h-4 text-text-muted hover:text-text cursor-pointer transition-colors",
                pollingActive && "animate-[spin_3s_linear_infinite]"
              )}
            />
          </div>
        </div>
      </nav>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-extrabold text-text tracking-tight">
            Oversight Dashboard
          </h1>
          <p className="text-sm text-text-muted mt-1.5 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary" />
            Real-time KYC pipeline monitoring &middot; Last sync{" "}
            <span className="font-mono text-accent">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </motion.div>

        {/* ── Stat Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {statCards.map((card, idx) => (
            <motion.div
              key={card.label}
              custom={idx}
              variants={statCardVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "glass-panel rounded-2xl p-6 relative overflow-hidden group cursor-default",
                card.border,
                card.glow
              )}
            >
              {/* Gradient overlay */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-100 pointer-events-none",
                  card.gradient
                )}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                    {card.label}
                  </span>
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                      card.iconBg
                    )}
                  >
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
                <motion.span
                  key={`${card.label}-${pulseKey}`}
                  initial={{ scale: 1.08, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="text-4xl font-extrabold text-text font-mono block"
                >
                  {card.value}
                </motion.span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Charts Row ───────────────────────────────────────────── */}
        {isMounted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Risk Distribution AreaChart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="lg:col-span-2 glass-panel rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-text text-sm tracking-wide">
                    Risk Score Distribution
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Across all analyzed cases
                  </p>
                </div>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={riskChartData}>
                    <defs>
                      <linearGradient
                        id="riskGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6366f1"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor="#6366f1"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="range"
                      stroke="#4b5563"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#4b5563"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="risk"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fill="url(#riskGradient)"
                      dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: "#818cf8",
                        stroke: "#6366f1",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Decision Breakdown Donut */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="glass-panel rounded-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-text text-sm tracking-wide">
                    Decision Breakdown
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Pipeline verdicts
                  </p>
                </div>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#12121a",
                        borderColor: "#2a2a3a",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                    Total
                  </span>
                  <span className="text-2xl font-extrabold text-text font-mono">
                    {metrics?.total_cases ?? cases.length}
                  </span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-[10px] text-text-muted font-medium">
                      {d.name}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Avg Risk / Confidence Bar ─────────────────────────────── */}
        {metrics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-5 mb-8"
          >
            <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">
                  Avg Risk Score
                </p>
                <p className={cn("text-2xl font-extrabold font-mono", riskColor(metrics.avg_risk))}>
                  {metrics.avg_risk.toFixed(1)}
                  <span className="text-sm text-text-muted font-normal ml-1">/100</span>
                </p>
              </div>
              {/* Mini bar */}
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden ml-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.avg_risk}%` }}
                  transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    metrics.avg_risk < 30
                      ? "bg-emerald-500"
                      : metrics.avg_risk < 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                />
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">
                  Avg Confidence
                </p>
                <p className={cn("text-2xl font-extrabold font-mono", confidenceColor(metrics.avg_confidence))}>
                  {(metrics.avg_confidence * 100).toFixed(1)}
                  <span className="text-sm text-text-muted font-normal ml-1">%</span>
                </p>
              </div>
              <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden ml-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.avg_confidence * 100}%` }}
                  transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Cases Table ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="glass-panel rounded-2xl overflow-hidden"
        >
          {/* Table Header */}
          <div className="p-5 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-text text-base tracking-tight">
                Case Records
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {filtered.length} of {cases.length} cases
              </p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by customer name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2/60 border border-border text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-4 px-5">Customer Name</th>
                  <th className="py-4 px-5">Risk Score</th>
                  <th className="py-4 px-5">Decision</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5">Agents</th>
                  <th className="py-4 px-5">Created</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Activity className="w-6 h-6 animate-spin text-primary" />
                          <span className="text-sm text-text-muted">
                            Loading cases…
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-6 h-6 text-text-muted/40" />
                          <span className="text-sm text-text-muted">
                            No cases match your search.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => {
                      const agents = agentStatusFromCase(c)
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{
                            delay: i * 0.025,
                            duration: 0.3,
                            ease: "easeOut",
                          }}
                          className="border-b border-border/30 hover:bg-surface-2/40 transition-all duration-200 group"
                        >
                          {/* Customer Name */}
                          <td className="py-4 px-5">
                            <Link
                              href={`/cases/${c.id}`}
                              className="group/link flex flex-col"
                            >
                              <span className="font-semibold text-text text-sm group-hover/link:text-primary transition-colors">
                                {c.customer_name}
                              </span>
                              <span className="text-[10px] text-text-muted/70 font-mono mt-0.5">
                                {c.id.slice(0, 12)}…
                              </span>
                            </Link>
                          </td>

                          {/* Risk Score */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    c.risk_score < 30
                                      ? "bg-emerald-500"
                                      : c.risk_score < 60
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  )}
                                  style={{
                                    width: `${Math.min(c.risk_score, 100)}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={cn(
                                  "font-bold text-sm font-mono",
                                  riskColor(c.risk_score)
                                )}
                              >
                                {c.risk_score.toFixed(0)}
                              </span>
                            </div>
                          </td>

                          {/* Decision */}
                          <td className="py-4 px-5">
                            {c.decision ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold",
                                  statusColor(c.decision)
                                )}
                              >
                                {c.decision === "APPROVE" ||
                                c.decision === "APPROVED" ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : c.decision === "ESCALATE" ||
                                  c.decision === "ESCALATED" ? (
                                  <AlertTriangle className="w-3 h-3" />
                                ) : (
                                  <Shield className="w-3 h-3" />
                                )}
                                {c.decision}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted italic">
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5">
                            <span
                              className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent",
                                statusColor(c.status)
                              )}
                            >
                              {c.status}
                            </span>
                          </td>

                          {/* Agent Dots */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5">
                              {agents.map((a) => (
                                <div
                                  key={a.name}
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-full shadow-sm transition-transform duration-200 hover:scale-150 cursor-default",
                                    agentDotColor[a.status]
                                  )}
                                  title={`${a.name}: ${a.status}`}
                                />
                              ))}
                            </div>
                          </td>

                          {/* Created date */}
                          <td className="py-4 px-5 text-xs text-text-muted font-mono">
                            {formatDate(c.created_at)}
                          </td>

                          {/* Action */}
                          <td className="py-4 px-5 text-right">
                            <Link
                              href={`/cases/${c.id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all duration-200 group-hover:translate-x-0.5"
                            >
                              View
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                Showing {filtered.length} record{filtered.length !== 1 && "s"}
              </span>
              <span className="text-[11px] text-text-muted font-mono flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  {pollingActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex rounded-full h-1.5 w-1.5",
                      pollingActive ? "bg-emerald-400" : "bg-slate-500"
                    )}
                  />
                </span>
                {pollingActive ? "Auto-refreshing every 5s" : "Polling paused"}
              </span>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
