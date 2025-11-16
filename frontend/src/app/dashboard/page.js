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
  Building2,
  TrendingDown,
  Users
} from "lucide-react"
import { useAuth, PermissionGuard } from "@/lib/auth-context"
import { useTasks, useGoals, useOrganizations } from "@/lib/react-query"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function KpiCard({ title, value, subtitle, icon: Icon, change, trend }) {
  return (
    <Card className="border-gray-200 hover:shadow-sm transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-black">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        {change && (
          <div className={`flex items-center mt-2 text-xs ${trend === 'up' ? 'text-gray-600' : 'text-gray-500'}`}>
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuickTaskItem({ task, onClick }) {
  const getDaysUntilDue = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  const daysUntilDue = getDaysUntilDue(task.due_date)
  const isUrgent = daysUntilDue <= 3

  return (
    <div
      onClick={() => onClick(task)}
      className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black truncate">{task.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </span>
          {isUrgent && (
            <span className="text-xs text-gray-700 font-medium">
              {daysUntilDue} days left
            </span>
          )}
        </div>
      </div>
      <Badge variant="outline" className="ml-3 text-xs border-gray-300 text-gray-700">
        {task.status}
      </Badge>
    </div>
  )
}

function GoalProgressItem({ goal, organizationName, compact = false }) {
  return (
    <div className={`space-y-2 ${!compact && 'mb-4 pb-4 border-b border-gray-100 last:border-0'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black truncate">{goal.title}</p>
          {organizationName && (
            <p className="text-xs text-gray-500 mt-0.5">{organizationName}</p>
          )}
        </div>
        <span className="text-sm font-bold text-black whitespace-nowrap">{goal.progress_percentage || 0}%</span>
      </div>
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${goal.progress_percentage || 0}%`,
            background: `linear-gradient(to right, rgba(59, 130, 246, 1), rgba(59, 130, 246, 0.3))`
          }}
        />
      </div>
    </div>
  )
}

function LineChart({ tasks }) {
  const chartData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })

      const completed = tasks.filter(task => {
        if (!task.reviewed_at) return false
        const reviewDate = new Date(task.reviewed_at)
        return reviewDate.getMonth() === date.getMonth() &&
               reviewDate.getFullYear() === date.getFullYear() &&
               (task.status === 'approved')
      }).length

      months.push({ month: monthName, count: completed })
    }

    return months
  }, [tasks])

  const maxCount = Math.max(...chartData.map(d => d.count), 1)
  const points = chartData.map((d, i) => ({
    x: (i / (chartData.length - 1)) * 100,
    y: 100 - ((d.count / maxCount) * 100),
    count: d.count
  }))

  const pathD = points.map((p, i) => {
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  }).join(' ')

  return (
    <div className="space-y-4">
      <div className="relative" style={{ height: '200px' }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#f3f4f6"
              strokeWidth="0.5"
            />
          ))}

          {/* Gradient fill */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>

          {/* Area under line */}
          <path
            d={`${pathD} L 100 100 L 0 100 Z`}
            fill="url(#lineGradient)"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(59, 130, 246, 1)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill="white"
                stroke="rgba(59, 130, 246, 1)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>

        {/* Data labels */}
        <div className="absolute inset-0 flex items-start justify-between px-1 pointer-events-none">
          {points.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: 'translate(-50%, -100%)',
                marginTop: '-8px'
              }}
            >
              {p.count > 0 && (
                <span className="text-xs font-medium text-gray-700 bg-white px-1 rounded">
                  {p.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-1">
        {chartData.map((d, i) => (
          <span key={i} className="text-xs text-gray-500 font-medium">
            {d.month}
          </span>
        ))}
      </div>
    </div>
  )
}

function DepartmentMetricCard({ department, tasks, goals }) {
  const deptTasks = tasks.filter(t =>
    t.assignments?.some(a => a.organization_id === department.id)
  )

  const completedTasks = deptTasks.filter(t => t.status === 'approved')
  const completionRate = deptTasks.length > 0
    ? Math.round((completedTasks.length / deptTasks.length) * 100)
    : 0

  const deptGoals = goals.filter(g => g.organization_id === department.id)
  const avgGoalProgress = deptGoals.length > 0
    ? Math.round(deptGoals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / deptGoals.length)
    : 0

  return (
    <div className="p-5 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow bg-white">
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-black text-base">{department.name}</h4>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{department.level}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Tasks</p>
            <p className="text-2xl font-bold text-black">{deptTasks.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Completion</p>
            <p className="text-2xl font-bold text-black">{completionRate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Goals</p>
            <p className="text-2xl font-bold text-black">{deptGoals.length}</p>
          </div>
        </div>

        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${completionRate}%`,
              background: `linear-gradient(to right, rgba(16, 185, 129, 1), rgba(16, 185, 129, 0.3))`
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ScoreDistributionChart({ tasks }) {
  const scoredTasks = tasks.filter(t => t.score)

  const distribution = useMemo(() => {
    const ranges = [
      { label: '1-2', min: 1, max: 2, count: 0 },
      { label: '3-4', min: 3, max: 4, count: 0 },
      { label: '5-6', min: 5, max: 6, count: 0 },
      { label: '7-8', min: 7, max: 8, count: 0 },
      { label: '9-10', min: 9, max: 10, count: 0 }
    ]

    scoredTasks.forEach(task => {
      const range = ranges.find(r => task.score >= r.min && task.score <= r.max)
      if (range) range.count++
    })

    return ranges
  }, [scoredTasks])

  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  return (
    <div className="space-y-3">
      {distribution.map((range, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">{range.label}</span>
            <span className="text-gray-900 font-bold">{range.count} tasks</span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${(range.count / maxCount) * 100}%`,
                background: `linear-gradient(to right, rgba(16, 185, 129, 1), rgba(16, 185, 129, 0.2))`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Management Dashboard Component
function ManagementDashboard({ user }) {
  const router = useRouter()
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  const { data: allTasksData, isLoading: tasksLoading } = useTasks({
    page: 1,
    per_page: 100,
    assigned_to_me: false
  })

  const { data: goalsData, isLoading: goalsLoading } = useGoals({})
  const { data: organizations = [] } = useOrganizations()

  const allTasks = allTasksData?.tasks || []
  const allGoals = goalsData?.goals || []

  const departments = organizations.filter(org =>
    org.level === 'department' || org.level === 'directorate'
  )

  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.status === 'approved').length
  const overdueTasks = allTasks.filter(t => t.status === 'overdue').length
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0

  const activeGoals = allGoals.filter(g => g.status === 'active')
  const achievedGoals = allGoals.filter(g => g.status === 'achieved')

  const filteredTasks = selectedDepartment === 'all'
    ? allTasks
    : allTasks.filter(t => t.assignments?.some(a => a.organization_id === selectedDepartment))

  const filteredGoals = selectedDepartment === 'all'
    ? activeGoals
    : activeGoals.filter(g => g.organization_id === selectedDepartment)

  const getOrganizationName = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.name || ''
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black tracking-tight">
            Management Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Organization performance at a glance
          </p>
        </div>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[240px] border-gray-300 bg-white">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Tasks"
          value={totalTasks}
          subtitle={`${completionRate}% completion rate`}
          icon={CheckSquare}
          change="+8% from last month"
          trend="up"
        />
        <KpiCard
          title="Active Goals"
          value={activeGoals.length}
          subtitle={`${achievedGoals.length} achieved this period`}
          icon={Target}
        />
        <KpiCard
          title="Overdue Tasks"
          value={overdueTasks.length}
          subtitle="Requires attention"
          icon={AlertCircle}
        />
        <KpiCard
          title="Departments"
          value={departments.length}
          subtitle="Organizational units"
          icon={Building2}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Charts */}
        <div className="lg:col-span-3 space-y-6">
          {/* Completion Trend */}
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">
                    Task Completion Trend
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">
                    {selectedDepartment === 'all'
                      ? 'Organization-wide performance over 6 months'
                      : `${getOrganizationName(selectedDepartment)} performance`
                    }
                  </CardDescription>
                </div>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <LineChart tasks={filteredTasks} />
            </CardContent>
          </Card>

          {/* Department Performance */}
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">
                    Department Metrics
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">
                    Performance comparison across units
                  </CardDescription>
                </div>
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              {departments.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {departments.slice(0, 6).map(dept => (
                    <DepartmentMetricCard
                      key={dept.id}
                      department={dept}
                      tasks={allTasks}
                      goals={allGoals}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">No departments configured</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Live Data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Goals */}
          <Card className="border-gray-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">
                    Active Goals
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">
                    Real-time progress tracking
                  </CardDescription>
                </div>
                <Target className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredGoals.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {filteredGoals.slice(0, 8).map((goal) => (
                    <GoalProgressItem
                      key={goal.id}
                      goal={goal}
                      organizationName={
                        selectedDepartment === 'all' && goal.organization_id
                          ? getOrganizationName(goal.organization_id)
                          : null
                      }
                      compact
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-gray-700 border-gray-300 mt-2"
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Distribution */}
          {filteredTasks.filter(t => t.score).length > 0 && (
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-black">
                      Performance Scores
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-sm mt-1">
                      {selectedDepartment === 'all'
                        ? 'Organization-wide distribution'
                        : getOrganizationName(selectedDepartment)
                      }
                    </CardDescription>
                  </div>
                  <Award className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <ScoreDistributionChart tasks={filteredTasks} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Employee Dashboard Component
function EmployeeDashboard({ user }) {
  const router = useRouter()

  const { data: myTasksData, isLoading: tasksLoading } = useTasks({
    page: 1,
    per_page: 100,
    assigned_to_me: true
  })

  const { data: goalsData, isLoading: goalsLoading } = useGoals({
    status: 'active'
  })

  const { data: organizations = [] } = useOrganizations()

  const myTasks = myTasksData?.tasks || []
  const completedTasks = myTasks.filter(t => t.status === 'approved')
  const ongoingTasks = myTasks.filter(t => t.status === 'ongoing')
  const overdueTasks = myTasks.filter(t => t.status === 'overdue')
  const pendingReviewTasks = myTasks.filter(t => t.status === 'completed')

  const scoredTasks = myTasks.filter(t => t.score)
  const avgScore = scoredTasks.length > 0
    ? (scoredTasks.reduce((sum, t) => sum + t.score, 0) / scoredTasks.length).toFixed(1)
    : 'N/A'

  const urgentTasks = myTasks
    .filter(t => {
      if (t.status === 'approved') return false
      const daysUntilDue = Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 7 && daysUntilDue >= 0
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  const activeGoals = (goalsData?.goals || [])
    .filter(g => g.status === 'active')
    .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
    .slice(0, 4)

  const getOrganizationName = (orgId) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.name || ''
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-black tracking-tight">
          Welcome back, {user?.first_name || user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your performance and tasks
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="My Tasks"
          value={myTasks.length}
          subtitle={`${ongoingTasks.length} in progress`}
          icon={CheckSquare}
        />
        <KpiCard
          title="Completed"
          value={completedTasks.length}
          subtitle="Tasks approved"
          icon={Award}
          change="+12% from last month"
          trend="up"
        />
        <KpiCard
          title="Average Score"
          value={avgScore}
          subtitle={`Based on ${scoredTasks.length} tasks`}
          icon={Target}
        />
        <KpiCard
          title="Overdue"
          value={overdueTasks.length}
          subtitle={`${pendingReviewTasks.length} pending review`}
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">Upcoming Tasks</CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">Due within 7 days</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/tasks')}
                  className="text-gray-700 border-gray-300"
                >
                  View All
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {tasksLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : urgentTasks.length > 0 ? (
                <div className="border-t border-gray-100">
                  {urgentTasks.map((task) => (
                    <QuickTaskItem
                      key={task.id}
                      task={task}
                      onClick={() => router.push('/dashboard/tasks')}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-t border-gray-100">
                  <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No urgent tasks</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-black">
                    Completion Trend
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">
                    Your performance over 6 months
                  </CardDescription>
                </div>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <LineChart tasks={myTasks} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-black">Active Goals</CardTitle>
                    <CardDescription className="text-gray-500 text-sm mt-1">Organization progress</CardDescription>
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
                ) : (
                  <div className="space-y-4">
                    {activeGoals.map((goal) => (
                      <GoalProgressItem
                        key={goal.id}
                        goal={goal}
                        organizationName={goal.organization_id ? getOrganizationName(goal.organization_id) : null}
                        compact
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-gray-700 border-gray-300"
                      onClick={() => router.push('/dashboard/goals')}
                    >
                      View All Goals
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {scoredTasks.length > 0 && (
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-black">Score Distribution</CardTitle>
                    <CardDescription className="text-gray-500 text-sm mt-1">
                      Your performance breakdown
                    </CardDescription>
                  </div>
                  <Award className="h-5 w-5 text-gray-400" />
                </div>
              </CardHeader>
              <CardContent>
                <ScoreDistributionChart tasks={myTasks} />
              </CardContent>
            </Card>
          )}

          <PermissionGuard permission="task_create">
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-black">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-gray-700 border-gray-300"
                  onClick={() => router.push('/dashboard/tasks')}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Manage Tasks
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-gray-700 border-gray-300"
                  onClick={() => router.push('/dashboard/goals')}
                >
                  <Target className="mr-2 h-4 w-4" />
                  View Goals
                </Button>
              </CardContent>
            </Card>
          </PermissionGuard>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const isManagement = user?.permissions?.includes('task_view_all') ||
                       user?.permissions?.includes('user_view_all') ||
                       user?.permissions?.includes('system_admin')

  if (isManagement) {
    return <ManagementDashboard user={user} />
  }

  return <EmployeeDashboard user={user} />
}
