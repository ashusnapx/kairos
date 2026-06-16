"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Loader2, CheckCircle, XCircle, Clock, AlertTriangle,
  Upload, FileSearch, UserCheck, Search, TrendingUp,
  Network, Layers, MessageSquare, Shield,
  ArrowLeft, RefreshCw, FileText, Scale, Gavel
} from "lucide-react"
import { cn, riskColor } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface StageDef {
  id: string
  name: string
  icon: typeof Upload
  agentName: string
}

const PIPELINE: StageDef[] = [
  { id: "upload", name: "Upload", icon: Upload, agentName: "" },
  { id: "ocr", name: "OCR", icon: FileSearch, agentName: "document_intelligence" },
  { id: "identity", name: "Identity", icon: UserCheck, agentName: "identity_resolution" },
  { id: "compliance", name: "Compliance", icon: Search, agentName: "compliance_screening" },
  { id: "financial", name: "Financial", icon: TrendingUp, agentName: "financial_profiling" },
  { id: "graph", name: "Graph", icon: Network, agentName: "graph_intelligence" },
  { id: "fusion", name: "Fusion", icon: Layers, agentName: "evidence_fusion" },
  { id: "debate", name: "Debate", icon: MessageSquare, agentName: "debate_engine" },
  { id: "decision", name: "Decision", icon: Shield, agentName: "" },
]

type StageStatus = "pending" | "in_progress" | "complete" | "failed"

const MAX_RETRIES = 25
const BASE_DELAY = 2000
const MAX_DELAY = 10000
const REQUEST_TIMEOUT = 8000
const STUCK_WARNING_MS = 30000

export default function KYCStatusPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [stages, setStages] = useState<StageStatus[]>(() => PIPELINE.map(() => "pending"))
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stuck, setStuck] = useState(false)
  const retryCount = useRef(0)
  const mountedRef = useRef(true)
  const startTime = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const derive = useCallback((data: any): StageStatus[] => {
    const agentResults: any[] = data?.agent_results || []
    const completeAgents = new Set(agentResults.map((a: any) => a.agent_name))

    return PIPELINE.map((stage) => {
      if (stage.id === "upload") {
        return "complete"
      }
      if (stage.id === "decision") {
        if (data?.case?.decision) return "complete"
        const allAgentsDone = PIPELINE
          .filter((s) => s.agentName)
          .every((s) => completeAgents.has(s.agentName))
        return allAgentsDone ? "in_progress" : "pending"
      }
      if (!stage.agentName) return "pending"
      if (completeAgents.has(stage.agentName)) return "complete"
      const prevIdx = PIPELINE.indexOf(stage) - 1
      const prevComplete = prevIdx < 0 || PIPELINE[prevIdx].id === "upload" || (
        PIPELINE[prevIdx].agentName
          ? completeAgents.has(PIPELINE[prevIdx].agentName)
          : true
      )
      if (prevComplete) return "in_progress"
      return "pending"
    })
  }, [])

  const fetchCase = useCallback(async () => {
    if (!mountedRef.current) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const res = await fetch(`http://localhost:8000/api/cases/${id}`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`API ${res.status}: ${text || res.statusText}`)
      }
      const data = await res.json()
      if (!mountedRef.current) return

      setCaseData(data)
      setStages(derive(data))
      setError(null)
      retryCount.current = 0
      startTime.current = Date.now()
      setStuck(false)
    } catch (err: any) {
      if (!mountedRef.current) return
      if (err.name === "AbortError") {
        setError("Request timed out")
      } else {
        setError(err.message || "Failed to fetch case status")
      }
      retryCount.current++
    } finally {
      clearTimeout(timeoutId)
      if (mountedRef.current) setLoading(false)
    }
  }, [id, derive])

  useEffect(() => {
    mountedRef.current = true
    fetchCase()

    const poll = () => {
      if (!mountedRef.current) return

      if (retryCount.current >= MAX_RETRIES) {
        setStuck(true)
        return
      }

      const delay = Math.min(
        BASE_DELAY * Math.pow(1.5, retryCount.current),
        MAX_DELAY
      )

      timerRef.current = setTimeout(() => {
        fetchCase().then(poll)
      }, delay)
    }

    const initialDelay = setTimeout(() => {
      if (mountedRef.current) poll()
    }, 3000)

    const stuckTimer = setInterval(() => {
      if (mountedRef.current && Date.now() - startTime.current > STUCK_WARNING_MS) {
        if (!caseData?.case?.decision) {
          setStuck(true)
        }
      }
    }, 5000)

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
      clearTimeout(initialDelay)
      clearTimeout(timerRef.current!)
      clearInterval(stuckTimer)
    }
  }, [fetchCase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    retryCount.current = 0
    setStuck(false)
    setError(null)
    setLoading(true)
    startTime.current = Date.now()
    fetchCase()
  }

  if (loading && !caseData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted font-semibold">Loading case status...</p>
        </div>
      </div>
    )
  }

  if (error && !caseData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text mb-2">Case Not Found</h2>
          <p className="text-sm text-text-muted mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            <Link
              href="/kyc"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-text text-sm font-semibold"
            >
              Back to KYC Form
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isComplete = caseData?.case?.decision
  const agentResults: any[] = caseData?.agent_results || []

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#111116_1px,transparent_1px),linear-gradient(to_bottom,#111116_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-50 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => router.push("/kyc")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to KYC
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" /> Application Status
          </div>
          <h1 className="text-3xl font-bold text-text tracking-tight">{caseData?.case?.customer_name || "KYC Application"}</h1>
          <p className="text-sm text-text-muted mt-2">
            Case ID: <span className="font-mono text-primary text-xs">{id}</span>
          </p>
        </div>

        {stuck && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border border-warning/30 bg-warning/5 text-center"
          >
            <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-2" />
            <p className="text-sm text-text font-semibold mb-1">Pipeline appears stuck</p>
            <p className="text-xs text-text-muted mb-3">The pipeline is taking longer than expected. You can retry or check back later.</p>
            <button
              onClick={handleRetry}
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-warning text-white text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Now
            </button>
          </motion.div>
        )}

        <div className="relative mb-10">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" aria-hidden />

          <div className="space-y-0">
            {PIPELINE.map((stage, i) => {
              const status = stages[i]
              const Icon = stage.icon
              const agentResult = agentResults.find((a: any) => a.agent_name === stage.agentName)

              return (
                <div key={stage.id} className="relative flex items-start gap-4 pb-8 last:pb-0">
                  <motion.div
                    className={cn(
                      "relative z-10 w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all",
                      status === "complete"
                        ? "border-success bg-success/10"
                        : status === "in_progress"
                          ? "border-primary bg-primary/10"
                          : status === "failed"
                            ? "border-danger bg-danger/10"
                            : "border-border bg-surface-2"
                    )}
                    animate={
                      status === "in_progress"
                        ? { scale: [1, 1.06, 1] }
                        : status === "complete"
                          ? { scale: [0.95, 1, 1] }
                          : {}
                    }
                    transition={
                      status === "in_progress"
                        ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.3 }
                    }
                  >
                    {status === "complete" ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : status === "in_progress" ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : status === "failed" ? (
                      <XCircle className="w-5 h-5 text-danger" />
                    ) : (
                      <Clock className="w-5 h-5 text-text-muted" />
                    )}
                  </motion.div>

                  <div className="flex-1 pt-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={cn(
                          "text-sm font-bold",
                          status === "complete"
                            ? "text-success"
                            : status === "in_progress"
                              ? "text-primary"
                              : status === "failed"
                                ? "text-danger"
                                : "text-text-muted"
                        )}
                      >
                        {stage.name}
                      </h3>
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                          status === "complete"
                            ? "border-success/20 bg-success/10 text-success"
                            : status === "in_progress"
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : status === "failed"
                                ? "border-danger/20 bg-danger/10 text-danger"
                                : "border-border bg-surface-2 text-text-muted"
                        )}
                      >
                        {status === "in_progress"
                          ? "Running"
                          : status === "complete"
                            ? "Done"
                            : status === "failed"
                              ? "Failed"
                              : "Pending"}
                      </span>
                    </div>

                    {status === "in_progress" && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            animate={{ width: ["0%", "100%"] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                      </div>
                    )}

                    {status === "complete" && agentResult && agentResult.confidence !== undefined && (
                      <p className="text-[10px] text-text-muted mt-1">
                        Confidence: {(agentResult.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-surface/50 p-6 text-center"
          >
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 border",
                caseData.case.decision === "APPROVED"
                  ? "bg-success/10 text-success border-success/20"
                  : caseData.case.decision === "REVIEW"
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-danger/10 text-danger border-danger/20"
              )}
            >
              {caseData.case.decision === "APPROVED" ? (
                <CheckCircle className="w-5 h-5" />
              ) : caseData.case.decision === "REVIEW" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              {caseData.case.decision}
            </div>

            <h2 className="text-xl font-bold text-text mb-2">Final Decision</h2>

            {caseData.case.risk_score !== undefined && (
              <div className="mb-4">
                <span className={cn("text-3xl font-bold", riskColor(caseData.case.risk_score))}>
                  {caseData.case.risk_score.toFixed(0)}
                </span>
                <span className="text-text-muted text-sm ml-1.5">/ 100 Risk Score</span>
              </div>
            )}

            {caseData.case.explanation && (
              <p className="text-sm text-text-muted max-w-lg mx-auto leading-relaxed">{caseData.case.explanation}</p>
            )}

            {caseData.debate?.consensus && (
              <div className="mt-4 p-3 rounded-xl bg-surface-2/50 border border-border/50 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Debate Consensus</p>
                <p className="text-xs text-text">{caseData.debate.consensus}</p>
                {caseData.debate.confidence !== undefined && (
                  <p className="text-[10px] text-text-muted mt-1">
                    Consensus confidence: {(caseData.debate.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            )}

            {agentResults.length > 0 && (
              <div className="mt-6 space-y-2 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <Gavel className="w-3 h-3" /> Agent Evidence
                </p>
                {agentResults.map((a: any) => (
                  <div
                    key={a.agent_name}
                    className="p-3 rounded-xl border border-border/50 bg-surface-2/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-text">{a.agent_name.replace(/_/g, " ")}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                        a.status === "SUCCESS" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      )}>
                        {a.status}
                      </span>
                    </div>
                    {a.confidence !== undefined && (
                      <p className="text-[10px] text-text-muted">Confidence: {(a.confidence * 100).toFixed(0)}%</p>
                    )}
                    {a.findings && a.findings.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {a.findings.slice(0, 3).map((f: any, i: number) => (
                          <p key={i} className="text-[10px] text-text-muted flex items-start gap-1">
                            <span className="text-warning mt-0.5 shrink-0">•</span>
                            <span>{typeof f === "string" ? f : f.finding_type || f.description || JSON.stringify(f)}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {a.recommendation && (
                      <p className="text-[10px] text-text-muted mt-1">
                        <span className="text-primary font-semibold">Recommendation:</span> {a.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {caseData.case.decision === "REVIEW" && (
              <div className="mt-6 p-4 rounded-xl border border-warning/20 bg-warning/5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-warning" />
                  <p className="text-xs font-bold text-warning uppercase tracking-wider">Human Review Required</p>
                </div>
                <p className="text-xs text-text-muted">
                  The agent consensus indicates this case needs human review.
                  An authorized reviewer will evaluate the evidence and make a final decision.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {!isComplete && !stuck && (
          <div className="text-center mt-6">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-text-muted font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" /> Processing...
            </span>
          </div>
        )}

        {error && caseData && (
          <div className="text-center mt-4">
            <p className="text-[10px] text-danger font-semibold">{error}</p>
            <button
              onClick={handleRetry}
              type="button"
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-text-muted text-xs font-semibold hover:bg-surface-2"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}