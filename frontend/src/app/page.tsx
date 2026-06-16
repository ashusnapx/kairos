"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Shield, Brain, GitBranch, Scale, FileSearch, UserCheck,
  Search, TrendingUp, Network, MessageSquare, FileText, Cpu, Zap,
  CheckCircle, XCircle, AlertTriangle, Loader2, Server, Database,
  Upload, ChevronRight, Activity, Sparkles, RefreshCw, Play, Sliders, Eye, Layers
} from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

/* ─── Types ───────────────────────────────────────────────────────────── */
interface CaseSummary {
  id: string
  status: string
  customer_name: string
  risk_score: number
  decision: string | null
  trace_id?: string
  created_at: string
  updated_at?: string
}

/* ------------- Agent metadata ------------- */
const AGENT_DETAILS = [
  {
    id: "document_agent",
    name: "Document Intelligence",
    icon: FileSearch,
    color: "from-red-500 to-orange-500",
    glow: "glow-red",
    desc: "Performs digital forensics on identification documents.",
    specs: ["Error Level Analysis (ELA) for digital forgery", "Optical Character Recognition (OCR) data parsing", "Format consistency checks & metadata verification"]
  },
  {
    id: "identity_agent",
    name: "Identity Resolution",
    icon: UserCheck,
    color: "from-pink-500 to-purple-500",
    glow: "shadow-[0_0_30px_-5px_rgba(236,72,153,0.2)]",
    desc: "Cross-matches customer identity across external databases.",
    specs: ["Fuzzy name matching with RapidFuzz algorithms", "Biometric face verification checks", "Entity resolution across historical case clusters"]
  },
  {
    id: "compliance_agent",
    name: "Compliance Screening",
    icon: Search,
    color: "from-violet-500 to-indigo-500",
    glow: "glow-indigo",
    desc: "Evaluates name listings against global compliance matrices.",
    specs: ["Real-time Politically Exposed Person (PEP) check", "OFAC & UNSC consolidated sanctions lists lookup", "FATF (Financial Action Task Force) policy alignment"]
  },
  {
    id: "financial_agent",
    name: "Financial Profiling",
    icon: TrendingUp,
    color: "from-blue-500 to-cyan-500",
    glow: "glow-cyan",
    desc: "Extracts transaction trends and detects structural anomaly flags.",
    specs: ["Isolation Forest machine learning anomaly detection", "Structuring & CTR avoidance pattern triggers", "Income-to-deposit ratio validation"]
  },
  {
    id: "graph_agent",
    name: "Graph Intelligence",
    icon: Network,
    color: "from-cyan-500 to-teal-500",
    glow: "shadow-[0_0_30px_-5px_rgba(6,182,212,0.2)]",
    desc: "Explores entity-relationship graphs for hidden connections.",
    specs: ["Shared device login, IMEI, and IP address mappings", "Overlapping residential address fraud ring queries", "Neo4j graph database path matching"]
  },
  {
    id: "fusion_agent",
    name: "Evidence Fusion",
    icon: Layers,
    color: "from-emerald-500 to-green-500",
    glow: "glow-emerald",
    desc: "Consolidates individual agent recommendations into a weighted metric.",
    specs: ["Conflict resolution rules when agents disagree", "Deduplication of findings and uncertainties", "Mathematical confidence-based score mapping"]
  },
  {
    id: "debate_engine",
    name: "Debate Engine",
    icon: MessageSquare,
    color: "from-amber-500 to-red-500",
    glow: "glow-amber",
    desc: "Simulates adversarial debate among three compliance officer personas.",
    specs: ["Conservative, Growth, and Forensic Investigator voices", "Adversarial argumentation for high-fidelity reviews", "Constitutional AI guideline compliance checking"]
  }
]

const PRESET_SCENARIOS = [
  {
    id: "low-risk",
    name: "John Doe",
    label: "Low Risk Profile",
    description: "Standard customer due diligence. Clean passport, stable salary deposits, no compliance matches.",
    icon: UserCheck,
    badge: "Clean Pass",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/50 hover:shadow-emerald-500/5",
    iconColor: "text-emerald-400",
    payload: {
      customer_name: "John Doe (Clean Profile)",
      customer_id: "CUST-LOW001",
      customer_type: "LOW_RISK",
      expected_risk: 15,
      income: 95000,
      transactions: [1200, 1500, 1100, 1300, 1400, 1250, 1350],
      documents: ["PASSPORT"]
    }
  },
  {
    id: "tampered-aadhaar",
    name: "Aarav Sharma",
    label: "WOW #1: Tampered Aadhaar",
    description: "Image forgery detection. Aadhaar card upload with spliced expiry date and ELA compression anomalies.",
    icon: FileSearch,
    badge: "ELA Tampering",
    color: "from-red-500/10 to-orange-500/10 border-red-500/20 text-red-400 hover:border-red-500/50 hover:shadow-red-500/5",
    iconColor: "text-red-400",
    payload: {
      customer_name: "Aarav Sharma (Tampered Aadhaar)",
      customer_id: "CUST-TAMP002",
      customer_type: "TAMPERED_DOC",
      expected_risk: 72,
      income: 65000,
      transactions: [800, 900, 1200, 1100, 1000],
      documents: ["AADHAAR"],
      tampering: {
        tampering_detected: true,
        tampering_type: "EXPIRY_DATE_MODIFICATION",
        confidence: 0.94,
        evidence: ["ELA anomaly near expiry field", "Font mismatch detected: Arial-Bold vs. Helvetica"]
      }
    }
  },
  {
    id: "pep-smith",
    name: "Jane Smith",
    label: "Jane Smith PEP",
    description: "Enhanced Compliance Screening. Identity matched against OFAC sanctions and PEP databases.",
    icon: Search,
    badge: "Sanctions / PEP",
    color: "from-violet-500/10 to-indigo-500/10 border-violet-500/20 text-indigo-400 hover:border-violet-500/50 hover:shadow-violet-500/5",
    iconColor: "text-indigo-400",
    payload: {
      customer_name: "Jane Smith (PEP)",
      customer_id: "CUST-PEP003",
      customer_type: "PEP",
      expected_risk: 80,
      income: 120000,
      transactions: [5000, 4500, 6000, 5500],
      documents: ["PASSPORT"],
      pep_match: {
        finding_type: "PEP_MATCH",
        confidence: 0.95,
        regulation: "FATF Recommendation 12",
        recommended_action: "EDD_REQUIRED"
      }
    }
  },
  {
    id: "structuring-gardner",
    name: "Matthew Gardner",
    label: "WOW #3: Transaction Structuring",
    description: "Evading CTR Reporting. Repetitive daily transactions structured just below the legal reporting threshold.",
    icon: TrendingUp,
    badge: "Structuring",
    color: "from-amber-500/10 to-yellow-500/10 border-amber-500/20 text-amber-400 hover:border-amber-500/50 hover:shadow-amber-500/5",
    iconColor: "text-amber-400",
    payload: {
      customer_name: "Matthew Gardner (Structuring)",
      customer_id: "CUST-STR004",
      customer_type: "STRUCTURING",
      expected_risk: 88,
      income: 48000,
      transactions: [9800, 9900, 9750, 9850, 9900, 9800, 9700, 9950],
      documents: ["PAN_CARD"]
    }
  },
  {
    id: "fraud-ring-kumar",
    name: "Ashutosh Kumar",
    label: "WOW #4: Graph Fraud Link",
    description: "Shared Entity Networks. Links detected between customer devices, addresses, and shell corporations.",
    icon: Network,
    badge: "Fraud Ring",
    color: "from-cyan-500/10 to-blue-500/10 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/50 hover:shadow-cyan-500/5",
    iconColor: "text-cyan-400",
    payload: {
      customer_name: "Ashutosh Kumar (Fraud Network)",
      customer_id: "CUST-RING005",
      customer_type: "FRAUD_RING",
      expected_risk: 92,
      income: 35000,
      transactions: [9500, 9200, 9800, 9400],
      documents: ["AADHAAR"],
      graph_pattern: {
        suspicious_pattern: "SHARED_ADDRESS",
        entities_involved: 5,
        confidence: 0.91
      }
    }
  }
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState<number>(-1)
  const [pipelineState, setPipelineState] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [uploadProgress, setUploadProgress] = useState("")
  const [customName, setCustomName] = useState("")
  const [customDocType, setCustomDocType] = useState("PASSPORT")
  const [dragActive, setDragActive] = useState(false)
  
  // Custom mouse pointer tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [cursorHovered, setCursorHovered] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(false)
  const [activeAgentShowcase, setActiveAgentShowcase] = useState(0)

  useEffect(() => {
    setMounted(true)
    refreshCases()

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
      if (!cursorVisible) setCursorVisible(true)
    }

    const handleMouseLeave = () => {
      setCursorVisible(false)
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target.closest("button") || 
        target.closest("a") || 
        target.closest("select") || 
        target.closest("input") || 
        target.closest(".interactive-node") || 
        target.closest(".clickable-card")
      ) {
        setCursorHovered(true)
      } else {
        setCursorHovered(false)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("mouseover", handleMouseOver)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("mouseover", handleMouseOver)
    }
  }, [cursorVisible])

  const refreshCases = () => {
    setLoading(true)
    api.getCases()
      .then((d: any) => {
        const list = Array.isArray(d) ? d : (d.cases || d.items || [])
        setCases(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const simulateWorkflowProgress = async (caseId: string) => {
    setPipelineState("processing")
    for (let i = 0; i < AGENT_DETAILS.length; i++) {
      setActiveStep(i)
      await new Promise((resolve) => setTimeout(resolve, 900))
    }
    setPipelineState("success")
    await new Promise((resolve) => setTimeout(resolve, 600))
    window.location.href = `/cases/${caseId}`
  }

  const handleScenarioClick = async (scenario: typeof PRESET_SCENARIOS[0]) => {
    try {
      setUploadProgress(`Spawning case pipeline for ${scenario.name}...`)
      const resp = await api.createCase(scenario.payload)
      if (resp && resp.case_id) {
        simulateWorkflowProgress(resp.case_id)
      } else {
        throw new Error("Failed to initialize workflow case")
      }
    } catch (e) {
      console.error(e)
      setPipelineState("error")
      setUploadProgress("Failed to deploy scenario. Please try again.")
    }
  }

  const handleCustomSubmit = async () => {
    if (!customName.trim()) return
    try {
      setUploadProgress("Deploying custom compliance workflow...")
      const resp = await api.createCase({
        customer_name: customName,
        customer_id: `CUST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        documents: [customDocType]
      })
      if (resp && resp.case_id) {
        simulateWorkflowProgress(resp.case_id)
      }
    } catch (e) {
      console.error(e)
      setPipelineState("error")
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setPipelineState("processing")
      setUploadProgress(`Uploading and analyzing ${file.name}...`)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("customer_name", customName || file.name.split(".")[0].replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
      formData.append("doc_type", customDocType)

      const resp = await api.uploadCaseFile(formData)
      if (resp && resp.case_id) {
        simulateWorkflowProgress(resp.case_id)
      } else {
        throw new Error("No case ID returned from upload")
      }
    } catch (e) {
      console.error(e)
      setPipelineState("error")
      setUploadProgress("Error uploading file. Check API logs.")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SUCCESS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      FAILURE: "bg-red-500/10 text-red-400 border-red-500/20",
      ESCALATE: "bg-red-500/10 text-red-400 border-red-500/20",
      APPROVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    }
    return colors[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20"
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-x-hidden md:cursor-none select-none">
      
      {/* ─── Apple-style spring trailing cursor ─── */}
      <AnimatePresence>
        {cursorVisible && (
          <>
            <motion.div
              className="fixed top-0 left-0 w-8 h-8 rounded-full border border-indigo-500/50 pointer-events-none z-50 hidden md:block"
              animate={{
                x: mousePos.x - 16,
                y: mousePos.y - 16,
                scale: cursorHovered ? 1.6 : 1,
                backgroundColor: cursorHovered ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0)",
                borderColor: cursorHovered ? "rgba(6, 182, 212, 0.6)" : "rgba(99, 102, 241, 0.4)",
              }}
              transition={{ type: "spring", stiffness: 220, damping: 22, mass: 0.6 }}
            />
            <motion.div
              className="fixed top-0 left-0 w-2.5 h-2.5 rounded-full bg-cyan-400 pointer-events-none z-50 hidden md:block glow-cyan"
              animate={{
                x: mousePos.x - 5,
                y: mousePos.y - 5,
                scale: cursorHovered ? 0.8 : 1,
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Dynamic Grid Overlay & ambient glowing orbs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111116_1px,transparent_1px),linear-gradient(to_bottom,#111116_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-75 pointer-events-none" />
      <div className="absolute top-[-10%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-cyan-500/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Nav bar */}
      <nav className="fixed top-0 w-full z-40 bg-[#030305]/75 backdrop-blur-2xl border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base glow-indigo">K</div>
            <span className="font-semibold text-text text-base tracking-tight">KAIROS</span>
            <span className="hidden sm:inline text-[10px] font-mono text-text-muted bg-surface-2/60 px-2 py-0.5 rounded-full border border-border/50">v3.0</span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xs font-semibold text-text-muted hover:text-text transition-colors">Workspace</Link>
            <Link href="/judge-mode" className="text-xs font-semibold text-text-muted hover:text-text transition-colors">Judge Benchmarks</Link>
            <Link href="/human-review" className="text-xs font-semibold text-text-muted hover:text-text transition-colors">Human Console</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all glow-indigo">
              Launch Console
            </Link>
          </div>
        </div>
      </nav>

      {/* LangGraph Pipeline Active Modal */}
      <AnimatePresence>
        {pipelineState !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#030305]/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="glass-panel w-full max-w-xl rounded-3xl p-8 border border-border/80 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Cpu className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">Orchestrating KAIROS Graph Engine</h3>
                  <p className="text-xs text-text-muted">{uploadProgress || "Triggering 7-Agent LangGraph verification pipeline..."}</p>
                </div>
              </div>

              <div className="space-y-2.5 relative z-10">
                {AGENT_DETAILS.map((step, idx) => {
                  const Icon = step.icon
                  const isPending = idx > activeStep
                  const isCurrent = idx === activeStep
                  const isCompleted = idx < activeStep

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-3.5 p-3 rounded-xl border transition-all duration-300",
                        isCurrent ? "bg-indigo-500/10 border-indigo-500/40 scale-[1.01] shadow-[0_0_15px_rgba(99,102,241,0.1)]" :
                        isCompleted ? "bg-surface/40 border-border/30 opacity-90" :
                        "bg-surface/10 border-border/10 opacity-30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all",
                        isCompleted ? "bg-emerald-500/15 text-emerald-400" :
                        isCurrent ? "bg-indigo-500/20 text-indigo-400 animate-pulse" :
                        "bg-surface-2 text-text-muted"
                      )}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text">{step.name}</span>
                          {isCurrent && <span className="text-[9px] font-bold text-indigo-400 animate-pulse uppercase tracking-wider">Evaluating</span>}
                          {isCompleted && <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Completed</span>}
                        </div>
                        <span className="text-[10px] text-text-muted truncate block mt-0.5">{step.desc}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {pipelineState === "error" && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Pipeline connection failure. Reverting console.</span>
                  </div>
                  <button
                    onClick={() => setPipelineState("idle")}
                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Close & Return
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-28 max-w-[1400px] mx-auto px-8 pb-20">
        
        {/* ─── Hero Section (Apple.com styling) ─── */}
        <section className="mb-24 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-8 glow-indigo"
          >
            <Sparkles className="w-3.5 h-3.5" /> High-Fidelity Agentic Compliance Protocol
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.05] max-w-4xl"
          >
            Trust, Resolved.
            <br />
            <span className="text-gradient">
              Autonomous KYC Intelligence.
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-base text-text-muted mt-8 max-w-2xl leading-relaxed"
          >
            KAIROS coordinates 7 specialized AI agents within a LangGraph state machine. From error-level document forgery detection to Neo4j relationship networks, AML checks, and multi-persona debate chambers, we convert compliance analysis into structured, explainable trust verdicts.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <Link href="/dashboard" className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all glow-indigo flex items-center gap-2">
              Launch Investigation Workspace <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/judge-mode" className="px-6 py-3 rounded-2xl bg-surface border border-border/80 hover:border-indigo-500/30 text-text text-sm font-semibold transition-all">
              Inspect Performance Matrix
            </Link>
          </motion.div>
        </section>

        {/* ─── Neural Net Pipeline SVG Graphic (7 Agents working) ─── */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white tracking-tight">7-Agent Neural Orchestration</h2>
            <p className="text-xs text-text-muted mt-2">Explore each module of our synchronous decision-graph pipeline.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Interactive SVG Workspace */}
            <div className="lg:col-span-7 p-6 rounded-3xl border border-border/60 bg-surface/30 backdrop-blur-md relative overflow-hidden flex items-center justify-center min-h-[360px]">
              <div className="absolute inset-0 bg-[#050508]/40 pointer-events-none" />
              
              {/* Dynamic Connecting Lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {/* Connection lines between agent nodes */}
                <path d="M 50 180 L 140 100" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                <path d="M 50 180 L 140 260" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                <path d="M 140 100 L 260 100" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                <path d="M 140 260 L 260 260" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                <path d="M 260 100 L 380 180" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                <path d="M 260 260 L 380 180" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                <path d="M 380 180 L 500 180" stroke="rgba(99, 102, 241, 0.25)" strokeWidth="2" fill="none" />
                
                {/* Moving active data pulses */}
                <circle r="4" fill="#06b6d4" className="glow-cyan">
                  <animateMotion dur="6s" repeatCount="indefinite" path="M 50 180 L 140 100 L 260 100 L 380 180 L 500 180" />
                </circle>
                <circle r="4" fill="#6366f1" className="glow-indigo">
                  <animateMotion dur="5s" begin="2s" repeatCount="indefinite" path="M 50 180 L 140 260 L 260 260 L 380 180 L 500 180" />
                </circle>
              </svg>

              {/* Node Grid Layout */}
              <div className="relative w-full max-w-[550px] h-[280px]">
                {/* Node 1: Doc Intel */}
                <div 
                  onClick={() => setActiveAgentShowcase(0)}
                  className={cn(
                    "absolute left-[10px] top-[145px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 0 ? "border-red-500 bg-red-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-red-500/40 hover:bg-red-500/5"
                  )}
                >
                  <FileSearch className="w-5 h-5 text-red-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Doc Intel</span>
                </div>

                {/* Node 2: Identity Res */}
                <div 
                  onClick={() => setActiveAgentShowcase(1)}
                  className={cn(
                    "absolute left-[130px] top-[60px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 1 ? "border-pink-500 bg-pink-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-pink-500/40 hover:bg-pink-500/5"
                  )}
                >
                  <UserCheck className="w-5 h-5 text-pink-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Identity</span>
                </div>

                {/* Node 3: Compliance */}
                <div 
                  onClick={() => setActiveAgentShowcase(2)}
                  className={cn(
                    "absolute left-[250px] top-[60px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 2 ? "border-violet-500 bg-violet-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-violet-500/40 hover:bg-violet-500/5"
                  )}
                >
                  <Search className="w-5 h-5 text-violet-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Screening</span>
                </div>

                {/* Node 4: Financial */}
                <div 
                  onClick={() => setActiveAgentShowcase(3)}
                  className={cn(
                    "absolute left-[130px] top-[220px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 3 ? "border-blue-500 bg-blue-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-blue-500/40 hover:bg-blue-500/5"
                  )}
                >
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Financial</span>
                </div>

                {/* Node 5: Graph Intel */}
                <div 
                  onClick={() => setActiveAgentShowcase(4)}
                  className={cn(
                    "absolute left-[250px] top-[220px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 4 ? "border-cyan-500 bg-cyan-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  )}
                >
                  <Network className="w-5 h-5 text-cyan-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Graph</span>
                </div>

                {/* Node 6: Evidence Fusion */}
                <div 
                  onClick={() => setActiveAgentShowcase(5)}
                  className={cn(
                    "absolute left-[370px] top-[145px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 5 ? "border-emerald-500 bg-emerald-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                  )}
                >
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Fusion</span>
                </div>

                {/* Node 7: Debate Engine */}
                <div 
                  onClick={() => setActiveAgentShowcase(6)}
                  className={cn(
                    "absolute left-[490px] top-[145px] -translate-y-1/2 w-16 h-16 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-300 interactive-node shadow-lg z-10",
                    activeAgentShowcase === 6 ? "border-amber-500 bg-amber-500/10 scale-105" : "border-border bg-surface-2/80 hover:border-amber-500/40 hover:bg-amber-500/5"
                  )}
                >
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  <span className="text-[8px] font-bold mt-1 text-text-muted">Debate</span>
                </div>
              </div>
            </div>

            {/* Explanatory Info Card (Apple-style product specifications) */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAgentShowcase}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="glass-panel p-8 rounded-3xl border border-border/80 relative"
                >
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white",
                      AGENT_DETAILS[activeAgentShowcase].color
                    )}>
                      {(() => {
                        const Icon = AGENT_DETAILS[activeAgentShowcase].icon
                        return <Icon className="w-6 h-6" />
                      })()}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Agent {activeAgentShowcase + 1} of 7</span>
                      <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">
                        {AGENT_DETAILS[activeAgentShowcase].name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed mb-6">
                    {AGENT_DETAILS[activeAgentShowcase].desc}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Core Operations</span>
                    {AGENT_DETAILS[activeAgentShowcase].specs.map((spec, sidx) => (
                      <div key={sidx} className="flex items-start gap-2.5 text-xs text-text">
                        <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{spec}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* ─── Apple Bento Grid Section (Aesthetic Showcase) ─── */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white tracking-tight">Engineered for Forgery & Network Fraud</h2>
            <p className="text-xs text-text-muted mt-2">Combining forensic image analysis, device correlation, and constitutional logic.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento 1: Document Tampering */}
            <div className="md:col-span-2 p-6 rounded-3xl border border-border bg-gradient-to-b from-[#0b0b10] to-[#040406] flex flex-col justify-between min-h-[260px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Forensic ELA Checks</span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-3">Image Forgery & Metadata Integrity</h3>
                <p className="text-xs text-text-muted mt-2 max-w-lg leading-relaxed">
                  The Document Intelligence agent performs Error Level Analysis (ELA) to scan compression consistency across image zones. If spliced numbers, custom dates, or font mismatches are identified, ELA locks tampering coordinates to outline manipulated boundaries directly on the ID image.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <FileSearch className="w-5 h-5 text-red-400" />
                <span className="text-xs font-semibold text-text">Live pixel verification overlay</span>
              </div>
            </div>

            {/* Bento 2: AMD ROCm */}
            <div className="p-6 rounded-3xl border border-border bg-[#0b0b10] flex flex-col justify-between min-h-[260px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Hardware Accelerated</span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-3">AMD ROCm Pipeline</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Vector similarity queries and risk weighting calculations are compiled to run using AMD ROCm GPU acceleration, achieving a simulated 22x latency speedup over traditional CPU workflows.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <Cpu className="w-4 h-4 animate-pulse" />
                <span>ROCm PyTorch execution kernels</span>
              </div>
            </div>

            {/* Bento 3: Graph Intelligence */}
            <div className="p-6 rounded-3xl border border-border bg-[#0b0b10] flex flex-col justify-between min-h-[260px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Entity Resolution</span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-3">Neo4j Network Graphs</h3>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Maps relationships between customers, registration addresses, mobile IMEI codes, and bank accounts. Instantly isolates structured money-laundering loops or shared device fraud rings.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                <Network className="w-4 h-4" />
                <span>Active node clustering algorithms</span>
              </div>
            </div>

            {/* Bento 4: Adversarial Debate */}
            <div className="md:col-span-2 p-6 rounded-3xl border border-border bg-gradient-to-b from-[#0b0b10] to-[#040406] flex flex-col justify-between min-h-[260px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Constitutional Debate</span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-3">Multi-Persona Consensus Engine</h3>
                <p className="text-xs text-text-muted mt-2 max-w-lg leading-relaxed">
                  To eliminate machine bias, the final decision is subjected to a three-way agent debate. A Conservative Compliance Officer, Growth Officer, and Forensic Investigator argue risk mitigations based on policy templates, ensuring absolute validation audit trails.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-semibold text-text">Fully explainable natural language auditing</span>
              </div>
            </div>
            
          </div>
        </section>

        {/* ─── Interactive Preset Scenarios (Apple Cards styling) ─── */}
        <section className="mb-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Scenario Playgrounds</h2>
              <p className="text-xs text-text-muted mt-2">Deploy pre-calibrated compliance vectors to inspect specific system outcomes.</p>
            </div>
            <span className="self-start sm:self-center mt-3 sm:mt-0 text-[10px] font-mono text-text-muted bg-surface-2/60 px-2.5 py-1 rounded-full border border-border/50">
              Interactive Demonstrators
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {PRESET_SCENARIOS.map((scen, idx) => {
              const Icon = scen.icon
              return (
                <motion.div
                  key={scen.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  onClick={() => handleScenarioClick(scen)}
                  className={cn(
                    "p-6 rounded-3xl border bg-surface/30 backdrop-blur-md cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[230px] hover:translate-y-[-4px] hover:shadow-lg clickable-card",
                    scen.color
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider">{scen.badge}</span>
                      <Icon className={cn("w-5 h-5", scen.iconColor)} />
                    </div>
                    <h3 className="font-bold text-white text-base tracking-tight mb-1.5">{scen.name}</h3>
                    <p className="text-[11px] text-text-muted leading-relaxed mb-4">{scen.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/10 text-xs font-bold">
                    <span>Deploy Scenario</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ─── Onboarding Console (High-tech interactive block) ─── */}
        <section className="mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col justify-center lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-3">
              <Zap className="w-4 h-4 animate-pulse" /> Active Deployer
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-snug">
              Onboard Custom Client
            </h2>
            <p className="text-xs text-text-muted mt-4 leading-relaxed">
              Submit custom identity variables to observe how agents resolve, screen, and debate details in real-time. Drag and drop mock ID images to test ELA image tampering checks.
            </p>
          </div>

          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full rounded-3xl border border-border/80 bg-surface/40 backdrop-blur-md p-8 shadow-2xl relative"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">Customer Full Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="E.g. Ashutosh Kumar, Jane Smith..."
                    className="w-full px-4.5 py-3 rounded-2xl bg-surface-2 border border-border text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/10 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-wider">Primary Verification Document</label>
                  <select
                    value={customDocType}
                    onChange={(e) => setCustomDocType(e.target.value)}
                    className="w-full px-4.5 py-3 rounded-2xl bg-surface-2 border border-border text-xs text-text focus:outline-none focus:border-indigo-500/50 font-semibold"
                  >
                    <option value="PASSPORT">Passport (Global)</option>
                    <option value="AADHAAR">Aadhaar ID Card (India)</option>
                    <option value="PAN_CARD">PAN Tax Document (India)</option>
                    <option value="DRIVING_LICENSE">Driving License (State)</option>
                    <option value="BANK_STATEMENT">Bank Account Statement</option>
                  </select>
                </div>

                {/* File Dropzone */}
                <div
                  className={cn(
                    "border border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer",
                    dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-border hover:border-indigo-500/40 bg-surface-2/30"
                  )}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
                  />
                  <Upload className="w-7 h-7 text-indigo-400 mx-auto mb-3" />
                  <p className="text-xs font-bold text-text">Drag & drop document or <span className="text-indigo-400 font-bold">browse local files</span></p>
                  <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                    Upload mock JPEG/PNG identifications to trigger active Error Level Analysis overlays
                  </p>
                </div>

                <button
                  onClick={handleCustomSubmit}
                  disabled={!customName.trim()}
                  className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all glow-indigo flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Trigger Verification Workforce
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── Compliance Database cases list ─── */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Active Audit Registries</h2>
              <span className="text-xs font-semibold text-text-muted bg-surface-2/60 px-2.5 py-0.5 rounded-full border border-border/50 font-mono">
                {cases.length} entries
              </span>
            </div>
            <button
              onClick={refreshCases}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 hover:border-indigo-500/50 hover:bg-surface text-text text-xs font-semibold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Synchronize Logs
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-text-muted text-xs font-medium">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Indexing compliance records...
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-20 text-text-muted border border-dashed border-border/60 rounded-3xl">
              <Database className="w-10 h-10 mx-auto mb-4 opacity-25" />
              <h3 className="font-bold text-text text-sm">No Compliance Records Located</h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Click a preset scenario above to seed and run the verification pipeline.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-surface/30 backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      <th className="py-4 px-6">Customer Profile</th>
                      <th className="py-4 px-6">Compliance Verdict</th>
                      <th className="py-4 px-6">Consensus Risk</th>
                      <th className="py-4 px-6">Trace Reference</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c, i) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.4 }}
                        className="border-b border-border/50 hover:bg-surface-2/20 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text">{c.customer_name}</span>
                            <span className="text-[10px] text-text-muted font-mono bg-surface-2/40 px-1.5 py-0.5 rounded border border-border/50">
                              ID: {c.id.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            statusBadge(c.decision || c.status)
                          )}>
                            {c.decision || c.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-text">
                          <span className={cn(
                            "font-bold",
                            c.risk_score < 35 ? "text-emerald-400" : c.risk_score < 70 ? "text-amber-400" : "text-red-400"
                          )}>
                            {c.risk_score.toFixed(0)}/100
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[10px] text-text-muted font-mono">
                          {c.trace_id || `trace_${c.id.slice(0, 12)}`}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold transition-all"
                          >
                            Investigate <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 px-8 border-t border-border/30 text-center text-[10px] font-semibold text-text-muted relative z-10">
        KAIROS v3.0 · Multi-Agent Compliant Decision Graph · Postgres · Redis · Neo4j · AMD ROCm GPU
      </footer>
    </div>
  )
}
