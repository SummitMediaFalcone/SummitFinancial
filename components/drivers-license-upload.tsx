"use client"

import { useRef, useState } from "react"
import { Camera, Upload, Loader2, CheckCircle2, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface DriversLicenseUploadProps {
  contractorId: string
  currentPath: string | null
  onUpload?: (path: string) => void
}

export function DriversLicenseUpload({ contractorId, currentPath, onUpload }: DriversLicenseUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedPath, setUploadedPath] = useState<string | null>(currentPath)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError("File must be under 10MB"); return }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only images or PDF allowed"); return
    }

    setError(null)
    setUploading(true)

    // Show local preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }

    try {
      const ext = file.name.split(".").pop()
      const path = `drivers-licenses/${contractorId}/dl-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("contractor-documents")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw uploadErr

      // Save path to contractor record
      const { error: updateErr } = await supabase
        .from("contractors")
        .update({
          drivers_license_path: path,
          drivers_license_updated_at: new Date().toISOString()
        })
        .eq("id", contractorId)

      if (updateErr) throw updateErr

      setUploadedPath(path)
      onUpload?.(path)
    } catch (e: any) {
      setError(e.message ?? "Upload failed")
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  async function getSignedUrl() {
    if (!uploadedPath) return
    const { data } = await supabase.storage
      .from("contractor-documents")
      .createSignedUrl(uploadedPath, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  const hasDoc = !!uploadedPath

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {/* Current state display */}
      {hasDoc && !preview ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">License on file</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500">Click to view or replace</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="text-emerald-600 h-8" onClick={getSignedUrl}>
              <ExternalLink className="size-3.5 mr-1" /> View
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={() => inputRef.current?.click()}>
              <Upload className="size-3.5 mr-1" /> Replace
            </Button>
          </div>
        </div>
      ) : preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          <img src={preview} alt="DL Preview" className="w-full max-h-52 object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="size-7 animate-spin" />
                <span className="text-sm font-semibold">Uploading…</span>
              </div>
            ) : (
              <CheckCircle2 className="size-8 text-emerald-400" />
            )}
          </div>
          {!uploading && (
            <button
              onClick={() => { setPreview(null) }}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-accent/50 hover:border-primary/40 disabled:opacity-50"
        >
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="size-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Upload Driver's License</p>
            <p className="text-xs text-muted-foreground">Photo or PDF · Max 10MB</p>
          </div>
        </button>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}
