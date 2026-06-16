"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Activity, CheckCircle, AlertTriangle, Clock, Cpu, Database, Brain, GitBranch, MessageSquare, Network, Scale, Shield, TrendingUp, Users } from "lucide-react"
import { api } from "@/lib/api"

const AGENT_FLOW = [
  { id: "document_intelligence", name: "Document Intelligence", icon: Shield, color: "from-red-500 to-orange-500", status: "idle" },
  { id: "identity_resolution", name: "Identity Resolution", icon: Users, color: "from-blue-500 to-cyan-500", status: "idle" },
  { id: "compliance_screening", name: "Compliance Screening", icon: Scale, color: "from-violet-500 to-purple-500", status: "idle" },
  { id: "financial_profiling", name: "Financial Profiling", icon: TrendingUp, color: "from-emerald-500 to-teal-500", status: "idle" },
  { id: "graph_intelligence", name: "Graph Intelligence", icon: Network, color: "from-amber-500 to-orange-500", status: "idle" },
  { id: "evidence_fusion", name: "Evidence Fusion", icon: GitBranch, color: "from-pink-500 to-rose-500", status: "idle" },
  { id: "debate_engine", name: "Debate Engine", icon: MessageSquare, color: "from-indigo-500 to-purple-500", status: "idle" },
]

export default function WorkspacePage() {
  const [cases, setCases] = useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [agentStates, setAgentStates] = useState(AGENT_FLOW)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getCases().then((data) => {
      setCases(data)
      setLoading(false)
    })
  }, [])

  const activeCase = cases.find((c) => c.id === selectedCaseId)

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-text-muted hover:text-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-text">Agent Command Center</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Activity className="w-4 h-4" />
            <span>{cases.length} cases processed</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold text-text mb-4">Agent Workforce</h2>
              <div className="space-y-2">
                {agentStates.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} p-1.5`}>
                      <agent.icon className="w-full h-full text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">{agent.name}</p>
                      <p className="text-xs text-text-muted capitalize">{agent.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold text-text mb-6">Agent Orchestration Flow</h2>
              <div className="relative">
                <svg className="w-full" viewBox="0 0 800 300" fill="none">
                  {agentStates.map((_, i) => {
                    if (i >= agentStates.length - 1) return null
                    const x1 = 60 + i * 110
                    const x2 = 60 + (i + 1) * 110
                    return (
                      <line key={i} x1={x1 + 40} y1="80" x2={x2} y2="80" stroke="#2a2a3a" strokeWidth="2" strokeDasharray="6 4" />
                    )
                  })}
                  {agentStates.map((agent, i) => {
                    const x = 40 + i * 110
                    return (
                      <g key={agent.id}>
                        <defs>
                          <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={agent.color.split(" ")[0].replace("from-", "#").replace("red", "ef4444").replace("blue", "3b82f6").replace("violet", "8b5cf6").replace("emerald", "22c55e").replace("amber", "f59e0b").replace("pink", "ec4899").replace("indigo", "6366f1")} />
                            <stop offset="100%" stopColor={agent.color.split(" ")[1].replace("to-", "#").replace("orange", "f97316").replace("cyan", "06b6d4").replace("purple", "a855f7").replace("teal", "14b8a6").replace("rose", "f43f5e")} />
                          </linearGradient>
                        </defs>
                        <rect x={x} y="50" width="80" height="60" rx="12" fill={`url(#grad-${i})`} opacity="0.15" stroke={`url(#grad-${i})`} strokeWidth="1" />
                        <text x={x + 40} y="88" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">
                          {agent.name.split(" ")[0]}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center text-text-muted mt-6">
                Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-12 text-center mt-6">
                <Brain className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted mb-4">No cases processed yet</p>
                <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface mt-6">
                <div className="p-5 border-b border-border">
                  <h3 className="font-semibold text-text">Recent Cases</h3>
                </div>
                <div className="divide-y divide-border">
                  {cases.slice(0, 10).map((case_) => (
                    <div key={case_.id} className="p-4 flex items-center justify-between hover:bg-surface-2/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          case_.status === "APPROVED" ? "bg-emerald-400" :
                          case_.status === "ESCALATED" ? "bg-red-400" :
                          case_.status === "IN_PROGRESS" ? "bg-blue-400" : "bg-amber-400"
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-text">{case_.customer_name}</p>
                          <p className="text-xs text-text-muted">{case_.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <Link
                        href={`/cases/${case_.id}`}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
