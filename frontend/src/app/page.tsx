"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Shield, FileSearch, UserCheck,
  Search, TrendingUp, MessageSquare, Cpu, Zap,
  CheckCircle, XCircle, AlertTriangle, Loader2, Database,
  Upload, Activity, Sparkles, Layers, Network,
  BarChart3, Clock, ChevronRight
} from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const ThreeBackground = dynamic(() => import("@/components/three-scene"), {
  ssr: false,
  loading: () => null,
})

interface CaseSummary {
  id: string
  status: string
  customer_name: string
  risk_score: number
  decision: string | null
  created_at: string
}

interface Metrics {
  cases: { total: number; approved: number; escalated: number; reviewed: number }
  agents: { avg_execution_time_ms: number }
  system: { service: string; version: string }
  avg_risk?: number
  avg_confidence?: number
}

const AGENTS = [
  {
    id: "document_agent", name: "Document Intelligence",
    icon: FileSearch, color: "from-red-500 to-orange-500", gradient: "from-red-500/10 to-orange-500/10",
    border: "border-red-500/20", text: "text-red-400", badge: "ELA Forensics",
    desc: "Error Level Analysis for digital forgery detection on ID documents.",
  },
  {
    id: "identity_agent", name: "Identity Resolution",
    icon: UserCheck, color: "from-pink-500 to-purple-500", gradient: "from-pink-500/10 to-purple-500/10",
    border: "border-pink-500/20", text: "text-pink-400", badge: "Biometric Match",
    desc: "Cross-matches customer identity across databases with fuzzy name matching.",
  },
  {
    id: "compliance_agent", name: "Compliance Screening",
    icon: Search, color: "from-violet-500 to-indigo-500", gradient: "from-violet-500/10 to-indigo-500/10",
    border: "border-violet-500/20", text: "text-indigo-400", badge: "PEP / Sanctions",
    desc: "Real-time PEP checks, OFAC sanctions lookup, and FATF policy alignment.",
  },
  {
    id: "financial_agent", name: "Financial Profiling",
    icon: TrendingUp, color: "from-blue-500 to-cyan-500", gradient: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-500/20", text: "text-cyan-400", badge: "Anomaly Detection",
    desc: "Isolation Forest ML for transaction structuring and CTR avoidance flags.",
  },
  {
    id: "graph_agent", name: "Graph Intelligence",
    icon: Network, color: "from-cyan-500 to-teal-500", gradient: "from-cyan-500/10 to-teal-500/10",
    border: "border-cyan-500/20", text: "text-cyan-400", badge: "Neo4j Analysis",
    desc: "Entity-relationship mapping across devices, addresses, and fraud rings.",
  },
  {
    id: "fusion_agent", name: "Evidence Fusion",
    icon: Layers, color: "from-emerald-500 to-green-500", gradient: "from-emerald-500/10 to-green-500/10",
    border: "border-emerald-500/20", text: "text-emerald-400", badge: "Weighted Scoring",
    desc: "Consolidates agent recommendations into a mathematically weighted metric.",
  },
  {
    id: "debate_engine", name: "Debate Engine",
    icon: MessageSquare, color: "from-amber-500 to-red-500", gradient: "from-amber-500/10 to-red-500/10",
    border: "border-amber-500/20", text: "text-amber-400", badge: "3-Persona Debate",
    desc: "Adversarial debate among Conservative, Growth, and Forensic personas.",
  },
]

const STAGES = [
  { id: "upload", name: "Upload", icon: Upload },
  { id: "ocr", name: "OCR", icon: FileSearch },
  { id: "identity", name: "Identity", icon: UserCheck },
  { id: "compliance", name: "Compliance", icon: Search },
  { id: "financial", name: "Financial", icon: TrendingUp },
  { id: "fusion", name: "Fusion", icon: Layers },
  { id: "debate", name: "Debate", icon: MessageSquare },
  { id: "decision", name: "Decision", icon: Shield },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [threeReady, setThreeReady] = useState(false)
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCaseIdx, setActiveCaseIdx] = useState(0)

  useEffect(() => {
    setMounted(true)
    const load = async () => {
      try {
        const [casesData, metricsData] = await Promise.allSettled([
          api.getCases(),
          api.getMetrics(),
        ])
        if (casesData.status === "fulfilled") {
          const list = Array.isArray(casesData.value) ? casesData.value : (casesData.value.cases || casesData.value.items || [])
          setCases(list)
        }
        if (metricsData.status === "fulfilled") setMetrics(metricsData.value)
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
    const timer = setTimeout(() => setThreeReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const latestCase = cases[activeCaseIdx] || null
  const latestStages = (() => {
    if (!latestCase) return STAGES.map(() => "pending")
    const order: Record<string, number> = {
      PENDING: 0, UPLOADED: 1, OCR_COMPLETE: 2, IDENTITY_COMPLETE: 3,
      COMPLIANCE_COMPLETE: 4, FINANCIAL_COMPLETE: 5, FUSION_COMPLETE: 6,
      DEBATE_COMPLETE: 7, APPROVED: 8, REVIEW: 8, ESCALATED: 8,
    }
    const idx = order[latestCase.status] ?? -1
    return STAGES.map((_, i) => {
      if (i < idx) return "complete"
      if (i === idx) return "in_progress"
      return "pending"
    })
  })()

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#111116_1px,transparent_1px),linear-gradient(to_bottom,#111116_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-40 pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base">K</div>
            <span className="font-semibold text-text text-base tracking-tight">KAIROS</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/kyc" className="text-xs font-semibold text-text-muted hover:text-text transition-colors">KYC</Link>
            <Link href="/dashboard" className="text-xs font-semibold text-text-muted hover:text-text transition-colors hidden sm:inline">Dashboard</Link>
            <Link href="/kyc" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all shadow-lg shadow-primary/20">
              Start KYC
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-indigo-500/3 to-background" />
          {threeReady && <ThreeBackground />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background opacity-60" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center pt-24 pb-20">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" /> Multi-Agent Compliance Intelligence
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]"
            >
              Trust, Resolved.
              <br />
              <span className="text-gradient">Autonomous KYC Intelligence.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-sm sm:text-base text-text-muted mt-6 max-w-2xl mx-auto leading-relaxed"
            >
              KAIROS coordinates 7 specialized AI agents — from forensic document analysis to
              multi-persona debate — converting compliance into explainable, auditable trust verdicts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-10 flex flex-wrap gap-4 justify-center"
            >
              <Link
                href="/kyc"
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
              >
                Start Your KYC <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-2xl bg-surface border border-border/80 hover:border-primary/30 text-text text-sm font-semibold transition-all"
              >
                View Dashboard
              </Link>
            </motion.div>

            {/* Live stats bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-16 flex flex-wrap justify-center gap-6 sm:gap-12"
            >
              <StatItem icon={BarChart3} value={metrics?.cases.total ?? "—"} label="Total Cases" />
              <StatItem icon={CheckCircle} value={metrics?.cases.approved ?? "—"} label="Approved" color="text-success" />
              <StatItem icon={AlertTriangle} value={metrics?.cases.escalated ?? "—"} label="Escalated" color="text-warning" />
              <StatItem icon={Clock} value={metrics ? `${(metrics.agents.avg_execution_time_ms / 1000).toFixed(1)}s` : "—"} label="Avg Time" />
            </motion.div>
          </div>
        </section>

        {/* ─── Agent Bento Grid ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-12"
          >
            <motion.p variants={itemVariants} className="inline-flex items-center gap-2 text-xs font-semibold text-primary mb-3">
              <Cpu className="w-3.5 h-3.5" /> 7 Specialized Agents
            </motion.p>
            <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
              The Intelligence Pipeline
            </motion.h2>
            <motion.p variants={itemVariants} className="text-sm text-text-muted mt-2 max-w-xl mx-auto">
              Each agent performs a distinct function in the verification workflow, passing results downstream.
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {AGENTS.map((agent, i) => {
              const Icon = agent.icon
              const isLarge = i === 0 || i === AGENTS.length - 1
              return (
                <motion.div
                  key={agent.id}
                  variants={itemVariants}
                  className={cn(
                    "group relative rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1",
                    agent.gradient, agent.border,
                    isLarge ? "sm:col-span-2 lg:col-span-1" : ""
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shrink-0", agent.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-text">{agent.name}</h3>
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", agent.border, agent.text)}>
                          {agent.badge}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">{agent.desc}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* ─── Live Pipeline Demo ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-12"
          >
            <motion.p variants={itemVariants} className="inline-flex items-center gap-2 text-xs font-semibold text-primary mb-3">
              <Activity className="w-3.5 h-3.5" /> Live Pipeline
            </motion.p>
            <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
              Real-Time Processing
            </motion.h2>
            <motion.p variants={itemVariants} className="text-sm text-text-muted mt-2">
              {latestCase
                ? `Latest case: ${latestCase.customer_name}`
                : "Submit a KYC to see the pipeline in action"}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-surface/30 backdrop-blur-sm p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-text">Agent Pipeline</span>
              </div>
              {cases.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveCaseIdx((p) => (p - 1 + cases.length) % cases.length)}
                    className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
                    type="button"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-[10px] font-mono text-text-muted">
                    {activeCaseIdx + 1}/{cases.length}
                  </span>
                  <button
                    onClick={() => setActiveCaseIdx((p) => (p + 1) % cases.length)}
                    className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
                    type="button"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {STAGES.map((stage, i) => {
                const Icon = stage.icon
                const status = latestStages[i]
                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                      status === "complete"
                        ? "border-success/20 bg-success/5"
                        : status === "in_progress"
                          ? "border-primary/20 bg-primary/5"
                          : "border-border/50 bg-surface-2/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                        status === "complete"
                          ? "bg-success/10 text-success"
                          : status === "in_progress"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-2 text-text-muted"
                      )}
                    >
                      {status === "complete" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : status === "in_progress" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider text-center",
                        status === "complete"
                          ? "text-success"
                          : status === "in_progress"
                            ? "text-primary"
                            : "text-text-muted"
                      )}
                    >
                      {stage.name}
                    </span>
                  </div>
                )
              })}
            </div>

            {latestCase && latestCase.decision && (
              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-text-muted">Decision:</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                    latestCase.decision === "APPROVED"
                      ? "border-success/20 bg-success/10 text-success"
                      : latestCase.decision === "REVIEW"
                        ? "border-warning/20 bg-warning/10 text-warning"
                        : "border-danger/20 bg-danger/10 text-danger"
                  )}
                >
                  {latestCase.decision === "APPROVED" ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : latestCase.decision === "REVIEW" ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {latestCase.decision}
                </span>
                <span className={cn("text-xs font-bold", riskColor(latestCase.risk_score))}>
                  Risk: {latestCase.risk_score.toFixed(0)}/100
                </span>
              </div>
            )}
          </motion.div>
        </section>

        {/* ─── Stats Section ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-12"
          >
            <motion.p variants={itemVariants} className="inline-flex items-center gap-2 text-xs font-semibold text-primary mb-3">
              <BarChart3 className="w-3.5 h-3.5" /> Live Metrics
            </motion.p>
            <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
              System Performance
            </motion.h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatsCard variants={itemVariants} icon={BarChart3} value={metrics?.cases.total ?? "—"} label="Total Cases" />
            <StatsCard variants={itemVariants} icon={CheckCircle} value={metrics?.cases.approved ?? "—"} label="Approved" color="text-success" />
            <StatsCard variants={itemVariants} icon={AlertTriangle} value={metrics?.cases.escalated ?? "—"} label="Escalated" color="text-warning" />
            <StatsCard variants={itemVariants} icon={Clock} value={metrics ? `${(metrics.agents.avg_execution_time_ms / 1000).toFixed(1)}s` : "—"} label="Avg Processing" />
          </motion.div>
        </section>

        {/* ─── CTA ─── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface to-indigo-500/5 p-8 sm:p-12 text-center overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-text tracking-tight mb-4">
                Ready to Verify?
              </h2>
              <p className="text-sm text-text-muted max-w-lg mx-auto mb-8">
                Start your KYC application and experience the full 7-agent pipeline in action.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/kyc"
                  className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
                >
                  Start Your KYC <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 rounded-2xl bg-surface border border-border/80 hover:border-primary/30 text-text text-sm font-semibold transition-all"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t border-border/30 text-center">
        <p className="text-[10px] font-semibold text-text-muted">
          KAIROS — KYC Autonomous Intelligence & Risk Oversight System
        </p>
      </footer>
    </div>
  )
}

function StatItem({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: any
  value: string | number
  label: string
  color?: string
}) {
  return (
    <div className="text-center">
      <div className={cn("text-xl sm:text-2xl font-bold text-text", color)}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-1 justify-center">
        <Icon className="w-3 h-3" />
        {label}
      </div>
    </div>
  )
}

function StatsCard({
  variants: v,
  icon: Icon,
  value,
  label,
  color,
}: {
  variants: any
  icon: any
  value: string | number
  label: string
  color?: string
}) {
  return (
    <motion.div
      variants={v}
      className="rounded-2xl border border-border bg-surface/50 p-6 text-center hover:border-primary/20 transition-colors"
    >
      <Icon className={cn("w-6 h-6 mx-auto mb-3", color || "text-primary")} />
      <div className={cn("text-2xl sm:text-3xl font-bold text-text mb-1", color)}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-text-muted">{label}</div>
    </motion.div>
  )
}

function riskColor(risk: number): string {
  if (risk < 30) return "text-success"
  if (risk < 60) return "text-warning"
  return "text-danger"
}
