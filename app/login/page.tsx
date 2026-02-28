"use client"

import { useState, useTransition } from "react"
import { Building2, Eye, EyeOff, Loader2, AlertTriangle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loginAction } from "@/app/actions/auth"

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await loginAction(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-4 gap-4">
      {/* ── Setup banner when Supabase isn't configured yet ── */}
      {!SUPABASE_CONFIGURED && (
        <Card className="w-full max-w-md border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col gap-3 pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-800 dark:text-amber-400 text-sm">
                Supabase not configured
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Copy <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.example</code> to{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.local</code> and fill
              in your Supabase URL, Anon Key, Service Role Key, and a 64-char{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">FIELD_ENCRYPTION_KEY</code>.
              Then restart the dev server.
            </p>
            <div className="flex flex-col gap-1.5 text-xs font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 rounded p-2 leading-loose">
              <span># 1. Create .env.local from the example:</span>
              <span className="pl-2">copy .env.example .env.local</span>
              <span className="mt-1"># 2. Generate encryption key:</span>
              <span className="pl-2">node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</span>
              <span className="mt-1"># 3. Restart:</span>
              <span className="pl-2">npm run dev</span>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline"
            >
              Open Supabase Dashboard <ExternalLink className="size-3" />
            </a>
          </CardContent>
        </Card>
      )}

      {/* ── Login card ── */}
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Summit Financial OS
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in with your account credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={isPending || !SUPABASE_CONFIGURED}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  className="pr-10"
                  autoComplete="current-password"
                  disabled={isPending || !SUPABASE_CONFIGURED}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isPending || !SUPABASE_CONFIGURED}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in…
                </>
              ) : !SUPABASE_CONFIGURED ? (
                "Configure Supabase First"
              ) : (
                "Sign In"
              )}
            </Button>

            {!SUPABASE_CONFIGURED && (
              <p className="text-center text-xs text-muted-foreground">
                See the setup banner above to get started.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
