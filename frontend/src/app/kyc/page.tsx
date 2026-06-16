"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload, Check, X, FileText, User, Mail, Phone,
  ChevronRight, ChevronLeft, Shield, Send,
  Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const STEPS = ["Personal Info", "Documents", "Review", "Submit"]

interface FileEntry {
  file: File | null
  preview: string | null
  name: string
}

const emptyFile: FileEntry = { file: null, preview: null, name: "" }

export default function KYCPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const [aadhaar, setAadhaar] = useState<FileEntry>(emptyFile)
  const [pan, setPan] = useState<FileEntry>(emptyFile)
  const [selfie, setSelfie] = useState<FileEntry>(emptyFile)
  const [bankStatement, setBankStatement] = useState<FileEntry>(emptyFile)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const handleFile = useCallback((file: File | null, setter: (f: FileEntry) => void) => {
    if (!file) { setter(emptyFile); return }
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null
    setter({ file, preview, name: file.name })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, setter: (f: FileEntry) => void, key: string) => {
      e.preventDefault()
      setDragOver(null)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file, setter)
    },
    [handleFile]
  )

  const removeFile = (setter: (f: FileEntry) => void) => setter(emptyFile)

  const validate = (): boolean => {
    if (step === 0) {
      if (!name.trim()) { toast.error("Name is required"); return false }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Valid email is required"); return false
      }
      if (!phone.trim()) { toast.error("Phone number is required"); return false }
      return true
    }
    if (step === 1) {
      if (!aadhaar.file) { toast.error("Aadhaar card is required"); return false }
      if (!pan.file) { toast.error("PAN card is required"); return false }
      if (!selfie.file) { toast.error("Selfie photo is required"); return false }
      if (!bankStatement.file) { toast.error("Bank statement is required"); return false }
      return true
    }
    return true
  }

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("customer_name", name)
      if (aadhaar.file) fd.append("aadhaar", aadhaar.file)
      if (pan.file) fd.append("pan", pan.file)
      if (selfie.file) fd.append("selfie", selfie.file)
      if (bankStatement.file) fd.append("bank_statement", bankStatement.file)

      const res = await fetch("http://localhost:8000/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Upload failed (${res.status})`)
      }
      const data = await res.json()
      toast.success("Application submitted successfully!")
      router.push(`/kyc/${data.case_id || data.id}`)
    } catch (err: any) {
      toast.error(err.message || "Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  function Dropzone({
    label, accept, state, setter, id: key,
  }: {
    label: string; accept: string; state: FileEntry; setter: (f: FileEntry) => void; id: string
  }) {
    const isOver = dragOver === key
    return (
      <div>
        <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">{label}</label>
        {state.file ? (
          <div className="relative rounded-xl border border-border bg-surface-2/50 p-3">
            <div className="flex items-center gap-3">
              {state.preview ? (
                <img src={state.preview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-border/50" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-surface-2 flex items-center justify-center border border-border/50">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate">{state.name}</p>
                <p className="text-[10px] text-text-muted">
                  {state.file.size > 1048576
                    ? `${(state.file.size / 1048576).toFixed(1)} MB`
                    : `${(state.file.size / 1024).toFixed(0)} KB`}
                </p>
              </div>
              <button
                onClick={() => removeFile(setter)}
                className="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDrop={(e) => handleDrop(e, setter, key)}
            onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
            onDragLeave={() => setDragOver(null)}
            onClick={() => document.getElementById(`fu-${key}`)?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              isOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-surface-2/30"
            )}
          >
            <input
              id={`fu-${key}`}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null, setter)}
            />
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-xs font-semibold text-text-muted">
              <span className="text-primary">Click to upload</span> or drag & drop
            </p>
            <p className="text-[10px] text-text-muted mt-1">{accept.replace(/,/g, ", ")}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#111116_1px,transparent_1px),linear-gradient(to_bottom,#111116_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-50 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" /> KYC Application
          </div>
          <h1 className="text-3xl font-bold text-text tracking-tight">Identity Verification</h1>
          <p className="text-sm text-text-muted mt-2">Complete your Know Your Customer verification</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2 px-0.5">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => i < step && setStep(i)}
                type="button"
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider transition-colors",
                  i === step ? "text-primary" : i < step ? "text-success" : "text-text-muted"
                )}
              >
                {i < step && <Check className="w-3 h-3 inline mr-1" />}
                <span className="hidden sm:inline">{s}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 inline mr-1.5" /> Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 inline mr-1.5" /> Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 inline mr-1.5" /> Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <Dropzone label="Aadhaar Card (Front)" accept="image/*,application/pdf" state={aadhaar} setter={setAadhaar} id="aadhaar" />
                <Dropzone label="PAN Card" accept="image/*,application/pdf" state={pan} setter={setPan} id="pan" />
                <Dropzone label="Selfie Photo" accept="image/*" state={selfie} setter={setSelfie} id="selfie" />
                <Dropzone label="Bank Statement (PDF)" accept="application/pdf,image/*" state={bankStatement} setter={setBankStatement} id="bank" />
              </div>
            )}

            {step === 2 && (
              <div className="rounded-2xl border border-border bg-surface/50 p-6 space-y-4">
                <h3 className="text-sm font-bold text-text">Review Your Information</h3>
                <div className="space-y-3 text-sm">
                  <ReviewRow label="Name" value={name} />
                  <ReviewRow label="Email" value={email} />
                  <ReviewRow label="Phone" value={phone} />
                  <ReviewRow label="Aadhaar" value={aadhaar.file ? "Uploaded" : "Missing"} check={!!aadhaar.file} />
                  <ReviewRow label="PAN Card" value={pan.file ? "Uploaded" : "Missing"} check={!!pan.file} />
                  <ReviewRow label="Selfie" value={selfie.file ? "Uploaded" : "Missing"} check={!!selfie.file} />
                  <ReviewRow label="Bank Statement" value={bankStatement.file ? "Uploaded" : "Missing"} check={!!bankStatement.file} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button
              onClick={prev}
              type="button"
              className="px-5 py-2.5 rounded-xl border border-border text-text text-sm font-semibold hover:bg-surface-2 transition-all flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-primary/20"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              type="button"
              className="px-6 py-2.5 rounded-xl bg-success hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-success/20"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewRow({ label, value, check }: { label: string; value: string; check?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-semibold flex items-center gap-1.5">
        {check !== undefined && (
          check
            ? <Check className="w-3.5 h-3.5 text-success" />
            : <X className="w-3.5 h-3.5 text-danger" />
        )}
        {value}
      </span>
    </div>
  )
}
