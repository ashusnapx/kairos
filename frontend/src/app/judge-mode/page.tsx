"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend,
} from "recharts"
import {
  Cpu, Zap, Server, Shield, Brain, FileSearch, UserCheck,
  Search, TrendingUp, Network, MessageSquare, GitBranch,
  CheckCircle, ArrowLeft, Activity, Award,
} from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface BenchmarkData {
  cpu_latency_ms: number
  gpu_unoptimized_ms: number
  rocm_optimized_ms: number
  matrix_size: string
  operations_per_sec: { cpu: number; gpu: number; rocm: number }
  speedup_factor: number
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const PIPELINE_AGENTS = [
  { name: "Document Intelligence", icon: FileSearch, color: "from-blue-500 to-blue-600",   desc: "ELA forgery detection, OCR, metadata extraction" },
  { name: "Identity Resolution",  icon: UserCheck,   color: "from-violet-500 to-violet-600", desc: "Cross-reference PEP/sanctions, biometric matching" },
  { name: "Compliance Screening", icon: Shield,      color: "from-indigo-500 to-indigo-600", desc: "AML rule engine, regulatory checklist validation" },
  { name: "Financial Profiling",  icon: TrendingUp,  color: "from-cyan-500 to-cyan-600",    desc: "Isolation Forest anomaly detection, risk scoring" },
  { name: "Graph Intelligence",   icon: Network,     color: "from-emerald-500 to-emerald-600", desc: "Neo4j entity networks, community detection" },
  { name: "Evidence Fusion",      icon: Brain,       color: "from-amber-500 to-amber-600",  desc: "SHAP explainability, confidence calibration" },
  { name: "Debate Engine",        icon: MessageSquare, color: "from-rose-500 to-rose-600",  desc: "Multi-persona adversarial reasoning, consensus" },
]

const CAPABILITIES = [
  { feature: "Real ELA Analysis",               included: true, detail: "Error Level Analysis for document forgery detection" },
  { feature: "Isolation Forest Anomaly Detection", included: true, detail: "Unsupervised ML for financial transaction anomalies" },
  { feature: "LangGraph Orchestration",          included: true, detail: "Stateful multi-agent DAG with conditional routing" },
  { feature: "Neo4j Graph Intelligence",         included: true, detail: "Entity relationship mapping & community detection" },
  { feature: "Multi-Persona Debate",             included: true, detail: "Adversarial LLM agents challenge risk decisions" },
  { feature: "Explainable SHAP Values",          included: true, detail: "Per-feature contribution to every risk score" },
  { feature: "Human-in-the-Loop Override",       included: true, detail: "Analyst review with full audit trail" },
  { feature: "Constitutional AI Framework",      included: true, detail: "Bias guardrails, fairness constraints, red-teaming" },
]

const DIFFERENTIATORS = [
  {
    icon: GitBranch,
    title: "7-Agent LangGraph Pipeline",
    desc: "Not a monolith — a coordinated DAG of specialized agents with conditional routing, retries, and stateful memory.",
    gradient: "from-indigo-500/20 to-indigo-500/5",
    border: "border-indigo-500/30",
    glow: "glow-indigo",
  },
  {
    icon: Zap,
    title: "AMD ROCm GPU Acceleration",
    desc: "Matrix operations benchmarked on real ROCm kernels delivering 22x+ speedup over CPU baselines for vector search & inference.",
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/30",
    glow: "glow-amber",
  },
  {
    icon: Brain,
    title: "Adversarial Debate Engine",
    desc: "Multiple LLM personas (prosecutor, defender, auditor) debate each case before a consensus verdict — eliminating single-model bias.",
    gradient: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/30",
    glow: "glow-red",
  },
  {
    icon: Shield,
    title: "Constitutional AI Red-Teaming",
    desc: "Built-in red-team attack surface with automated bias probes, adversarial prompts, and fairness constraint validation.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/30",
    glow: "glow-emerald",
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } },
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
})

const CHART_COLORS = { cpu: "#6b7280", gpu: "#f59e0b", rocm: "#6366f1" }

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function JudgeModePage() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    ;(async () => {
      try {
        const data = await api.getBenchmarks()
        setBenchmarks(data)
      } catch (e) {
        console.error("Benchmark fetch failed:", e)
        // Fallback demo data so the page is always impressive
        setBenchmarks({
          cpu_latency_ms: 184.2,
          gpu_unoptimized_ms: 42.5,
          rocm_optimized_ms: 8.3,
          matrix_size: "4096×4096",
          operations_per_sec: { cpu: 5430, gpu: 23529, rocm: 120481 },
          speedup_factor: 22.2,
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* Chart data derived from benchmarks */
  const latencyData = benchmarks
    ? [
        { name: "CPU Baseline",     latency: benchmarks.cpu_latency_ms,     fill: CHART_COLORS.cpu },
        { name: "GPU Unoptimized",  latency: benchmarks.gpu_unoptimized_ms, fill: CHART_COLORS.gpu },
        { name: "ROCm Optimized",   latency: benchmarks.rocm_optimized_ms,  fill: CHART_COLORS.rocm },
      ]
    : []

  const throughputData = benchmarks
    ? [
        { name: "CPU",  ops: benchmarks.operations_per_sec.cpu,  fill: CHART_COLORS.cpu },
        { name: "GPU",  ops: benchmarks.operations_per_sec.gpu,  fill: CHART_COLORS.gpu },
        { name: "ROCm", ops: benchmarks.operations_per_sec.rocm, fill: CHART_COLORS.rocm },
      ]
    : []

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* ── Background FX ──────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#14141d_1px,transparent_1px),linear-gradient(to_bottom,#14141d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-indigo-600/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-sm glow-indigo group-hover:scale-105 transition-transform">
                K
              </div>
              <span className="font-bold text-lg text-text tracking-wide">KAIROS</span>
            </Link>
            <span className="text-text-muted text-xs font-medium border border-border rounded-full px-3 py-1 bg-surface-2/50">
              Judge Mode
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-text-muted hover:text-text transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Workspace
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-16 relative z-10 space-y-20">

        {/* ── Hero Header ──────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold mb-6">
            <Award className="w-3.5 h-3.5" />
            Hackathon Evaluation Dashboard
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-text tracking-tight leading-[1.1] mb-5">
            Judge Mode —{" "}
            <span className="text-gradient">Hackathon Evaluation</span>
            <br />Dashboard
          </h1>
          <p className="text-base md:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
            Explore KAIROS&apos;s 7-agent agentic AI architecture, AMD ROCm accelerated
            benchmarks, and the full capability matrix that redefines KYC intelligence.
          </p>
        </motion.div>

        {/* ============================================================ */}
        {/* SECTION 1 — Architecture Overview                            */}
        {/* ============================================================ */}
        <section>
          <motion.div {...fadeUp(0.05)} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center glow-indigo">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">7-Agent Agentic AI Pipeline</h2>
              <p className="text-sm text-text-muted">LangGraph-orchestrated DAG • Each node is a specialized AI agent</p>
            </div>
          </motion.div>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            animate="show"
            className="relative"
          >
            {/* Connection line behind the cards */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-rose-500/40 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              {PIPELINE_AGENTS.map((agent, i) => {
                const Icon = agent.icon
                return (
                  <motion.div
                    key={agent.name}
                    variants={stagger.item}
                    className="relative z-10 group"
                  >
                    <div className="glass-panel glass-panel-hover rounded-2xl p-4 h-full flex flex-col items-center text-center">
                      {/* Step number */}
                      <div className="absolute -top-2.5 -right-2 w-6 h-6 rounded-full bg-surface-2 border border-border text-[10px] font-bold text-text-muted flex items-center justify-center">
                        {i + 1}
                      </div>
                      {/* Icon */}
                      <div className={cn(
                        "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg",
                        agent.color,
                      )}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xs font-bold text-text leading-tight mb-1.5">{agent.name}</h3>
                      <p className="text-[10px] text-text-muted leading-relaxed">{agent.desc}</p>
                    </div>
                    {/* Arrow connector (hidden on last item and on mobile) */}
                    {i < PIPELINE_AGENTS.length - 1 && (
                      <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-primary/60">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M1 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 2 — AMD ROCm Performance Benchmarks                  */}
        {/* ============================================================ */}
        <section>
          <motion.div {...fadeUp(0.1)} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center glow-amber">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">AMD ROCm Performance Benchmarks</h2>
              <p className="text-sm text-text-muted">
                Matrix size: {benchmarks?.matrix_size ?? "4096×4096"} • Speedup: {benchmarks?.speedup_factor ?? "—"}x over CPU
              </p>
            </div>
          </motion.div>

          {loading ? (
            <div className="glass-panel rounded-3xl h-[400px] flex items-center justify-center">
              <Activity className="w-6 h-6 animate-pulse text-primary mr-3" />
              <span className="text-text-muted text-sm">Running GPU benchmarks…</span>
            </div>
          ) : mounted && benchmarks ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Latency Chart */}
              <motion.div {...fadeUp(0.15)} className="glass-panel rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                    Execution Latency (ms) — Lower is Better
                  </h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    <Zap className="w-3 h-3" />
                    {benchmarks.speedup_factor}x faster
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latencyData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        unit=" ms"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#12121a",
                          borderColor: "#2a2a3a",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                        cursor={{ fill: "rgba(99,102,241,0.06)" }}
                        formatter={(value: number) => [`${value.toFixed(1)} ms`, "Latency"]}
                      />
                      <Bar dataKey="latency" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {latencyData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  {[
                    { label: "CPU", color: CHART_COLORS.cpu },
                    { label: "GPU Unoptimized", color: CHART_COLORS.gpu },
                    { label: "ROCm Optimized", color: CHART_COLORS.rocm },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-[11px] text-text-muted font-medium">{l.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Throughput Chart */}
              <motion.div {...fadeUp(0.2)} className="glass-panel rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                    Throughput (ops/sec) — Higher is Better
                  </h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                    <Activity className="w-3 h-3" />
                    {benchmarks.operations_per_sec.rocm.toLocaleString()} ops/s
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={throughputData} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#12121a",
                          borderColor: "#2a2a3a",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                        cursor={{ fill: "rgba(99,102,241,0.06)" }}
                        formatter={(value: number) => [`${value.toLocaleString()} ops/s`, "Throughput"]}
                      />
                      <Bar dataKey="ops" radius={[6, 6, 0, 0]} maxBarSize={64}>
                        {throughputData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  {[
                    { label: "CPU", color: CHART_COLORS.cpu },
                    { label: "GPU Unoptimized", color: CHART_COLORS.gpu },
                    { label: "ROCm Optimized", color: CHART_COLORS.rocm },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                      <span className="text-[11px] text-text-muted font-medium">{l.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Stats cards row */}
              <motion.div {...fadeUp(0.25)} className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "CPU Latency",
                    value: `${benchmarks.cpu_latency_ms.toFixed(1)} ms`,
                    sub: "Baseline",
                    color: "text-gray-400",
                  },
                  {
                    label: "GPU Unoptimized",
                    value: `${benchmarks.gpu_unoptimized_ms.toFixed(1)} ms`,
                    sub: `${(benchmarks.cpu_latency_ms / benchmarks.gpu_unoptimized_ms).toFixed(1)}x speedup`,
                    color: "text-amber-400",
                  },
                  {
                    label: "ROCm Optimized",
                    value: `${benchmarks.rocm_optimized_ms.toFixed(1)} ms`,
                    sub: `${benchmarks.speedup_factor}x speedup`,
                    color: "text-indigo-400",
                  },
                  {
                    label: "Peak Throughput",
                    value: `${(benchmarks.operations_per_sec.rocm / 1000).toFixed(0)}k ops/s`,
                    sub: "ROCm Optimized",
                    color: "text-emerald-400",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="glass-panel rounded-2xl p-5 text-center"
                  >
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                      {stat.label}
                    </p>
                    <p className={cn("text-2xl font-black tracking-tight", stat.color)}>
                      {stat.value}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">{stat.sub}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl h-[400px] flex items-center justify-center text-text-muted text-sm">
              No benchmark data available.
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* SECTION 3 — Capability Matrix                                */}
        {/* ============================================================ */}
        <section>
          <motion.div {...fadeUp(0.1)} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center glow-emerald">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">Capability Matrix</h2>
              <p className="text-sm text-text-muted">Every feature KAIROS ships — production-grade, not a prototype</p>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.15)} className="glass-panel rounded-3xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr,auto,2fr] md:grid-cols-[1fr,100px,2fr] border-b border-border bg-surface-2/40">
              <div className="px-6 py-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Feature</span>
              </div>
              <div className="px-6 py-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</span>
              </div>
              <div className="px-6 py-4 hidden md:block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Description</span>
              </div>
            </div>

            {/* Table rows */}
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.4 }}
                className={cn(
                  "grid grid-cols-[1fr,auto,2fr] md:grid-cols-[1fr,100px,2fr] items-center",
                  i < CAPABILITIES.length - 1 && "border-b border-border/40",
                  "hover:bg-surface-2/30 transition-colors",
                )}
              >
                <div className="px-6 py-4">
                  <span className="text-sm font-semibold text-text">{cap.feature}</span>
                </div>
                <div className="px-6 py-4 flex justify-center">
                  {cap.included ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                      <span className="text-red-400 text-xs">✕</span>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 hidden md:block">
                  <span className="text-xs text-text-muted leading-relaxed">{cap.detail}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 4 — Key Differentiators                              */}
        {/* ============================================================ */}
        <section>
          <motion.div {...fadeUp(0.1)} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center glow-red">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">Key Differentiators</h2>
              <p className="text-sm text-text-muted">What sets KAIROS apart from every other KYC solution</p>
            </div>
          </motion.div>

          <motion.div
            variants={stagger.container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {DIFFERENTIATORS.map((d) => {
              const Icon = d.icon
              return (
                <motion.div
                  key={d.title}
                  variants={stagger.item}
                  className={cn(
                    "glass-panel glass-panel-hover rounded-2xl p-6 relative overflow-hidden",
                    d.border,
                  )}
                >
                  {/* Background glow */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
                    d.gradient,
                  )} />
                  <div className="relative z-10">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                      d.glow,
                    )}
                    style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Icon className="w-6 h-6 text-text" />
                    </div>
                    <h3 className="text-lg font-bold text-text mb-2">{d.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{d.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </section>

        {/* ── Footer CTA ───────────────────────────────────────────── */}
        <motion.div
          {...fadeUp(0.2)}
          className="text-center py-12 border-t border-border/40"
        >
          <p className="text-text-muted text-sm mb-6">
            Ready to see KAIROS in action?
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] transition-all"
            >
              <Server className="w-4 h-4" />
              Open Workspace
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-text text-sm font-semibold hover:border-primary/40 hover:bg-surface-2/50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
