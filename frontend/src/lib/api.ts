const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json()
}

export const api = {
  createCase: (data: any) =>
    fetchAPI("/api/cases", { method: "POST", body: JSON.stringify(data) }),

  getCases: () =>
    fetchAPI("/api/cases"),

  getCase: (id: string) =>
    fetchAPI(`/api/cases/${id}`),

  getTimeline: (id: string) =>
    fetchAPI(`/api/cases/${id}/timeline`),

  getGraph: (id: string) =>
    fetchAPI(`/api/cases/${id}/graph`),

  submitReview: (id: string, data: any) =>
    fetchAPI(`/api/review/${id}`, { method: "POST", body: JSON.stringify(data) }),

  getJudgeComparison: () =>
    fetchAPI("/api/judge/comparison"),

  getMetrics: () =>
    fetchAPI("/api/observability/metrics"),

  simulateCounterfactual: (caseId: string, data: any) =>
    fetchAPI(`/api/cases/${caseId}/simulate-counterfactual`, { method: "POST", body: JSON.stringify(data) }),

  getBenchmarks: () =>
    fetchAPI("/api/judge/benchmarks"),

  getPolicies: () =>
    fetchAPI("/api/policies"),

  getRedteamSummary: () =>
    fetchAPI("/api/redteam/summary"),

  triggerRedteamAttack: (data: { scenario_name: string }) =>
    fetchAPI("/api/redteam/trigger", { method: "POST", body: JSON.stringify(data) }),

  uploadCaseFile: (formData: FormData) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/cases/upload`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
      return res.json()
    }),
}
