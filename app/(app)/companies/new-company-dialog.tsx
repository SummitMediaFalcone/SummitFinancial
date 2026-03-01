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
import { createCompanyAction } from "@/app/actions/companies"

export function NewCompanyDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)

        const result = await createCompanyAction({
            name: formData.get("name") as string,
            dba: formData.get("dba") as string,
            ein: formData.get("ein") as string,
            phone: formData.get("phone") as string,
            address_line1: formData.get("address") as string,
            address_city: formData.get("city") as string,
            address_state: formData.get("state") as string,
            address_zip: formData.get("zip") as string,
            check_layout_type: "top",
            print_offset_x: 0,
            print_offset_y: 0,
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
                    Add Company
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Add New Company</DialogTitle>
                    <DialogDescription>
                        Add a new company entity to your account.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm font-semibold text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name">Company Name *</Label>
                        <Input id="name" name="name" placeholder="Acme Corp LLC" required />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="dba">DBA (optional)</Label>
                        <Input id="dba" name="dba" placeholder="Acme Corp" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="ein">EIN</Label>
                            <Input id="ein" name="ein" placeholder="XX-XXXXXXX" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input id="phone" name="phone" placeholder="(555) 000-0000" required />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="address">Address *</Label>
                        <Input id="address" name="address" placeholder="123 Main St" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="city">City *</Label>
                            <Input id="city" name="city" placeholder="Denver" required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="state">State *</Label>
                            <Input id="state" name="state" placeholder="CO" maxLength={2} required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="zip">ZIP *</Label>
                            <Input id="zip" name="zip" placeholder="80202" required />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Company"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
