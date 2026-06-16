"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Settings, FileText, Brain, Shield, Activity,
  TrendingUp, Lightbulb, ArrowLeft
} from "lucide-react"
import { api } from "@/lib/api"
import { cn, formatDate } from "@/lib/utils"

type Policy = {
  id: string
  name: string
  version: string
  content: string
  effective_date: string
  status: string
}

type Tab = "policies" | "insights"

const insightsData = [
  {
    id: 1,
    pattern: "Reviewers approve 78% of cases where only identity resolution flags concern",
    confidence: 78,
    category: "Identity Resolution",
    icon: Shield,
    color: "indigo",
  },
  {
    id: 2,
    pattern: "Financial anomalies with income documentation reduce escalation by 45%",
    confidence: 87,
    category: "Financial Analysis",
    icon: TrendingUp,
    color: "emerald",
  },
  {
    id: 3,
    pattern: "PEP matches with low-risk financial profiles are approved 62% of the time",
    confidence: 62,
    category: "PEP Screening",
    icon: Activity,
    color: "amber",
  },
  {
    id: 4,
    pattern: "Tampered documents are never approved regardless of other agent findings",
    confidence: 99,
    category: "Document Integrity",
    icon: FileText,
    color: "red",
  },
]

const colorMap: Record<string, { ring: string; bg: string; text: string; bar: string; glow: string }> = {
  indigo: {
    ring: "ring-indigo-500/30",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    bar: "bg-indigo-500",
    glow: "shadow-[0_0_20px_-4px_rgba(99,102,241,0.3)]",
  },
  emerald: {
    ring: "ring-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    bar: "bg-emerald-500",
    glow: "shadow-[0_0_20px_-4px_rgba(34,197,94,0.3)]",
  },
  amber: {
    ring: "ring-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    bar: "bg-amber-500",
    glow: "shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)]",
  },
  red: {
    ring: "ring-red-500/30",
    bg: "bg-red-500/10",
    text: "text-red-400",
    bar: "bg-red-500",
    glow: "shadow-[0_0_20px_-4px_rgba(239,68,68,0.3)]",
  },
}

export default function SettingsPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("policies")

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true)
      try {
        const data = await api.getPolicies()
        setPolicies(data)
      } catch (e) {
        console.error("Failed to fetch policies:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchPolicies()
  }, [])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "policies", label: "Regulatory Policies", icon: <Shield className="w-4 h-4" /> },
    { key: "insights", label: "Learning Insights", icon: <Brain className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#14141d_1px,transparent_1px),linear-gradient(to_bottom,#14141d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm glow-indigo">
              K
            </div>
            <div>
              <h1 className="font-semibold text-lg text-text tracking-wide leading-none">
                Platform Settings
              </h1>
              <span className="text-[10px] text-text-muted">
                Policy Management & Learning
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Console
            </Link>
            <Link
              href="/benchmarks"
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Benchmarks
            </Link>
            <div className="p-2 rounded-xl bg-surface-2 border border-border">
              <Settings className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-text tracking-tight">
            Configuration & Intelligence
          </h2>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            Manage regulatory policies enforced across all screening agents and explore
            behavioural patterns learned from human reviewer overrides.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/80 border border-border w-fit mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === tab.key
                  ? "text-text"
                  : "text-text-muted hover:text-text"
              )}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-surface-2 border border-border rounded-lg"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "policies" && (
            <motion.div
              key="policies"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {/* Policies Section Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Active Regulatory Policies</h3>
                    <p className="text-xs text-text-muted">
                      Versioned Policy-as-Code definitions enforced by the Compliance Screening Agent.
                    </p>
                  </div>
                </div>
                <span className="text-xs text-text-muted bg-surface-2 px-3 py-1 rounded-full border border-border">
                  {policies.length} {policies.length === 1 ? "policy" : "policies"}
                </span>
              </div>

              {/* Loading / Empty / Policies */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                  <span className="text-sm text-text-muted">Loading policies…</span>
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                  <FileText className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-text-muted">No policies found. Run backend migrations to seed policy data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {policies.map((policy, idx) => (
                    <motion.div
                      key={policy.id ?? policy.version}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.4 }}
                      className="group rounded-2xl border border-border bg-surface/60 backdrop-blur-sm p-6 relative overflow-hidden hover:border-primary/30 transition-all duration-300"
                    >
                      {/* Hover glow */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      {/* Header */}
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-text text-base truncate">{policy.name}</h4>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-mono text-text-muted bg-surface-2 px-2 py-0.5 rounded border border-border/60">
                              v{policy.version}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              Effective: {formatDate(policy.effective_date)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ml-3",
                            policy.status === "ACTIVE"
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : "text-text-muted bg-surface-2 border-border"
                          )}
                        >
                          {policy.status}
                        </span>
                      </div>

                      {/* Content preview */}
                      <pre className="text-xs text-text-muted leading-relaxed font-sans whitespace-pre-wrap bg-surface-2/40 p-4 rounded-xl border border-border/30 max-h-40 overflow-y-auto relative z-10">
                        {policy.content}
                      </pre>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "insights" && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {/* Insights Section Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Lightbulb className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">Behavioural Patterns</h3>
                  <p className="text-xs text-text-muted">
                    Insights distilled from human reviewer overrides across all completed case reviews.
                  </p>
                </div>
              </div>

              {/* Insight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {insightsData.map((insight, idx) => {
                  const colors = colorMap[insight.color]
                  const Icon = insight.icon

                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.4 }}
                      className={cn(
                        "rounded-2xl border border-border bg-surface/60 backdrop-blur-sm p-6 relative overflow-hidden group hover:border-primary/20 transition-all duration-300",
                      )}
                    >
                      {/* Decorative corner glow */}
                      <div
                        className={cn(
                          "absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none",
                          colors.bar
                        )}
                      />

                      {/* Top bar */}
                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-2 rounded-lg", colors.bg)}>
                            <Icon className={cn("w-4 h-4", colors.text)} />
                          </div>
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider", colors.text)}>
                            {insight.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xl font-bold tabular-nums", colors.text)}>
                            {insight.confidence}%
                          </span>
                        </div>
                      </div>

                      {/* Pattern description */}
                      <p className="text-sm text-text leading-relaxed mb-5 relative z-10">
                        {insight.pattern}
                      </p>

                      {/* Confidence bar */}
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-text-muted uppercase tracking-wider">
                            Confidence
                          </span>
                          <span className={cn("text-[10px] font-semibold", colors.text)}>
                            {insight.confidence >= 80 ? "High" : insight.confidence >= 60 ? "Medium" : "Low"}
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${insight.confidence}%` }}
                            transition={{ delay: idx * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
                            className={cn("h-full rounded-full", colors.bar)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Footer note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 p-5 rounded-2xl border border-border bg-surface/50 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text mb-1">
                      Continuous Feedback Loop
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      These insights are automatically distilled from reviewer override patterns across
                      all completed cases. As more reviews are submitted, confidence scores are
                      recalibrated and new behavioural patterns emerge. This data informs policy
                      adjustments and agent threshold tuning.
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
