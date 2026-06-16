"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowRight, Shield, Brain, GitBranch, Scale, FileSearch, UserCheck,
  Search, TrendingUp, Network, MessageSquare, FileText, Cpu, Zap,
  CheckCircle, XCircle, AlertTriangle, Loader2, Server, Database,
  Share2, Eye, Upload, Plus, ChevronRight, Activity
} from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"

const AGENT_META: Record<string, { icon: any, color: string, label: string }> = {
  document_intelligence: { icon: FileSearch, color: "from-red-500 to-orange-500", label: "Document Intel" },
  identity_resolution: { icon: UserCheck, color: "from-pink-500 to-purple-500", label: "Identity Res." },
  compliance_screening: { icon: Search, color: "from-violet-500 to-indigo-500", label: "Compliance" },
  financial_profiling: { icon: TrendingUp, color: "from-blue-500 to-cyan-500", label: "Financial" },
  graph_intelligence: { icon: Network, color: "from-cyan-500 to-teal-500", label: "Graph Intel" },
  evidence_fusion: { icon: Layers, color: "from-emerald-500 to-green-500", label: "Fusion" },
  debate_engine: { icon: MessageSquare, color: "from-amber-500 to-red-500", label: "Debate" },
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    FAILURE: "bg-red-500/10 text-red-400 border-red-500/20",
  }
  return colors[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20"
}

function AgentPipeline({ results, showLabels = true }: { results: any[], showLabels?: boolean }) {
  const agents = ["document_intelligence", "identity_resolution", "compliance_screening", "financial_profiling", "graph_intelligence", "evidence_fusion", "debate_engine"]
  const agentMap = new Map(results.map(r => [r.agent_name, r]))

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {agents.map((name, i) => {
        const a = agentMap.get(name)
        const meta = AGENT_META[name] || { icon: Cpu, color: "from-slate-500 to-slate-600", label: name }
        const Icon = meta.icon
        const isLast = i === agents.length - 1
        return (
          <div key={name} className="flex items-center shrink-0">
            <div className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl border ${a ? "border-border bg-surface" : "border-border/30 bg-surface/50"}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.color} p-1.5 ${a ? "" : "opacity-40"}`}>
                <Icon className="w-full h-full text-white" />
              </div>
              {showLabels && <span className="text-[10px] text-text-muted font-medium whitespace-nowrap">{meta.label}</span>}
              {a && (
                <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${a.status === "SUCCESS" ? "bg-emerald-400" : a.status === "FAILURE" ? "bg-red-400" : "bg-amber-400"}`} />
                  <span className="text-[9px] text-text-muted">{a.confidence > 0 ? `${(a.confidence * 100).toFixed(0)}%` : "—"}</span>
                </div>
              )}
            </div>
            {!isLast && (
              <div className="w-4 h-px bg-border/50 mx-0.5" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AgentResultRow({ result }: { result: any }) {
  const meta = AGENT_META[result.agent_name] || { icon: Cpu, color: "from-slate-500 to-slate-600", label: result.agent_name }
  const Icon = meta.icon
  const findings = result.findings || []
  const evidence = result.evidence || []
  const uncertainties = result.uncertainties || []

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.color} p-2`}>
          <Icon className="w-full h-full text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text text-sm">{meta.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge(result.status)}`}>
              {result.status}
            </span>
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Confidence: {(result.confidence * 100).toFixed(0)}% · Rec: {result.recommendation} · {result.execution_time_ms}ms
          </div>
        </div>
      </div>
      {findings.length > 0 && (
        <div className="p-3 border-b border-border/30">
          <div className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wider">Findings</div>
          {findings.map((f: any, i: number) => (
            <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${f.confidence > 0.7 ? "bg-red-400" : f.confidence > 0.4 ? "bg-amber-400" : "bg-emerald-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text"><span className="font-medium">{f.finding_type}</span> — {f.description}</div>
                {f.evidence?.map((e: any, j: number) => (
                  <div key={j} className="text-[11px] text-text-muted mt-0.5 truncate">{e.source}: {typeof e.content === 'string' ? e.content.slice(0, 120) : JSON.stringify(e.content).slice(0, 120)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {uncertainties.length > 0 && (
        <div className="p-3">
          <div className="text-[11px] font-medium text-amber-400 mb-1">Uncertainties ({uncertainties.length})</div>
          {uncertainties.map((u: string, i: number) => (
            <div key={i} className="text-[11px] text-text-muted mb-0.5">• {u.slice(0, 100)}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [demoName, setDemoName] = useState("")
  const [demoResult, setDemoResult] = useState<any>(null)
  const [activeView, setActiveView] = useState<"cases" | "pipeline" | "demo">("cases")

  useEffect(() => {
    setMounted(true)
    api.getCases()
      .then((d: any) => {
        const list = Array.isArray(d) ? d : (d.cases || d.items || [])
        setCases(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadCaseDetail = async (c: any) => {
    setSelectedCase(c)
    setDetailLoading(true)
    setSelectedDetail(null)
    try {
      const detail = await api.getCase(c.id)
      setSelectedDetail(detail)
    } catch (e) {
      console.error(e)
    }
    setDetailLoading(false)
  }

  const createDemoCase = async () => {
    if (!demoName.trim()) return
    setCreating(true)
    setDemoResult(null)
    try {
      const resp = await api.createCase({ customer_name: demoName, customer_id: `DEMO-${Date.now()}` })
      const caseId = resp.case_id
      // Poll for completion
      let attempts = 0
      const poll = async (): Promise<any> => {
        const d = await api.getCase(caseId)
        if (d.case.status !== "IN_PROGRESS" || attempts > 30) return d
        attempts++
        await new Promise(r => setTimeout(r, 2000))
        return poll()
      }
      const detail = await poll()
      setDemoResult(detail)
      // Refresh case list
      api.getCases().then((d: any) => {
        const list = Array.isArray(d) ? d : (d.cases || d.items || [])
        setCases(list)
      }).catch(() => {})
    } catch (e) {
      console.error(e)
    }
    setCreating(false)
  }

  if (!mounted) return null

  const latestCase = cases[0]

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-text">KAIROS</span>
            <span className="hidden sm:inline text-[10px] font-mono text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">v0.1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-text-muted hover:text-text transition-colors">Dashboard</Link>
            <Link href="/judge-mode" className="text-sm text-text-muted hover:text-text transition-colors">Judge</Link>
            <Link href="/dashboard" className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
              Launch
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-14">
        {/* Hero */}
        <section className="py-16 px-6 border-b border-border/30">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-12 items-start">
              <div className="flex-1 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-5">
                  <Zap className="w-3 h-3" /> {cases.length} Cases Processed · Gemini Live
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text leading-[1.1]">
                  KYC Autonomous
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                    Intelligence
                  </span>
                </h1>
                <p className="text-base text-text-muted mt-4 max-w-xl leading-relaxed">
                  7 specialized AI agents collaborate in a LangGraph pipeline to perform end-to-end customer due diligence.
                  Each agent outputs structured findings with confidence scores. The Debate Engine produces a final
                  recommendation with explainable reasoning.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-all shadow-lg shadow-indigo-500/20">
                    Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-text text-sm font-medium hover:border-indigo-500/50 transition-all">
                    Try Demo <Zap className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Architecture Diagram */}
                <div className="mt-8 p-5 rounded-2xl border border-border bg-surface">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Architecture: 7-Agent LangGraph Pipeline</span>
                  </div>
                  <svg viewBox="0 0 700 120" className="w-full h-auto max-w-[700px]" fill="none">
                    {/* Agent boxes */}
                    {[
                      { x: 10, label: "Input", color: "#6366f1", icon: "📄" },
                      { x: 95, label: "Doc Intel", color: "#ef4444" },
                      { x: 180, label: "Identity", color: "#d946ef" },
                      { x: 265, label: "Compliance", color: "#8b5cf6" },
                      { x: 350, label: "Financial", color: "#06b6d4" },
                      { x: 435, label: "Graph", color: "#14b8a6" },
                      { x: 520, label: "Fusion", color: "#22c55e" },
                      { x: 605, label: "Debate", color: "#f59e0b" },
                    ].map((node, i) => (
                      <g key={i}>
                        <rect x={node.x} y={30} width={70} height={50} rx="8" fill={node.color + "20"} stroke={node.color + "50"} strokeWidth="1" />
                        <text x={node.x + 35} y={62} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="500">{node.label}</text>
                        {i < 7 && (
                          <g>
                            <line x1={node.x + 70} y1={55} x2={node.x + 75 + (i === 0 ? 10 : 5)} y2={55} stroke="#2a2a3a" strokeWidth="1.5" />
                            <polygon points={`${node.x + 75 + (i === 0 ? 10 : 5)},50 ${node.x + 78 + (i === 0 ? 10 : 5)},55 ${node.x + 75 + (i === 0 ? 10 : 5)},60`} fill="#2a2a3a" />
                          </g>
                        )}
                      </g>
                    ))}
                    {/* Flow arrows between agents */}
                    {[0,1,2,3,4,5,6].map((i) => {
                      const startX = 75 + i * 85
                      return <g key={`flow-${i}`}>
                        <rect x={startX} y={48} width="10" height="14" rx="2" fill="#2a2a3a" />
                      </g>
                    })}
                    {/* Bottom labels */}
                    <text x="430" y="105" textAnchor="middle" fill="#6366f1" fontSize="10" fontWeight="600">← Sequential Execution (LangGraph) →</text>
                  </svg>
                </div>
              </div>

              {/* Live Pipeline Preview */}
              <div className="w-full lg:w-[480px]">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-text">Live Agent Pipeline</span>
                    </div>
                    {latestCase && (
                      <Link href={`/cases/${latestCase.id}`} className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
                        View Case <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  {latestCase ? (
                    <CasePipelineCard caseId={latestCase.id} />
                  ) : loading ? (
                    <div className="flex items-center justify-center py-8 text-text-muted text-sm">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading cases...
                    </div>
                  ) : (
                    <div className="py-8 text-center text-text-muted text-sm">No cases yet. Create one below!</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Case Data Table */}
        <section className="py-10 px-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Database className="w-4 h-4 text-indigo-400" />
              <h2 className="text-lg font-bold text-text">Live Cases from Database</h2>
              <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">{cases.length} total</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-2xl">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cases in database. Seed some data or create a demo case below.</p>
              </div>
            ) : (
              <>
                {/* Case Table */}
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface/50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Customer</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Risk</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Decision</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Agents</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((c: any, i: number) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className={`border-b border-border/50 hover:bg-surface-2/50 transition-colors cursor-pointer ${selectedCase?.id === c.id ? "bg-surface-2" : ""}`}
                          onClick={() => loadCaseDetail(c)}
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-text">{c.customer_name}</span>
                            <span className="text-[10px] text-text-muted font-mono ml-2">{c.id.slice(0, 8)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-medium ${c.risk_score < 30 ? "text-emerald-400" : c.risk_score < 60 ? "text-amber-400" : "text-red-400"}`}>
                              {c.risk_score.toFixed(0)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {c.decision ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.decision === "APPROVE" ? "text-emerald-400 bg-emerald-400/10" : c.decision === "REVIEW" ? "text-amber-400 bg-amber-400/10" : "text-red-400 bg-red-400/10"}`}>
                                {c.decision}
                              </span>
                            ) : <span className="text-xs text-text-muted">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <CaseMiniPipeline caseId={c.id} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/cases/${c.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors">
                              Open <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Selected Case Detail Panel */}
                {selectedDetail && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-base font-semibold text-text">{selectedDetail.case.customer_name} — Agent Breakdown</h3>
                      <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">{selectedDetail.case.id.slice(0, 8)}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {(selectedDetail.agent_results || []).map((r: any) => (
                        <AgentResultRow key={r.agent_name} result={r} />
                      ))}
                    </div>
                    {selectedDetail.debate && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-text">Debate Consensus</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {selectedDetail.debate.consensus} ({(selectedDetail.debate.confidence * 100).toFixed(0)}%)
                          </span>
                        </div>
                        {Array.isArray(selectedDetail.debate.transcript) && selectedDetail.debate.transcript.map((entry: any, i: number) => (
                          entry.argument ? (
                            <div key={i} className="mb-2 last:mb-0 p-2 rounded-lg bg-background/50 border border-border/30">
                              <span className="text-xs font-medium text-text-muted">{entry.agent}: {entry.stance}</span>
                              <p className="text-xs text-text mt-0.5">{entry.argument.slice(0, 200)}</p>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {detailLoading && (
                  <div className="flex items-center justify-center py-8 text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading agent details...
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo-section" className="py-10 px-6 bg-surface/30 border-t border-border/30">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-lg font-bold text-text">Create a Demo Case</h2>
            </div>
            <p className="text-sm text-text-muted mb-6 max-w-xl">
              Enter a customer name to trigger the full 7-agent pipeline. See real Gemini-powered agent outputs 
              as they process the case end-to-end.
            </p>

            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                placeholder="Enter customer name..."
                className="flex-1 max-w-xs px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && createDemoCase()}
              />
              <button
                onClick={createDemoCase}
                disabled={creating || !demoName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Zap className="w-4 h-4" /> Run Pipeline</>}
              </button>
            </div>

            {demoResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text">{demoResult.case.customer_name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    demoResult.case.decision === "APPROVE" ? "text-emerald-400 bg-emerald-400/10" : 
                    demoResult.case.decision === "REVIEW" ? "text-amber-400 bg-amber-400/10" : 
                    "text-red-400 bg-red-400/10"
                  }`}>
                    {demoResult.case.decision}
                  </span>
                  <span className="text-xs text-text-muted">Risk: {demoResult.case.risk_score.toFixed(0)}/100</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {(demoResult.agent_results || []).map((r: any) => (
                    <AgentResultRow key={r.agent_name} result={r} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <Link href={`/cases/${demoResult.case.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-all">
                    Full Case View <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* 7 Agents Reference */}
        <section className="py-10 px-6 border-t border-border/30">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-4 h-4 text-violet-400" />
              <h2 className="text-lg font-bold text-text">The 7 Agents</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { name: "Document Intelligence", icon: FileSearch, desc: "OCR extraction + ELA tampering detection on uploaded documents", color: "from-red-500 to-orange-500", findings: "Tampering score, text extraction confidence" },
                { name: "Identity Resolution", icon: UserCheck, desc: "Entity matching via Sentence Transformers + RapidFuzz across known identities", color: "from-pink-500 to-purple-500", findings: "Match score, resolved identity cluster" },
                { name: "Compliance Screening", icon: Search, desc: "PEP/sanctions database + Gemini LLM risk assessment against regulations", color: "from-violet-500 to-indigo-500", findings: "Screening matches, LLM risk level" },
                { name: "Financial Profiling", icon: TrendingUp, desc: "Isolation Forest anomaly detection + Gemini counterfactual scenarios", color: "from-blue-500 to-cyan-500", findings: "Anomalous transactions, counterfactual risk" },
                { name: "Graph Intelligence", icon: Network, desc: "Neo4j entity graph — shell company detection, fraud ring patterns", color: "from-cyan-500 to-teal-500", findings: "Graph connections, shell entity links" },
                { name: "Evidence Fusion", icon: Layers, desc: "Cross-agent conflict resolution — reconciles conflicting recommendations", color: "from-emerald-500 to-green-500", findings: "Conflict detection, weighted consensus" },
                { name: "Debate Engine", icon: MessageSquare, desc: "3 personas (Conservative/Growth/Investigator) argue each case to consensus", color: "from-amber-500 to-red-500", findings: "Per-persona stance, consensus recommendation" },
              ].map((agent, i) => {
                const Icon = agent.icon
                return (
                  <div key={agent.name} className="p-4 rounded-xl border border-border bg-surface">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.color} p-2 mb-3`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-text mb-1">{agent.name}</h3>
                    <p className="text-xs text-text-muted leading-relaxed">{agent.desc}</p>
                    <div className="mt-2 text-[10px] text-text-muted bg-surface-2 px-2 py-1 rounded">Outputs: {agent.findings}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 px-6 border-t border-border/30 text-center text-xs text-text-muted">
          KAIROS v0.1.0 · LangGraph · Gemini 2.5 Flash Lite · PostgreSQL · Redis · Neo4j
        </footer>
      </main>
    </div>
  )
}

/* Separate component to load agent pipeline for a case */
function CasePipelineCard({ caseId }: { caseId: string }) {
  const [detail, setDetail] = useState<any>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    api.getCase(caseId).then(setDetail).catch(() => setErr(true))
  }, [caseId])

  if (err) return <div className="text-xs text-text-muted">Failed to load pipeline</div>
  if (!detail) return <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="w-3 h-3 animate-spin" /> Loading...</div>

  const agents = detail.agent_results || []
  return (
    <div>
      <div className="text-xs text-text mb-2">{detail.case.customer_name} · Risk {detail.case.risk_score.toFixed(0)} · {detail.case.decision || "—"}</div>
      <AgentPipeline results={agents} showLabels={false} />
      <div className="mt-2 text-[10px] text-text-muted">{agents.filter((a: any) => a.status === "SUCCESS").length}/{agents.length} agents succeeded</div>
    </div>
  )
}

/* Mini pipeline dots for table rows */
function CaseMiniPipeline({ caseId }: { caseId: string }) {
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    api.getCase(caseId).then(setDetail).catch(() => {})
  }, [caseId])

  if (!detail) return <span className="text-xs text-text-muted">...</span>

  const agents = detail.agent_results || []
  return (
    <div className="flex items-center gap-1">
      {agents.map((a: any) => (
        <div
          key={a.agent_name}
          className={`w-2 h-2 rounded-full ${
            a.status === "SUCCESS" ? "bg-emerald-400" :
            a.status === "FAILURE" ? "bg-red-400" : "bg-amber-400"
          }`}
          title={`${a.agent_name}: ${a.status}`}
        />
      ))}
    </div>
  )
}

// Need to add Layers icon
function Layers(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg> }
