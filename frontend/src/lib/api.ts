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
}
