"use client"

import React, { useState } from "react"
import {
  Plus,
  Target,
  Calendar,
  Building2,
  Lock,
  Unlock,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Shield,
  Users
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth, usePermission } from "@/lib/auth-context"
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useUpdateGoalProgress,
  useUpdateGoalStatus,
  useDeleteGoal,
  useFreezeGoalsQuarter,
  useUnfreezeGoalsQuarter,
  useGoalFreezeLogs,
} from "@/lib/react-query"
import { Progress } from "@/components/ui/progress"

const statusColors = {
  ACTIVE: "bg-blue-100 text-blue-800 border-blue-200",
  ACHIEVED: "bg-green-100 text-green-800 border-green-200",
  DISCARDED: "bg-gray-100 text-gray-800 border-gray-200",
}

const typeColors = {
  YEARLY: "bg-purple-100 text-purple-800 border-purple-200",
  QUARTERLY: "bg-blue-100 text-blue-800 border-blue-200",
}

const typeIcons = {
  YEARLY: Building2,
  QUARTERLY: Calendar,
}

function OrganizationalGoalCard({ goal, onEdit, onDelete, onUpdateProgress, onStatusChange }) {
  const TypeIcon = typeIcons[goal.type]

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg font-semibold">{goal.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={`${typeColors[goal.type]} flex items-center gap-1.5`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {goal.type}
              </Badge>
              <Badge className={`${statusColors[goal.status]} flex items-center gap-1.5`}>
                {goal.status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Goal
              </DropdownMenuItem>
              {goal.status === "ACTIVE" && (
                <>
                  <DropdownMenuItem onClick={() => onUpdateProgress(goal)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Update Progress
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStatusChange(goal, "ACHIEVED")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Achieved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(goal, "DISCARDED")}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Discard Goal
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(goal)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold">{goal.progress_percentage || 0}%</span>
          </div>
          <Progress value={goal.progress_percentage || 0} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(goal.start_date).toLocaleDateString()}
          </div>
          <div>Due: {new Date(goal.end_date).toLocaleDateString()}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function OrganizationalGoalForm({ goal, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    type: goal?.type || "QUARTERLY",
    evaluation_method: goal?.evaluation_method || "",
    difficulty_level: goal?.difficulty_level || 3,
    start_date: goal?.start_date || "",
    end_date: goal?.end_date || "",
    parent_goal_id: goal?.parent_goal_id || "",
  })

  const { data: goals = [] } = useGoals()

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  const potentialParents = goals.filter((g) => {
    if (goal && g.id === goal.id) return false
    if (formData.type === "YEARLY") return false
    if (formData.type === "QUARTERLY") return g.type === "YEARLY"
    return false
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{goal ? "Edit Organizational Goal" : "Create Organizational Goal"}</DialogTitle>
            <DialogDescription>
              Create company-wide goals that cascade throughout the organization
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter goal title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this goal aims to achieve"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Goal Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value, parent_goal_id: "" })}
                  disabled={!!goal}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YEARLY">Yearly Goal</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly Goal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty_level.toString()}
                  onValueChange={(value) => setFormData({ ...formData, difficulty_level: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Very Easy</SelectItem>
                    <SelectItem value="2">2 - Easy</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - Hard</SelectItem>
                    <SelectItem value="5">5 - Very Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {potentialParents.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Goal (Optional)</Label>
                <Select
                  value={formData.parent_goal_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parent_goal_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent goal</SelectItem>
                    {potentialParents.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title} ({g.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="evaluation_method">Evaluation Method</Label>
              <Input
                id="evaluation_method"
                value={formData.evaluation_method}
                onChange={(e) => setFormData({ ...formData, evaluation_method: e.target.value })}
                placeholder="How will success be measured?"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{goal ? "Update Goal" : "Create Goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FreezeDialog({ isOpen, onClose, onSubmit, mode = "freeze" }) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const [formData, setFormData] = useState({
    quarter: `Q${currentQuarter}`,
    year: currentYear,
    scheduled_unfreeze_date: "",
    is_emergency_override: false,
    emergency_reason: "",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "freeze" ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
              {mode === "freeze" ? "Freeze Goals" : "Unfreeze Goals"}
            </DialogTitle>
            <DialogDescription>
              {mode === "freeze"
                ? "Freeze all individual goals for a specific quarter. Frozen goals cannot be edited."
                : "Unfreeze all individual goals for a specific quarter to allow editing."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quarter">Quarter</Label>
                <Select
                  value={formData.quarter}
                  onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min={currentYear - 2}
                  max={currentYear + 5}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            {mode === "freeze" && (
              <div className="grid gap-2">
                <Label htmlFor="scheduled_unfreeze_date">Scheduled Unfreeze Date (Optional)</Label>
                <Input
                  id="scheduled_unfreeze_date"
                  type="datetime-local"
                  value={formData.scheduled_unfreeze_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_unfreeze_date: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Goals will automatically unfreeze on this date if set
                </p>
              </div>
            )}

            {mode === "unfreeze" && (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="emergency_override"
                    checked={formData.is_emergency_override}
                    onChange={(e) => setFormData({ ...formData, is_emergency_override: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="emergency_override" className="cursor-pointer">
                    Emergency Override
                  </Label>
                </div>

                {formData.is_emergency_override && (
                  <div className="grid gap-2">
                    <Label htmlFor="emergency_reason">
                      Emergency Reason <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="emergency_reason"
                      value={formData.emergency_reason}
                      onChange={(e) => setFormData({ ...formData, emergency_reason: e.target.value })}
                      placeholder="Explain why this emergency unfreeze is necessary..."
                      rows={3}
                      required={formData.is_emergency_override}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={mode === "freeze" ? "default" : "destructive"}>
              {mode === "freeze" ? "Freeze Goals" : "Unfreeze Goals"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProgressUpdateDialog({ goal, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    new_percentage: goal?.progress_percentage || 0,
    report: "",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Goal Progress</DialogTitle>
            <DialogDescription>
              Update the progress for &quot;{goal?.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label htmlFor="percentage">Progress Percentage</Label>
              <div className="space-y-2">
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.new_percentage}
                  onChange={(e) => setFormData({ ...formData, new_percentage: parseInt(e.target.value) || 0 })}
                  required
                />
                <Progress value={formData.new_percentage} className="h-2" />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="report">Progress Report *</Label>
              <Textarea
                id="report"
                value={formData.report}
                onChange={(e) => setFormData({ ...formData, report: e.target.value })}
                placeholder="Explain the progress made..."
                rows={5}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Update Progress</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalsManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFreezeOpen, setIsFreezeOpen] = useState(false)
  const [isUnfreezeOpen, setIsUnfreezeOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [updatingGoal, setUpdatingGoal] = useState(null)
  const [activeTab, setActiveTab] = useState("goals")

  const { user } = useAuth()
  const canCreateYearly = usePermission("goal_create_yearly")
  const canCreateQuarterly = usePermission("goal_create_quarterly")
  const canFreezeGoals = usePermission("goal_freeze")
  const canEditGoals = usePermission("goal_edit")
  const canUpdateProgress = usePermission("goal_progress_update")

  const canCreateOrganizationalGoals = canCreateYearly || canCreateQuarterly

  // Redirect if no permissions
  if (!canCreateOrganizationalGoals && !canFreezeGoals) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access this page.</p>
      </div>
    )
  }

  const { data: goals = [], isLoading } = useGoals()
  const { data: freezeLogs = [] } = useGoalFreezeLogs()
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  const updateProgressMutation = useUpdateGoalProgress()
  const updateStatusMutation = useUpdateGoalStatus()
  const deleteMutation = useDeleteGoal()
  const freezeMutation = useFreezeGoalsQuarter()
  const unfreezeMutation = useUnfreezeGoalsQuarter()

  const organizationalGoals = goals.filter((g) => g.type === "YEARLY" || g.type === "QUARTERLY")

  const handleCreate = (data) => {
    createMutation.mutate({
      ...data,
      parent_goal_id: data.parent_goal_id === "" ? null : data.parent_goal_id,
    })
  }

  const handleUpdate = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, ...data })
    }
  }

  const handleUpdateProgress = (data) => {
    if (updatingGoal) {
      updateProgressMutation.mutate({ id: updatingGoal.id, ...data }, {
        onSuccess: () => {
          if (data.new_percentage === 100) {
            updateStatusMutation.mutate({ id: updatingGoal.id, status: 'ACHIEVED' })
          }
        }
      })
    }
  }

  const handleEdit = (goal) => {
    setEditingGoal(goal)
    setIsFormOpen(true)
  }

  const handleUpdateProgressDialog = (goal) => {
    setUpdatingGoal(goal)
    setIsProgressOpen(true)
  }

  const handleStatusChange = (goal, status) => {
    updateStatusMutation.mutate({ id: goal.id, status })
  }

  const handleDelete = (goal) => {
    if (confirm(`Are you sure you want to delete "${goal.title}"?`)) {
      deleteMutation.mutate(goal.id)
    }
  }

  const handleFreeze = (data) => {
    freezeMutation.mutate(data, {
      onSuccess: () => {
        setIsFreezeOpen(false)
      }
    })
  }

  const handleUnfreeze = (data) => {
    unfreezeMutation.mutate(data, {
      onSuccess: () => {
        setIsUnfreezeOpen(false)
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Goals Management</h1>
            <p className="text-base text-gray-600">
              Manage organizational goals and freeze settings
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Organizational Goals
          </TabsTrigger>
          <TabsTrigger value="freeze" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Freeze Management
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Freeze Logs
          </TabsTrigger>
        </TabsList>

        {/* Organizational Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Manage company-wide yearly and quarterly goals
            </p>
            {canCreateOrganizationalGoals && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Organizational Goal
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organizational Goals ({organizationalGoals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : organizationalGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {organizationalGoals.map((goal) => (
                    <OrganizationalGoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onUpdateProgress={handleUpdateProgressDialog}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizational goals yet</h3>
                  <p className="text-gray-600 mb-4">Create your first organizational goal to get started</p>
                  {canCreateOrganizationalGoals && (
                    <Button onClick={() => setIsFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Goal
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Freeze Management Tab */}
        <TabsContent value="freeze" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Freeze Individual Goals</CardTitle>
              <CardDescription>
                Freeze or unfreeze all individual goals for a specific quarter to prevent or allow editing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lock className="h-5 w-5 text-blue-600" />
                      Freeze Goals
                    </CardTitle>
                    <CardDescription>
                      Lock goals to prevent editing for a specific quarter
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => setIsFreezeOpen(true)}
                      disabled={!canFreezeGoals}
                      className="w-full"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Freeze Quarter Goals
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Unlock className="h-5 w-5 text-orange-600" />
                      Unfreeze Goals
                    </CardTitle>
                    <CardDescription>
                      Unlock goals to allow editing again
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => setIsUnfreezeOpen(true)}
                      disabled={!canFreezeGoals}
                      variant="outline"
                      className="w-full"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      Unfreeze Quarter Goals
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {!canFreezeGoals && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You don't have permission to freeze or unfreeze goals. Contact your administrator.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Freeze Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Freeze/Unfreeze History</CardTitle>
              <CardDescription>
                View all freeze and unfreeze actions performed on goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {freezeLogs.length > 0 ? (
                <div className="space-y-4">
                  {freezeLogs.map((log) => (
                    <Card key={log.id} className="border-l-4" style={{
                      borderLeftColor: log.action === 'freeze' ? '#3b82f6' : '#f59e0b'
                    }}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {log.action === 'freeze' ? (
                                <Lock className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Unlock className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="font-semibold capitalize">{log.action}</span>
                              <Badge variant="outline">
                                {log.quarter} {log.year}
                              </Badge>
                              {log.is_emergency_override && (
                                <Badge variant="destructive">Emergency Override</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              <p>Affected {log.affected_goals_count} goal(s)</p>
                              <p>By: {log.performer_name || 'Unknown'}</p>
                              <p>Date: {new Date(log.performed_at).toLocaleString()}</p>
                              {log.emergency_reason && (
                                <p className="mt-2 text-red-600">Reason: {log.emergency_reason}</p>
                              )}
                              {log.scheduled_unfreeze_date && (
                                <p className="mt-2 text-blue-600">
                                  Scheduled unfreeze: {new Date(log.scheduled_unfreeze_date).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No freeze logs yet</h3>
                  <p className="text-gray-600">Freeze/unfreeze actions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OrganizationalGoalForm
        goal={editingGoal}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingGoal(null)
        }}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
      />

      <FreezeDialog
        isOpen={isFreezeOpen}
        onClose={() => setIsFreezeOpen(false)}
        onSubmit={handleFreeze}
        mode="freeze"
      />

      <FreezeDialog
        isOpen={isUnfreezeOpen}
        onClose={() => setIsUnfreezeOpen(false)}
        onSubmit={handleUnfreeze}
        mode="unfreeze"
      />

      <ProgressUpdateDialog
        goal={updatingGoal}
        isOpen={isProgressOpen}
        onClose={() => {
          setIsProgressOpen(false)
          setUpdatingGoal(null)
        }}
        onSubmit={handleUpdateProgress}
      />
    </div>
  )
}
