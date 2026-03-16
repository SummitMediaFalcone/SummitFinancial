"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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

export function SettingsClient() {
    const [role, setRole] = useState("Admin")

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Settings</h2>
                <p className="text-sm text-muted-foreground">Application and account settings</p>
            </div>

            {/* Bank Accounts — full width */}
            <BankAccountsManager />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Account */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">Account</CardTitle>
                        <CardDescription>Your account settings</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>Name</Label>
                            <Input defaultValue="Summit User" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Email</Label>
                            <Input defaultValue="user@summit.com" type="email" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Finance">Finance</SelectItem>
                                    <SelectItem value="Viewer">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="button">Save Changes</Button>
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-foreground">Preferences</CardTitle>
                        <CardDescription>General application preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label>Default Check Layout</Label>
                            <Select defaultValue="top">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="top">Top Check (standard)</SelectItem>
                                    <SelectItem value="3-per-page">3-Per-Page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Fiscal Year Start</Label>
                            <Select defaultValue="january">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="january">January</SelectItem>
                                    <SelectItem value="april">April</SelectItem>
                                    <SelectItem value="july">July</SelectItem>
                                    <SelectItem value="october">October</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="button">Save Preferences</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
