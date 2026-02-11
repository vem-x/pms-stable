'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
  Award,
  Target,
  ArrowRight,
  Activity,
  Clock,
  Users,
  Bell
} from "lucide-react"
import { useAuth, PermissionGuard } from "@/lib/auth-context"
import { useInitiatives, useSuperviseeInitiatives, useGoals, useSuperviseeGoals, useUsers } from "@/lib/react-query"
import { useRouter } from "next/navigation"
import { useMemo } from "react"

function KpiCard({ title, value, subtitle, icon: Icon, change, trend, onClick }) {
  return (
    <Card className="border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-black">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        {change && (
          <div className={`flex items-center mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-gray-500'}`}>
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <Activity className="h-3 w-3 mr-1" />
            )}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuickInitiativeItem({ initiative, onClick, showCreator = false }) {
  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  const daysUntilDue = getDaysUntilDue(initiative.due_date)
  const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0

  const urgencyColors = {
    LOW: "bg-gray-100 text-gray-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700"
  }

  const statusColors = {
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    STARTED: "bg-indigo-100 text-indigo-800",
    COMPLETED: "bg-purple-100 text-purple-800",
    APPROVED: "bg-green-100 text-green-800"
  }

  return (
    <div
      onClick={() => onClick(initiative)}
      className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black truncate">{initiative.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(initiative.due_date).toLocaleDateString()}
          </span>
          {showCreator && initiative.creator_name && (
            <span className="text-xs text-gray-500 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {initiative.creator_name}
            </span>
          )}
          {isUrgent && (
            <span className="text-xs text-orange-700 font-medium flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {daysUntilDue} days left
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <Badge className={`text-xs ${urgencyColors[initiative.urgency] || urgencyColors.MEDIUM}`}>
          {initiative.urgency}
        </Badge>
        <Badge className={`text-xs ${statusColors[initiative.status] || statusColors.ASSIGNED}`}>
          {initiative.status?.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  )
}

function QuickGoalItem({ goal, onClick, showOwner = false, users = [] }) {
  const statusColors = {
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-blue-100 text-blue-800",
    ACHIEVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800"
  }

  const owner = showOwner && goal.owner_id ? users.find(u => u.id === goal.owner_id) : null

  return (
    <div
      onClick={() => onClick(goal)}
      className="space-y-2 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-black truncate">{goal.title}</p>
            <Badge className={`text-xs ${statusColors[goal.status] || statusColors.ACTIVE}`}>
              {goal.status?.replace('_', ' ')}
            </Badge>
          </div>
          {showOwner && owner && (
            <p className="text-xs text-gray-500 flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {owner.name}
            </p>
          )}
        </div>
        <span className="text-sm font-bold text-blue-600 whitespace-nowrap">{goal.progress_percentage || 0}%</span>
      </div>
      <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-blue-300"
          style={{ width: `${goal.progress_percentage || 0}%` }}
        />
      </div>
    </div>
  )
}

// Employee Dashboard Component
function EmployeeDashboard({ user }) {
  const router = useRouter()

  const { data: myInitiativesData, isLoading: initiativesLoading } = useInitiatives({
    page: 1,
    per_page: 100,
    assigned_to_me: true
  })

  const { data: goalsData, isLoading: goalsLoading } = useGoals({})

  const myInitiatives = myInitiativesData?.initiatives || []
  const myGoals = (goalsData?.goals || []).filter(g => g.type === 'INDIVIDUAL' && g.owner_id === user?.user_id)

  const completedInitiatives = myInitiatives.filter(i => i.status === 'APPROVED')
  const ongoingInitiatives = myInitiatives.filter(i => ['ASSIGNED', 'STARTED'].includes(i.status))
  const pendingApprovalInitiatives = myInitiatives.filter(i => i.status === 'PENDING_APPROVAL')
  const overdueInitiatives = myInitiatives.filter(i => i.status === 'OVERDUE')

  const pendingGoals = myGoals.filter(g => g.status === 'PENDING_APPROVAL')
  const activeGoals = myGoals.filter(g => g.status === 'ACTIVE')

  const urgentInitiatives = myInitiatives
    .filter(i => {
      if (i.status === 'APPROVED') return false
      const daysUntilDue = Math.ceil((new Date(i.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 7 && daysUntilDue >= 0
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || user?.first_name}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s your performance overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="My Initiatives"
          value={myInitiatives.length}
          subtitle={`${ongoingInitiatives.length} in progress`}
          icon={CheckSquare}
          onClick={() => router.push('/dashboard/initiatives')}
        />
        <KpiCard
          title="Completed"
          value={completedInitiatives.length}
          subtitle="Initiatives approved"
          icon={Award}
          onClick={() => router.push('/dashboard/initiatives')}
        />
        <KpiCard
          title="My Goals"
          value={myGoals.length}
          subtitle={`${activeGoals.length} active`}
          icon={Target}
          onClick={() => router.push('/dashboard/goals')}
        />
        <KpiCard
          title="Pending Approval"
          value={pendingApprovalInitiatives.length + pendingGoals.length}
          subtitle={`${pendingApprovalInitiatives.length} initiatives, ${pendingGoals.length} goals`}
          icon={Clock}
          onClick={() => router.push('/dashboard/goals')}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Initiatives */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">Upcoming Initiatives</CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">Due within 7 days</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/initiatives')}
                  className="text-gray-700 border-gray-300"
                >
                  View All
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {initiativesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : urgentInitiatives.length > 0 ? (
                <div className="border-t border-gray-100">
                  {urgentInitiatives.map((initiative) => (
                    <QuickInitiativeItem
                      key={initiative.id}
                      initiative={initiative}
                      onClick={() => router.push('/dashboard/initiatives')}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-t border-gray-100">
                  <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No upcoming initiatives</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          {(pendingApprovalInitiatives.length > 0 || pendingGoals.length > 0) && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                      <Bell className="h-4 w-4 text-yellow-600" />
                      Awaiting Supervisor Approval
                    </CardTitle>
                    <CardDescription className="text-gray-700 text-sm mt-1">
                      Items you created pending review
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t border-yellow-200/50">
                  {pendingApprovalInitiatives.slice(0, 3).map((initiative) => (
                    <QuickInitiativeItem
                      key={initiative.id}
                      initiative={initiative}
                      onClick={() => router.push('/dashboard/initiatives')}
                    />
                  ))}
                  {pendingGoals.slice(0, 2).map((goal) => (
                    <QuickGoalItem
                      key={goal.id}
                      goal={goal}
                      onClick={() => router.push('/dashboard/goals')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* My Active Goals */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">My Goals</CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">Personal goal progress</CardDescription>
                </div>
                <Target className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : activeGoals.length > 0 ? (
                <div className="space-y-1">
                  {activeGoals.slice(0, 4).map((goal) => (
                    <QuickGoalItem
                      key={goal.id}
                      goal={goal}
                      onClick={() => router.push('/dashboard/goals')}
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-gray-700 border-gray-300 mt-3"
                    onClick={() => router.push('/dashboard/goals')}
                  >
                    View All Goals
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No active goals</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/dashboard/goals')}
                  >
                    Create Goal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-black">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300 hover:bg-blue-50"
                onClick={() => router.push('/dashboard/initiatives')}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Manage Initiatives
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300 hover:bg-blue-50"
                onClick={() => router.push('/dashboard/goals')}
              >
                <Target className="mr-2 h-4 w-4" />
                Manage Goals
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Supervisor Dashboard Component
function SupervisorDashboard({ user }) {
  const router = useRouter()

  const { data: myInitiativesData } = useInitiatives({
    page: 1,
    per_page: 100,
    assigned_to_me: true
  })

  const { data: teamInitiativesData } = useSuperviseeInitiatives()
  const { data: teamGoalsData } = useSuperviseeGoals()
  const { data: goalsData } = useGoals({})
  const { data: usersData } = useUsers()
  const users = usersData?.users || []

  const myInitiatives = myInitiativesData?.initiatives || []
  const teamInitiatives = teamInitiativesData || []
  const teamGoals = teamGoalsData || []
  const myGoals = (goalsData?.goals || []).filter(g => g.type === 'INDIVIDUAL' && g.owner_id === user?.user_id)

  const supervisees = useMemo(() => {
    return users.filter(u => u.supervisor_id === user?.user_id)
  }, [users, user?.user_id])

  const pendingInitiatives = teamInitiatives.filter(i => i.status === 'PENDING_APPROVAL' && supervisees.some(s => s.id === i.created_by))
  const pendingGoals = teamGoals.filter(g => g.status === 'PENDING_APPROVAL')

  const activeTeamGoals = teamGoals.filter(g => g.status === 'ACTIVE')
  const completedTeamInitiatives = teamInitiatives.filter(i => i.status === 'APPROVED')

  const myActiveGoals = myGoals.filter(g => g.status === 'ACTIVE')
  const myCompletedInitiatives = myInitiatives.filter(i => i.status === 'APPROVED')

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">
          Supervisor Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your performance and your team&apos;s progress
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Pending Approvals"
          value={pendingInitiatives.length + pendingGoals.length}
          subtitle={`${pendingInitiatives.length} initiatives, ${pendingGoals.length} goals`}
          icon={Bell}
          onClick={() => router.push('/dashboard/initiatives?tab=team-initiatives')}
        />
        <KpiCard
          title="Team Members"
          value={supervisees.length}
          subtitle={`${activeTeamGoals.length} active team goals`}
          icon={Users}
          onClick={() => router.push('/dashboard/goals?tab=team')}
        />
        <KpiCard
          title="My Initiatives"
          value={myInitiatives.length}
          subtitle={`${myCompletedInitiatives.length} completed`}
          icon={CheckSquare}
          onClick={() => router.push('/dashboard/initiatives')}
        />
        <KpiCard
          title="My Goals"
          value={myGoals.length}
          subtitle={`${myActiveGoals.length} active`}
          icon={Target}
          onClick={() => router.push('/dashboard/goals')}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Approvals */}
          {(pendingInitiatives.length > 0 || pendingGoals.length > 0) && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-black flex items-center gap-2">
                      <Bell className="h-5 w-5 text-yellow-600 animate-pulse" />
                      Requires Your Approval
                    </CardTitle>
                    <CardDescription className="text-gray-700 text-sm mt-1">
                      Items submitted by your team members
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/initiatives?tab=team-initiatives')}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Review All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t border-yellow-200">
                  {pendingInitiatives.slice(0, 3).map((initiative) => (
                    <QuickInitiativeItem
                      key={initiative.id}
                      initiative={initiative}
                      showCreator={true}
                      onClick={() => router.push('/dashboard/initiatives?tab=team-initiatives')}
                    />
                  ))}
                  {pendingGoals.slice(0, 2).map((goal) => (
                    <QuickGoalItem
                      key={goal.id}
                      goal={goal}
                      showOwner={true}
                      users={users}
                      onClick={() => router.push('/dashboard/goals?tab=team')}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Performance */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">Team Performance</CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">{supervisees.length} team members</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/goals?tab=team')}
                  className="text-gray-700 border-gray-300"
                >
                  View Team
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {activeTeamGoals.length > 0 ? (
                <div className="border-t border-gray-100">
                  {activeTeamGoals.slice(0, 5).map((goal) => (
                    <QuickGoalItem
                      key={goal.id}
                      goal={goal}
                      showOwner={true}
                      users={users}
                      onClick={() => router.push('/dashboard/goals?tab=team')}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-t border-gray-100">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No active team goals</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/dashboard/goals?tab=team')}
                  >
                    Create Team Goal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* My Goals */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">My Goals</CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">Personal progress</CardDescription>
                </div>
                <Target className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              {myActiveGoals.length > 0 ? (
                <div className="space-y-1">
                  {myActiveGoals.slice(0, 3).map((goal) => (
                    <QuickGoalItem
                      key={goal.id}
                      goal={goal}
                      onClick={() => router.push('/dashboard/goals')}
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-gray-700 border-gray-300 mt-3"
                    onClick={() => router.push('/dashboard/goals')}
                  >
                    View All
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No active goals</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-black">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300 hover:bg-blue-50"
                onClick={() => router.push('/dashboard/initiatives?tab=team-initiatives')}
              >
                <Users className="mr-2 h-4 w-4" />
                Team Initiatives
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300 hover:bg-blue-50"
                onClick={() => router.push('/dashboard/goals?tab=team')}
              >
                <Target className="mr-2 h-4 w-4" />
                Team Goals
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-gray-700 border-gray-300 hover:bg-blue-50"
                onClick={() => router.push('/dashboard/initiatives')}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                My Initiatives
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: usersData } = useUsers()
  const users = usersData?.users || []

  const supervisees = useMemo(() => {
    if (!user?.user_id || !users || users.length === 0) return []
    return users.filter(u => u.supervisor_id === user.user_id)
  }, [users, user?.user_id])

  const isSupervisor = supervisees.length > 0

  if (isSupervisor) {
    return <SupervisorDashboard user={user} />
  }

  return <EmployeeDashboard user={user} />
}
