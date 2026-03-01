"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createContractorAction } from "@/app/actions/contractors"

export function NewContractorDialog({ activeCompanyId }: { activeCompanyId?: string | null }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [tinType, setTinType] = useState<"SSN" | "EIN">("SSN")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)

        // The form natively assumes we just assign to the currently active UI company
        const companyIds = activeCompanyId ? [activeCompanyId] : []

        const result = await createContractorAction({
            first_name: formData.get("first_name") as string,
            last_name: formData.get("last_name") as string,
            business_name: formData.get("business_name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            address_line1: formData.get("address_line1") as string,
            address_city: formData.get("address_city") as string,
            address_state: formData.get("address_state") as string,
            address_zip: formData.get("address_zip") as string,
            tin_type: tinType,
            tin: formData.get("tin") as string,
            company_ids: companyIds,
        })

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            setOpen(false)
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 size-4" />
                    Add Contractor
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add New Contractor</DialogTitle>
                    <DialogDescription>
                        Enter contractor details. You can upload the W-9 later.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && <div className="text-sm font-semibold text-destructive">{error}</div>}

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
                    <div className="flex flex-col gap-2">
                        <Label>Business Name (optional)</Label>
                        <Input name="business_name" placeholder="Doe Services LLC" />
                    </div>
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>TIN Type *</Label>
                            <Select value={tinType} onValueChange={(v: "SSN" | "EIN") => setTinType(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SSN">SSN</SelectItem>
                                    <SelectItem value="EIN">EIN</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>TIN *</Label>
                            <Input name="tin" placeholder="XX-XXXXXXX" required />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Contractor"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
