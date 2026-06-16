import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(date))
}

export function truncate(str: string, len: number = 50): string {
  return str.length > len ? str.slice(0, len) + "..." : str
}

export function confidenceColor(conf: number): string {
  if (conf >= 0.8) return "text-emerald-400"
  if (conf >= 0.5) return "text-amber-400"
  return "text-red-400"
}

export function riskColor(risk: number): string {
  if (risk < 30) return "text-emerald-400"
  if (risk < 60) return "text-amber-400"
  return "text-red-400"
}

export function statusColor(status: string): string {
  switch (status) {
    case "APPROVED": case "APPROVE": return "text-emerald-400 bg-emerald-400/10"
    case "REVIEW": return "text-amber-400 bg-amber-400/10"
    case "ESCALATED": case "ESCALATE": return "text-red-400 bg-red-400/10"
    case "PENDING": return "text-slate-400 bg-slate-400/10"
    case "IN_PROGRESS": return "text-blue-400 bg-blue-400/10"
    default: return "text-slate-400 bg-slate-400/10"
  }
}
