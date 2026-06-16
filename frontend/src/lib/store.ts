import { create } from "zustand"

interface CaseSummary {
  id: string
  status: string
  customer_name: string
  risk_score: number
  decision: string | null
  created_at: string
}

interface Metrics {
  cases: { total: number; approved: number; escalated: number; reviewed: number }
  agents: { avg_execution_time_ms: number }
  system: { service: string; version: string }
}

interface AppState {
  cases: CaseSummary[]
  metrics: Metrics | null
  selectedCaseId: string | null
  loading: boolean
  setCases: (cases: CaseSummary[]) => void
  setMetrics: (metrics: Metrics) => void
  setSelectedCase: (id: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  cases: [],
  metrics: null,
  selectedCaseId: null,
  loading: false,
  setCases: (cases) => set({ cases }),
  setMetrics: (metrics) => set({ metrics }),
  setSelectedCase: (id) => set({ selectedCaseId: id }),
  setLoading: (loading) => set({ loading }),
}))
