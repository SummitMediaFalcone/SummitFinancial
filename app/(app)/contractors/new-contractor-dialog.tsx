"use client"

import { useRef, useState } from "react"
import { Plus, Building2, User, Briefcase, Upload, FileCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createContractorAction } from "@/app/actions/contractors"
import { useCompany } from "@/lib/company-context"

interface Props {
    activeCompanyId?: string | null
    onSuccess?: () => void
}

type ContractorType = "individual" | "business"

export function NewContractorDialog({ activeCompanyId, onSuccess }: Props) {
    const { selectedCompanyName } = useCompany()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [contractorType, setContractorType] = useState<ContractorType>("individual")
    const [docFile, setDocFile] = useState<File | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const tinType = contractorType === "individual" ? "SSN" : "EIN"

    function handleClose(val: boolean) {
        setOpen(val)
        if (!val) {
            setError(null)
            setContractorType("individual")
            setDocFile(null)
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const fd = new FormData(e.currentTarget)
        const companyIds = activeCompanyId ? [activeCompanyId] : []

        // Upload document to Supabase Storage if provided
        let w9FilePath: string | null = null
        if (docFile) {
            const { createClient } = await import("@/lib/supabase/client")
            const supabase = createClient()
            const filePath = `w9s/${Date.now()}_${docFile.name.replace(/\s/g, "_")}`
            const { error: uploadErr } = await supabase.storage
                .from("contractor-documents")
                .upload(filePath, docFile, { upsert: false })
            if (!uploadErr) w9FilePath = filePath
        }

        const result = await createContractorAction({
            first_name: contractorType === "individual" ? (fd.get("first_name") as string) : "",
            last_name: contractorType === "individual" ? (fd.get("last_name") as string) : "",
            business_name: contractorType === "business" ? (fd.get("business_name") as string) : "",
            email: fd.get("email") as string,
            phone: fd.get("phone") as string,
            address_line1: fd.get("address_line1") as string,
            address_city: fd.get("address_city") as string,
            address_state: fd.get("address_state") as string,
            address_zip: fd.get("address_zip") as string,
            tin_type: tinType,
            tin: fd.get("tin") as string,
            company_ids: companyIds,
            ...(w9FilePath ? { w9_file_path: w9FilePath } : {}),
        } as Parameters<typeof createContractorAction>[0])

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setOpen(false)
            setLoading(false)
            onSuccess?.()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 size-4" />
                    Add Contractor
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg sm:max-w-lg max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-lg">
                <DialogHeader>
                    <DialogTitle>Add New Contractor</DialogTitle>
                    <DialogDescription>
                        Choose Individual or Business, fill in details and optionally upload their W-9 / 1099 document.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                    {/* ── Type Toggle ── */}
                    <div className="flex flex-col gap-2">
                        <Label>Contractor Type *</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setContractorType("individual")}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all text-left",
                                    contractorType === "individual"
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                                )}
                            >
                                <User className="size-5 shrink-0" />
                                <div>
                                    <p className="font-semibold leading-tight">Individual</p>
                                    <p className="text-xs font-normal opacity-60 mt-0.5">First &amp; last name · SSN</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setContractorType("business")}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all text-left",
                                    contractorType === "business"
                                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                                )}
                            >
                                <Briefcase className="size-5 shrink-0" />
                                <div>
                                    <p className="font-semibold leading-tight">Business</p>
                                    <p className="text-xs font-normal opacity-60 mt-0.5">Company name · EIN</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* ── Linked Company ── */}
                    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{selectedCompanyName}</span>
                        {!activeCompanyId && (
                            <span className="ml-auto text-xs text-amber-600 font-medium">
                                ⚠ Select a company from the top bar
                            </span>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm font-semibold text-destructive">
                            {error}
                        </div>
                    )}

                    {/* ── Individual: First + Last Name only ── */}
                    {contractorType === "individual" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label>First Name *</Label>
                                <Input name="first_name" placeholder="John" required />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Last Name *</Label>
                                <Input name="last_name" placeholder="Doe" required />
                            </div>
                        </div>
                    )}

                    {/* ── Business: Company Name only ── */}
                    {contractorType === "business" && (
                        <div className="flex flex-col gap-2">
                            <Label>Business / Company Name *</Label>
                            <Input name="business_name" placeholder="Doe Services LLC" required />
                        </div>
                    )}

                    {/* ── Contact ── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>Email *</Label>
                            <Input type="email" name="email" placeholder="john@example.com" required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Phone *</Label>
                            <Input name="phone" placeholder="(555) 000-0000" required />
                        </div>
                    </div>

                    {/* ── Address ── */}
                    <div className="flex flex-col gap-2">
                        <Label>Address *</Label>
                        <Input name="address_line1" placeholder="123 Main St" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>City *</Label>
                            <Input name="address_city" placeholder="Denver" required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>State *</Label>
                            <Input name="address_state" placeholder="CO" maxLength={2} required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>ZIP *</Label>
                            <Input name="address_zip" placeholder="80202" required />
                        </div>
                    </div>

                    {/* ── TIN ── */}
                    <div className="flex flex-col gap-2">
                        <Label>
                            {contractorType === "individual"
                                ? "Social Security Number (SSN) *"
                                : "Employer Identification Number (EIN) *"}
                        </Label>
                        <Input
                            name="tin"
                            placeholder={contractorType === "individual" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Stored encrypted · Used for 1099 tax reporting
                        </p>
                    </div>

                    {/* ── Document Upload (W-9 / 1099) ── */}
                    <div className="flex flex-col gap-2">
                        <Label>W-9 / 1099 Document <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            className="hidden"
                            onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                        />
                        {docFile ? (
                            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <FileCheck className="size-4 text-emerald-600 shrink-0" />
                                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300 truncate max-w-[220px]">
                                        {docFile.name}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setDocFile(null); if (fileRef.current) fileRef.current.value = "" }}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                            >
                                <Upload className="size-4 shrink-0" />
                                Upload W-9 or 1099 (PDF, JPG, PNG)
                            </button>
                        )}
                    </div>

                    <Button type="submit" disabled={loading} className="w-full mt-1">
                        {loading
                            ? "Creating..."
                            : `Add ${contractorType === "individual" ? "Individual" : "Business"} Contractor`}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
