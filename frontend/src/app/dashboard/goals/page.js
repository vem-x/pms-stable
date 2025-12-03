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
  Building2,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  XCircle,
  User,
  Users,
  Send,
  MessageSquare
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { useAuth, usePermission } from "@/lib/auth-context"
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useUpdateGoalProgress,
  useUpdateGoalStatus,
  useDeleteGoal,
  useApproveGoal,
  useSuperviseeGoals,
  useCreateGoalForSupervisee,
  useRespondToGoal,
  useRequestGoalChange,
  useUsers
} from "@/lib/react-query"

const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACTIVE: "bg-blue-100 text-blue-800 border-blue-200",
  ACHIEVED: "bg-green-100 text-green-800 border-green-200",
  DISCARDED: "bg-gray-100 text-gray-800 border-gray-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
}

const typeColors = {
  YEARLY: "bg-purple-100 text-purple-800 border-purple-200",
  QUARTERLY: "bg-blue-100 text-blue-800 border-blue-200",
  INDIVIDUAL: "bg-green-100 text-green-800 border-green-200",
}

const typeIcons = {
  YEARLY: Building2,
  QUARTERLY: Calendar,
  INDIVIDUAL: User,
}

// Helper to format status for display
const formatStatus = (status) => {
  if (!status) return ''
  return status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

function GoalCard({ goal, onEdit, onDelete, onUpdateProgress, onStatusChange, onApprove, onRespond, onRequestChange, canEdit = false, canApprove = false, isTeamGoal = false, onViewDetails }) {
  const TypeIcon = typeIcons[goal.type]
  const isPendingApproval = goal.status === "PENDING_APPROVAL"
  const isActive = goal.status === "ACTIVE"
  const isAssignedByOther = goal.created_by !== goal.owner_id

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onViewDetails && onViewDetails(goal)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <CardTitle className="text-lg font-semibold">{goal.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${typeColors[goal.type]} flex items-center gap-1.5`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {goal.type}
              </Badge>
              <Badge className={`${statusColors[goal.status]} flex items-center gap-1.5`}>
                {formatStatus(goal.status)}
              </Badge>
              {goal.frozen && (
                <Badge className="bg-gray-200 text-gray-800">Frozen</Badge>
              )}
              {isAssignedByOther && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  Assigned by Supervisor
                </Badge>
              )}
              {goal.quarter && goal.year && (
                <Badge variant="outline">{goal.quarter} {goal.year}</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Approve option for supervisors on team goals */}
              {canApprove && isPendingApproval && isTeamGoal && (
                <>
                  <DropdownMenuItem onClick={() => onApprove(goal)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Goal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Respond option for supervisees on assigned goals */}
              {isPendingApproval && isAssignedByOther && !isTeamGoal && (
                <>
                  <DropdownMenuItem onClick={() => onRespond(goal, true)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Accept Goal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRespond(goal, false)}>
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Decline Goal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Edit and progress options */}
              {canEdit && !goal.frozen && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Goal
                  </DropdownMenuItem>
                  {isActive && (
                    <>
                      <DropdownMenuItem onClick={() => onUpdateProgress(goal)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Update Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRequestChange(goal)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Request Change
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
                </>
              )}

              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDelete(goal)} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Goal
                  </DropdownMenuItem>
                </>
              )}
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

        {(goal.start_date || goal.end_date) && (
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            {goal.start_date && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(goal.start_date).toLocaleDateString()}
              </div>
            )}
            {goal.end_date && (
              <div>Due: {new Date(goal.end_date).toLocaleDateString()}</div>
            )}
          </div>
        )}

        {goal.owner_name && isTeamGoal && (
          <div className="text-xs text-gray-600 pt-2 border-t">
            Owner: <span className="font-medium">{goal.owner_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IndividualGoalForm({ goal, isOpen, onClose, onSubmit, canCreateForSupervisee = false, supervisees = [] }) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    type: "INDIVIDUAL",
    start_date: goal?.start_date || "",
    end_date: goal?.end_date || "",
    quarter: goal?.quarter || `Q${currentQuarter}`,
    year: goal?.year || currentYear,
    supervisee_id: goal?.owner_id || "",
  })

  const [createForSupervisee, setCreateForSupervisee] = useState(false)

  const { data: goals = [] } = useGoals()

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      supervisee_id: createForSupervisee ? formData.supervisee_id : undefined
    })
    onClose()
  }

  const potentialParents = goals.filter((g) =>
    (g.type === "YEARLY" || g.type === "QUARTERLY") && g.status === "ACTIVE"
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{goal ? "Edit Goal" : "Create Individual Goal"}</DialogTitle>
            <DialogDescription>
              Create a personal performance goal for the quarter
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {canCreateForSupervisee && !goal && (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="createForSupervisee"
                  checked={createForSupervisee}
                  onChange={(e) => setCreateForSupervisee(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="createForSupervisee" className="cursor-pointer">
                  Create this goal for a team member
                </Label>
              </div>
            )}

            {createForSupervisee && (
              <div className="grid gap-2">
                <Label htmlFor="supervisee">Select Team Member *</Label>
                <Select
                  value={formData.supervisee_id}
                  onValueChange={(value) => setFormData({ ...formData, supervisee_id: value })}
                  required={createForSupervisee}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisees.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} - {s.job_title || 'No title'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="title">Goal Title *</Label>
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
                placeholder="Describe what you want to achieve"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quarter">Quarter *</Label>
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
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min={currentYear - 1}
                  max={currentYear + 5}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date (Optional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {potentialParents.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="parent">Link to Organizational Goal (Optional)</Label>
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
              Update progress for &quot;{goal?.title}&quot;
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
            <DialogTitle>Approve Goal</DialogTitle>
            <DialogDescription>
              Review and approve or reject this goal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h3 className="font-semibold">{goal?.title}</h3>
              {goal?.description && (
                <p className="text-sm text-gray-600">{goal.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Badge>{goal?.quarter} {goal?.year}</Badge>
                {goal?.owner_name && (
                  <span className="text-gray-600">Owner: {goal.owner_name}</span>
                )}
              </div>
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
                <Label htmlFor="rejection_reason">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection_reason"
                  value={formData.rejection_reason}
                  onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                  placeholder="Explain why this goal is being rejected..."
                  rows={4}
                  required={!formData.approved}
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

function ChangeRequestDialog({ goal, isOpen, onClose, onSubmit }) {
  const [changeRequest, setChangeRequest] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(changeRequest)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request Goal Change</DialogTitle>
            <DialogDescription>
              Request modifications to &quot;{goal?.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="change_request">
                What changes do you need? <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="change_request"
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                placeholder="Describe the changes you need to this goal..."
                rows={5}
                required
              />
              <p className="text-xs text-gray-500">
                Your supervisor will review this request and may approve changes to your goal
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RespondToGoalDialog({ goal, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    accepted: true,
    response_message: ""
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData.accepted, formData.response_message)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Respond to Assigned Goal</DialogTitle>
            <DialogDescription>
              Your supervisor assigned you this goal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h3 className="font-semibold">{goal?.title}</h3>
              {goal?.description && (
                <p className="text-sm text-gray-600">{goal.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Badge>{goal?.quarter} {goal?.year}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.accepted ? "default" : "outline"}
                className="flex-1"
                onClick={() => setFormData({ accepted: true, response_message: "" })}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                type="button"
                variant={!formData.accepted ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setFormData({ ...formData, accepted: false })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>

            {!formData.accepted && (
              <div className="grid gap-2">
                <Label htmlFor="response_message">
                  Reason for declining <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="response_message"
                  value={formData.response_message}
                  onChange={(e) => setFormData({ ...formData, response_message: e.target.value })}
                  placeholder="Explain why you're declining this goal..."
                  rows={4}
                  required={!formData.accepted}
                />
              </div>
            )}

            {formData.accepted && (
              <div className="grid gap-2">
                <Label htmlFor="response_message">Message (Optional)</Label>
                <Textarea
                  id="response_message"
                  value={formData.response_message}
                  onChange={(e) => setFormData({ ...formData, response_message: e.target.value })}
                  placeholder="Add any comments..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant={formData.accepted ? "default" : "destructive"}>
              {formData.accepted ? "Accept Goal" : "Decline Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GoalDetailDialog({ goal, isOpen, onClose, parentGoal, supervisor }) {
  if (!goal) return null

  const TypeIcon = typeIcons[goal.type]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <DialogTitle className="text-xl">{goal.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${typeColors[goal.type]} flex items-center gap-1.5`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {goal.type}
                </Badge>
                <Badge className={statusColors[goal.status]}>
                  {formatStatus(goal.status)}
                </Badge>
                {goal.quarter && goal.year && (
                  <Badge variant="outline">{goal.quarter} {goal.year}</Badge>
                )}
                {goal.frozen && (
                  <Badge className="bg-gray-200 text-gray-800">Frozen</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          {goal.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{goal.description}</p>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-700">Progress</h3>
              <span className="text-sm font-semibold">{goal.progress_percentage || 0}%</span>
            </div>
            <Progress value={goal.progress_percentage || 0} className="h-2" />
          </div>

          {/* Dates */}
          {(goal.start_date || goal.end_date) && (
            <div className="grid grid-cols-2 gap-4">
              {goal.start_date && (
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-gray-700">Start Date</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(goal.start_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {goal.end_date && (
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-gray-700">End Date</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(goal.end_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Parent Goal */}
          {parentGoal && (
            <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-sm text-blue-900">Linked to Organizational Goal</h3>
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-800">{parentGoal.title}</p>
                <div className="flex items-center gap-2">
                  <Badge className={typeColors[parentGoal.type]}>
                    {parentGoal.type}
                  </Badge>
                  <Badge className={statusColors[parentGoal.status]}>
                    {formatStatus(parentGoal.status)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Supervisor Info */}
          {supervisor && (
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-sm text-gray-700">Reporting Supervisor</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{supervisor.name}</p>
                  <p className="text-xs text-gray-600">{supervisor.job_title || 'Supervisor'}</p>
                  {supervisor.email && (
                    <p className="text-xs text-gray-500">{supervisor.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {goal.status === 'REJECTED' && goal.rejection_reason && (
            <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold text-sm text-red-900">Rejection Reason</h3>
              <p className="text-sm text-red-800">{goal.rejection_reason}</p>
            </div>
          )}

          {/* Achievement Date */}
          {goal.status === 'ACHIEVED' && goal.achieved_at && (
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-gray-700">Achieved On</h3>
              <p className="text-sm text-gray-600">
                {new Date(goal.achieved_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function GoalsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [isApprovalOpen, setIsApprovalOpen] = useState(false)
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false)
  const [isRespondOpen, setIsRespondOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [updatingGoal, setUpdatingGoal] = useState(null)
  const [approvingGoal, setApprovingGoal] = useState(null)
  const [changingGoal, setChangingGoal] = useState(null)
  const [respondingGoal, setRespondingGoal] = useState(null)
  const [detailGoal, setDetailGoal] = useState(null)
  const [activeTab, setActiveTab] = useState("organizational")

  const { user } = useAuth()
  const canEditGoals = usePermission("goal_edit")
  const canUpdateProgress = usePermission("goal_progress_update")
  const canApproveGoals = usePermission("goal_approve")

  const { data: goals = [], isLoading } = useGoals()
  const { data: superviseeGoals = [] } = useSuperviseeGoals()
  const { data: users = [] } = useUsers()

  const createMutation = useCreateGoal()
  const createForSuperviseeMutation = useCreateGoalForSupervisee()
  const updateMutation = useUpdateGoal()
  const updateProgressMutation = useUpdateGoalProgress()
  const updateStatusMutation = useUpdateGoalStatus()
  const deleteMutation = useDeleteGoal()
  const approvalMutation = useApproveGoal()
  const respondMutation = useRespondToGoal()
  const requestChangeMutation = useRequestGoalChange()

  // Get supervisees for supervisor view
  const supervisees = useMemo(() => {
    return users.filter(u => u.supervisor_id === user?.user_id)
  }, [users, user])

  const isSupervisor = supervisees.length > 0

  // Filter goals by type
  const organizationalGoals = useMemo(() =>
    goals.filter(g => g.type === "YEARLY" || g.type === "QUARTERLY"),
    [goals]
  )

  const myIndividualGoals = useMemo(() =>
    goals.filter(g => g.type === "INDIVIDUAL" && g.owner_id === user?.user_id),
    [goals, user]
  )

  // Handlers
  const handleCreate = (data) => {
    if (data.supervisee_id) {
      // Create goal for supervisee using the special endpoint
      createForSuperviseeMutation.mutate({
        ...data,
        parent_goal_id: data.parent_goal_id === "" ? null : data.parent_goal_id,
      }, {
        onSuccess: () => {
          setIsFormOpen(false)
          setEditingGoal(null)
        }
      })
    } else {
      createMutation.mutate({
        ...data,
        parent_goal_id: data.parent_goal_id === "" ? null : data.parent_goal_id,
      }, {
        onSuccess: () => {
          setIsFormOpen(false)
          setEditingGoal(null)
        }
      })
    }
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

  const handleRequestChange = (changeRequest) => {
    if (changingGoal) {
      requestChangeMutation.mutate({
        id: changingGoal.id,
        changeRequest
      }, {
        onSuccess: () => {
          setIsChangeRequestOpen(false)
          setChangingGoal(null)
        }
      })
    }
  }

  const handleRespond = (accepted, message) => {
    if (respondingGoal) {
      respondMutation.mutate({
        id: respondingGoal.id,
        accepted,
        response_message: message
      }, {
        onSuccess: () => {
          setIsRespondOpen(false)
          setRespondingGoal(null)
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

  const handleApprovalDialog = (goal) => {
    setApprovingGoal(goal)
    setIsApprovalOpen(true)
  }

  const handleChangeRequestDialog = (goal) => {
    setChangingGoal(goal)
    setIsChangeRequestOpen(true)
  }

  const handleRespondDialog = (goal, accepted) => {
    setRespondingGoal({ ...goal, initialAccepted: accepted })
    setIsRespondOpen(true)
  }

  const handleStatusChange = (goal, status) => {
    updateStatusMutation.mutate({ id: goal.id, status })
  }

  const handleDelete = (goal) => {
    if (confirm(`Delete "${goal.title}"?`)) {
      deleteMutation.mutate(goal.id)
    }
  }

  const handleViewDetails = (goal) => {
    setDetailGoal(goal)
    setIsDetailOpen(true)
  }

  // Get parent goal and supervisor for detail view
  const parentGoalForDetail = detailGoal?.parent_goal_id
    ? goals.find(g => g.id === detailGoal.parent_goal_id)
    : null

  const supervisorForDetail = detailGoal?.owner_id && detailGoal.owner_id !== user?.user_id
    ? users.find(u => u.id === detailGoal.owner_id)?.supervisor
    : user?.supervisor_id
      ? users.find(u => u.id === user.supervisor_id)
      : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
            <p className="text-base text-gray-600">
              Track organizational goals and manage your personal performance goals
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="organizational" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizational
          </TabsTrigger>
          <TabsTrigger value="my" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            My Goals
          </TabsTrigger>
          {isSupervisor && (
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Goals
            </TabsTrigger>
          )}
        </TabsList>

        {/* Organizational Goals Tab */}
        <TabsContent value="organizational" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Goals</CardTitle>
              <CardDescription>
                View yearly and quarterly organizational goals
              </CardDescription>
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
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onUpdateProgress={handleUpdateProgressDialog}
                      onStatusChange={handleStatusChange}
                      onViewDetails={handleViewDetails}
                      canEdit={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizational goals</h3>
                  <p className="text-gray-600">Check back later for company-wide goals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Individual Goals Tab */}
        <TabsContent value="my" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Create and manage your personal performance goals
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>My Individual Goals ({myIndividualGoals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {myIndividualGoals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {myIndividualGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onUpdateProgress={handleUpdateProgressDialog}
                      onStatusChange={handleStatusChange}
                      onApprove={handleApprovalDialog}
                      onRespond={handleRespondDialog}
                      onRequestChange={handleChangeRequestDialog}
                      onViewDetails={handleViewDetails}
                      canEdit={canEditGoals || goal.created_by === user?.user_id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No individual goals yet</h3>
                  <p className="text-gray-600 mb-4">Create your first personal goal to get started</p>
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Goal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Goals Tab (Supervisors only) */}
        {isSupervisor && (
          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Review and approve your team members' goals
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Goal for Team Member
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Team Member Goals ({superviseeGoals.length})</CardTitle>
                <CardDescription>
                  {supervisees.length} team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {superviseeGoals.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {superviseeGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onUpdateProgress={handleUpdateProgressDialog}
                        onStatusChange={handleStatusChange}
                        onApprove={handleApprovalDialog}
                        onViewDetails={handleViewDetails}
                        canEdit={canEditGoals}
                        canApprove={canApproveGoals || true}
                        isTeamGoal={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No team goals yet</h3>
                    <p className="text-gray-600 mb-4">Create goals for your team members or wait for them to create their own</p>
                    <Button onClick={() => setIsFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Goal for Team Member
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <IndividualGoalForm
        goal={editingGoal}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingGoal(null)
        }}
        onSubmit={editingGoal ? handleUpdate : handleCreate}
        canCreateForSupervisee={isSupervisor && activeTab === "team"}
        supervisees={supervisees}
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

      <GoalApprovalDialog
        goal={approvingGoal}
        isOpen={isApprovalOpen}
        onClose={() => {
          setIsApprovalOpen(false)
          setApprovingGoal(null)
        }}
        onSubmit={handleApprove}
      />

      <ChangeRequestDialog
        goal={changingGoal}
        isOpen={isChangeRequestOpen}
        onClose={() => {
          setIsChangeRequestOpen(false)
          setChangingGoal(null)
        }}
        onSubmit={handleRequestChange}
      />

      <RespondToGoalDialog
        goal={respondingGoal}
        isOpen={isRespondOpen}
        onClose={() => {
          setIsRespondOpen(false)
          setRespondingGoal(null)
        }}
        onSubmit={handleRespond}
      />

      <GoalDetailDialog
        goal={detailGoal}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setDetailGoal(null)
        }}
        parentGoal={parentGoalForDetail}
        supervisor={supervisorForDetail}
      />
    </div>
  )
}
