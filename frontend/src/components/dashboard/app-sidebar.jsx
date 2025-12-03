'use client'

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Building2,
  Users,
  Target,
  CheckSquare,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  Home,
  Calendar,
  FileText,
  Star,
  TrendingUp
} from "lucide-react"

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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAuth, usePermission, PermissionGuard } from "@/lib/auth-context"

// Navigation items with permissions
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    permission: null, // Available to all authenticated users
  },
  {
    title: "Initiatives",
    url: "/dashboard/initiatives",
    icon: CheckSquare,
    permission: null,
  },
  {
    title: "Goals",
    url: "/dashboard/goals",
    icon: Target,
    permission: null,
  },
  {
    title: "Calendar",
    url: "/dashboard/calendar",
    icon: Calendar,
    permission: null,
  },
  {
    title: "Reviews",
    url: "/dashboard/reviews",
    icon: Star,
    permission: null,
  },
]

const managementItems = [
  {
    title: "Organization",
    url: "/dashboard/organization",
    icon: Building2,
    permission: "organization_create",
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: Users,
    permission: "user_view_all",
  },
  {
    title: "Roles",
    url: "/dashboard/roles",
    icon: Shield,
    permission: "role_create",
  },
  {
    title: "Goals Management",
    url: "/dashboard/goals-management",
    icon: Target,
    permission: "goal_create_yearly",
  },
  {
    title: "Review Management",
    url: "/dashboard/review-management",
    icon: Star,
    permission: "review_create_cycle",
  },
  {
    title: "Performance Management",
    url: "/dashboard/performance",
    icon: TrendingUp,
    permission: "performance_view_all",
  },
]

const reportsItems = [
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
    permission: "reports_generate",
  },
  {
    title: "Reports",
    url: "/dashboard/reports",
    icon: FileText,
    permission: "reports_generate",
  },
]

const settingsItems = [
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    permission: null,
  },
]

function NavGroup({ title, items }) {
  const pathname = usePathname()

  const visibleItems = items.filter(item => {
    if (!item.permission) return true
    return usePermission(item.permission)
  })

  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                 className={pathname === item.url&&"bg-black text-white"}
                // isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      // The logout function already handles routing to /login, so we don't need to do it again here
    } catch (error) {
      console.error('Logout error:', error)
      // Force navigation even if logout fails
      router.push('/login')
    }
  }

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'U'

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b px-6 py-4 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            N
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Nigcomsat PMS</span>
            <span className="text-xs text-muted-foreground">Performance Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup title="" items={navigationItems} />

        <PermissionGuard permission="user_view_all">
          <Separator className="my-2" />
          <NavGroup title="Management" items={managementItems} />
        </PermissionGuard>

        <PermissionGuard permission="reports_generate">
          <Separator className="my-2" />
          <NavGroup title="Reports" items={reportsItems} />
        </PermissionGuard>

        <Separator className="my-2" />
        <NavGroup title="Settings" items={settingsItems} />
      </SidebarContent>

      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 mb-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role_name} • {user?.organization_name}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}