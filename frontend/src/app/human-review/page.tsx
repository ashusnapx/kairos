"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertTriangle, Shield, FileText, MessageSquare, UserCheck, Send } from "lucide-react"
import { api } from "@/lib/api"
import { useStore } from "@/lib/store"
import { formatDate, statusColor } from "@/lib/utils"

export default function HumanReviewPage() {
  const { cases, setCases } = useStore()
  const [selectedCase, setSelectedCase] = useState<any>(null)
  const [reviewAction, setReviewAction] = useState("")
  const [reviewReason, setReviewReason] = useState("")
  const [reviewerId, setReviewerId] = useState("reviewer_01")
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    api.getCases().then(setCases).catch(console.error)
  }, [setCases])

  const pendingCases = cases.filter((c) => c.status === "IN_PROGRESS" || c.status === "REVIEW")

  const selectCase = async (case_: any) => {
    setSelectedCase(case_)
    setReviewAction("")
    setReviewReason("")
    const d = await api.getCase(case_.id)
    setDetail(d)
  }

  const submitReview = async () => {
    if (!selectedCase || !reviewAction) return
    setSubmitting(true)
    try {
      await api.submitReview(selectedCase.id, {
        reviewer_id: reviewerId,
        action: reviewAction,
        reasoning: reviewReason,
        notes: reviewReason,
      })
      const updated = await api.getCases()
      setCases(updated)
      setSelectedCase(null)
      setDetail(null)
      setReviewAction("")
      setReviewReason("")
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-text-muted hover:text-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-text">Human Review</span>
          </div>
          <div className="text-sm text-text-muted">
            Reviewer: <span className="text-text font-medium">{reviewerId}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold text-text mb-4">Pending Reviews ({pendingCases.length})</h2>
              {pendingCases.length === 0 ? (
                <p className="text-text-muted text-sm">No cases pending review</p>
              ) : (
                <div className="space-y-2">
                  {pendingCases.map((case_) => (
                    <button
                      key={case_.id}
                      onClick={() => selectCase(case_)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedCase?.id === case_.id
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-surface-2 hover:bg-surface-2/80 border border-transparent"
                      }`}
                    >
                      <p className="text-sm font-medium text-text">{case_.customer_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${statusColor(case_.status)}`}>{case_.status}</span>
                        <span className="text-xs text-text-muted">{case_.risk_score.toFixed(0)} risk</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedCase ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="rounded-2xl border border-border bg-surface p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-text text-lg">{selectedCase.customer_name}</h2>
                      <p className="text-sm text-text-muted">Case {selectedCase.id.slice(0, 8)}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor(selectedCase.status)}`}>
                      {selectedCase.status}
                    </span>
                  </div>

                  {detail?.debate && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Debate Recommendation
                      </h3>
                      <div className="p-4 rounded-xl bg-surface-2">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-lg font-bold ${statusColor(detail.debate.consensus)}`}>
                            {detail.debate.consensus}
                          </span>
                          <span className="text-sm text-text-muted">
                            Confidence: {(detail.debate.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-surface p-6">
                  <h3 className="font-semibold text-text mb-4">Review Decision</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      {["APPROVE", "REVIEW", "ESCALATE", "REQUEST_INFO"].map((action) => (
                        <button
                          key={action}
                          onClick={() => setReviewAction(action)}
                          className={`flex-1 p-3 rounded-xl text-sm font-medium transition-all ${
                            reviewAction === action
                              ? action === "APPROVE" ? "bg-emerald-400/10 border border-emerald-400/30 text-emerald-400"
                                : action === "ESCALATE" ? "bg-red-400/10 border border-red-400/30 text-red-400"
                                : action === "REVIEW" ? "bg-amber-400/10 border border-amber-400/30 text-amber-400"
                                : "bg-blue-400/10 border border-blue-400/30 text-blue-400"
                              : "bg-surface-2 border border-transparent text-text-muted hover:text-text hover:bg-surface-2/80"
                          }`}
                        >
                          {action === "APPROVE" ? <CheckCircle className="w-4 h-4 mx-auto mb-1" /> :
                           action === "ESCALATE" ? <AlertTriangle className="w-4 h-4 mx-auto mb-1" /> :
                           action === "REQUEST_INFO" ? <FileText className="w-4 h-4 mx-auto mb-1" /> :
                           <Shield className="w-4 h-4 mx-auto mb-1" />}
                          {action.replace("_", " ")}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-sm text-text-muted mb-2 block">Reasoning</label>
                      <textarea
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        placeholder="Document your reasoning for this decision..."
                        className="w-full h-24 p-3 rounded-xl bg-surface-2 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <button
                      onClick={submitReview}
                      disabled={!reviewAction || submitting}
                      className="w-full p-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? "Submitting..." : <><Send className="w-4 h-4" /> Submit Review</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-12 flex items-center justify-center">
                <div className="text-center">
                  <UserCheck className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted">Select a case from the queue to review</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
