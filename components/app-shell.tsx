"use client"

import { useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
  Loader2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useCompany } from "@/lib/company-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { CompanyProvider } from "@/lib/company-context"
import { logoutAction } from "@/app/actions/auth"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Contractors", href: "/contractors", icon: Users },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "1099 Reports", href: "/reports/1099", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
]

function AppSidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()
  const { companies, selectedCompanyId, setSelectedCompanyId, selectedCompanyName } =
    useCompany()
  const [isPending, startTransition] = useTransition()

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : "SA"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm">Summit Financial OS</span>
                    <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                      {selectedCompanyName}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                align="start"
              >
                <DropdownMenuItem onClick={() => setSelectedCompanyId(null)}>
                  <span className={cn(!selectedCompanyId && "font-semibold")}>
                    All Companies
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {companies.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setSelectedCompanyId(c.id)}
                  >
                    <span
                      className={cn(
                        selectedCompanyId === c.id && "font-semibold"
                      )}
                    >
                      {c.name}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/")
                    }
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" disabled={isPending}>
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">
                      {userEmail ?? "Loading…"}
                    </span>
                  </div>
                  {isPending && <Loader2 className="ml-auto size-4 animate-spin" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width]"
                align="start"
                side="top"
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 size-4" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    startTransition(async () => {
                      await logoutAction()
                    })
                  }
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function AppHeader() {
  const pathname = usePathname()
  const pageTitle =
    navItems.find(
      (i) => pathname === i.href || pathname.startsWith(i.href + "/")
    )?.label ?? "Summit Financial OS"

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
    </header>
  )
}

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode
  userEmail?: string | null
}) {
  return (
    <CompanyProvider>
      <SidebarProvider>
        <AppSidebar userEmail={userEmail} />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </CompanyProvider>
  )
}
