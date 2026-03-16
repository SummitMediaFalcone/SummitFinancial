import { Suspense } from "react"
import { PLReportClient } from "./client"

export const metadata = { title: "P&L Report" }

export default function PLReportPage() {
  return (
    <Suspense>
      <PLReportClient />
    </Suspense>
  )
}
