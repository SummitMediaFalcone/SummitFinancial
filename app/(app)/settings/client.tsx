"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { BankAccountsManager } from "@/components/bank-accounts-manager"
import { useCompany } from "@/lib/company-context"
import { updateCompanySettingsAction } from "@/app/actions/companies"

export function SettingsClient() {
    const { selectedCompanyId, selectedCompanyName, companies } = useCompany()
    const [checkLayout, setCheckLayout] = useState<"top" | "3-per-page">("top")
    const [fiscalYear, setFiscalYear] = useState("january")
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    // Use selectedCompanyId or fall back to first company
    const companyId = selectedCompanyId ?? companies[0]?.id ?? null

    function handleSavePreferences() {
        if (!companyId) return
        setSaved(false)
        startTransition(async () => {
            await updateCompanySettingsAction(companyId, {
                check_layout_type: checkLayout,
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Settings</h2>
                <p className="text-sm text-muted-foreground">Application and account settings</p>
            </div>

            {/* Bank Accounts — full width */}
            <BankAccountsManager />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">Check Preferences</CardTitle>
                        <CardDescription>
                            Settings for{" "}
                            <span className="font-medium text-foreground">
                                {selectedCompanyName ?? companies[0]?.name ?? "your company"}
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>Default Check Layout</Label>
                            <Select
                                value={checkLayout}
                                onValueChange={(v: "top" | "3-per-page") => setCheckLayout(v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="top">Top Check (standard)</SelectItem>
                                    <SelectItem value="3-per-page">3-Per-Page</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                "3-Per-Page" prints all three check stubs — top, middle, and bottom.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Fiscal Year Start</Label>
                            <Select value={fiscalYear} onValueChange={setFiscalYear}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="january">January</SelectItem>
                                    <SelectItem value="april">April</SelectItem>
                                    <SelectItem value="july">July</SelectItem>
                                    <SelectItem value="october">October</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {!companyId && (
                            <p className="text-xs text-amber-600">
                                Select a company from the sidebar dropdown to save preferences.
                            </p>
                        )}

                        <Button
                            type="button"
                            disabled={isPending || !companyId}
                            onClick={handleSavePreferences}
                        >
                            {isPending ? "Saving…" : "Save Preferences"}
                        </Button>

                        {saved && (
                            <div className="flex items-center gap-2 text-sm text-emerald-600">
                                <CheckCircle2 className="size-4" />
                                Preferences saved!
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* About */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">About</CardTitle>
                        <CardDescription>System information</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Application</span>
                            <span className="font-medium text-foreground">Summit Financial OS</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Companies</span>
                            <span className="font-medium text-foreground">{companies.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Active Company</span>
                            <span className="font-medium text-foreground truncate max-w-[160px] text-right">
                                {selectedCompanyName ?? "All Companies"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Audit Log</span>
                            <a href="/reports/audit" className="text-primary hover:underline">View →</a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
