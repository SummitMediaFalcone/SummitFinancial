import { Suspense } from "react"
import { AuditLogClient } from "./client"

export const metadata = { title: "Audit Log" }

export default function AuditLogPage() {
  return (
    <Suspense>
      <AuditLogClient />
    </Suspense>
  )
}
