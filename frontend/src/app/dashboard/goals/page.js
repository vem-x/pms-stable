"use client"

import React, { useState, useMemo } from "react"
import {
  Plus,
  Target,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Users,
  Building2,
  ChevronRight,
  ChevronDown,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Play,
  Check,
  ChevronsUpDown,
  User,
  CheckCircle,
  XCircle,
  TypeIcon
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth, usePermission } from "@/lib/auth-context"
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useUpdateGoalProgress,
  useUpdateGoalStatus,
  useDeleteGoal,
  useApproveGoal,
  useFreezeGoalsQuarter,
  useOrganizations,
} from "@/lib/react-query"

const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACTIVE: "bg-blue-100 text-blue-800 border-blue-200",
  ACHIEVED: "bg-green-100 text-green-800 border-green-200",
  DISCARDED: "bg-gray-100 text-gray-800 border-gray-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  // Legacy support
  pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
  active: "bg-blue-100 text-blue-800 border-blue-200",
  achieved: "bg-green-100 text-green-800 border-green-200",
  discarded: "bg-gray-100 text-gray-800 border-gray-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
}

const typeColors = {
  YEARLY: "bg-purple-100 text-purple-800 border-purple-200",
  QUARTERLY: "bg-blue-100 text-blue-800 border-blue-200",
  INDIVIDUAL: "bg-green-100 text-green-800 border-green-200",
  // Legacy support
  yearly: "bg-purple-100 text-purple-800 border-purple-200",
  quarterly: "bg-blue-100 text-blue-800 border-blue-200",
  individual: "bg-green-100 text-green-800 border-green-200",
}

const statusIcons = {
  active: Play,
  achieved: CheckCircle2,
  discarded: AlertCircle,
}

const typeIcons = {
  yearly: Building2,
  quarterly: Calendar,
  individual: User,
  YEARLY: Building2,
  QUARTERLY: Calendar,
  INDIVIDUAL: User,
}

// Helper function to format goal type for display
const formatGoalType = (type) => {
  if (!type) return ''
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

// Helper function to format goal status for display
const formatGoalStatus = (status) => {
  if (!status) return ''
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

function GoalCard({ goal, onEdit, onDelete, onUpdateProgress, onStatusChange, onApprove, canEdit = false, canUpdateProgress = false, canApprove = false, onCardClick }) {
  const StatusIcon = statusIcons[goal.status?.toLowerCase()]
  const TypeIcon = typeIcons[goal.type?.toLowerCase()
]
  const isActive = goal.status === "active"
  const isPendingApproval = goal.status === "pending_approval"

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onCardClick?.(goal)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold leading-tight">{goal.title}</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={`${typeColors[goal.type]} flex items-center gap-1.5 px-3 py-1`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {formatGoalType(goal.type)}
              </Badge>
              <Badge className={`${statusColors[goal.status]} flex items-center gap-1.5 px-3 py-1`}>
                {/* <StatusIcon className="h-3.5 w-3.5" /> */}
                {formatGoalStatus(goal.status)}
              </Badge>
              {goal.frozen && (
                <Badge className="bg-gray-200 text-gray-800 border-gray-300 flex items-center gap-1.5 px-3 py-1">
                  <Target className="h-3.5 w-3.5" />
                  Frozen
                </Badge>
              )}
            </div>
          </div>
          {(canEdit || canUpdateProgress || canApprove) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {canApprove && isPendingApproval && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(goal); }}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Goal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canEdit && !goal.frozen && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Goal
                  </DropdownMenuItem>
                )}
                {(canUpdateProgress || canEdit) && isActive && !goal.frozen && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateProgress(goal); }}>
                      <FileText className="mr-2 h-4 w-4" />
                      Update Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(goal, "achieved"); }}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Achieved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(goal, "discarded"); }}>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Discard Goal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(goal); }} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Goal
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{goal.description}</p>

        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${
                  goal.status === 'achieved' ? 'text-green-500' :
                  goal.status === 'discarded' ? 'text-gray-400' : 'text-blue-500'
                }`}
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${goal.progress_percentage || 0}, 100`}
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-700">
                {goal.progress_percentage || 0}%
              </span>
            </div>
          </div>
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

function GoalsHierarchy({ goals, onEdit, onDelete, onUpdateProgress, onStatusChange, onApprove, canEdit, canUpdateProgress, canApprove, onCardClick }) {
  const [expandedGoals, setExpandedGoals] = useState(new Set())

  const hierarchicalGoals = useMemo(() => {
    const yearlyGoals = goals.filter((g) => g.type === "yearly")
    const quarterlyGoals = goals.filter((g) => g.type === "quarterly")

    return yearlyGoals
      .map((yearly) => ({
        ...yearly,
        children: quarterlyGoals.filter((q) => q.parent_goal_id === yearly.id),
      }))
      .concat(
        // Standalone quarterly goals (no parent)
        quarterlyGoals.filter((q) => !q.parent_goal_id),
      )
  }, [goals])

  const toggleExpanded = (goalId) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedGoals(newExpanded)
  }

  const renderGoal = (goal, level = 0) => {
    const hasChildren = goal.children && goal.children.length > 0
    const isExpanded = expandedGoals.has(goal.id)
    const paddingClass = level === 0 ? "" : level === 1 ? "ml-6" : "ml-12"

    return (
      <div key={goal.id} className={paddingClass}>
        <div className="flex items-start gap-2 mb-3">
          {hasChildren && (
            <Button variant="ghost" size="sm" className="p-1 h-6 w-6 mt-1" onClick={() => toggleExpanded(goal.id)}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
          <div className="flex-1">
            <GoalCard
              goal={goal}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdateProgress={onUpdateProgress}
              onStatusChange={onStatusChange}
              onApprove={onApprove}
              canEdit={canEdit}
              canUpdateProgress={canUpdateProgress}
              canApprove={canApprove}
              onCardClick={onCardClick}
            />
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-3">{goal.children.map((child) => renderGoal(child, level + 1))}</div>
        )}
      </div>
    )
  }

  return <div className="space-y-4">{hierarchicalGoals.map((goal) => renderGoal(goal))}</div>
}

function GoalForm({ goal, isOpen, onClose, onSubmit, canCreateOrganizationalGoals = false }) {
  const { user } = useAuth()

  // Calculate current quarter and year for defaults
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    type: goal?.type?.toUpperCase() || (canCreateOrganizationalGoals ? "QUARTERLY" : "INDIVIDUAL"),
    evaluation_method: goal?.evaluation_method || "",
    difficulty_level: goal?.difficulty_level || 3,
    start_date: goal?.start_date || "",
    end_date: goal?.end_date || "",
    parent_goal_id: goal?.parent_goal_id || "",
    quarter: goal?.quarter || `Q${currentQuarter}`,
    year: goal?.year || currentYear,
  })

  const [parentGoalOpen, setParentGoalOpen] = useState(false)

  const { data: goals = [] } = useGoals()

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  const goalsArray = Array.isArray(goals) ? goals : []

  // ensure comparison is uppercase
  const potentialParents = goalsArray.filter((g) => {
    const gType = g.type?.toUpperCase()
    const currentType = formData.type?.toUpperCase()

    if (goal && g.id === goal.id) return false
    if (currentType === "YEARLY") return false
    if (currentType === "QUARTERLY") return gType === "YEARLY"
    if (currentType === "INDIVIDUAL") return gType === "YEARLY" || gType === "QUARTERLY"
    return false
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl">{goal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            <DialogDescription>
              {goal
                ? "Update the goal details below."
                : "Create a new performance goal following the hierarchical structure."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Goal Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter a clear, concise goal title"
                required
                className="text-base"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of what this goal aims to achieve"
                rows={4}
                className="text-base resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-sm font-medium">
                  Goal Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value.toUpperCase(), parent_goal_id: "" })}
                  disabled={!!goal}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {canCreateOrganizationalGoals && (
                      <>
                        <SelectItem value="YEARLY">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Yearly Goal
                          </div>
                        </SelectItem>
                        <SelectItem value="QUARTERLY">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Quarterly Goal
                          </div>
                        </SelectItem>
                      </>
                    )}
                    <SelectItem value="INDIVIDUAL">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Individual Goal
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty Level
                </Label>
                <Select
                  value={formData.difficulty_level.toString()}
                  onValueChange={(value) => setFormData({ ...formData, difficulty_level: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
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

            {formData.type === "INDIVIDUAL" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quarter" className="text-sm font-medium">
                    Quarter <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.quarter}
                    onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                    required={formData.type === "INDIVIDUAL"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1 (Jan - Mar)</SelectItem>
                      <SelectItem value="Q2">Q2 (Apr - Jun)</SelectItem>
                      <SelectItem value="Q3">Q3 (Jul - Sep)</SelectItem>
                      <SelectItem value="Q4">Q4 (Oct - Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year" className="text-sm font-medium">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    min={currentYear - 1}
                    max={currentYear + 5}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number.parseInt(e.target.value) })}
                    required={formData.type === "INDIVIDUAL"}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date" className="text-sm font-medium">
                  Start Date
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date" className="text-sm font-medium">
                  End Date
                </Label>
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
                <Label htmlFor="parent" className="text-sm font-medium">
                  {formData.type === "INDIVIDUAL" ? "Link to Organizational Goal (Optional)" : "Parent Goal (Optional)"}
                </Label>
                <Popover open={parentGoalOpen} onOpenChange={setParentGoalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={parentGoalOpen}
                      className="w-full justify-between"
                    >
                      {formData.parent_goal_id && formData.parent_goal_id !== "none"
                        ? (() => {
                            const selectedGoal = potentialParents.find(g => g.id === formData.parent_goal_id)
                            return selectedGoal ? (
                              <div className="flex items-center gap-2">
                                {React.createElement(typeIcons[selectedGoal.type], { className: "h-4 w-4" })}
                                {selectedGoal.title} ({selectedGoal.type})
                              </div>
                            ) : "Select parent goal..."
                          })()
                        : "Select parent goal..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search parent goals..." />
                      <CommandList>
                        <CommandEmpty>No goals found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData({ ...formData, parent_goal_id: "none" })
                              setParentGoalOpen(false)
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.parent_goal_id === "none" || !formData.parent_goal_id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            No parent goal
                          </CommandItem>
                          {potentialParents.map((g) => (
                            <CommandItem
                              key={g.id}
                              value={`${g.title} ${g.type}`}
                              onSelect={() => {
                                setFormData({ ...formData, parent_goal_id: g.id })
                                setParentGoalOpen(false)
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.parent_goal_id === g.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex items-center gap-2">
                                {React.createElement(typeIcons[g.type], { className: "h-4 w-4" })}
                                {g.title} ({g.type})
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="evaluation_method" className="text-sm font-medium">
                Evaluation Method
              </Label>
              <Input
                id="evaluation_method"
                value={formData.evaluation_method}
                onChange={(e) => setFormData({ ...formData, evaluation_method: e.target.value })}
                placeholder="How will success be measured for this goal?"
                className="text-base"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {goal ? "Update Goal" : "Create Goal"}
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
              Update the progress for &quot;<strong>{goal?.title}</strong>&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label htmlFor="percentage" className="text-sm font-medium">
                Progress Percentage
              </Label>
              <div className="space-y-2">
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.new_percentage}
                  onChange={(e) => setFormData({ ...formData, new_percentage: Number.parseInt(e.target.value) || 0 })}
                  required
                  className="text-base"
                />
                <Progress value={formData.new_percentage} className="h-2" />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="report" className="text-sm font-medium">
                Progress Report *
              </Label>
              <Textarea
                id="report"
                value={formData.report}
                onChange={(e) => setFormData({ ...formData, report: e.target.value })}
                placeholder="Explain the progress made, key achievements, and reasons for this update..."
                rows={5}
                required
                className="text-base resize-none"
              />
              <p className="text-xs text-gray-500">
                This report will be logged for audit purposes and progress tracking.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Update Progress
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GoalDetailDialog({ goal, isOpen, onClose, allGoals }) {
  if (!goal) return null

  const childGoals = allGoals.filter(g => g.parent_goal_id === goal.id)
  const parentGoal = goal.parent_goal_id ? allGoals.find(g => g.id === goal.parent_goal_id) : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl pr-8">{goal.title}</DialogTitle>
              <div className="flex items-center gap-3">
                <Badge className={`${typeColors[goal.type]} flex items-center gap-1.5 px-3 py-1`}>
                  {React.createElement(typeIcons[goal.type], { className: "h-3.5 w-3.5" })}
                  {goal.type}
                </Badge>
                <Badge className={`${statusColors[goal.status]} flex items-center gap-1.5 px-3 py-1`}>
                  {React.createElement(statusIcons[goal.status], { className: "h-3.5 w-3.5" })}
                  {goal.status}
                </Badge>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${
                      goal.status === 'achieved' ? 'text-green-500' :
                      goal.status === 'discarded' ? 'text-gray-400' : 'text-blue-500'
                    }`}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${goal.progress_percentage || 0}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">
                    {goal.progress_percentage || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
            <p className="text-gray-600 leading-relaxed">{goal.description || 'No description provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Start: {new Date(goal.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>End: {new Date(goal.end_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Difficulty: {goal.difficulty_level}/5</div>
                {goal.evaluation_method && (
                  <div>Evaluation: {goal.evaluation_method}</div>
                )}
              </div>
            </div>
          </div>

          {parentGoal && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Parent Goal</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {React.createElement(typeIcons[parentGoal.type], { className: "h-4 w-4 text-gray-500" })}
                  <span className="font-medium text-gray-900">{parentGoal.title}</span>
                  <Badge className={`${typeColors[parentGoal.type]} text-xs`}>
                    {parentGoal.type}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {childGoals.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Child Goals ({childGoals.length})</h4>
              <div className="space-y-2">
                {childGoals.map((child) => (
                  <div key={child.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {React.createElement(typeIcons[child.type], { className: "h-4 w-4 text-gray-500" })}
                        <span className="font-medium text-gray-900">{child.title}</span>
                        <Badge className={`${typeColors[child.type]} text-xs`}>
                          {child.type}
                        </Badge>
                        <Badge className={`${statusColors[child.status]} text-xs`}>
                          {child.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-600">{child.progress_percentage || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

function GoalApprovalDialog({ goal, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    approved: true,
    rejection_reason: ""
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
            <DialogTitle className="text-xl">Approve Goal</DialogTitle>
            <DialogDescription>
              Review and approve or reject this individual goal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-900">{goal?.title}</h3>
              {goal?.description && (
                <p className="text-sm text-gray-600">{goal.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Badge className={typeColors[goal?.type] || typeColors.individual}>
                  {goal?.type?.toUpperCase()}
                </Badge>
                {goal?.quarter && (
                  <Badge variant="outline">
                    {goal.quarter} {goal.year}
                  </Badge>
                )}
              </div>
              {goal?.owner_name && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Owner:</span> {goal.owner_name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.approved ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormData({ approved: true, rejection_reason: "" })}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                type="button"
                variant={!formData.approved ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setFormData({ ...formData, approved: false })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>

            {!formData.approved && (
              <div className="grid gap-2">
                <Label htmlFor="rejection_reason" className="text-sm font-medium">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection_reason"
                  value={formData.rejection_reason}
                  onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                  placeholder="Provide a reason for rejecting this goal..."
                  rows={4}
                  required={!formData.approved}
                  className="resize-none"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={formData.approved ? "default" : "destructive"}>
              {formData.approved ? "Approve Goal" : "Reject Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isApprovalOpen, setIsApprovalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [updatingGoal, setUpdatingGoal] = useState(null)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [approvingGoal, setApprovingGoal] = useState(null)
  const [goalViewType, setGoalViewType] = useState("organizational") // "my" or "organizational"
  const [filterType, setFilterType] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [viewMode, setViewMode] = useState("list") // hierarchy or list

  const { user } = useAuth()

  const canViewAllGoals = usePermission("goal_view_all")
  const canEditGoals = usePermission("goal_edit")
  const canUpdateProgress = usePermission("goal_progress_update")
  const canApproveGoals = usePermission("goal_approve")
  const canCreateYearly = usePermission("goal_create_yearly")
  const canCreateQuarterly = usePermission("goal_create_quarterly")
  const canCreateDepartmental = usePermission("goal_create_departmental")
  const canCreateOrganizationalGoals = canCreateYearly || canCreateQuarterly || canCreateDepartmental

  // Everyone can access goals page - permissions checked for specific actions

  const { data: goals = [], isLoading } = useGoals()
   
  console.log(goals)
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  const updateProgressMutation = useUpdateGoalProgress()
  const updateStatusMutation = useUpdateGoalStatus()
  const deleteMutation = useDeleteGoal()
  const approvalMutation = useApproveGoal()

  const handleCreate = (data) => {
    const processedData = {
      ...data,
      type: data.type,
      parent_goal_id: data.parent_goal_id === "none" || data.parent_goal_id === "" ? null : data.parent_goal_id,
      difficulty_level: parseInt(data.difficulty_level, 10),
    }

    console.log('Creating goal with data:', processedData)
    createMutation.mutate(processedData)
  }

  const handleUpdate = (data) => {
    if (editingGoal) {
      const processedData = {
        ...data,
        type: data.type?.toLowerCase(), // Convert to lowercase for backend enum
        parent_goal_id: data.parent_goal_id === "none" || data.parent_goal_id === "" ? null : data.parent_goal_id,
        difficulty_level: parseInt(data.difficulty_level, 10),
      }

      console.log('Updating goal with data:', processedData)
      updateMutation.mutate({ id: editingGoal.id, ...processedData })
    }
  }

  const handleUpdateProgress = (data) => {
    if (updatingGoal) {
      updateProgressMutation.mutate({ id: updatingGoal.id, ...data }, {
        onSuccess: () => {
          // Auto-achieve goal if progress reaches 100%
          if (data.new_percentage === 100) {
            updateStatusMutation.mutate({ id: updatingGoal.id, status: 'achieved' })
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
    if (confirm(`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(goal.id)
    }
  }

  const handleApprovalDialog = (goal) => {
    setApprovingGoal(goal)
    setIsApprovalOpen(true)
  }

  const handleApprove = (data) => {
    if (approvingGoal) {
      approvalMutation.mutate({ id: approvingGoal.id, ...data }, {
        onSuccess: () => {
          setIsApprovalOpen(false)
          setApprovingGoal(null)
        }
      })
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingGoal(null)
  }

  const handleCloseApproval = () => {
    setIsApprovalOpen(false)
    setApprovingGoal(null)
  }

  const handleCloseProgress = () => {
    setIsProgressOpen(false)
    setUpdatingGoal(null)
  }

  const handleCardClick = (goal) => {
    setSelectedGoal(goal)
    setIsDetailOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedGoal(null)
  }

  const goalsArray = Array.isArray(goals) ? goals : []
  const filteredGoals = goalsArray.filter((goal) => {
    console.log(goalViewType)
    console.log(user)
     
    if (goalViewType === "my") {

      if (goal.type !== "INDIVIDUAL" || goal.owner_id !== user?.user_id) {
        return false
      }
    } else {
      if (goal.type !== "YEARLY" && goal.type !== "QUARTERLY") {
        return false
      }
    }

    const matchesType = filterType === "all" || goal.type === filterType
    const matchesStatus = filterStatus === "all" || goal.status === filterStatus
    return matchesType && matchesStatus
  })

  // Everyone can create goals - at minimum individual goals
  const canCreateAnyGoal = true

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Goals Management</h1>
            <p className="text-base text-gray-600">
              Create, manage, and track performance goals across the entire organization
            </p>
          </div>
          {canCreateAnyGoal && (
            <Button onClick={() => setIsFormOpen(true)} className=" px-6">
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          )}
        </div>
      </div>

      {/* Goal View Tabs */}
      <Tabs value={goalViewType} onValueChange={setGoalViewType} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="organizational" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizational Goals
          </TabsTrigger>
          <TabsTrigger value="my" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Goals
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Statistics Dashboard */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Goals</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {filteredGoals.filter((g) => g.status === "active").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Across all levels</p>
          </CardContent>
        </Card>

        <Card className=" ">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Achieved Goals</CardTitle>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {filteredGoals.filter((g) => g.status === "achieved").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Organization-wide</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Average Progress</CardTitle>
            <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {filteredGoals.length > 0
                ? Math.round(
                    filteredGoals
                      .filter((g) => g.status === "active")
                      .reduce((sum, g) => sum + (g.progress_percentage || 0), 0) /
                      Math.max(filteredGoals.filter((g) => g.status === "active").length, 1),
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-gray-500 mt-1">All active goals</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Goals</CardTitle>
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{filteredGoals.length}</div>
            <p className="text-xs text-gray-500 mt-1">Under management</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="yearly">Yearly Goals</SelectItem>
                  <SelectItem value="quarterly">Quarterly Goals</SelectItem>
                  <SelectItem value="individual">Individual Goals</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                  <SelectItem value="discarded">Discarded</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList>
                <TabsTrigger value="hierarchy">Hierarchy View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
      </Card>

      {/* Goals Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Target className="h-5 w-5" />
            Goals Overview ({filteredGoals.length} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : filteredGoals.length > 0 ? (
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
              <TabsContent value="hierarchy" className="space-y-6 mt-6">
                <GoalsHierarchy
                  goals={filteredGoals}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUpdateProgress={handleUpdateProgressDialog}
                  onStatusChange={handleStatusChange}
                  onApprove={handleApprovalDialog}
                  canEdit={canEditGoals}
                  canUpdateProgress={canUpdateProgress}
                  canApprove={canApproveGoals}
                  onCardClick={handleCardClick}
                />
              </TabsContent>

              <TabsContent value="list" className="space-y-6 mt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onUpdateProgress={handleUpdateProgressDialog}
                      onStatusChange={handleStatusChange}
                      onApprove={handleApprovalDialog}
                      canEdit={canEditGoals}
                      canUpdateProgress={canUpdateProgress}
                      canApprove={canApproveGoals}
                      onCardClick={handleCardClick}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-16">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals found</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                {filterType !== "all" || filterStatus !== "all"
                  ? "No goals match your current filters. Try adjusting your filters above."
                  : "Start building your organization's goal structure by creating the first goal."}
              </p>
              {canCreateAnyGoal && filterType === "all" && filterStatus === "all" && (
                <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization Goal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <GoalForm
        goal={editingGoal}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
        canCreateOrganizationalGoals={canCreateOrganizationalGoals}
      />

      <ProgressUpdateDialog
        goal={updatingGoal}
        isOpen={isProgressOpen}
        onClose={handleCloseProgress}
        onSubmit={handleUpdateProgress}
      />

      <GoalDetailDialog
        goal={selectedGoal}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        allGoals={goalsArray}
      />

      <GoalApprovalDialog
        goal={approvingGoal}
        isOpen={isApprovalOpen}
        onClose={handleCloseApproval}
        onSubmit={handleApprove}
      />
    </div>
  )
}
