"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Plus, Search, TrendingUp, Shield, AlertTriangle, Clock, BarChart3, Activity } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useStore } from "@/lib/store"
import { formatDate, riskColor, statusColor, formatCurrency } from "@/lib/utils"

export default function DashboardPage() {
  const { cases, setCases, metrics, setMetrics } = useStore()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    Promise.all([api.getCases(), api.getMetrics()])
      .then(([casesData, metricsData]) => {
        setCases(casesData)
        setMetrics(metricsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [setCases, setMetrics])

  const filtered = cases.filter((c) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-semibold text-lg text-text">KAIROS</span>
            <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/judge-mode" className="text-sm text-text-muted hover:text-text transition-colors">Judge Mode</Link>
            <Link href="/" className="text-sm text-text-muted hover:text-text transition-colors">Home</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Cases", value: metrics?.cases.total ?? 0, icon: BarChart3, color: "from-indigo-500 to-indigo-600" },
            { label: "Approved", value: metrics?.cases.approved ?? 0, icon: Shield, color: "from-emerald-500 to-emerald-600" },
            { label: "Escalated", value: metrics?.cases.escalated ?? 0, icon: AlertTriangle, color: "from-red-500 to-red-600" },
            { label: "Avg Time", value: metrics ? `${(metrics.agents.avg_execution_time_ms / 1000).toFixed(1)}s` : "—", icon: Clock, color: "from-cyan-500 to-cyan-600" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} p-1.5`}>
                  <stat.icon className="w-full h-full text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold text-text">{stat.value}</span>
            </motion.div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-text">Cases</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg bg-surface-2 border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-text-muted uppercase tracking-wider">
                  <th className="text-left py-4 px-5">Customer</th>
                  <th className="text-left py-4 px-5">Status</th>
                  <th className="text-left py-4 px-5">Risk Score</th>
                  <th className="text-left py-4 px-5">Decision</th>
                  <th className="text-left py-4 px-5">Created</th>
                  <th className="text-right py-4 px-5">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">Loading cases...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">No cases found</td>
                  </tr>
                ) : (
                  filtered.map((case_, i) => (
                    <motion.tr
                      key={case_.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-surface-2/50 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-medium text-text text-sm">{case_.customer_name}</p>
                          <p className="text-xs text-text-muted font-mono">{case_.id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(case_.status)}`}>
                          {case_.status}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`font-medium text-sm ${riskColor(case_.risk_score)}`}>
                          {case_.risk_score.toFixed(0)}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {case_.decision ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(case_.decision)}`}>
                            {case_.decision}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-sm text-text-muted">{formatDate(case_.created_at)}</td>
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/cases/${case_.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                        >
                          Investigate
                        </Link>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
