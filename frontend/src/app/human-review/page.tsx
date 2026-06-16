"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Shield, CheckCircle, AlertTriangle, Users, ArrowLeft, Send,
  FileText, Search, Scale, Brain, Activity,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn, formatDate, riskColor, statusColor, confidenceColor } from "@/lib/utils"

/* ─── Types ─────────────────────────────────────────────────────────── */
interface CaseItem {
  id: string
  customer_name: string
  risk_score: number
  status: string
  decision?: string
  created_at?: string
}

interface AgentResult {
  agent_name: string
  recommendation: string
  confidence: number
}

interface CaseDetail {
  id: string
  customer_name: string
  risk_score: number
  status: string
  agent_results: AgentResult[]
  debate?: { consensus: string; confidence: number }
  documents?: { tampering?: { tampering_detected: boolean } }[]
}

/* ─── SVG Risk Gauge ────────────────────────────────────────────────── */
function RiskGauge({ score }: { score: number }) {
  const radius = 60
  const stroke = 10
  const circumference = Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const offset = circumference - (clampedScore / 100) * circumference

  const gradientId = "gauge-grad"
  const glowColor =
    clampedScore >= 70 ? "rgba(239,68,68,0.35)" :
    clampedScore >= 40 ? "rgba(245,158,11,0.35)" :
    "rgba(34,197,94,0.35)"
  const labelColor =
    clampedScore >= 70 ? "text-red-400" :
    clampedScore >= 40 ? "text-amber-400" :
    "text-emerald-400"
  const labelText =
    clampedScore >= 70 ? "HIGH RISK" :
    clampedScore >= 40 ? "MEDIUM" :
    "LOW RISK"

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={100} viewBox="0 0 160 100" className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path
          d={`M ${80 - radius} 80 A ${radius} ${radius} 0 0 1 ${80 + radius} 80`}
          fill="none"
          stroke="#1e1e2e"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={`M ${80 - radius} 80 A ${radius} ${radius} 0 0 1 ${80 + radius} 80`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          filter="url(#gauge-glow)"
        />
      </svg>
      <div className="flex flex-col items-center -mt-14">
        <span className="text-3xl font-black text-text tabular-nums tracking-tight">
          {clampedScore.toFixed(0)}
        </span>
        <span className={cn("text-[10px] font-bold tracking-widest uppercase mt-0.5", labelColor)}>
          {labelText}
        </span>
      </div>
    </div>
  )
}

/* ─── Success Toast ─────────────────────────────────────────────────── */
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl shadow-2xl glow-emerald"
    >
      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
      <span className="text-sm font-semibold text-emerald-300">{message}</span>
    </motion.div>
  )
}

/* ─── Checklist ─────────────────────────────────────────────────────── */
const CHECKLIST_ITEMS = [
  { id: "ela",  icon: FileText,      label: "ELA verification — error-level analysis & OCR signatures reviewed" },
  { id: "pep",  icon: Shield,        label: "PEP / Sanctions check — politically exposed person & sanctions list audit" },
  { id: "fin",  icon: Activity,      label: "Financial anomaly review — structuring patterns & velocity flags analyzed" },
  { id: "ident", icon: Users,        label: "Identity verification — biometric cross-match & document consistency confirmed" },
] as const

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["id"]

/* ─── Page Component ────────────────────────────────────────────────── */
export default function HumanReviewPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null)
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Search / filter
  const [searchQuery, setSearchQuery] = useState("")

  // Override form state
  const [reviewerName, setReviewerName] = useState("")
  const [reviewAction, setReviewAction] = useState("")
  const [reasoning, setReasoning] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Checklist
  const [checked, setChecked] = useState<Record<ChecklistKey, boolean>>({
    ela: false, pep: false, fin: false, ident: false,
  })

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  /* ── Data fetching ─────────────────────────────────────────────────── */
  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.getCases()
      setCases(data)
    } catch (e) {
      console.error("Failed to load cases:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const pendingCases = cases
    .filter((c) => c.status === "REVIEW" || c.status === "ESCALATED")
    .filter((c) =>
      searchQuery === "" ||
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    )

  /* ── Select a case ─────────────────────────────────────────────────── */
  const selectCase = async (c: CaseItem) => {
    setSelectedCase(c)
    setReviewAction("")
    setReasoning("")
    setReviewerName("")
    setChecked({ ela: false, pep: false, fin: false, ident: false })
    setDetail(null)
    setDetailLoading(true)
    try {
      const d = await api.getCase(c.id)
      setDetail(d)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  /* ── Submit review ─────────────────────────────────────────────────── */
  const allChecked = Object.values(checked).every(Boolean)
  const canSubmit = !!reviewAction && !!reviewerName.trim() && allChecked && !submitting

  const handleSubmit = async () => {
    if (!selectedCase || !canSubmit) return
    setSubmitting(true)
    try {
      await api.submitReview(selectedCase.id, {
        reviewer_id: reviewerName.trim(),
        action: reviewAction,
        reasoning,
        notes: reasoning,
      })
      setToast(`Review submitted — case ${selectedCase.id.slice(0, 8)} marked as ${reviewAction}`)
      setSelectedCase(null)
      setDetail(null)
      await fetchQueue()
    } catch (e) {
      console.error("Submit failed:", e)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Toggle checklist ──────────────────────────────────────────────── */
  const toggleCheck = (key: ChecklistKey) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))

  /* ────────────────────────────────────────────────────────────────────
   *  RENDER
   * ──────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#14141d_1px,transparent_1px),linear-gradient(to_bottom,#14141d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* ── Header / Nav ──────────────────────────────────────────────── */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm glow-indigo">
              K
            </div>
            <div>
              <h1 className="font-bold text-text text-base leading-tight">Human Review Console</h1>
              <p className="text-[10px] text-text-muted font-mono tracking-wide">HUMAN-IN-THE-LOOP OVERSIGHT</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-2/50">
              <Scale className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono">
                <span className="text-text font-bold">{pendingCases.length}</span> pending
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Layout: Split Panel ──────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ─ LEFT PANEL: Review Queue ────────────────────────────────── */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="glass-panel rounded-2xl p-4 h-[calc(100vh-120px)] flex flex-col">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search queue…"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-surface-2/60 border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Review Queue</h2>
                <span className="text-[10px] text-text-muted tabular-nums">{pendingCases.length} cases</span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Activity className="w-6 h-6" />
                    </motion.div>
                    <span className="text-xs mt-3">Loading queue…</span>
                  </div>
                ) : pendingCases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                    <CheckCircle className="w-8 h-8 opacity-30 mb-2" />
                    <span className="text-xs">All cases cleared</span>
                    <span className="text-[10px] mt-0.5 opacity-60">No pending reviews</span>
                  </div>
                ) : (
                  <AnimatePresence>
                    {pendingCases.map((c, i) => {
                      const isSelected = selectedCase?.id === c.id
                      return (
                        <motion.button
                          key={c.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => selectCase(c)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all group",
                            isSelected
                              ? "bg-primary/10 border-primary/40 glow-indigo"
                              : "bg-surface-2/30 border-border/40 hover:border-border hover:bg-surface-2/60"
                          )}
                        >
                          {/* Name + risk badge */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-text truncate max-w-[160px]">
                              {c.customer_name}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums",
                                c.risk_score >= 70
                                  ? "text-red-400 border-red-500/30 bg-red-500/10"
                                  : c.risk_score >= 40
                                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                                  : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                              )}
                            >
                              {c.risk_score.toFixed(0)}
                            </span>
                          </div>

                          {/* Status + decision */}
                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/20">
                            <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-md", statusColor(c.status))}>
                              {c.status}
                            </span>
                            {c.decision && (
                              <span className="text-[9px] text-text-muted font-mono">
                                {c.decision}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      )
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          {/* ─ RIGHT PANEL: Review Workspace ───────────────────────────── */}
          <div className="lg:col-span-8 xl:col-span-9">
            <AnimatePresence mode="wait">
              {selectedCase ? (
                <motion.div
                  key={selectedCase.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* ── Case Header + Risk Gauge ─────────────────────────── */}
                  <div className="glass-panel rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      {/* Risk Gauge */}
                      <div className="shrink-0">
                        <RiskGauge score={selectedCase.risk_score} />
                      </div>

                      {/* Case meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold text-text">{selectedCase.customer_name}</h2>
                            <p className="text-xs text-text-muted font-mono mt-1 truncate">
                              Case ID: {selectedCase.id}
                            </p>
                            {selectedCase.created_at && (
                              <p className="text-[10px] text-text-muted mt-1">
                                Created {formatDate(selectedCase.created_at)}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 px-3 py-1 rounded-xl text-xs font-bold border",
                              statusColor(selectedCase.status)
                            )}
                          >
                            {selectedCase.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Agent Summary ─────────────────────────────────────── */}
                  {detailLoading ? (
                    <div className="glass-panel rounded-2xl p-8 flex items-center justify-center gap-3 text-text-muted">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                        <Brain className="w-5 h-5" />
                      </motion.div>
                      <span className="text-xs">Loading agent analysis…</span>
                    </div>
                  ) : detail?.agent_results && detail.agent_results.length > 0 ? (
                    <div className="glass-panel rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                          Agent Recommendations
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {detail.agent_results.map((agent) => (
                          <motion.div
                            key={agent.agent_name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 rounded-xl bg-surface-2/40 border border-border/50 hover:border-border transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Brain className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <span className="text-xs font-bold text-text capitalize">
                                {agent.agent_name.replaceAll("_", " ")}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md",
                                  statusColor(agent.recommendation || "PENDING")
                                )}
                              >
                                {agent.recommendation || "PROCEED"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                                  <motion.div
                                    className={cn(
                                      "h-full rounded-full",
                                      agent.confidence >= 0.8 ? "bg-emerald-400" :
                                      agent.confidence >= 0.5 ? "bg-amber-400" : "bg-red-400"
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${agent.confidence * 100}%` }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                  />
                                </div>
                                <span className={cn("text-[10px] font-bold tabular-nums", confidenceColor(agent.confidence))}>
                                  {(agent.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* ── Compliance Checklist ──────────────────────────────── */}
                  <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-accent" />
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                        Compliance Checklist
                      </h3>
                    </div>
                    <p className="text-[10px] text-text-muted mb-4">
                      All items must be verified before submitting a review decision.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CHECKLIST_ITEMS.map((item) => {
                        const Icon = item.icon
                        const isChecked = checked[item.id]
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            className={cn(
                              "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
                              isChecked
                                ? "bg-emerald-500/5 border-emerald-500/30"
                                : "bg-surface-2/30 border-border/40 hover:border-border"
                            )}
                          >
                            <div
                              className={cn(
                                "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                isChecked
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-border bg-transparent"
                              )}
                            >
                              {isChecked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", isChecked ? "text-emerald-400" : "text-text-muted")} />
                              <span className={cn("text-xs leading-relaxed", isChecked ? "text-emerald-300" : "text-text-muted")}>
                                {item.label}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Override / Decision Form ─────────────────────────── */}
                  <div className="glass-panel rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <Scale className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                        Submit Review Decision
                      </h3>
                    </div>

                    <div className="space-y-5">
                      {/* Reviewer name */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                          Reviewer Name
                        </label>
                        <input
                          type="text"
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="Enter your full name…"
                          className="w-full px-4 py-3 text-sm rounded-xl bg-surface-2/60 border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>

                      {/* Action select */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                          Decision Action
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              value: "APPROVE",
                              label: "Approve",
                              icon: CheckCircle,
                              activeClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 glow-emerald",
                              hoverClass: "hover:border-emerald-500/30 hover:text-emerald-400",
                            },
                            {
                              value: "ESCALATE",
                              label: "Escalate",
                              icon: AlertTriangle,
                              activeClass: "border-amber-500/50 bg-amber-500/10 text-amber-400 glow-amber",
                              hoverClass: "hover:border-amber-500/30 hover:text-amber-400",
                            },
                            {
                              value: "REQUEST_MORE_INFO",
                              label: "Request Info",
                              icon: FileText,
                              activeClass: "border-blue-500/50 bg-blue-500/10 text-blue-400",
                              hoverClass: "hover:border-blue-500/30 hover:text-blue-400",
                            },
                          ].map((opt) => {
                            const Icon = opt.icon
                            const active = reviewAction === opt.value
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setReviewAction(opt.value)}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center",
                                  active
                                    ? opt.activeClass
                                    : `bg-surface-2/30 border-border/40 text-text-muted ${opt.hoverClass}`
                                )}
                              >
                                <Icon className="w-5 h-5" />
                                <span className="text-xs font-bold">{opt.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                          Reasoning &amp; Notes
                        </label>
                        <textarea
                          value={reasoning}
                          onChange={(e) => setReasoning(e.target.value)}
                          placeholder="Document your compliance rationale for this decision…"
                          rows={4}
                          className="w-full px-4 py-3 text-sm rounded-xl bg-surface-2/60 border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors resize-none"
                        />
                      </div>

                      {/* Submit */}
                      <motion.button
                        whileHover={canSubmit ? { scale: 1.01 } : {}}
                        whileTap={canSubmit ? { scale: 0.98 } : {}}
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={cn(
                          "w-full p-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5",
                          canSubmit
                            ? "bg-primary hover:bg-primary-hover text-white glow-indigo cursor-pointer"
                            : "bg-surface-2 border border-border text-text-muted opacity-50 cursor-not-allowed"
                        )}
                      >
                        {submitting ? (
                          <>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                              <Activity className="w-4 h-4" />
                            </motion.div>
                            Submitting Review…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Review Decision
                          </>
                        )}
                      </motion.button>

                      {/* Validation hint */}
                      {!canSubmit && !submitting && (
                        <p className="text-[10px] text-text-muted text-center">
                          {!reviewerName.trim()
                            ? "Enter your reviewer name"
                            : !reviewAction
                            ? "Select a decision action"
                            : !allChecked
                            ? "Complete all checklist items"
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ── Empty state ─────────────────────────────────────────── */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center h-[calc(100vh-120px)]"
                >
                  <div className="w-20 h-20 rounded-2xl bg-surface-2/50 border border-border flex items-center justify-center mb-6">
                    <Scale className="w-10 h-10 text-text-muted opacity-30" />
                  </div>
                  <h3 className="text-base font-bold text-text mb-2">Human Review Console</h3>
                  <p className="text-xs text-text-muted max-w-sm leading-relaxed">
                    Select a case from the review queue to begin your compliance audit.
                    Review agent recommendations, verify checklist items, and submit your override decision.
                  </p>
                  <div className="flex items-center gap-4 mt-6 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> ELA Verify</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> PEP Audit</span>
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Anomaly Review</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* ── Success Toast ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}
