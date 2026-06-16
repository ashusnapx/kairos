"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Shield, Brain, GitBranch, Network, Scale, Users, Activity, BarChart3, Cpu, FileText } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

export default function JudgeModePage() {
  const [comparison, setComparison] = useState<any>(null)

  useEffect(() => {
    api.getJudgeComparison().then(setComparison).catch(console.error)
  }, [])

  const capabilities = comparison?.capabilities ?? []

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-lg text-text">KAIROS — Judge Mode</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-text-muted hover:text-text transition-colors">Dashboard</Link>
            <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">Home</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-text mb-4">Judge Mode</h1>
          <p className="text-xl text-text-muted max-w-3xl mx-auto">
            See how KAIROS transforms compliance from document processing into evidence-driven intelligence.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-border bg-surface overflow-hidden mb-16"
        >
          <div className="grid grid-cols-[2fr,1fr,1fr] gap-px bg-border">
            <div className="p-5 bg-surface">
              <span className="text-xs font-bold uppercase tracking-wider text-text">Capability</span>
            </div>
            <div className="p-5 bg-surface text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Traditional KYC</span>
            </div>
            <div className="p-5 bg-surface text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">KAIROS</span>
            </div>

            {capabilities.map((cap: any, i: number) => (
              <div key={i} className="contents">
                <div className="p-5 bg-surface-2/30 flex items-center gap-3">
                  <span className="text-sm text-text">{cap.capability}</span>
                </div>
                <div className="p-5 bg-surface-2/30 flex items-center justify-center">
                  {typeof cap.traditional === "boolean" ? (
                    cap.traditional ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400/60" />
                    )
                  ) : (
                    <span className="text-xs text-text-muted">{cap.traditional}</span>
                  )}
                </div>
                <div className="p-5 bg-surface-2/30 flex items-center justify-center">
                  {typeof cap.kairos === "boolean" ? (
                    cap.kairos ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400/60" />
                    )
                  ) : (
                    <span className="text-xs text-primary font-medium">{cap.kairos}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          {[
            {
              title: "Architecture",
              icon: Network,
              items: ["7 specialized agents", "LangGraph orchestration", "Event-driven (Redis Streams)", "AMD ROCm optimized", "PostgreSQL + Neo4j + Redis"],
            },
            {
              title: "Intelligence",
              icon: Brain,
              items: ["Qwen3 + Qwen2.5-VL on ROCm", "Sentence Transformer embeddings", "LightGBM + Isolation Forest", "SHAP explainability", "Multi-agent debate"],
            },
            {
              title: "Enterprise",
              icon: Shield,
              items: ["Full audit trails", "Policy-as-code framework", "Human-in-the-loop learning", "Adversarial red teaming", "Real-time observability"],
            },
          ].map((section) => (
            <div key={section.title} className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 p-2">
                  <section.icon className="w-full h-full text-white" />
                </div>
                <h3 className="font-semibold text-text">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative rounded-3xl border border-border bg-surface p-8 md:p-12 text-center overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-text mb-4">
              KAIROS transforms compliance from document processing into evidence-driven intelligence.
            </h2>
            <p className="text-lg text-text-muted mb-8 max-w-2xl mx-auto">
              Seven specialized agents collaborate to investigate, debate, and explain — preserving human authority while augmenting judgment with AI.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium transition-all"
              >
                Launch KAIROS
              </Link>
              <Link
                href="/human-review"
                className="px-6 py-3 rounded-xl border border-border hover:border-primary/50 text-text font-medium transition-all"
              >
                Human Review Console
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
