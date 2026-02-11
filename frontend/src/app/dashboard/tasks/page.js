'use client'

import { useState, useEffect } from "react"
import { Plus, CheckSquare, Calendar, User, Users, MoreHorizontal, Edit, Trash2, Eye, FileText, Clock, Star, Search, Filter, X, Check, ChevronsUpDown, Download } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FileUpload } from "@/components/ui/file-upload"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useAuth, PermissionGuard } from "@/lib/auth-context"
import {
  useTasks,
  useCreateTask,
  useUpdateTaskStatus,
  useSubmitTask,
  useReviewTask,
  useGoals,
  useRequestTaskExtension,
  useDeleteTask,
  useUsers,
} from "@/lib/react-query"

const statusColors = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  STARTED: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  // Legacy status support for backward compatibility
  pending_approval: "bg-yellow-100 text-yellow-800",
  assigned: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  started: "bg-indigo-100 text-indigo-800",
  completed: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800"
}

const typeColors = {
  INDIVIDUAL: "bg-blue-100 text-blue-800",
  GROUP: "bg-purple-100 text-purple-800",
  // Legacy support
  individual: "bg-blue-100 text-blue-800",
  group: "bg-purple-100 text-purple-800"
}

const urgencyColors = {
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  URGENT: "bg-red-100 text-red-800 border-red-200",
  // Legacy support
  low: "bg-gray-100 text-gray-800 border-gray-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200"
}

function TaskForm({ task, isOpen, onClose, onSubmit }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    type: task?.type || "individual",
    urgency: task?.urgency || "medium",
    due_date: task?.due_date ? task.due_date.split('T')[0] : "",
    assignee_ids: task?.assignee_ids || [],
    team_head_id: task?.team_head_id || "",
    goal_id: task?.goal_id || "none"
  })
  const [attachedFiles, setAttachedFiles] = useState([])
  const [goalOpen, setGoalOpen] = useState(false)
  const [assigneeOpen, setAssigneeOpen] = useState(false)

  const { data: usersData } = useUsers()
  const users = usersData?.users || []
  const { data: goals = [] } = useGoals()

  // Reset files when form opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAttachedFiles([])
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()

    // Format the data for submission
    const submitData = {
      ...formData,
      due_date: formData.due_date + 'T23:59:59', // Set to end of day
      assignee_ids: formData.type === 'individual' ? [formData.assignee_ids[0]] : formData.assignee_ids,
      goal_id: formData.goal_id === 'none' ? null : formData.goal_id, // Convert "none" to null
      files: attachedFiles
    }

    onSubmit(submitData)
    onClose()
  }

  const usersArray = Array.isArray(users) ? users : []
  // Filter out current user and only show active users
  const availableUsers = usersArray.filter(u => u.status === 'active' && u.id !== user?.user_id)

  // Filter goals based on user's department and scope
  const activeGoals = Array.isArray(goals) ? goals.filter(g => {
    // Only show active goals
    if (g.status !== 'active' && g.status !== 'ACTIVE') return false

    // Show yearly and quarterly goals to everyone
    if (g.type === 'yearly' || g.type === 'YEARLY' || g.type === 'quarterly' || g.type === 'QUARTERLY') {
      return true
    }

    // For departmental goals, filter by user's department unless user has global scope
    if (g.type === 'departmental' || g.type === 'DEPARTMENTAL') {
      // If user has global scope, show all departmental goals
      if (user?.scope === 'global') {
        return true
      }
      // Otherwise, only show goals from user's department
      return g.organization_id === user?.organization_id
    }

    return true
  }) : []

  // Get selected goal
  const selectedGoal = activeGoals.find(g => g.id === formData.goal_id)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col ">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-y-scroll w-full">
          <DialogHeader>
            <DialogTitle>
              {task ? 'Edit Task' : 'Create Task'}
            </DialogTitle>
            <DialogDescription>
              {task
                ? 'Update the task details below.'
                : 'Create a new task assignment.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Task title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the task"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    type: value,
                    assignee_ids: [],
                    team_head_id: ""
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="urgency">Priority</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        Urgent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Linked Goal (Optional)</Label>
              <Popover open={goalOpen} onOpenChange={setGoalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={goalOpen}
                    className="w-full justify-between"
                  >
                    {selectedGoal ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedGoal.type === 'yearly' || selectedGoal.type === 'YEARLY' ? 'Yearly' :
                           selectedGoal.type === 'quarterly' || selectedGoal.type === 'QUARTERLY' ? 'Quarterly' :
                           'Departmental'}
                        </Badge>
                        {(selectedGoal.type === 'departmental' || selectedGoal.type === 'DEPARTMENTAL') && selectedGoal.organization_name && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedGoal.organization_name}
                          </Badge>
                        )}
                        <span className="truncate">{selectedGoal.title}</span>
                      </div>
                    ) : (
                      "Search goals..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder="Search goals..." />
                    <CommandEmpty>No goal found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      <CommandItem
                        value="none"
                        onSelect={() => {
                          setFormData({ ...formData, goal_id: "none" })
                          setGoalOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.goal_id === "none" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="text-muted-foreground">None</span>
                      </CommandItem>
                      {activeGoals.map((goal) => (
                        <CommandItem
                          key={goal.id}
                          value={`${goal.title} ${goal.type} ${goal.organization_name || ''}`}
                          onSelect={() => {
                            setFormData({ ...formData, goal_id: goal.id })
                            setGoalOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.goal_id === goal.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {goal.type === 'yearly' || goal.type === 'YEARLY' ? 'Yearly' :
                               goal.type === 'quarterly' || goal.type === 'QUARTERLY' ? 'Quarterly' :
                               'Departmental'}
                            </Badge>
                            {(goal.type === 'departmental' || goal.type === 'DEPARTMENTAL') && goal.organization_name && (
                              <Badge variant="secondary" className="text-xs">
                                {goal.organization_name}
                              </Badge>
                            )}
                            <span className="flex-1">{goal.title}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Unified Assignee Selection */}
            <div className="grid gap-2">
              <Label>
                {formData.type === 'individual' ? 'Assignee' : 'Group Members'}
              </Label>

              {/* Selected Assignees Display */}
              {formData.assignee_ids.length > 0 && (
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex flex-wrap gap-2">
                    {formData.assignee_ids.map((userId) => {
                      const user = availableUsers.find(u => u.id === userId)
                      if (!user) return null
                      return (
                        <div key={user.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                assignee_ids: formData.assignee_ids.filter(id => id !== user.id),
                                team_head_id: formData.team_head_id === user.id ? "" : formData.team_head_id
                              })
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Searchable Assignee Selector */}
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assigneeOpen}
                    className="w-full justify-between"
                  >
                    {formData.assignee_ids.length === 0 ? (
                      "Search and select users..."
                    ) : formData.type === 'individual' ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">
                            {availableUsers.find(u => u.id === formData.assignee_ids[0])?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {availableUsers.find(u => u.id === formData.assignee_ids[0])?.name || 'Selected'}
                        </span>
                      </div>
                    ) : (
                      `${formData.assignee_ids.length} member${formData.assignee_ids.length > 1 ? 's' : ''} selected`
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0">
                  <Command>
                    <CommandInput placeholder="Search users by name, email, or organization..." />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {availableUsers.map((user) => {
                        const isSelected = formData.assignee_ids.includes(user.id)
                        return (
                          <CommandItem
                            key={user.id}
                            value={`${user.name} ${user.email} ${user.organization_name || ''}`}
                            onSelect={() => {
                              if (formData.type === 'individual') {
                                // Single selection for individual tasks
                                setFormData({ ...formData, assignee_ids: [user.id] })
                                setAssigneeOpen(false)
                              } else {
                                // Multi-selection for group tasks
                                if (isSelected) {
                                  setFormData({
                                    ...formData,
                                    assignee_ids: formData.assignee_ids.filter(id => id !== user.id),
                                    team_head_id: formData.team_head_id === user.id ? "" : formData.team_head_id
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    assignee_ids: [...formData.assignee_ids, user.id]
                                  })
                                }
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback className="text-xs">
                                {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col flex-1">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                              {user.organization_name && (
                                <span className="text-xs text-muted-foreground">{user.organization_name}</span>
                              )}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Team Head Selection for Group Tasks */}
            {formData.type === 'group' && formData.assignee_ids.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="team_head">Team Head</Label>
                <Select
                  value={formData.team_head_id}
                  onValueChange={(value) => setFormData({ ...formData, team_head_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team head from assigned members" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.assignee_ids.map((userId) => {
                      const user = availableUsers.find(u => u.id === userId)
                      return user ? (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {user.name?.split(' ').map(n => n[0]).join('') || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                        </SelectItem>
                      ) : null
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* File Upload Section */}
            <div className="grid gap-2">
              <FileUpload
                files={attachedFiles}
                onFilesChange={setAttachedFiles}
                label="Attach Documents (Optional)"
                description="Upload supporting documents, references, or files related to this task"
                maxFiles={5}
                maxSize={10 * 1024 * 1024} // 10MB
                optional={true}
                acceptedTypes=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.zip,.rar"
              />
            </div>
          </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {task ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskSubmissionDialog({ task, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    report: ""
  })
  const [submissionFiles, setSubmissionFiles] = useState([])

  // Reset files when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubmissionFiles([])
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      files: submissionFiles
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Submit Task</DialogTitle>
            <DialogDescription>
              Submit your completed work for &ldquo;{task?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report">Completion Report</Label>
              <Textarea
                id="report"
                value={formData.report}
                onChange={(e) => setFormData({ ...formData, report: e.target.value })}
                placeholder="Describe what was completed and any relevant details"
                rows={6}
                required
              />
            </div>

            {/* File Upload for Submission */}
            <div className="grid gap-2">
              <FileUpload
                files={submissionFiles}
                onFilesChange={setSubmissionFiles}
                label="Attach Supporting Documents (Optional)"
                description="Upload completed work, screenshots, reports, or other evidence of task completion"
                maxFiles={10}
                maxSize={25 * 1024 * 1024} // 25MB for submissions
                optional={true}
                acceptedTypes=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.zip,.rar"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskReviewDialog({ task, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    score: 7,
    feedback: ""
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
            <DialogTitle>Review Task</DialogTitle>
            <DialogDescription>
              Review and score the completed task &ldquo;{task?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="score">Score (1-10)</Label>
              <Select
                value={formData.score.toString()}
                onValueChange={(value) => setFormData({ ...formData, score: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select score" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(10)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1} - {i < 3 ? 'Poor' : i < 6 ? 'Fair' : i < 8 ? 'Good' : 'Excellent'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={formData.feedback}
                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                placeholder="Provide feedback on the task completion"
                rows={5}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Submit Review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TaskDetailModal({ task, isOpen, onClose, onEdit, onDelete, onUpdateStatus, onSubmit, onReview, canUserSubmit, canUserReview }) {
  const [submission, setSubmission] = useState(null)
  const [loadingSubmission, setLoadingSubmission] = useState(false)

  // Fetch submission details when task is pending_review and user is creator
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!task || !isOpen) {
        setSubmission(null)
        return
      }

      if (task.status === 'pending_review' && canUserReview(task)) {
        setLoadingSubmission(true)
        try {
          const response = await fetch(`http://localhost:8000/api/tasks/${task.id}/submission`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            setSubmission(data)
          }
        } catch (error) {
          console.error('Error fetching submission:', error)
        } finally {
          setLoadingSubmission(false)
        }
      } else {
        setSubmission(null)
      }
    }

    fetchSubmission()
  }, [task, isOpen, canUserReview])

  if (!task) return null

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'approved'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <Badge className={statusColors[task.status]}>
              {task.status}
            </Badge>
            <Badge className={urgencyColors[task.urgency || 'medium']}>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  task.urgency === 'urgent' ? 'bg-red-500' :
                  task.urgency === 'high' ? 'bg-orange-500' :
                  task.urgency === 'low' ? 'bg-gray-500' : 'bg-yellow-500'
                }`}></div>
                {task.urgency ? task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1) : 'Medium'}
              </div>
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">
                {task.description || 'No description provided'}
              </p>
            </div>

            {/* Assignees */}
            <div>
              <h3 className="font-semibold mb-2">Assignees</h3>
              <div className="space-y-2">
                {task.assignments && task.assignments.length > 0 ? (
                  task.assignments.map((assignment) => (
                    <div key={assignment.user_id} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Avatar>
                        <AvatarFallback>
                          {assignment.user_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{assignment.user_name}</p>
                        <p className="text-sm text-muted-foreground">{assignment.user_email}</p>
                      </div>
                      {task.team_head_id === assignment.user_id && (
                        <Badge variant="outline">Team Head</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No assignees</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Task Details */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Created By</h4>
                  <p className="text-sm">{task.creator_name || 'Unknown'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Created At</h4>
                  <p className="text-sm">{formatDate(task.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Due Date</h4>
                  <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                    {formatDate(task.due_date)}
                    {isOverdue && <span className="ml-2 text-xs">(Overdue)</span>}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Score</h4>
                  <div className="text-sm">
                    {task.score ? (
                      <div className="flex items-center gap-1">
                        <span>{task.score}/10</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not scored</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Task Documents */}
            {task.documents && task.documents.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Attached Documents ({task.documents.length})</h3>
                <div className="space-y-2">
                  {task.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Download document
                          const url = `http://localhost:8000/api/tasks/documents/${doc.id}/download`
                          const link = document.createElement('a')
                          link.href = url
                          link.download = doc.file_name
                          link.target = '_blank'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Details (for creator when task is pending_review) */}
            {task.status === 'pending_review' && canUserReview(task) && (
              <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                <h3 className="font-semibold mb-3 text-purple-900">Task Submission</h3>

                {loadingSubmission ? (
                  <div className="text-sm text-muted-foreground">Loading submission...</div>
                ) : submission ? (
                  <div className="space-y-4">
                    {/* Submission Report */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Completion Report</h4>
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{submission.report}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted by {submission.submitter_name} on {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Submitted Documents */}
                    {submission.documents && submission.documents.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Submitted Documents ({submission.documents.length})</h4>
                        <div className="space-y-2">
                          {submission.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-3 p-2 bg-white border rounded-lg hover:bg-muted/50">
                              <FileText className="h-4 w-4 text-purple-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Download document
                                  const url = `http://localhost:8000/api/tasks/documents/${doc.id}/download`
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = doc.file_name
                                  link.target = '_blank'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No submission details available</p>
                )}
              </div>
            )}

            {/* Feedback */}
            {task.feedback && (
              <div>
                <h3 className="font-semibold mb-2">Feedback</h3>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{task.feedback}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {/* Action buttons based on task status and user permissions */}
          {task.status === 'pending' && canUserSubmit(task) && (
            <Button onClick={() => {
              onUpdateStatus(task, 'ongoing')
              onClose()
            }}>
              Start Task
            </Button>
          )}

          {task.status === 'ongoing' && canUserSubmit(task) && (
            <Button onClick={() => {
              onSubmit(task)
              onClose()
            }}>
              <FileText className="mr-2 h-4 w-4" />
              Submit Task
            </Button>
          )}

          {task.status === 'pending_review' && canUserReview(task) && (
            <Button onClick={() => {
              onReview(task)
              onClose()
            }}>
              <Star className="mr-2 h-4 w-4" />
              Review Task
            </Button>
          )}

          {canUserReview(task) && (
            <>
              <Button variant="outline" onClick={() => {
                onEdit(task)
                onClose()
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => {
                onDelete(task)
                onClose()
              }}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TasksPage() {
  const { user } = useAuth()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [submittingTask, setSubmittingTask] = useState(null)
  const [reviewingTask, setReviewingTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [activeTab, setActiveTab] = useState("my-tasks")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [urgencyFilter, setUrgencyFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage] = useState(20)

  // Build params with filters
  const buildParams = (isMyTasks) => {
    const params = {
      page: activeTab === (isMyTasks ? 'my-tasks' : 'all-tasks') ? currentPage : 1,
      per_page: perPage,
      assigned_to_me: isMyTasks
    }

    // Add filters only if they have values other than "all" or empty
    if (statusFilter && statusFilter !== 'all' && statusFilter !== '') {
      params.status_filter = [statusFilter]
    }
    if (typeFilter && typeFilter !== 'all' && typeFilter !== '') {
      params.task_type = typeFilter
    }
    if (urgencyFilter && urgencyFilter !== 'all' && urgencyFilter !== '') {
      params.urgency_filter = urgencyFilter
    }

    return params
  }

  // Fetch tasks based on active tab
  const myTasksParams = buildParams(true)
  const allTasksParams = buildParams(false)

  const { data: myTasksData, isLoading: myTasksLoading } = useTasks(myTasksParams)
  const { data: allTasksData, isLoading: allTasksLoading } = useTasks(allTasksParams)

  // Use data based on active tab
  const isLoading = activeTab === 'my-tasks' ? myTasksLoading : allTasksLoading
  const taskData = activeTab === 'my-tasks' ? myTasksData : allTasksData
  const tasks = taskData?.tasks || []
  const totalTasks = taskData?.total || 0
  const totalPages = Math.ceil(totalTasks / perPage)

  // Reset to page 1 when switching tabs or changing filters
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, statusFilter, urgencyFilter, typeFilter])

  const createMutation = useCreateTask()
  const updateStatusMutation = useUpdateTaskStatus()
  const submitMutation = useSubmitTask()
  const reviewMutation = useReviewTask()
  const deleteMutation = useDeleteTask()
  console.log(tasks)

  const handleCreate = (data) => {
    createMutation.mutate(data)
  }

  const handleUpdateStatus = (task, status) => {
    updateStatusMutation.mutate({ id: task.id, status })
  }

  const handleSubmit = (data) => {
    if (submittingTask) {
      submitMutation.mutate({ id: submittingTask.id, ...data })
    }
  }

  const handleReview = (data) => {
    if (reviewingTask) {
      reviewMutation.mutate({ id: reviewingTask.id, ...data })
    }
  }

  const handleEdit = (task) => {
    setEditingTask(task)
    setIsFormOpen(true)
  }

  const handleDelete = (task) => {
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      deleteMutation.mutate(task.id)
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingTask(null)
    // Reset form will happen automatically when component unmounts/remounts
  }

  // Tasks are already filtered, sorted, and paginated by the backend
  // Get the actual task lists from each query
  const myTasksRaw = myTasksData?.tasks || []
  const allTasksRaw = allTasksData?.tasks || []

  // Apply client-side search filter
  const filterBySearch = (tasks) => {
    if (!searchTerm || searchTerm.trim() === '') return tasks

    const searchLower = searchTerm.toLowerCase()
    return tasks.filter(task => {
      // Search in title
      if (task.title?.toLowerCase().includes(searchLower)) return true
      // Search in description
      if (task.description?.toLowerCase().includes(searchLower)) return true
      // Search in assignee names
      if (task.assignments?.some(a => a.user_name?.toLowerCase().includes(searchLower))) return true
      return false
    })
  }

  const myTasks = filterBySearch(myTasksRaw)
  const allTasks = filterBySearch(allTasksRaw)

  const canUserSubmit = (task) => {
    const isAssigned = task.assignments?.some(assignment => assignment.user_id === user?.id)
    const isTeamHead = task.team_head_id === user?.id
    return isAssigned || isTeamHead
  }

  const canUserReview = (task) => {
    return task.created_by === user?.id
  }


  function TaskTable({ tasks, showActions = true }) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Assignees</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Score</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => {
                setSelectedTask(task)
                setIsTaskDetailOpen(true)
              }}
            >
              <TableCell>
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={urgencyColors[task.urgency || 'medium']}>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      task.urgency === 'urgent' ? 'bg-red-500' :
                      task.urgency === 'high' ? 'bg-orange-500' :
                      task.urgency === 'low' ? 'bg-gray-500' : 'bg-yellow-500'
                    }`}></div>
                    {task.urgency ? task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1) : 'Medium'}
                  </div>
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {task.type === 'individual' ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {task.assignments?.[0]?.user_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.assignments?.[0]?.user_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{task.assignments?.[0]?.user_email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {task.assignments?.slice(0, 3).map((assignment) => (
                          <Avatar key={assignment.user_id} className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {assignment.user_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignments && task.assignments.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs">+{task.assignments.length - 3}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.assignments?.length || 0} members</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {task.team_head_name && `Head: ${task.team_head_name}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[task.status]}>
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <div className={new Date(task.due_date) < new Date() && task.status !== 'approved' ? 'text-red-600' : ''}>
                  {new Date(task.due_date).toLocaleDateString()}
                </div>
              </TableCell>
              <TableCell>
                {task.score ? (
                  <div className="flex items-center gap-1">
                    <span>{task.score}/10</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {showActions && (
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedTask(task)
                        setIsTaskDetailOpen(true)
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {task.status === 'pending' && canUserSubmit(task) && (
                        <DropdownMenuItem onClick={() => handleUpdateStatus(task, 'ongoing')}>
                          Start Task
                        </DropdownMenuItem>
                      )}
                      {task.status === 'ongoing' && canUserSubmit(task) && (
                        <DropdownMenuItem onClick={() => {
                          setSubmittingTask(task)
                          setIsSubmissionOpen(true)
                        }}>
                          <FileText className="mr-2 h-4 w-4" />
                          Submit Task
                        </DropdownMenuItem>
                      )}
                      {task.status === 'pending_review' && canUserReview(task) && (
                        <DropdownMenuItem onClick={() => {
                          setReviewingTask(task)
                          setIsReviewOpen(true)
                        }}>
                          <Star className="mr-2 h-4 w-4" />
                          Review Task
                        </DropdownMenuItem>
                      )}
                      {canUserReview(task) && (
                        <DropdownMenuItem onClick={() => handleEdit(task)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canUserReview(task) && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(task)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground">
              Manage and track task assignments and progress
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks, assignees, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setUrgencyFilter("all")
                  setTypeFilter("all")
                }}
                className="whitespace-nowrap"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="STARTED">Started</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasksData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Assigned to me
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myTasksRaw.filter(t => t.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myTasksRaw.filter(t => t.status === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myTasksRaw.filter(t => t.score).length > 0
                ? (myTasksRaw.reduce((sum, t) => sum + (t.score || 0), 0) / myTasksRaw.filter(t => t.score).length).toFixed(1)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on completed tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-tasks">My Tasks ({myTasksData?.total || 0})</TabsTrigger>
          <PermissionGuard permission="task_view_all">
            <TabsTrigger value="all-tasks">All Tasks ({allTasksData?.total || 0})</TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="my-tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : myTasks.length > 0 ? (
                <>
                  <TaskTable tasks={myTasks} />
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalTasks)} of {totalTasks} tasks
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="text-sm">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                  <p className="text-muted-foreground mb-4">
                    You don&rsquo;t have any tasks yet.
                  </p>
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-tasks" className="space-y-4">
          <PermissionGuard permission="task_view_all">
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>All tasks in the system (requires task_view_all permission)</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : allTasks.length > 0 ? (
                  <>
                    <TaskTable tasks={allTasks} showActions={false} />
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalTasks)} of {totalTasks} tasks
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="text-sm">
                            Page {currentPage} of {totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                    <p className="text-muted-foreground">
                      No tasks have been created in the system yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskForm
        task={editingTask}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleCreate}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={isTaskDetailOpen}
        onClose={() => {
          setIsTaskDetailOpen(false)
          setSelectedTask(null)
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUpdateStatus={handleUpdateStatus}
        onSubmit={(task) => {
          setSubmittingTask(task)
          setIsSubmissionOpen(true)
        }}
        onReview={(task) => {
          setReviewingTask(task)
          setIsReviewOpen(true)
        }}
        canUserSubmit={canUserSubmit}
        canUserReview={canUserReview}
      />

      <TaskSubmissionDialog
        task={submittingTask}
        isOpen={isSubmissionOpen}
        onClose={() => {
          setIsSubmissionOpen(false)
          setSubmittingTask(null)
        }}
        onSubmit={handleSubmit}
      />

      <TaskReviewDialog
        task={reviewingTask}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false)
          setReviewingTask(null)
        }}
        onSubmit={handleReview}
      />
    </div>
  )
}