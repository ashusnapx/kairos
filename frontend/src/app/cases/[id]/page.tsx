"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  ArrowLeft, Shield, AlertTriangle, CheckCircle, Brain, GitBranch,
  Scale, FileText, Users, TrendingUp, Network, MessageSquare, Activity,
  Zap, Clock, ChevronRight, Eye, XCircle, Gauge, SlidersHorizontal,
  Play, Pause, SkipForward, Cpu, Info
} from "lucide-react"
import { api } from "@/lib/api"
import { cn, formatDate, riskColor, statusColor, confidenceColor } from "@/lib/utils"

/* ------------- Types ------------- */
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

/* ------------- Agent metadata ------------- */
const AGENT_META: Record<string, { icon: any; gradient: string; label: string }> = {
  document_intelligence: { icon: FileText, gradient: "from-red-500 to-orange-500", label: "Document Intelligence" },
  identity_resolution: { icon: Users, gradient: "from-pink-500 to-purple-500", label: "Identity Resolution" },
  compliance_screening: { icon: Scale, gradient: "from-violet-500 to-indigo-500", label: "Compliance Screening" },
  financial_profiling: { icon: TrendingUp, gradient: "from-blue-500 to-cyan-500", label: "Financial Profiling" },
  graph_intelligence: { icon: Network, gradient: "from-cyan-500 to-teal-500", label: "Graph Intelligence" },
  evidence_fusion: { icon: GitBranch, gradient: "from-emerald-500 to-green-500", label: "Evidence Fusion" },
  debate_engine: { icon: MessageSquare, gradient: "from-amber-500 to-red-500", label: "Debate Engine" },
}

/* ============================== Main Page ============================== */
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <Brain className="absolute inset-0 m-auto w-6 h-6 text-primary" />
          </div>
          <p className="text-text-muted text-sm">Loading investigation workspace...</p>
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
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "agents", label: "Agents", icon: Brain },
    { id: "debate", label: "Debate", icon: MessageSquare },
    { id: "graph", label: "Graph", icon: Network },
    { id: "counterfactual", label: "What-If", icon: SlidersHorizontal },
    { id: "timeline", label: "Timeline", icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-text-muted hover:text-text transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">K</div>
            <span className="font-semibold text-text text-sm">{c.customer_name}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
              {c.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="font-mono">trace:{c.trace_id?.slice(0, 12)}</span>
            <span>•</span>
            <span>{formatDate(c.created_at)}</span>
          </div>
        </div>
      </nav>

      {/* Tab Bar */}
      <div className="border-b border-border bg-surface/30 backdrop-blur-sm sticky top-14 z-40">
        <div className="max-w-[1400px] mx-auto px-6 flex gap-1 overflow-x-auto py-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-text-muted hover:text-text hover:bg-surface-2"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && <OverviewTab key="overview" data={data} />}
          {activeTab === "documents" && <DocumentsTab key="documents" data={data} />}
          {activeTab === "agents" && <AgentsTab key="agents" data={data} />}
          {activeTab === "debate" && <DebateTab key="debate" data={data} />}
          {activeTab === "graph" && <GraphTab key="graph" graph={graph} caseData={data} />}
          {activeTab === "counterfactual" && <CounterfactualTab key="counterfactual" data={data} caseId={id as string} />}
          {activeTab === "timeline" && <TimelineTab key="timeline" timeline={timeline} />}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ============================== Overview Tab ============================== */
function OverviewTab({ data }: { data: CaseDetail }) {
  const c = data.case
  const risk = c.risk_score ?? 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Risk Gauge + Decision + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk Gauge */}
        <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col items-center">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Risk Score</p>
          <RiskGauge value={risk} size={160} />
          <p className={`text-2xl font-bold mt-3 ${riskColor(risk)}`}>{risk.toFixed(0)}<span className="text-sm text-text-muted font-normal">/100</span></p>
        </div>

        {/* Decision Card */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Final Decision</p>
          <div className={`text-3xl font-bold ${statusColor(c.decision ?? "PENDING")}`}>
            {c.decision ?? "Pending"}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Confidence</span>
              <span className={confidenceColor(c.decision_confidence ?? 0)}>{((c.decision_confidence ?? 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(c.decision_confidence ?? 0) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
          {data.debate && (
            <div className="mt-4 p-3 rounded-xl bg-surface-2 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <MessageSquare className="w-3 h-3" />
                Debate Consensus: <span className={`font-medium ${statusColor(data.debate.consensus)}`}>{data.debate.consensus}</span>
              </div>
            </div>
          )}
        </div>

        {/* Agent Pipeline Summary */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Agent Pipeline</p>
          <div className="space-y-2">
            {data.agent_results.map((result: any, i: number) => {
              const meta = AGENT_META[result.agent_name] || { icon: Brain, gradient: "from-gray-500 to-gray-600", label: result.agent_name }
              const Icon = meta.icon
              return (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-text flex-1 truncate">{meta.label}</span>
                  <span className={`text-xs font-medium ${
                    result.status === "SUCCESS" ? "text-emerald-400" :
                    result.status === "REVIEW" ? "text-amber-400" : "text-red-400"
                  }`}>
                    {result.recommendation}
                  </span>
                  <span className={`text-xs font-mono ${confidenceColor(result.confidence ?? 0)}`}>
                    {((result.confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Narrative Summary */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-text mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          AI Investigation Summary
        </h3>
        <div className="prose prose-sm prose-invert max-w-none">
          <NarrativeSummary data={data} />
        </div>
      </div>
    </motion.div>
  )
}

/* ============================== Documents Tab (WOW #1) ============================== */
function DocumentsTab({ data }: { data: CaseDetail }) {
  const [selectedRegion, setSelectedRegion] = useState<any>(null)
  const docAgent = data.agent_results.find((a: any) => a.agent_name === "document_intelligence")

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      {data.documents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No documents uploaded for this case</p>
        </div>
      ) : (
        data.documents.map((doc: any, docIdx: number) => (
          <div key={docIdx} className="rounded-2xl border border-border bg-surface overflow-hidden">
            {/* Document Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${doc.tampering?.tampering_detected ? "bg-red-500/10" : "bg-emerald-500/10"} flex items-center justify-center`}>
                  <FileText className={`w-5 h-5 ${doc.tampering?.tampering_detected ? "text-red-400" : "text-emerald-400"}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-text">{doc.type} Document</h3>
                  <p className="text-xs text-text-muted">Error Level Analysis • OCR Extraction • Metadata Validation</p>
                </div>
              </div>
              {doc.tampering?.tampering_detected && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  TAMPERING DETECTED
                </span>
              )}
            </div>

            {/* ELA Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Left: Document Preview with ELA overlay */}
              <div className="p-6">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Document Preview — ELA Overlay
                </p>
                <div className="relative bg-surface-2 rounded-xl overflow-hidden border border-border" style={{ minHeight: 300 }}>
                  {/* Simulated document */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center border border-border">
                        <Shield className="w-8 h-8 text-indigo-400/50" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-text">Government of India</p>
                        <p className="text-xs text-text-muted">{doc.type} — Unique Identification Authority</p>
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-text-muted text-xs">Full Name</p>
                        <p className="text-text font-medium">{doc.extracted?.full_name ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-xs">Document Number</p>
                        <p className="text-text font-mono text-sm">{doc.extracted?.document_number ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-xs">Date of Birth</p>
                        <p className="text-text">{doc.extracted?.date_of_birth ?? "—"}</p>
                      </div>
                      <div className="relative">
                        <p className="text-text-muted text-xs">Expiry Date</p>
                        <p className="text-text">{doc.extracted?.expiry_date ?? "—"}</p>
                        {doc.tampering?.tampering_detected && (
                          <div
                            className="tampering-highlight absolute inset-0 -m-1 rounded-lg cursor-pointer z-10"
                            onMouseEnter={() => setSelectedRegion(doc.tampering?.regions?.[0] || { reason: doc.tampering.tampering_type })}
                            onMouseLeave={() => setSelectedRegion(null)}
                          />
                        )}
                      </div>
                    </div>
                    {doc.tampering?.regions?.map((region: any, ri: number) => (
                      <div
                        key={ri}
                        className="tampering-highlight absolute rounded cursor-pointer"
                        style={{
                          left: `${(region.x / 600) * 100}%`,
                          top: `${(region.y / 400) * 100}%`,
                          width: `${(region.width / 600) * 100}%`,
                          height: `${(region.height / 400) * 100}%`,
                        }}
                        onMouseEnter={() => setSelectedRegion(region)}
                        onMouseLeave={() => setSelectedRegion(null)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Analysis Results */}
              <div className="p-6">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                  Forensic Analysis
                </p>
                <div className="space-y-4">
                  {/* Selected region detail */}
                  <AnimatePresence>
                    {selectedRegion && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-4 rounded-xl bg-red-500/5 border border-red-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">Region Analysis</span>
                        </div>
                        <p className="text-sm text-text-muted">{selectedRegion.reason}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tampering Details */}
                  {doc.tampering && (
                    <div className="p-4 rounded-xl bg-surface-2 border border-border">
                      <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        Tampering Analysis
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">Type</span>
                          <span className="text-red-400 font-mono text-xs">{doc.tampering.tampering_type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">Confidence</span>
                          <span className="text-red-400 font-bold">{(doc.tampering.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${doc.tampering.confidence * 100}%` }}
                            transition={{ duration: 1.2 }}
                          />
                        </div>
                      </div>
                      {doc.tampering.evidence?.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs font-medium text-text-muted">Evidence:</p>
                          {doc.tampering.evidence.map((e: string, ei: number) => (
                            <div key={ei} className="flex items-start gap-2 text-xs text-text-muted">
                              <ChevronRight className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                              <span>{e}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Agent Findings */}
                  {docAgent && docAgent.findings?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-text-muted">Agent Findings:</p>
                      {docAgent.findings.map((f: any, fi: number) => (
                        <div key={fi} className="p-3 rounded-lg bg-surface-2 border border-border/50">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${f.confidence > 0.8 ? "bg-red-400" : f.confidence > 0.5 ? "bg-amber-400" : "bg-emerald-400"}`} />
                            <span className="text-xs font-medium text-text">{f.finding_type}</span>
                            <span className={`text-xs font-mono ml-auto ${confidenceColor(f.confidence)}`}>{(f.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-xs text-text-muted">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Extracted Data */}
                  <div className="p-4 rounded-xl bg-surface-2 border border-border">
                    <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      OCR Extracted Fields
                    </h4>
                    {doc.extracted && Object.entries(doc.extracted).map(([key, val]) => (
                      <div key={key} className="flex justify-between py-1.5 text-xs border-b border-border/30 last:border-0">
                        <span className="text-text-muted capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-text font-mono">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </motion.div>
  )
}

/* ============================== Agents Tab ============================== */
function AgentsTab({ data }: { data: CaseDetail }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {data.agent_results.map((result: any, i: number) => {
        const meta = AGENT_META[result.agent_name] || { icon: Brain, gradient: "from-gray-500 to-gray-600", label: result.agent_name }
        const Icon = meta.icon

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-border bg-surface overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-text">{meta.label}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      result.status === "SUCCESS" ? "text-emerald-400" :
                      result.status === "REVIEW" ? "text-amber-400" : "text-red-400"
                    }`}>
                      {result.status === "SUCCESS" ? <CheckCircle className="w-3 h-3" /> :
                       result.status === "REVIEW" ? <AlertTriangle className="w-3 h-3" /> :
                       <XCircle className="w-3 h-3" />}
                      {result.status}
                    </span>
                    {result.execution_time_ms > 0 && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.execution_time_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${confidenceColor(result.confidence ?? 0)}`}>
                  {((result.confidence ?? 0) * 100).toFixed(0)}%
                </div>
                <span className={`text-xs font-medium ${statusColor(result.recommendation || "PROCEED")}`}>
                  {result.recommendation}
                </span>
              </div>
            </div>

            {/* Findings & Evidence */}
            {(result.findings?.length > 0 || result.evidence?.length > 0 || result.uncertainties?.length > 0) && (
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Findings */}
                {result.findings?.length > 0 && (
                  <div className="p-3 rounded-xl bg-surface-2 border border-border/50">
                    <p className="text-xs font-medium text-text-muted mb-2">Findings ({result.findings.length})</p>
                    <div className="space-y-1.5">
                      {result.findings.slice(0, 3).map((f: any, fi: number) => (
                        <div key={fi} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${f.confidence > 0.8 ? "bg-red-400" : f.confidence > 0.5 ? "bg-amber-400" : "bg-emerald-400"}`} />
                            <span className="text-text font-medium truncate">{f.finding_type}</span>
                          </div>
                          <p className="text-text-muted ml-3 line-clamp-2">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {result.evidence?.length > 0 && (
                  <div className="p-3 rounded-xl bg-surface-2 border border-border/50">
                    <p className="text-xs font-medium text-text-muted mb-2">Evidence ({result.evidence.length})</p>
                    <div className="space-y-1.5">
                      {result.evidence.slice(0, 3).map((e: any, ei: number) => (
                        <div key={ei} className="text-xs">
                          <span className="text-primary font-medium">{e.source}</span>
                          <p className="text-text-muted line-clamp-2">{e.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uncertainties */}
                {result.uncertainties?.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xs font-medium text-amber-400 mb-2">Uncertainties ({result.uncertainties.length})</p>
                    <div className="space-y-1">
                      {result.uncertainties.map((u: string, ui: number) => (
                        <p key={ui} className="text-xs text-text-muted flex items-start gap-1.5">
                          <Info className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                          {u}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
}

/* ============================== Debate Tab (WOW #2) ============================== */
function DebateTab({ data }: { data: CaseDetail }) {
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [typedText, setTypedText] = useState("")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const transcript = data.debate?.transcript ?? []

  const personaColor = (agent: string) => {
    if (agent?.includes("Conservative")) return { bg: "bg-red-500/5", border: "border-red-500/15", text: "text-red-400", icon: Shield }
    if (agent?.includes("Growth")) return { bg: "bg-emerald-500/5", border: "border-emerald-500/15", text: "text-emerald-400", icon: TrendingUp }
    return { bg: "bg-blue-500/5", border: "border-blue-500/15", text: "text-blue-400", icon: Eye }
  }

  // Typewriter effect
  useEffect(() => {
    if (!isPlaying || playbackIndex >= transcript.length) {
      setIsPlaying(false)
      return
    }

    const currentEntry = transcript[playbackIndex]
    const fullText = currentEntry?.argument ?? ""
    let charIndex = 0
    setTypedText("")

    intervalRef.current = setInterval(() => {
      charIndex++
      setTypedText(fullText.slice(0, charIndex))
      if (charIndex >= fullText.length) {
        clearInterval(intervalRef.current!)
        setTimeout(() => {
          setPlaybackIndex(prev => prev + 1)
        }, 800)
      }
    }, 15)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, playbackIndex, transcript])

  const startPlayback = () => {
    setPlaybackIndex(0)
    setTypedText("")
    setIsPlaying(true)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Constitutional Compliance Debate
          </h3>
          <p className="text-xs text-text-muted mt-1">Three-persona adversarial debate engine with consensus reasoning</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startPlayback}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <Play className="w-3.5 h-3.5" />
            {isPlaying ? "Replaying..." : "Play Debate"}
          </button>
        </div>
      </div>

      {/* Consensus badge */}
      {data.debate && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border">
          <div className={`text-xl font-bold ${statusColor(data.debate.consensus)}`}>
            {data.debate.consensus}
          </div>
          <div className="text-sm text-text-muted">
            Consensus reached with <span className={`font-medium ${confidenceColor(data.debate.confidence ?? 0)}`}>{((data.debate.confidence ?? 0) * 100).toFixed(0)}%</span> confidence
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-3">
        {transcript.map((entry: any, i: number) => {
          const colors = personaColor(entry.agent)
          const EntryIcon = colors.icon
          const isCurrentlyTyping = isPlaying && i === playbackIndex
          const isRevealed = !isPlaying || i < playbackIndex

          if (!isRevealed && !isCurrentlyTyping) return null

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: entry.agent?.includes("Conservative") ? -20 : entry.agent?.includes("Growth") ? 20 : 0, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: isPlaying ? 0 : i * 0.1 }}
              className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <EntryIcon className={`w-4 h-4 ${colors.text}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>{entry.agent}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(entry.stance ?? "REVIEW")}`}>
                  {entry.stance}
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                {isCurrentlyTyping ? (
                  <>{typedText}<span className="animate-pulse text-primary">▊</span></>
                ) : entry.argument}
              </p>
              {entry.evidence?.length > 0 && isRevealed && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.evidence.map((e: string, ei: number) => (
                    <span key={ei} className="text-xs px-2 py-0.5 rounded-md bg-surface/50 text-text-muted border border-border/30">📎 {e}</span>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ============================== Graph Tab (WOW #4) ============================== */
function GraphTab({ graph, caseData }: { graph: GraphData | null; caseData: CaseDetail }) {
  const [selectedNode, setSelectedNode] = useState<any>(null)

  if (!graph || graph.nodes.length === 0) {
    // Build a fallback graph from case data
    const fallbackNodes = buildFallbackGraph(caseData)
    if (fallbackNodes.nodes.length === 0) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Network className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">Graph intelligence data not available</p>
          <p className="text-xs text-text-muted mt-1">Neo4j may not be connected</p>
        </motion.div>
      )
    }
    return <GraphVisualization graph={fallbackNodes} selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
  }

  return <GraphVisualization graph={graph} selectedNode={selectedNode} setSelectedNode={setSelectedNode} />
}

function GraphVisualization({ graph, selectedNode, setSelectedNode }: { graph: GraphData; selectedNode: any; setSelectedNode: (n: any) => void }) {
  const nodePositions = useRef<Record<string, { x: number; y: number }>>({})

  // Layout nodes in a circle
  const centerX = 400
  const centerY = 250
  const radius = 180

  if (Object.keys(nodePositions.current).length !== graph.nodes.length) {
    graph.nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / graph.nodes.length - Math.PI / 2
      nodePositions.current[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })
  }

  const nodeColor = (label: string) => {
    if (label === "Person") return { fill: "#6366f1", stroke: "#818cf8" }
    if (label === "Company" || label === "SHELL_ENTITY") return { fill: "#ef4444", stroke: "#f87171" }
    if (label === "Address") return { fill: "#06b6d4", stroke: "#22d3ee" }
    if (label === "Device") return { fill: "#f59e0b", stroke: "#fbbf24" }
    if (label === "Account") return { fill: "#22c55e", stroke: "#4ade80" }
    return { fill: "#6b7280", stroke: "#9ca3af" }
  }

  const nodeIcon = (label: string) => {
    if (label === "Person") return "👤"
    if (label === "Company" || label === "SHELL_ENTITY") return "🏢"
    if (label === "Address") return "📍"
    if (label === "Device") return "📱"
    if (label === "Account") return "🏦"
    return "📄"
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text flex items-center gap-2">
            <Network className="w-4 h-4 text-primary" />
            Entity Relationship Graph
          </h3>
          <p className="text-xs text-text-muted mt-1">{graph.nodes.length} entities, {graph.edges.length} connections — Click nodes for details</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {["Person", "Company", "Address", "Device", "Account"].map(label => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: nodeColor(label).fill }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <svg viewBox="0 0 800 500" className="w-full" style={{ minHeight: 400 }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {graph.edges.map((edge, i) => {
            const fromPos = nodePositions.current[edge.from]
            const toPos = nodePositions.current[edge.to]
            if (!fromPos || !toPos) return null
            return (
              <g key={`edge-${i}`}>
                <line
                  x1={fromPos.x} y1={fromPos.y}
                  x2={toPos.x} y2={toPos.y}
                  stroke="#2a2a3a" strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <text
                  x={(fromPos.x + toPos.x) / 2}
                  y={(fromPos.y + toPos.y) / 2 - 6}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="9"
                  fontFamily="Inter"
                >
                  {edge.type}
                </text>
              </g>
            )
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = nodePositions.current[node.id]
            if (!pos) return null
            const colors = nodeColor(node.label)
            const isSelected = selectedNode?.id === node.id

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => setSelectedNode(isSelected ? null : node)}
              >
                <circle r={isSelected ? 28 : 22} fill={colors.fill} opacity={0.15} filter={isSelected ? "url(#glow)" : undefined} />
                <circle r={isSelected ? 22 : 18} fill="#12121a" stroke={colors.fill} strokeWidth={isSelected ? 2.5 : 1.5} />
                <text textAnchor="middle" dominantBaseline="middle" fontSize="14">{nodeIcon(node.label)}</text>
                <text y={32} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Inter">
                  {(node.properties?.name || node.properties?.full_address || node.id).slice(0, 16)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Selected node detail */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="p-4 rounded-xl bg-surface border border-border"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{nodeIcon(selectedNode.label)}</span>
              <span className="text-sm font-medium text-text">{selectedNode.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedNode.properties || {}).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-text-muted">{k}: </span>
                  <span className="text-text font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================== Counterfactual Tab (WOW #3) ============================== */
function CounterfactualTab({ data, caseId }: { data: CaseDetail; caseId: string }) {
  const [toggles, setToggles] = useState({
    income_proof_submitted: false,
    address_verified: false,
    additional_collateral: false,
    pattern_explained: false,
  })
  const [result, setResult] = useState<any>(null)
  const [simulating, setSimulating] = useState(false)
  const originalRisk = data.case.risk_score ?? 50

  const runSimulation = async () => {
    setSimulating(true)
    try {
      const res = await api.simulateCounterfactual(caseId, toggles)
      setResult(res)
    } catch (err) {
      console.error(err)
    }
    setSimulating(false)
  }

  useEffect(() => {
    runSimulation()
  }, [toggles])

  const simRisk = result?.simulated_risk ?? originalRisk
  const simDecision = result?.simulated_decision ?? data.case.decision

  const scenarios = [
    { key: "income_proof_submitted", label: "Income Proof Submitted", desc: "Verified salary slips or ITR documentation", impact: "-30 risk" },
    { key: "address_verified", label: "Address Verified", desc: "Confirmed residential address via utility bill", impact: "-15 risk" },
    { key: "additional_collateral", label: "Additional Collateral", desc: "Customer provides additional security deposit", impact: "-10 risk" },
    { key: "pattern_explained", label: "Transaction Pattern Explained", desc: "Customer justifies unusual transaction patterns", impact: "-20 risk" },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      <div>
        <h3 className="font-semibold text-text flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          Counterfactual Simulator
        </h3>
        <p className="text-xs text-text-muted mt-1">Toggle conditions to see how risk scores and decisions change in real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Toggles */}
        <div className="space-y-3">
          {scenarios.map(({ key, label, desc, impact }) => (
            <button
              key={key}
              onClick={() => setToggles(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all",
                toggles[key as keyof typeof toggles]
                  ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5"
                  : "bg-surface border-border hover:border-border/80"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    toggles[key as keyof typeof toggles]
                      ? "bg-primary text-white"
                      : "bg-surface-2 text-text-muted"
                  )}>
                    {toggles[key as keyof typeof toggles] ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{label}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400">{impact}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Result Gauge */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-center">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Simulated Risk</p>
            <RiskGauge value={simRisk} size={200} />
            <div className="mt-4 flex items-center justify-center gap-4">
              <div>
                <p className="text-xs text-text-muted">Original</p>
                <p className={`text-xl font-bold ${riskColor(originalRisk)}`}>{originalRisk.toFixed(0)}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
              <div>
                <p className="text-xs text-text-muted">Simulated</p>
                <p className={`text-xl font-bold ${riskColor(simRisk)}`}>{simRisk.toFixed(0)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-sm text-text-muted">Decision:</span>
              <span className={`text-sm font-bold ${statusColor(data.case.decision ?? "REVIEW")}`}>{data.case.decision ?? "REVIEW"}</span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
              <span className={`text-sm font-bold ${statusColor(simDecision ?? "REVIEW")}`}>{simDecision}</span>
            </div>
            {simRisk < originalRisk && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 text-xs text-emerald-400"
              >
                ↓ {(originalRisk - simRisk).toFixed(0)} points reduced
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ============================== Timeline Tab ============================== */
function TimelineTab({ timeline }: { timeline: any[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h3 className="font-semibold text-text mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        Investigation Audit Trail
      </h3>
      {timeline.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Activity className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No audit events recorded yet</p>
        </div>
      ) : (
        <div className="relative pl-8">
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent timeline-line-glow" />
          <div className="space-y-4">
            {timeline.map((event: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <div className="absolute -left-5 top-3 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                <div className="p-4 rounded-xl bg-surface border border-border hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text">{event.event}</span>
                    <span className="text-xs text-text-muted font-mono">{event.trace_id?.slice(0, 12)}</span>
                  </div>
                  <p className="text-xs text-text-muted">{event.timestamp ? formatDate(event.timestamp) : ""}</p>
                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-surface-2 text-xs font-mono text-text-muted overflow-x-auto">
                      {JSON.stringify(event.payload, null, 0).slice(0, 200)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ============================== Shared Components ============================== */

function RiskGauge({ value, size = 160 }: { value: number; size?: number }) {
  const r = size * 0.38
  const circumference = Math.PI * r
  const progress = Math.min(100, Math.max(0, value)) / 100
  const offset = circumference * (1 - progress)

  const gradientId = `gauge-${size}-${value}`
  const color = value >= 60 ? "#ef4444" : value >= 30 ? "#f59e0b" : "#22c55e"

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* Background arc */}
      <path
        d={`M ${size * 0.1} ${size * 0.58} A ${r} ${r} 0 0 1 ${size * 0.9} ${size * 0.58}`}
        fill="none"
        stroke="#1a1a25"
        strokeWidth={size * 0.06}
        strokeLinecap="round"
      />
      {/* Foreground arc */}
      <path
        d={`M ${size * 0.1} ${size * 0.58} A ${r} ${r} 0 0 1 ${size * 0.9} ${size * 0.58}`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={size * 0.06}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
      />
      {/* Needle */}
      <g transform={`translate(${size / 2}, ${size * 0.58})`}>
        <line
          x1="0" y1="0"
          x2={Math.cos(Math.PI - Math.PI * progress) * (r - size * 0.08)}
          y2={-Math.sin(Math.PI - Math.PI * progress) * (r - size * 0.08)}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transition: "all 1.2s ease-out" }}
        />
        <circle r="4" fill={color} />
      </g>
    </svg>
  )
}

function NarrativeSummary({ data }: { data: CaseDetail }) {
  const c = data.case
  const agents = data.agent_results
  const hasEscalate = agents.some((a: any) => a.recommendation === "ESCALATE")
  const hasReview = agents.some((a: any) => a.recommendation === "REVIEW")
  const tampering = data.documents.some((d: any) => d.tampering?.tampering_detected)

  const lines: string[] = []
  lines.push(`Case **${c.customer_name}** was processed through the 7-agent KAIROS pipeline in ${agents.reduce((s: number, a: any) => s + (a.execution_time_ms || 0), 0)}ms.`)

  if (tampering) {
    lines.push(`🔴 **Document Intelligence** flagged document tampering with high confidence. Error Level Analysis detected compression inconsistencies suggesting image manipulation.`)
  }

  agents.forEach((a: any) => {
    if (a.findings?.length > 0) {
      const topFinding = a.findings[0]
      const meta = AGENT_META[a.agent_name]
      if (meta && topFinding.finding_type !== "NO_MATCH" && topFinding.finding_type !== "INSUFFICIENT_DATA") {
        lines.push(`**${meta.label}**: ${topFinding.description} (${(topFinding.confidence * 100).toFixed(0)}% confidence)`)
      }
    }
  })

  if (data.debate) {
    lines.push(`The **Debate Engine** reached a **${data.debate.consensus}** consensus with ${((data.debate.confidence ?? 0) * 100).toFixed(0)}% confidence after adversarial deliberation.`)
  }

  lines.push(`Final recommendation: **${c.decision ?? "PENDING"}** with overall risk score of **${(c.risk_score ?? 0).toFixed(0)}/100**.`)

  return (
    <div className="text-sm text-text-muted leading-relaxed space-y-2">
      {lines.map((line, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-text">$1</strong>') }} />
      ))}
    </div>
  )
}

function buildFallbackGraph(caseData: CaseDetail): GraphData {
  const c = caseData.case
  const graphAgent = caseData.agent_results.find((a: any) => a.agent_name === "graph_intelligence")
  const nodes: GraphData["nodes"] = []
  const edges: GraphData["edges"] = []

  // Always add the customer node
  nodes.push({ id: "customer", label: "Person", properties: { name: c.customer_name } })
  nodes.push({ id: "address", label: "Address", properties: { name: "123 Financial Center Blvd" } })
  nodes.push({ id: "device", label: "Device", properties: { name: `IMEI-${c.id?.slice(0, 8)}` } })
  nodes.push({ id: "account", label: "Account", properties: { name: `XXXX${c.id?.slice(0, 8)}` } })
  edges.push({ from: "customer", to: "address", type: "RESIDES_AT" })
  edges.push({ from: "customer", to: "device", type: "USES" })
  edges.push({ from: "customer", to: "account", type: "OWNS" })

  // If graph agent found shell entities, add them
  if (graphAgent?.findings?.some((f: any) => f.finding_type === "SHELL_ENTITY_LINK")) {
    nodes.push({ id: "shell", label: "Company", properties: { name: "Offshore Services Ltd", type: "SHELL_ENTITY" } })
    edges.push({ from: "shell", to: "address", type: "REGISTERED_AT" })
  }

  if (graphAgent?.findings?.some((f: any) => f.finding_type === "FRAUD_RING_DETECTED")) {
    nodes.push({ id: "suspect", label: "Person", properties: { name: "Unknown Suspect" } })
    edges.push({ from: "suspect", to: "address", type: "RESIDES_AT" })
  }

  return { nodes, edges }
}
