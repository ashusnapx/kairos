"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, Brain, GitBranch, Scale, FileText, Users, TrendingUp, Network, MessageSquare, Activity } from "lucide-react"
import { api } from "@/lib/api"
import { riskColor, statusColor, confidenceColor, formatDate, formatCurrency } from "@/lib/utils"

interface CaseDetail {
  case: any
  documents: any[]
  agent_results: any[]
  debate: any | null
  human_reviews: any[]
  final_decision: any | null
}

interface GraphData {
  nodes: { id: string; label: string; properties: any }[]
  edges: { from: string; to: string; type: string }[]
}

export default function CaseDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState<CaseDetail | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getCase(id as string),
      api.getGraph(id as string),
      api.getTimeline(id as string),
    ])
      .then(([caseData, graphData, timelineData]) => {
        setData(caseData)
        setGraph(graphData)
        setTimeline(timelineData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-muted flex items-center gap-3">
          <Activity className="w-5 h-5 animate-pulse" />
          Loading investigation...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-muted">Case not found</div>
      </div>
    )
  }

  const c = data.case
  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "documents", label: "Documents", icon: Shield },
    { id: "agents", label: "Agents", icon: Brain },
    { id: "debate", label: "Debate", icon: MessageSquare },
    { id: "graph", label: "Graph", icon: Network },
    { id: "timeline", label: "Timeline", icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-text-muted hover:text-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-text">{c.customer_name}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
              {c.status}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text hover:bg-surface-2"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Risk Score" value={c.risk_score?.toFixed(0) ?? "—"} subtitle="out of 100" color={riskColor(c.risk_score ?? 0)} />
              <StatCard title="Decision" value={c.decision ?? "Pending"} subtitle={`Confidence: ${c.decision_confidence?.toFixed(2) ?? "—"}`} color={statusColor(c.decision ?? "PENDING")} />
              <StatCard title="Case ID" value={c.id?.slice(0, 8) ?? "—"} subtitle={`Created ${formatDate(c.created_at)}`} color="text-text" />
            </div>

            {data.debate && (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Debate Consensus
                </h3>
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-bold ${statusColor(data.debate.consensus)}`}>
                    {data.debate.consensus}
                  </span>
                  <span className="text-sm text-text-muted">
                    Confidence: {(data.debate.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {data.agent_results.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Agent Findings
                </h3>
                <div className="space-y-3">
                  {data.agent_results.map((result: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
                      <div className="flex items-center gap-3">
                        {result.status === "SUCCESS" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : result.status === "REVIEW" ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-text">{result.agent_name ?? "Unknown"}</p>
                          <p className="text-xs text-text-muted">{result.recommendation ?? "—"}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${confidenceColor(result.confidence ?? 0)}`}>
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "documents" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text mb-4">Document Analysis</h3>
            {data.documents.length === 0 ? (
              <p className="text-text-muted">No documents available</p>
            ) : (
              <div className="space-y-4">
                {data.documents.map((doc: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-surface-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text">{doc.type ?? "Unknown"}</span>
                      {doc.tampering?.tampering_detected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Tampering Detected
                        </span>
                      )}
                    </div>
                    {doc.tampering && (
                      <div className="mt-2 p-3 rounded-lg bg-red-400/5 border border-red-400/10">
                        <p className="text-xs font-medium text-red-400 mb-1">{doc.tampering.tampering_type}</p>
                        <p className="text-xs text-text-muted">Confidence: {(doc.tampering.confidence * 100).toFixed(0)}%</p>
                        {doc.tampering.evidence?.map((e: string, ei: number) => (
                          <p key={ei} className="text-xs text-text-muted mt-1">• {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "agents" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {[{
              name: "Document Intelligence", icon: Shield, color: "from-red-500 to-orange-500",
              findings: "Tampering detection, OCR extraction, field validation",
              wow: "Detects image manipulation via ELA analysis"
            }, {
              name: "Identity Resolution", icon: Users, color: "from-blue-500 to-cyan-500",
              findings: "Fuzzy name matching, embedding similarity, episodic memory",
              wow: "Links fragmented identities across documents"
            }, {
              name: "Compliance Screening", icon: Scale, color: "from-violet-500 to-purple-500",
              findings: "PEP/sanctions checks, regulatory reasoning, policy tracing",
              wow: "Every finding references specific regulations"
            }, {
              name: "Financial Profiling", icon: TrendingUp, color: "from-emerald-500 to-teal-500",
              findings: "Anomaly detection, risk scoring, counterfactuals, SHAP",
              wow: "What-if scenarios show risk reduction paths"
            }, {
              name: "Graph Intelligence", icon: Network, color: "from-amber-500 to-orange-500",
              findings: "Relationship discovery, fraud rings, shell entity detection",
              wow: "Reveals hidden connections to risky entities"
            }, {
              name: "Evidence Fusion", icon: GitBranch, color: "from-pink-500 to-rose-500",
              findings: "Conflict resolution, evidence weighting, aggregation",
              wow: "Synthesizes all agent findings into unified evidence"
            }, {
              name: "Debate Engine", icon: MessageSquare, color: "from-indigo-500 to-purple-500",
              findings: "Three-persona debate, consensus reasoning, constitutional",
              wow: "Conservative, Growth, and Investigator debate each case"
            }].map((agent) => (
              <div key={agent.name} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} p-2`}>
                    <agent.icon className="w-full h-full text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text">{agent.name}</h4>
                    <p className="text-xs text-text-muted">{agent.findings}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border/50">
                  <span className="text-xs font-medium text-primary">WOW Moment: </span>
                  <span className="text-xs text-text-muted">{agent.wow}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "debate" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Compliance Debate
            </h3>
            {data.debate?.transcript && data.debate.transcript.length > 0 ? (
              <div className="space-y-4">
                {data.debate.transcript.map((entry: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl ${
                    entry.agent?.includes("Conservative") ? "bg-red-400/5 border border-red-400/10" :
                    entry.agent?.includes("Growth") ? "bg-emerald-400/5 border border-emerald-400/10" :
                    "bg-blue-400/5 border border-blue-400/10"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text">{entry.agent ?? "Unknown"}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.stance === "APPROVE" ? "bg-emerald-400/10 text-emerald-400" :
                        entry.stance === "REJECT" || entry.stance === "ESCALATE" ? "bg-red-400/10 text-red-400" :
                        "bg-amber-400/10 text-amber-400"
                      }`}>
                        {entry.stance ?? "—"}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed">{entry.argument ?? ""}</p>
                    {entry.evidence && entry.evidence.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.evidence.map((e: string, ei: number) => (
                          <span key={ei} className="text-xs px-2 py-0.5 rounded bg-surface-2 text-text-muted">📎 {e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">Debate transcript not available</p>
            )}
          </motion.div>
        )}

        {activeTab === "graph" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Network className="w-4 h-4 text-primary" />
              Graph Intelligence
            </h3>
            {graph && graph.nodes.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {graph.nodes.map((node) => (
                    <div key={node.id} className="p-3 rounded-xl bg-surface-2 border border-border">
                      <span className="text-xs font-medium text-primary">{node.label}</span>
                      <p className="text-sm text-text mt-1">{node.properties?.name ?? node.properties?.full_address ?? node.id.slice(0, 12)}</p>
                    </div>
                  ))}
                </div>
                {graph.edges.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-text mb-2">Relationships ({graph.edges.length})</h4>
                    <div className="space-y-2">
                      {graph.edges.slice(0, 10).map((edge, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="font-mono">{edge.from.slice(0, 8)}</span>
                          <span className="text-primary">──{edge.type}──</span>
                          <span className="font-mono">{edge.to.slice(0, 8)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-muted">Graph data not available</p>
            )}
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Investigation Timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="text-text-muted">No timeline events available</p>
            ) : (
              <div className="space-y-3">
                {timeline.map((event: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{event.event ?? event.event_type}</p>
                      <p className="text-xs text-text-muted mt-0.5">{event.timestamp ? formatDate(event.timestamp) : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, color }: { title: string; value: string; subtitle: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{subtitle}</p>
    </div>
  )
}
