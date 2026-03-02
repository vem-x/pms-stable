"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  Users,
  Search,
  X,
  Tag,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CircleDot,
  MinusCircle,
  XCircle,
  CalendarDays,
  Filter,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { SearchableSelect } from "@/components/ui/searchable-select"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth, usePermission } from "@/lib/auth-context"
import {
  useGoals,
  useGoalsPaginated,
  useOrganizationsByLevel,
  useCreateGoal,
  useUpdateGoal,
  useUpdateGoalProgress,
  useUpdateGoalStatus,
  useDeleteGoal,
  useFreezeGoalsQuarter,
  useUnfreezeGoalsQuarter,
  useGoalFreezeLogs,
  useGoalTags,
  useCreateGoalTag,
  useUpdateGoalTag,
  useDeleteGoalTag,
  useFreezeGoal,
  useUnfreezeGoal,
  useOrganizations,
  useAssessGoal,
} from "@/lib/react-query"
import { Progress } from "@/components/ui/progress"

 

const STATUS_CONFIG = {
  ACTIVE:           { icon: CircleDot,    className: "text-sky-700 bg-sky-50 border-sky-200",             label: "Active" },
  COMPLETED:        { icon: CheckCircle2, className: "text-green-700 bg-green-50 border-green-300",        label: "Completed" },
  ACHIEVED:         { icon: CheckCircle2, className: "text-emerald-50 bg-emerald-700 border-emerald-700",  label: "Achieved" },
  DISCARDED:        { icon: MinusCircle,  className: "text-gray-500 bg-gray-50 border-gray-200",   label: "Discarded" },
  PENDING_APPROVAL: { icon: Clock,        className: "text-amber-700 bg-amber-50 border-amber-200", label: "Pending" },
  REJECTED:         { icon: XCircle,      className: "text-red-600 bg-red-50 border-red-200",      label: "Rejected" },
}

function GoalStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${config.className}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  )
}

const TYPE_CONFIG = {
  YEARLY:    { icon: Building2,    label: "Yearly" },
  QUARTERLY: { icon: CalendarDays, label: "Quarterly" },
}

function GoalTypeBadge({ type }) {
  const config = TYPE_CONFIG[type]
  if (!config) return null
  const Icon = config.icon
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border border-gray-300 text-gray-500 bg-transparent">
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  )
}


function OrganizationalGoalCard({ goal, onEdit, onDelete, onUpdateProgress, onStatusChange, onFreeze, onUnfreeze, canFreeze, onViewDetails }) {
  return (
    <Card
      className="relative cursor-pointer group flex flex-col h-full border-border/60 hover:border-border transition-colors duration-150"
      onClick={() => onViewDetails && onViewDetails(goal)}
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 break-words">
                    {goal.title}
                  </CardTitle>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm">
                  <p>{goal.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }} disabled={goal.frozen}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Goal
              </DropdownMenuItem>
              {goal.status === "ACTIVE" && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateProgress(goal); }} disabled={goal.frozen}>
                    <FileText className="mr-2 h-4 w-4" />
                    Update Progress
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(goal, "COMPLETED"); }} disabled={goal.frozen}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(goal, "DISCARDED"); }} disabled={goal.frozen}>
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Discard Goal
                  </DropdownMenuItem>
                </>
              )}
              {goal.status === "COMPLETED" && goal.scope === "INDIVIDUAL" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(goal, "ASSESS"); }}>
                    <Target className="mr-2 h-4 w-4" />
                    Assess KPIs
                  </DropdownMenuItem>
                </>
              )}
              {canFreeze && (
                <>
                  <DropdownMenuSeparator />
                  {goal.frozen ? (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnfreeze(goal); }}>
                      <Unlock className="mr-2 h-4 w-4" />
                      Unfreeze Goal
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFreeze(goal); }}>
                      <Lock className="mr-2 h-4 w-4" />
                      Freeze Goal
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(goal); }} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-1 mt-1">
          <GoalStatusBadge status={goal.status} />
          <GoalTypeBadge type={goal.type} />
          {goal.frozen && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 bg-slate-50">
              <Lock className="h-2.5 w-2.5" />Frozen
            </span>
          )}
          {goal.quarter && goal.year && goal.type === "QUARTERLY" && (
            <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
              {goal.quarter} {goal.year}
            </span>
          )}
          {goal.scope === "DEPARTMENTAL" && goal.organization_name && (
            <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {goal.organization_name}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 flex-1 flex flex-col pt-0 px-4 pb-4">
        {goal.description && (
          <div className="text-xs text-gray-600 line-clamp-2 break-words"
               dangerouslySetInnerHTML={{ __html: goal.description }} />
        )}

        {goal.tags && goal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {goal.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs px-1.5 py-0 max-w-[100px]"
                style={{
                  borderColor: tag.color,
                  color: tag.color,
                  backgroundColor: `${tag.color}15`
                }}
              >
                <span className="truncate">{tag.name}</span>
              </Badge>
            ))}
            {goal.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{goal.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {(goal.start_date || goal.end_date) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-1.5 border-t">
            {goal.start_date && (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{new Date(goal.start_date).toLocaleDateString()}</span>
              </div>
            )}
            {goal.end_date && (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate text-right">Due: {new Date(goal.end_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {goal.scope === "INDIVIDUAL" && goal.owner_name && (
          <div className="flex items-center gap-2 pt-2 mt-auto border-t">
            <Avatar className="h-5 w-5 flex-shrink-0">
              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-medium">
                {goal.owner_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{goal.owner_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GoalTableView({ goals, onEdit, onDelete, onUpdateProgress, onStatusChange, onFreeze, onUnfreeze, canFreeze, onViewDetails }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Title</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Type</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Scope</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Assigned To</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Period</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Progress</th>
            <th className="text-left py-3 px-3 font-medium text-muted-foreground">End Date</th>
            <th className="py-3 px-3" />
          </tr>
        </thead>
        <tbody>
          {goals.map((goal) => (
            <tr
              key={goal.id}
              className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
              onClick={() => onViewDetails && onViewDetails(goal)}
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  {goal.frozen && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                  <span className="font-medium line-clamp-1">{goal.title}</span>
                </div>
                {goal.tags && goal.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {goal.tags.slice(0, 2).map(tag => (
                      <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded border"
                        style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                        {tag.name}
                      </span>
                    ))}
                    {goal.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{goal.tags.length - 2}</span>}
                  </div>
                )}
              </td>
              <td className="py-3 px-3">
                <GoalTypeBadge type={goal.type} />
              </td>
              <td className="py-3 px-3">
                <span className="text-xs text-muted-foreground">
                  {goal.scope === "COMPANY_WIDE" ? "Company-wide" : goal.organization_name || goal.scope}
                </span>
              </td>
              <td className="py-3 px-3">
                {goal.scope === "INDIVIDUAL" && goal.owner_name ? (
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-medium">
                        {goal.owner_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-foreground">{goal.owner_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-3 px-3">
                <GoalStatusBadge status={goal.status} />
              </td>
              <td className="py-3 px-3 text-muted-foreground">
                {goal.quarter && goal.year ? `${goal.quarter} ${goal.year}` : goal.year || "—"}
              </td>
              <td className="py-3 px-3">
                <span className="text-xs font-medium">{goal.progress_percentage || 0}%</span>
              </td>
              <td className="py-3 px-3 text-muted-foreground text-xs">
                {goal.end_date ? new Date(goal.end_date).toLocaleDateString() : "—"}
              </td>
              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(goal)} disabled={goal.frozen}>
                      <Edit className="mr-2 h-4 w-4" />Edit
                    </DropdownMenuItem>
                    {goal.status === "ACTIVE" && (
                      <>
                        <DropdownMenuItem onClick={() => onUpdateProgress(goal)} disabled={goal.frozen}>
                          <FileText className="mr-2 h-4 w-4" />Update Progress
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onStatusChange(goal, "COMPLETED")} disabled={goal.frozen}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />Mark as Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStatusChange(goal, "DISCARDED")} disabled={goal.frozen}>
                          <AlertCircle className="mr-2 h-4 w-4" />Discard
                        </DropdownMenuItem>
                      </>
                    )}
                    {goal.status === "COMPLETED" && goal.scope === "INDIVIDUAL" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onStatusChange(goal, "ASSESS")}>
                          <Target className="mr-2 h-4 w-4" />Assess KPIs
                        </DropdownMenuItem>
                      </>
                    )}
                    {canFreeze && (
                      <>
                        <DropdownMenuSeparator />
                        {goal.frozen
                          ? <DropdownMenuItem onClick={() => onUnfreeze(goal)}><Unlock className="mr-2 h-4 w-4" />Unfreeze</DropdownMenuItem>
                          : <DropdownMenuItem onClick={() => onFreeze(goal)}><Lock className="mr-2 h-4 w-4" />Freeze</DropdownMenuItem>
                        }
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(goal)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrganizationalGoalForm({ goal, isOpen, onClose, onSubmit }) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = `Q${Math.ceil(currentMonth / 3)}`

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scope: "COMPANY_WIDE",
    type: "QUARTERLY",
    kpis: [],
    difficulty_level: 3,
    quarter: currentQuarter,
    year: currentYear,
    start_date: "",
    end_date: "",
    parent_goal_id: "",
    tag_ids: [],
    organization_id: "",
  })

  const { data: goals = [] } = useGoals()
  const { data: tags = [] } = useGoalTags()
  const { data: organizations = [] } = useOrganizations()

  // Update form data when goal changes
  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || "",
        description: goal.description || "",
        scope: goal.scope || "COMPANY_WIDE",
        type: goal.type || "QUARTERLY",
        kpis: Array.isArray(goal.kpis)
          ? goal.kpis.map(k => typeof k === "string"
              ? { id: crypto.randomUUID(), description: k, target_value: "", target_unit: "%" }
              : { id: k.id || crypto.randomUUID(), description: k.description || "", target_value: k.target_value ?? "", target_unit: k.target_unit || "%" }
            )
          : [],
        difficulty_level: goal.difficulty_level || 3,
        quarter: goal.quarter || currentQuarter,
        year: goal.year || currentYear,
        start_date: goal.start_date || "",
        end_date: goal.end_date || "",
        parent_goal_id: goal.parent_goal_id || "",
        tag_ids: goal.tags?.map(t => t.id) || [],
        organization_id: goal.organization_id || "",
      })
    } else {
      // Reset form when creating new goal
      setFormData({
        title: "",
        description: "",
        scope: "COMPANY_WIDE",
        type: "QUARTERLY",
        kpis: [],
        difficulty_level: 3,
        quarter: currentQuarter,
        year: currentYear,
        start_date: "",
        end_date: "",
        parent_goal_id: "",
        tag_ids: [],
        organization_id: "",
      })
    }
  }, [goal, currentQuarter, currentYear])

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...formData,
      kpis: formData.kpis.map(k => ({
        ...k,
        target_value: k.target_value !== "" && k.target_value !== null && k.target_value !== undefined
          ? parseFloat(k.target_value)
          : null,
      })),
    }
    onSubmit(payload)
    onClose()
  }

  const potentialParents = goals.filter((g) => {
    if (goal && g.id === goal.id) return false
    // Yearly company-wide goals can link to other yearly company-wide goals
    if (formData.scope === "COMPANY_WIDE" && formData.type === "YEARLY") {
      return g.scope === "COMPANY_WIDE" && g.type === "YEARLY"
    }
    // Quarterly company-wide goals can link to yearly company-wide goals
    if (formData.scope === "COMPANY_WIDE" && formData.type === "QUARTERLY") {
      return g.scope === "COMPANY_WIDE" && g.type === "YEARLY"
    }
    // Departmental goals can link to any company-wide goal
    if (formData.scope === "DEPARTMENTAL") {
      return g.scope === "COMPANY_WIDE"
    }
    // Individual goals can link to departmental or company-wide goals
    if (formData.scope === "INDIVIDUAL") {
      return g.scope === "COMPANY_WIDE" || g.scope === "DEPARTMENTAL"
    }
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
              <Label htmlFor="title">Goal Title <span className="text-red-500">*</span></Label>
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
              <RichTextEditor
                content={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                placeholder="Describe what this goal aims to achieve..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scope">Goal Scope <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value) => setFormData({ ...formData, scope: value, parent_goal_id: "", organization_id: "" })}
                  disabled={!!goal}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY_WIDE">Company-Wide</SelectItem>
                    <SelectItem value="DEPARTMENTAL">Departmental</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Time Period <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    type: value,
                    parent_goal_id: "",
                    // Clear quarter and year when switching to YEARLY
                    quarter: value === "YEARLY" ? "" : formData.quarter,
                    year: value === "YEARLY" ? "" : formData.year
                  })}
                  disabled={!!goal}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            {formData.type === "QUARTERLY" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quarter">Quarter <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.quarter}
                    onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label htmlFor="year">Year <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => {
                        const year = currentYear - 1 + i
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formData.scope === "DEPARTMENTAL" && (
              <div className="grid gap-2">
                <Label htmlFor="organization">Department/Directorate <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={formData.organization_id}
                  onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                  options={organizations.map((org) => ({
                    value: org.id,
                    label: `${org.name} (${org.level})`
                  }))}
                  placeholder="Search for department or directorate..."
                  emptyMessage="No organizations found"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date <span className="text-red-500">*</span></Label>
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
              <div className="flex items-center justify-between">
                <div>
                  <Label>KPIs <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Each KPI needs a description and a numeric target so it can be scored.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({
                    ...formData,
                    kpis: [...formData.kpis, { id: crypto.randomUUID(), description: "", target_value: "", target_unit: "%" }]
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add KPI
                </Button>
              </div>
              <div className="space-y-3">
                {formData.kpis.length === 0 && (
                  <p className="text-sm text-muted-foreground italic py-2">No KPIs added yet. At least one KPI is required.</p>
                )}
                {formData.kpis.map((kpi, index) => (
                  <div key={kpi.id || index} className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">KPI #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          const newKpis = formData.kpis.filter((_, i) => i !== index)
                          setFormData({ ...formData, kpis: newKpis })
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      value={kpi.description}
                      onChange={(e) => {
                        const newKpis = [...formData.kpis]
                        newKpis[index] = { ...newKpis[index], description: e.target.value }
                        setFormData({ ...formData, kpis: newKpis })
                      }}
                      placeholder="e.g. Increase social media engagement rate"
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={kpi.target_value}
                          onChange={(e) => {
                            const newKpis = [...formData.kpis]
                            newKpis[index] = { ...newKpis[index], target_value: e.target.value }
                            setFormData({ ...formData, kpis: newKpis })
                          }}
                          placeholder="Target value (e.g. 30)"
                          className="text-sm"
                        />
                      </div>
                      <div className="w-36">
                        <Select
                          value={kpi.target_unit || "%"}
                          onValueChange={(value) => {
                            const newKpis = [...formData.kpis]
                            newKpis[index] = { ...newKpis[index], target_unit: value }
                            setFormData({ ...formData, kpis: newKpis })
                          }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="%">% (Percent)</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="NGN">NGN (Naira)</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="score">Score</SelectItem>
                            <SelectItem value="km">Km</SelectItem>
                            <SelectItem value="units">Units</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Select
                value={formData.tag_ids.length > 0 ? "multi" : "none"}
                onValueChange={() => {}}
              >
                <SelectTrigger>
                  <SelectValue>
                    {formData.tag_ids.length > 0
                      ? `${formData.tag_ids.length} tag(s) selected`
                      : "Select tags..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 space-y-2">
                    {tags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`tag-${tag.id}`}
                          checked={formData.tag_ids.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                tag_ids: [...formData.tag_ids, tag.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                tag_ids: formData.tag_ids.filter(id => id !== tag.id)
                              })
                            }
                          }}
                          className="h-4 w-4 cursor-pointer"
                        />
                        <label
                          htmlFor={`tag-${tag.id}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </label>
                      </div>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-sm text-gray-500">No tags available. Create tags in the Tags Management tab.</p>
                    )}
                  </div>
                </SelectContent>
              </Select>
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

function AssessGoalDialog({ goal, isOpen, onClose, onSubmit }) {
  const kpis = Array.isArray(goal?.kpis) ? goal.kpis : []

  // Local state: map kpi.id → { actual_value }
  const [actuals, setActuals] = useState({})

  useEffect(() => {
    if (goal) {
      const init = {}
      kpis.forEach(k => {
        init[k.id] = {
          actual_value: k.actual_value ?? "",
        }
      })
      setActuals(init)
    }
  }, [goal])

  const handleSubmit = (e) => {
    e.preventDefault()
    const kpi_assessments = kpis
      .filter(k => actuals[k.id]?.actual_value !== "" && actuals[k.id]?.actual_value !== null && actuals[k.id]?.actual_value !== undefined)
      .map(k => ({
        id: k.id,
        actual_value: parseFloat(actuals[k.id].actual_value),
      }))
    onSubmit({ kpi_assessments })
    onClose()
  }

  const allFilled = kpis.length > 0 && kpis.every(k => {
    const v = actuals[k.id]?.actual_value
    return v !== "" && v !== null && v !== undefined
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] flex flex-col gap-0 p-0 max-h-[90vh]">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Assess Goal KPIs
          </DialogTitle>
          <DialogDescription>
            Enter the actual value achieved for each KPI. The goal will be marked as Achieved once all KPIs are assessed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              All initiatives linked to this goal must be completed before submitting the assessment.
              Score ≥ 80% → <strong>Achieved</strong>. Score &lt; 80% → <strong>Completed</strong>.
            </div>
            {kpis.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                This goal has no KPIs. The assessment will mark it as Achieved directly.
              </p>
            )}
            {kpis.map((kpi, index) => (
              <div key={kpi.id} className="rounded-md border border-border bg-muted/20 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">{kpi.description}</p>
                  {kpi.target_value !== null && kpi.target_value !== undefined ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Target: <strong>{kpi.target_value} {kpi.target_unit}</strong>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-0.5">⚠ No target set — enter actual value only</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Actual value <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={actuals[kpi.id]?.actual_value ?? ""}
                        onChange={(e) => setActuals(prev => ({
                          ...prev,
                          [kpi.id]: { ...prev[kpi.id], actual_value: e.target.value }
                        }))}
                        placeholder="Enter actual"
                        className="text-sm"
                        required
                      />
                      {kpi.target_unit && (
                        <span className="text-sm text-muted-foreground w-12 flex-shrink-0">{kpi.target_unit}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={kpis.length > 0 && !allFilled}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Submit Assessment
            </Button>
          </div>
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

function ProgressUpdateDialog({ goal, isOpen, onClose, onSubmit, initialPercentage }) {
  const [formData, setFormData] = useState({
    new_percentage: goal?.progress_percentage || 0,
    report: "",
    kpiActuals: {},
  })
  const [kpiError, setKpiError] = useState("")

  // Reset when goal changes
  useEffect(() => {
    if (goal) {
      const init = {}
      goal.kpis?.forEach(k => {
        init[k.id] = { actual_value: k.actual_value ?? '' }
      })
      setFormData({
        new_percentage: initialPercentage ?? goal.progress_percentage ?? 0,
        report: "",
        kpiActuals: init,
      })
      setKpiError("")
    }
  }, [goal?.id])

  const hasKpis = (goal?.kpis?.length ?? 0) > 0
  const is100 = formData.new_percentage === 100
  const isMarkComplete = !!goal?._targetStatus

  const calcKpiScore = (kpi) => {
    const actual = parseFloat(formData.kpiActuals[kpi.id]?.actual_value)
    if (isNaN(actual) || !kpi.target_value) return null
    return (Math.min(actual / kpi.target_value, 1) * 5).toFixed(2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (is100 && hasKpis) {
      const unfilled = goal.kpis.filter(k => {
        const val = formData.kpiActuals[k.id]?.actual_value
        return val === '' || val === null || val === undefined
      })
      if (unfilled.length > 0) {
        setKpiError(`Please enter actual values for all ${unfilled.length} KPI(s) before marking as complete.`)
        return
      }
    }
    setKpiError("")
    const payload = {
      new_percentage: formData.new_percentage,
      report: formData.report,
    }
    if (is100 && hasKpis) {
      payload.kpi_assessments = (goal?.kpis || []).map(k => ({
        id: k.id,
        actual_value: parseFloat(formData.kpiActuals[k.id]?.actual_value) || 0,
      }))
    }
    onSubmit(payload)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Goal Progress</DialogTitle>
            <DialogDescription>
              Update the progress for &quot;{goal?.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="grid gap-3">
              <Label htmlFor="percentage">Progress Percentage</Label>
              <div className="space-y-2">
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.new_percentage}
                  onChange={(e) => !isMarkComplete && setFormData({ ...formData, new_percentage: parseInt(e.target.value) || 0 })}
                  readOnly={isMarkComplete}
                  className={isMarkComplete ? "bg-muted cursor-not-allowed" : ""}
                  required
                />
                <Progress value={formData.new_percentage} className="h-2" />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="report">Progress Report <span className="text-red-500">*</span></Label>
              <Textarea
                id="report"
                value={formData.report}
                onChange={(e) => setFormData({ ...formData, report: e.target.value })}
                placeholder="Explain the progress made..."
                rows={3}
                required
              />
            </div>

            {is100 && hasKpis && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-t pt-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">KPI Actuals</Label>
                  <span className="text-xs text-muted-foreground">(required to complete)</span>
                </div>
                {goal.kpis.map(kpi => {
                  const score = calcKpiScore(kpi)
                  return (
                    <div key={kpi.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-foreground">{kpi.description}</p>
                      {kpi.target_value != null && (
                        <p className="text-[11px] text-muted-foreground">
                          Target: {kpi.target_value}{kpi.target_unit ? ` ${kpi.target_unit}` : ''}
                        </p>
                      )}
                      <Input
                          type="number"
                          step="any"
                          value={formData.kpiActuals[kpi.id]?.actual_value ?? ''}
                          onChange={(e) => {
                            setKpiError("")
                            setFormData(prev => ({
                              ...prev,
                              kpiActuals: {
                                ...prev.kpiActuals,
                                [kpi.id]: { ...prev.kpiActuals[kpi.id], actual_value: e.target.value }
                              }
                            }))
                          }}
                          placeholder="Actual value"
                          className="h-8 text-sm"
                        />
                    </div>
                  )
                })}
                {kpiError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {kpiError}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isMarkComplete ? "Mark as Complete" : "Update Progress"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TagManagementDialog({ tag, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    color: "#6B7280",
    description: "",
  })

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name || "",
        color: tag.color || "#6B7280",
        description: tag.description || "",
      })
    } else {
      setFormData({
        name: "",
        color: "#6B7280",
        description: "",
      })
    }
  }, [tag])

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
            <DialogTitle>{tag ? "Edit Tag" : "Create Tag"}</DialogTitle>
            <DialogDescription>
              {tag ? "Update the tag details" : "Create a new tag for categorizing goals"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Infrastructure, Strategy"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tag-color">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="tag-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                  required
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6B7280"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  required
                />
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: formData.color }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tag-description">Description (Optional)</Label>
              <Textarea
                id="tag-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when to use this tag..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{tag ? "Update Tag" : "Create Tag"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TagCard({ tag, onEdit, onDelete }) {
  return (
    <Card className="group hover:border-border transition-colors duration-150">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div
              className="w-12 h-12 rounded-lg border-2 flex items-center justify-center"
              style={{ borderColor: tag.color, backgroundColor: `${tag.color}20` }}
            >
              <Tag className="h-6 w-6" style={{ color: tag.color }} />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-semibold text-base">{tag.name}</h3>
              {tag.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{tag.description}</p>
              )}
              <Badge
                variant="outline"
                className="mt-2"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.color}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tag)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Tag
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(tag)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Tag
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GoalsManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFreezeOpen, setIsFreezeOpen] = useState(false)
  const [isUnfreezeOpen, setIsUnfreezeOpen] = useState(false)
  const [isProgressOpen, setIsProgressOpen] = useState(false)
  const [isAssessOpen, setIsAssessOpen] = useState(false)
  const [assessingGoal, setAssessingGoal] = useState(null)
  const [isTagFormOpen, setIsTagFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [updatingGoal, setUpdatingGoal] = useState(null)
  const [viewingGoal, setViewingGoal] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [activeTab, setActiveTab] = useState("goals")
  const [searchTerm, setSearchTerm] = useState("")
  const [tagFilter, setTagFilter] = useState("all")
  const [goalTypeFilter, setGoalTypeFilter] = useState("")        // "" | "YEARLY" | "QUARTERLY"
  const [yearFilter, setYearFilter] = useState("all")
  const [quarterFilter, setQuarterFilter] = useState("all")
  const [scopeFilter, setScopeFilter] = useState("COMPANY_WIDE")
  const [selectedDirectorate, setSelectedDirectorate] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedUnit, setSelectedUnit] = useState("")
  const [viewMode, setViewMode] = useState("card")

  const router = useRouter()
  const searchParams = useSearchParams()
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))

  const setPage = (newPage) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", String(newPage))
    router.push(`?${params.toString()}`)
  }

  const resetPage = () => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1")
    router.replace(`?${params.toString()}`)
  }

  const { user } = useAuth()
  const canCreateYearly = usePermission("goal_create_yearly")
  const canCreateQuarterly = usePermission("goal_create_quarterly")
  const canFreezeGoals = usePermission("goal_freeze")
  const canEditGoals = usePermission("goal_edit")
  const canUpdateProgress = usePermission("goal_progress_update")

  const canCreateOrganizationalGoals = canCreateYearly || canCreateQuarterly

  
  const apiParams = useMemo(() => {
    const params = { page, per_page: 10 }
    if (scopeFilter) params.scope = scopeFilter
    if (goalTypeFilter) params.goal_type = goalTypeFilter
    if (selectedUnit) params.organization_id = selectedUnit
    else if (selectedDepartment) params.organization_id = selectedDepartment
    else if (selectedDirectorate) params.organization_id = selectedDirectorate
    return params
  }, [page, scopeFilter, goalTypeFilter, selectedDirectorate, selectedDepartment, selectedUnit])

 
  const { data: goalsResponse, isLoading } = useGoalsPaginated(apiParams)
  const { data: freezeLogs = [] } = useGoalFreezeLogs()
  const { data: tags = [], isLoading: isTagsLoading } = useGoalTags()
  const { data: orgByLevel = { directorates: [], departments: [], units: [] } } = useOrganizationsByLevel()
  const createMutation = useCreateGoal()
  const updateMutation = useUpdateGoal()
  const updateProgressMutation = useUpdateGoalProgress()
  const updateStatusMutation = useUpdateGoalStatus()
  const assessMutation = useAssessGoal()
  const deleteMutation = useDeleteGoal()
  const freezeMutation = useFreezeGoalsQuarter()
  const unfreezeMutation = useUnfreezeGoalsQuarter()
  const freezeGoalMutation = useFreezeGoal()
  const unfreezeGoalMutation = useUnfreezeGoal()
  const createTagMutation = useCreateGoalTag()
  const updateTagMutation = useUpdateGoalTag()
  const deleteTagMutation = useDeleteGoalTag()

  const goalsPage = goalsResponse?.goals || []
  // Derive pagination — handle different backend field name conventions
  const apiTotal = goalsResponse?.total ?? goalsResponse?.count ?? goalsResponse?.pagination?.total ?? 0
  const apiTotalPages = goalsResponse?.total_pages ?? goalsResponse?.pages
    ?? goalsResponse?.pagination?.total_pages
    ?? (apiTotal > 0 ? Math.ceil(apiTotal / 10) : 1)

  // Derive org lists with dependency chain
  // divisions is the level between department and unit (DIVISION level)
  const { directorates, departments: allDepartments, divisions: allDivisions = [], units: allUnits } = orgByLevel

  const filteredDepartments = selectedDirectorate
    ? allDepartments.filter(d => d.parent_id === selectedDirectorate)
    : allDepartments

  // Divisions sit under departments
  const filteredDivisions = selectedDepartment
    ? allDivisions.filter(d => d.parent_id === selectedDepartment)
    : selectedDirectorate
      ? allDivisions.filter(d => filteredDepartments.some(dep => dep.id === d.parent_id))
      : allDivisions

  // Units sit under divisions (if any) or directly under departments
  const filteredUnits = selectedDepartment
    ? allUnits.filter(u => u.parent_id === selectedDepartment || filteredDivisions.some(d => d.id === u.parent_id))
    : selectedDirectorate
      ? allUnits.filter(u => filteredDepartments.some(d => d.id === u.parent_id) || filteredDivisions.some(d => d.id === u.parent_id))
      : allUnits

  // Client-side post-filters (year, quarter, tag, search — not available as API params)
  const organizationalGoals = useMemo(() => {
    let filtered = goalsPage
    if (yearFilter !== "all") filtered = filtered.filter(g => g.year?.toString() === yearFilter)
    if (quarterFilter !== "all") filtered = filtered.filter(g => g.quarter === quarterFilter)
    if (tagFilter !== "all") filtered = filtered.filter(g => g.tags?.some(t => t.id === tagFilter))
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(g =>
        g.title?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [goalsPage, yearFilter, quarterFilter, tagFilter, searchTerm])

  // Redirect if no permissions
  if (!canCreateOrganizationalGoals && !canFreezeGoals) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Shield className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
      </div>
    )
  }

  // Year range options for client-side filter
  const currentYear = new Date().getFullYear()
  const yearOptions = [
    { value: "all", label: "All Years" },
    ...Array.from({ length: 6 }, (_, i) => currentYear - 1 + i)
      .map(y => ({ value: String(y), label: String(y) }))
      .reverse(),
  ]
  const quarterOptions = [
    { value: "all", label: "All Quarters" },
    { value: "Q1", label: "Q1 (Jan–Mar)" },
    { value: "Q2", label: "Q2 (Apr–Jun)" },
    { value: "Q3", label: "Q3 (Jul–Sep)" },
    { value: "Q4", label: "Q4 (Oct–Dec)" },
  ]

  const handleCreate = (data) => {
    const submitData = {
      ...data,
      parent_goal_id: data.parent_goal_id === "" ? null : data.parent_goal_id,
      organization_id: data.organization_id === "" ? null : data.organization_id,
    }

    // Don't send quarter/year for YEARLY goals
    if (data.type === "YEARLY") {
      delete submitData.quarter
      delete submitData.year
    }

    createMutation.mutate(submitData)
  }

  const handleUpdate = (data) => {
    if (editingGoal) {
      const submitData = {
        id: editingGoal.id,
        ...data,
        parent_goal_id: data.parent_goal_id === "" ? null : data.parent_goal_id,
        organization_id: data.organization_id === "" ? null : data.organization_id,
      }

      // Don't send quarter/year for YEARLY goals
      if (data.type === "YEARLY") {
        delete submitData.quarter
        delete submitData.year
      }

      updateMutation.mutate(submitData)
    }
  }

  const handleUpdateProgress = (data) => {
    if (updatingGoal) {
      updateProgressMutation.mutate({ id: updatingGoal.id, ...data })
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
    if (status === "ASSESS") {
      // Open the KPI assessment dialog (supervisor enters actuals on a COMPLETED individual goal)
      setAssessingGoal(goal)
      setIsAssessOpen(true)
    } else if (status === "COMPLETED") {
      // Open progress dialog at 100% so KPI actuals can be entered before marking complete
      setUpdatingGoal({ ...goal, _targetStatus: "COMPLETED" })
      setIsProgressOpen(true)
    } else {
      updateStatusMutation.mutate({ id: goal.id, status })
    }
  }

  const handleAssess = (data) => {
    assessMutation.mutate({ id: assessingGoal.id, ...data })
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

  const handleTagCreate = (data) => {
    createTagMutation.mutate(data)
  }

  const handleTagUpdate = (data) => {
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, ...data })
    }
  }

  const handleTagEdit = (tag) => {
    setEditingTag(tag)
    setIsTagFormOpen(true)
  }

  const handleTagDelete = (tag) => {
    if (confirm(`Are you sure you want to delete the tag "${tag.name}"? This will remove the tag from all associated goals.`)) {
      deleteTagMutation.mutate(tag.id)
    }
  }

  const handleFreezeGoal = (goal) => {
    if (confirm(`Are you sure you want to freeze "${goal.title}"? This will prevent any edits until unfrozen.`)) {
      freezeGoalMutation.mutate({ id: goal.id })
    }
  }

  const handleUnfreezeGoal = (goal) => {
    if (confirm(`Are you sure you want to unfreeze "${goal.title}"? This will allow edits again.`)) {
      unfreezeGoalMutation.mutate({ id: goal.id })
    }
  }

  const handleViewDetails = (goal) => {
    setViewingGoal(goal)
    setIsDetailOpen(true)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Goals Management</h1>
            <p className="text-base text-muted-foreground">
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
            Goals
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags Management
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Freeze Logs
          </TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">

          {/* ── Action bar ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {canFreezeGoals && (
                <>
                  <Button onClick={() => setIsFreezeOpen(true)} size="sm" variant="outline" className="h-8">
                    <Lock className="mr-1.5 h-3.5 w-3.5" />Freeze
                  </Button>
                  <Button onClick={() => setIsUnfreezeOpen(true)} size="sm" variant="outline" className="h-8">
                    <Unlock className="mr-1.5 h-3.5 w-3.5" />Unfreeze
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Card / Table toggle — styled like a tab strip, no primary color */}
              <div className="inline-flex items-center bg-muted rounded-md p-0.5 gap-0.5">
                <button
                  onClick={() => setViewMode("card")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === "card"
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === "table"
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />Table
                </button>
              </div>
              {canCreateOrganizationalGoals && (
                <Button onClick={() => setIsFormOpen(true)} size="sm" className="h-8">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Create Goal
                </Button>
              )}
            </div>
          </div>

          {/* ── Filter panel ──────────────────────────────────────────────── */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3 w-3" />Filters
            </div>

            {/* Row 1: Scope + Org hierarchy */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">

              {/* Scope */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Scope</label>
                <div className="flex items-center gap-1">
                  {[
                    { value: "COMPANY_WIDE", label: "Company-wide" },
                    { value: "DEPARTMENTAL", label: "Departmental" },
                    { value: "INDIVIDUAL",   label: "Individual" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setScopeFilter(opt.value)
                        setSelectedDirectorate("")
                        setSelectedDepartment("")
                        setSelectedUnit("")
                        resetPage()
                      }}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        scopeFilter === opt.value
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 bg-background"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Directorate */}
              {directorates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Directorate</label>
                  <Select
                    value={selectedDirectorate || "all"}
                    onValueChange={(v) => {
                      setSelectedDirectorate(v === "all" ? "" : v)
                      setSelectedDepartment("")
                      setSelectedUnit("")
                      resetPage()
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="All directorates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All directorates</SelectItem>
                      {directorates.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Department — always shown when scope is Departmental or Individual */}
              {(scopeFilter === "DEPARTMENTAL" || scopeFilter === "INDIVIDUAL") && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Department</label>
                  <Select
                    value={selectedDepartment || "all"}
                    onValueChange={(v) => {
                      setSelectedDepartment(v === "all" ? "" : v)
                      setSelectedUnit("")
                      resetPage()
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {filteredDepartments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Unit — shown when a department is selected */}
              {selectedDepartment && filteredUnits.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Unit</label>
                  <Select
                    value={selectedUnit || "all"}
                    onValueChange={(v) => { setSelectedUnit(v === "all" ? "" : v); resetPage() }}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="All units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All units</SelectItem>
                      {filteredUnits.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Row 2: Type + Year + Quarter + Tag + Search */}
            <div className="flex flex-wrap gap-x-4 gap-y-3 items-end pt-1 border-t border-border/40">

              {/* Goal type */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Type</label>
                <div className="flex items-center gap-1">
                  {[
                    { value: "", label: "All" },
                    { value: "YEARLY", label: "Yearly" },
                    { value: "QUARTERLY", label: "Quarterly" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setGoalTypeFilter(opt.value); resetPage() }}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                        goalTypeFilter === opt.value
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 bg-background"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year — client-side */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Year</label>
                <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); resetPage() }}>
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Quarter — client-side, only useful when type = QUARTERLY */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Quarter</label>
                <Select value={quarterFilter} onValueChange={(v) => { setQuarterFilter(v); resetPage() }}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Tag */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Tag</label>
                <SearchableSelect
                  value={tagFilter}
                  onValueChange={setTagFilter}
                  options={[{ value: "all", label: "All Tags" }, ...tags.map(t => ({ value: t.id, label: t.name }))]}
                  placeholder="All Tags"
                  searchPlaceholder="Search tags..."
                  emptyText="No tags found."
                  className="w-[140px]"
                />
              </div>

              {/* Search */}
              <div className="space-y-1.5 flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search goals…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Clear all */}
              {(searchTerm || tagFilter !== "all" || goalTypeFilter || yearFilter !== "all" || quarterFilter !== "all"
                || selectedDirectorate || selectedDepartment || selectedUnit || scopeFilter !== "COMPANY_WIDE") && (
                <div className="space-y-1.5">
                  <label className="text-xs opacity-0 select-none">.</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchTerm(""); setTagFilter("all"); setGoalTypeFilter("")
                      setYearFilter("all"); setQuarterFilter("all")
                      setScopeFilter("COMPANY_WIDE")
                      setSelectedDirectorate(""); setSelectedDepartment(""); setSelectedUnit("")
                      resetPage()
                    }}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />Clear all
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {apiTotal > 0 ? `${apiTotal} goals` : "Goals"}
                </CardTitle>
                {apiTotalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {apiTotalPages}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                viewMode === "card" ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                )
              ) : organizationalGoals.length > 0 ? (
                <div className="space-y-5">
                  {viewMode === "card" ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {organizationalGoals.map((goal) => (
                        <OrganizationalGoalCard
                          key={goal.id}
                          goal={goal}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onUpdateProgress={handleUpdateProgressDialog}
                          onStatusChange={handleStatusChange}
                          onFreeze={handleFreezeGoal}
                          onUnfreeze={handleUnfreezeGoal}
                          onViewDetails={handleViewDetails}
                          canFreeze={canFreezeGoals}
                        />
                      ))}
                    </div>
                  ) : (
                    <GoalTableView
                      goals={organizationalGoals}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onUpdateProgress={handleUpdateProgressDialog}
                      onStatusChange={handleStatusChange}
                      onFreeze={handleFreezeGoal}
                      onUnfreeze={handleUnfreezeGoal}
                      onViewDetails={handleViewDetails}
                      canFreeze={canFreezeGoals}
                    />
                  )}

                  {apiTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {apiTotalPages} — {apiTotal} goals total
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: apiTotalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === apiTotalPages || Math.abs(p - page) <= 1)
                          .reduce((acc, p, idx, arr) => {
                            if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…")
                            acc.push(p)
                            return acc
                          }, [])
                          .map((item, idx) =>
                            typeof item === "string" ? (
                              <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                            ) : (
                              <Button
                                key={item}
                                variant={page === item ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPage(item)}
                                className="h-8 w-8 p-0 text-xs"
                              >
                                {item}
                              </Button>
                            )
                          )
                        }
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page >= apiTotalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No goals found</h3>
                  <p className="text-muted-foreground mb-4">
                    {scopeFilter === "COMPANY_WIDE"
                      ? "No company-wide goals yet. Create one to get started."
                      : scopeFilter === "DEPARTMENTAL"
                        ? selectedDepartment ? "No goals for this department." : "No departmental goals found."
                        : "No goals found for this scope."}
                  </p>
                  {canCreateOrganizationalGoals && (
                    <Button onClick={() => setIsFormOpen(true)} size="sm">
                      <Plus className="mr-2 h-4 w-4" />Create Goal
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags Management Tab */}
        <TabsContent value="tags" className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Create and manage tags for categorizing goals
            </p>
            <Button onClick={() => setIsTagFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tag
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Goal Tags ({tags.length})</CardTitle>
              <CardDescription>
                Tags help categorize and filter goals across the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isTagsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : tags.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {tags.map((tag) => (
                    <TagCard
                      key={tag.id}
                      tag={tag}
                      onEdit={handleTagEdit}
                      onDelete={handleTagDelete}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No tags yet</h3>
                  <p className="text-gray-600 mb-4">Create your first tag to start categorizing goals</p>
                  <Button onClick={() => setIsTagFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tag
                  </Button>
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
        initialPercentage={updatingGoal?._targetStatus ? 100 : undefined}
      />

      <AssessGoalDialog
        goal={assessingGoal}
        isOpen={isAssessOpen}
        onClose={() => {
          setIsAssessOpen(false)
          setAssessingGoal(null)
        }}
        onSubmit={handleAssess}
      />

      <TagManagementDialog
        tag={editingTag}
        isOpen={isTagFormOpen}
        onClose={() => {
          setIsTagFormOpen(false)
          setEditingTag(null)
        }}
        onSubmit={editingTag ? handleTagUpdate : handleTagCreate}
      />

      {/* Goal Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={() => setIsDetailOpen(false)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-2xl pr-8">{viewingGoal?.title}</DialogTitle>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <GoalStatusBadge status={viewingGoal?.status} />
                <GoalTypeBadge type={viewingGoal?.type} />
                {viewingGoal?.quarter && viewingGoal?.year && (
                  <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                    {viewingGoal.quarter} {viewingGoal.year}
                  </span>
                )}
                {viewingGoal?.frozen && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 bg-slate-50">
                    <Lock className="h-2.5 w-2.5" />Frozen
                  </span>
                )}
                {viewingGoal?.scope === "DEPARTMENTAL" && viewingGoal?.organization_name && (
                  <span className="text-[11px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                    {viewingGoal.organization_name}
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tags */}
            {viewingGoal?.tags && viewingGoal.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {viewingGoal.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-sm px-3 py-1"
                      style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned user — individual goals only */}
            {viewingGoal?.scope === "INDIVIDUAL" && viewingGoal?.owner_name && (
              <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/40 border border-border/50">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-background text-foreground font-medium">
                    {viewingGoal.owner_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-none mb-0.5">Assigned to</p>
                  <p className="text-sm font-medium truncate">{viewingGoal.owner_name}</p>
                </div>
              </div>
            )}

            {/* Description */}
            {viewingGoal?.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Description</h3>
                <div
                  className="text-sm text-gray-600 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: viewingGoal.description }}
                />
              </div>
            )}

            {/* KPIs */}
            {viewingGoal?.kpis && viewingGoal.kpis.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700">Key Performance Indicators</h3>
                <div className="space-y-2">
                  {viewingGoal.kpis.map((kpi, index) => {
                    const isStructured = typeof kpi === "object" && kpi !== null
                    return (
                      <div key={kpi.id || index} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                        <p className="font-medium text-foreground">
                          {isStructured ? kpi.description : kpi}
                        </p>
                        {isStructured && (kpi.target_value !== null && kpi.target_value !== undefined) && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Target: <strong className="text-foreground">{kpi.target_value} {kpi.target_unit}</strong></span>
                            {kpi.actual_value !== null && kpi.actual_value !== undefined && (
                              <span>Actual: <strong className="text-foreground">{kpi.actual_value} {kpi.target_unit}</strong></span>
                            )}
                            {kpi.achieved && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Achieved
                              </span>
                            )}
                          </div>
                        )}
                        {isStructured && (kpi.target_value === null || kpi.target_value === undefined) && (
                          <p className="text-xs text-amber-600 mt-1">⚠ Target not set — supervisor must enter target before scoring</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">Progress</h3>
                <span className="text-sm font-semibold">{viewingGoal?.progress_percentage || 0}%</span>
              </div>
              <Progress value={viewingGoal?.progress_percentage || 0} className="h-2" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {viewingGoal?.start_date && (
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-gray-700">Start Date</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(viewingGoal.start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {viewingGoal?.end_date && (
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-gray-700">End Date</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(viewingGoal.end_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Parent Goal */}
            {viewingGoal?.parent_goal_id && (() => {
              const parent = goalsPage.find(g => g.id === viewingGoal.parent_goal_id)
              return (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Parent Goal
                  </h3>
                  <Card
                    className="border-l-4 border-l-primary/40 cursor-pointer hover:border-border transition-colors"
                    onClick={() => parent && setViewingGoal(parent)}
                  >
                    <CardContent className="pt-3 pb-3">
                      <p className="text-sm font-medium">{parent?.title || 'Unknown (not in current page)'}</p>
                      {parent && (
                        <div className="flex items-center gap-2 mt-1">
                          <GoalTypeBadge type={parent.type} />
                          <span className="text-xs text-muted-foreground">{parent.progress_percentage || 0}% complete</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Child Goals */}
            {goalsPage.filter(g => g.parent_goal_id === viewingGoal?.id).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Child Goals ({goalsPage.filter(g => g.parent_goal_id === viewingGoal?.id).length})
                </h3>
                <div className="space-y-2">
                  {goalsPage.filter(g => g.parent_goal_id === viewingGoal?.id).map(child => (
                    <Card
                      key={child.id}
                      className="border-l-4 border-l-emerald-400/60 cursor-pointer hover:border-border transition-colors"
                      onClick={() => setViewingGoal(child)}
                    >
                      <CardContent className="pt-3 pb-3">
                        <p className="text-sm font-medium">{child.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <GoalStatusBadge status={child.status} />
                          <GoalTypeBadge type={child.type} />
                          <span className="text-xs text-muted-foreground">{child.progress_percentage || 0}% complete</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
              {viewingGoal?.created_at && (
                <p>Created: {new Date(viewingGoal.created_at).toLocaleString()}</p>
              )}
              {viewingGoal?.updated_at && (
                <p>Last Updated: {new Date(viewingGoal.updated_at).toLocaleString()}</p>
              )}
              {viewingGoal?.achieved_at && (
                <p>Achieved: {new Date(viewingGoal.achieved_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
