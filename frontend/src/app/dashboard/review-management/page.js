'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Eye, Users, Calendar, BarChart3, Clock, FileText, Search, Filter, X, Settings, Edit, Trash2, Target, ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth, PermissionGuard } from "@/lib/auth-context"
import { GET, POST, DELETE } from "@/lib/api"
import { useFreezeGoalsQuarter } from "@/lib/react-query"

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

const reviewStatusColors = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800"
}

const reviewTypeColors = {
  self: "bg-blue-100 text-blue-800",
  peer: "bg-purple-100 text-purple-800",
  supervisor: "bg-orange-100 text-orange-800"
}

// Trait Management Components
function TraitManagement() {
  const [traits, setTraits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTraitDialog, setShowTraitDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [selectedTrait, setSelectedTrait] = useState(null)
  const [questions, setQuestions] = useState([])
  const [traitFormType, setTraitFormType] = useState('value') // 'value' or 'competency'

  useEffect(() => {
    fetchTraits()
  }, [])

  const fetchTraits = async () => {
    try {
      const data = await GET('/api/reviews/traits')
      console.log(data)
      setTraits(data)
    } catch (error) {
      console.error('Error fetching traits:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTrait = async (traitData) => {
    try {
      await POST('/api/reviews/traits', traitData)
      fetchTraits()
      setShowTraitDialog(false)
    } catch (error) {
      console.error('Error creating trait:', error)
    }
  }

  const fetchQuestions = async (traitId) => {
    try {
      const data = await GET(`/api/reviews/traits/${traitId}/questions`)
      // Group questions by review types they apply to
      const groupedQuestions = {
        self: data.filter(q => q.applies_to_self),
        peer: data.filter(q => q.applies_to_peer),
        supervisor: data.filter(q => q.applies_to_supervisor)
      }
      setQuestions(groupedQuestions)
    } catch (error) {
      console.error('Error fetching questions:', error)
    }
  }

  const createQuestion = async (questionData) => {
    try {
      await POST(`/api/reviews/traits/${selectedTrait.id}/questions`, questionData)
      fetchQuestions(selectedTrait.id)
      setShowQuestionDialog(false)
    } catch (error) {
      console.error('Error creating question:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Values/Competency Framework</h3>
        <div className="flex gap-2">
          <Button onClick={() => {
            setShowTraitDialog(true)
            // Set initial scope to global for values
            setTraitFormType('value')
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Value
          </Button>
          <Button onClick={() => {
            setShowTraitDialog(true)
            // Set initial scope to non-global for competency
            setTraitFormType('competency')
          }} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Competency
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {traits.map((trait) => (
          <Card key={trait.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{trait.name}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{trait.question_count} questions</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={
                    trait.scope_type === 'global' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    trait.scope_type === 'directorate' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    trait.scope_type === 'department' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }
                >
                  {trait.scope_type === 'global' ? 'Global' :
                   trait.scope_type === 'directorate' ? 'Directorate' :
                   trait.scope_type === 'department' ? 'Department' : 'Unit'}
                </Badge>
                {trait.organization_name && (
                  <span className="text-xs text-muted-foreground">
                    {trait.organization_name}
                  </span>
                )}
              </div>
              {trait.description && (
                <CardDescription className="text-sm mt-2">
                  {trait.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTrait(trait)
                    fetchQuestions(trait.id)
                  }}
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Manage Questions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialogs for trait and question management */}
      <TraitDialog
        open={showTraitDialog}
        onClose={() => {
          setShowTraitDialog(false)
          setTraitFormType('value')
        }}
        onSubmit={createTrait}
        initialType={traitFormType}
      />

      <QuestionDialog
        open={showQuestionDialog}
        onClose={() => setShowQuestionDialog(false)}
        onSubmit={createQuestion}
        trait={selectedTrait}
      />

      <QuestionsManagementDialog
        open={selectedTrait && !showQuestionDialog}
        onClose={() => setSelectedTrait(null)}
        trait={selectedTrait}
        questions={questions}
        onAddQuestion={() => setShowQuestionDialog(true)}
        onRefreshQuestions={() => selectedTrait && fetchQuestions(selectedTrait.id)}
      />
    </div>
  )
}

// Enhanced Review Cycle Form
function EnhancedReviewCycleForm({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "quarterly",
    period: "",
    start_date: "",
    end_date: "",
    peer_review_count: 5,
    auto_assign_peers: true
  })

  const [traits, setTraits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchTraits()
    }
  }, [isOpen])

  const fetchTraits = async () => {
    try {
      const data = await GET('/api/reviews/traits')
      setTraits(data)
    } catch (error) {
      console.error('Error fetching traits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      start_date: formData.start_date + 'T00:00:00',
      end_date: formData.end_date + 'T23:59:59'
    }
    onSubmit(submitData)
    onClose()
    // Reset form
    setFormData({
      name: "",
      type: "quarterly",
      period: "",
      start_date: "",
      end_date: "",
      peer_review_count: 5,
      auto_assign_peers: true
    })
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Review Cycle</DialogTitle>
            <DialogDescription>
              Set up a review cycle with custom traits and parameters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Cycle Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Q1 2024 Review"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="probationary">Probationary</SelectItem>
                    <SelectItem value="project">Project-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                placeholder="Q1-2024"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name || !formData.start_date || !formData.end_date}
            >
              Create Cycle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Cycle Detail View
function CycleDetailView({ cycle, onBack, onViewAllReviews }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cycle) {
      fetchCycleReviews()
    }
  }, [cycle])

  const fetchCycleReviews = async () => {
    try {
      // This would be the API call to get all reviews for this cycle
      // For now, we'll simulate it
      setLoading(false)
    } catch (error) {
      console.error('Error fetching cycle reviews:', error)
      setLoading(false)
    }
  }

  if (!cycle) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cycles
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{cycle.name}</h2>
          <p className="text-sm text-gray-600">{cycle.period} • {cycle.type}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{cycle.participants_count || 0}</div>
            <p className="text-sm text-gray-600">Total Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{Math.round(cycle.completion_rate || 0)}%</div>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              <Badge className={statusColors[cycle.status]}>{cycle.status}</Badge>
            </div>
            <p className="text-sm text-gray-600">Status</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{cycle.quality_score || 0}</div>
            <p className="text-sm text-gray-600">Quality Score</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employee Reviews</CardTitle>
            <Button onClick={onViewAllReviews}>
              <Users className="w-4 h-4 mr-2" />
              View All Reviews
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Employee review data will be displayed here with filtering and aggregation options.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Simple dialog components (you can move these to separate files later)
function TraitDialog({ open, onClose, onSubmit, initialType = 'value' }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scope_type: initialType === 'value' ? "global" : "department",
    organization_id: null
  })
  const [organizations, setOrganizations] = useState([])

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await GET('/api/organization')
        setOrganizations(data)
      } catch (error) {
        console.error('Error fetching organizations:', error)
      }
    }
    if (open) {
      fetchOrganizations()
      // Set initial scope based on type when dialog opens
      setFormData(prev => ({
        ...prev,
        scope_type: initialType === 'value' ? "global" : "department",
        organization_id: initialType === 'value' ? null : prev.organization_id
      }))
    }
  }, [open, initialType])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({ name: "", description: "", scope_type: "global", organization_id: null })
  }

  const scopeRequiresOrg = formData.scope_type !== "global"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initialType === 'value' ? 'Add Value' : 'Add Competency'}
            </DialogTitle>
            <DialogDescription>
              {initialType === 'value'
                ? 'Define a global value that applies to all employees in the organization.'
                : 'Define a competency that applies to a specific organizational unit.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">{initialType === 'value' ? 'Value' : 'Competency'} Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Communication, Leadership, Technical Skills"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this trait measures..."
              />
            </div>

            {initialType !== 'value' && (
              <>
                <div>
                  <Label htmlFor="scope">Scope Type</Label>
                  <Select
                    value={formData.scope_type}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      scope_type: value,
                      organization_id: value === "global" ? null : prev.organization_id
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="directorate">Directorate Level</SelectItem>
                      <SelectItem value="department">Department Level</SelectItem>
                      <SelectItem value="unit">Unit Level</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.scope_type === "directorate" && "Applies to selected directorate and all departments/units under it"}
                    {formData.scope_type === "department" && "Applies to selected department and all units under it"}
                    {formData.scope_type === "unit" && "Applies only to selected unit"}
                  </p>
                </div>
              </>
            )}

            {scopeRequiresOrg && (
              <div>
                <Label htmlFor="organization">Organization Unit *</Label>
                <Select
                  value={formData.organization_id || ""}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
                  required={scopeRequiresOrg}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organizational unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations
                      .filter(org => org.level === formData.scope_type)
                      .map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Trait</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuestionDialog({ open, onClose, onSubmit, trait }) {
  const [formData, setFormData] = useState({
    question_text: "",
    applies_to_self: false,
    applies_to_peer: false,
    applies_to_supervisor: false
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate that at least one review type is selected
    if (!formData.applies_to_self && !formData.applies_to_peer && !formData.applies_to_supervisor) {
      alert('Please select at least one review type')
      return
    }

    onSubmit(formData)
    setFormData({
      question_text: "",
      applies_to_self: false,
      applies_to_peer: false,
      applies_to_supervisor: false
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Question to {trait?.name}</DialogTitle>
            <DialogDescription>
              Create a question that will be rated on a 1-10 scale. Select which review types this question applies to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="question">Question Text</Label>
              <Textarea
                id="question"
                value={formData.question_text}
                onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder="E.g., How effectively does this person communicate ideas and information clearly?"
                required
                className="min-h-[80px]"
              />
              <p className="text-xs text-gray-500 mt-1">This question will be rated on a scale of 1-10</p>
            </div>
            <div className="space-y-3">
              <Label>Applies to Review Types:</Label>
              <div className="space-y-3">
                {[
                  { key: 'applies_to_self', label: 'Self Review', color: 'bg-blue-100 text-blue-800', description: 'Employee evaluates themselves' },
                  { key: 'applies_to_peer', label: 'Peer Review', color: 'bg-purple-100 text-purple-800', description: 'Colleagues evaluate each other' },
                  { key: 'applies_to_supervisor', label: 'Supervisor Review', color: 'bg-orange-100 text-orange-800', description: 'Manager evaluates employee' }
                ].map(({ key, label, color, description }) => (
                  <div key={key} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <Checkbox
                      id={key}
                      checked={formData[key]}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [key]: checked }))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={key} className="font-medium">{label}</Label>
                        <Badge className={`${color} text-xs`}>1-10</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Add Question</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuestionsManagementDialog({ open, onClose, trait, questions, onAddQuestion, onRefreshQuestions }) {
  const [editingQuestion, setEditingQuestion] = useState(null)
  const reviewTypes = [
    { key: 'self', label: 'Self Review', color: 'bg-blue-100 text-blue-800' },
    { key: 'peer', label: 'Peer Review', color: 'bg-purple-100 text-purple-800' },
    { key: 'supervisor', label: 'Supervisor Review', color: 'bg-orange-100 text-orange-800' }
  ]

  const hasAnyQuestions = questions && Object.values(questions).some(typeQuestions => typeQuestions.length > 0)

  const deleteQuestion = async (questionId) => {
    try {
      await DELETE(`/api/reviews/questions/${questionId}`)
      onRefreshQuestions()
    } catch (error) {
      console.error('Error deleting question:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Manage {trait?.name} Questions</DialogTitle>
              <DialogDescription>
                Add, edit, or remove questions for this trait. Each question is rated on a scale of 1-10.
              </DialogDescription>
            </div>
            <Button onClick={onAddQuestion} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto">
          <Tabs defaultValue="self" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              {reviewTypes.map(type => (
                <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                  <Badge className={`${type.color} text-xs`}>
                    {questions && questions[type.key] ? questions[type.key].length : 0}
                  </Badge>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {reviewTypes.map(type => (
              <TabsContent key={type.key} value={type.key} className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Questions for {type.label}</h4>
                  <Button onClick={onAddQuestion} size="sm" variant="outline">
                    <Plus className="w-3 h-3 mr-1" />
                    Add {type.label} Question
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {questions && questions[type.key] && questions[type.key].length > 0 ? (
                    questions[type.key].map((question, index) => (
                      <Card key={question.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-medium flex-1">
                              <span className="text-gray-500 mr-2">{index + 1}.</span>
                              {question.question_text}
                            </p>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge className={`${type.color} text-xs`}>
                                1-10 Scale
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingQuestion(question)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this question?')) {
                                    deleteQuestion(question.id)
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No {type.label} Questions</h4>
                      <p className="text-gray-500 mb-4">
                        No questions have been added for {type.label.toLowerCase()} yet.
                      </p>
                      <Button onClick={onAddQuestion} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First {type.label} Question
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {!hasAnyQuestions && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Questions Added</h4>
              <p className="text-gray-500 mb-4">
                This trait doesn&apos;t have any questions yet. Add questions to use this trait in review cycles.
              </p>
              <Button onClick={onAddQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Question
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Freeze Goals Dialog Component
function FreezeGoalsDialog({ isOpen, onClose }) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentQuarter = Math.ceil(currentMonth / 3)

  const [formData, setFormData] = useState({
    quarter: `Q${currentQuarter}`,
    year: currentYear
  })

  const freezeMutation = useFreezeGoalsQuarter()

  const handleSubmit = (e) => {
    e.preventDefault()
    freezeMutation.mutate(formData, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Target className="h-5 w-5" />
              Freeze Goals for Quarter
            </DialogTitle>
            <DialogDescription>
              Freeze all individual goals for a specific quarter. Frozen goals cannot be edited.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quarter" className="text-sm font-medium">
                Quarter <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.quarter}
                onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                required
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
                required
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will freeze all individual goals for {formData.quarter} {formData.year}.
                Frozen goals cannot be edited by employees or their supervisors.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={freezeMutation.isPending}>
              {freezeMutation.isPending ? "Freezing..." : "Freeze Goals"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main Review Management Page Component
export default function ReviewManagementPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentView, setCurrentView] = useState('overview') // overview, cycle-detail, all-reviews
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCycleForm, setShowCycleForm] = useState(false)
  const [showFreezeDialog, setShowFreezeDialog] = useState(false)

  useEffect(() => {
    fetchCycles()
  }, [])

  const fetchCycles = async () => {
    try {
      const data = await GET('/api/reviews/cycles')
      setCycles(data)
    } catch (error) {
      console.error('Error fetching cycles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCycleSubmit = async (cycleData) => {
    try {
      await POST('/api/reviews/cycles', cycleData)
      fetchCycles()
      setShowCycleForm(false)
    } catch (error) {
      console.error('Error creating cycle:', error)
      alert(`Failed to create review cycle: ${error.message || 'Unknown error'}`)
    }
  }

  const handleViewCycle = (cycle) => {
    router.push(`/dashboard/reviews/${cycle.id}`)
  }

  const handleBackToOverview = () => {
    setCurrentView('overview')
    setSelectedCycle(null)
  }

  // Overview - Main dashboard
  if (currentView === 'overview') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Review Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFreezeDialog(true)}>
              <Target className="w-4 h-4 mr-2" />
              Freeze Goals
            </Button>
            <Button onClick={() => setShowCycleForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Review Cycle
            </Button>
          </div>
        </div>

        <Tabs defaultValue="cycles" className="w-full">
          <TabsList>
            <TabsTrigger value="cycles">Review Cycles</TabsTrigger>
            <TabsTrigger value="traits">Values/Competency Framework</TabsTrigger>
          </TabsList>

          <TabsContent value="cycles">
            <div className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {cycles.map((cycle) => (
                    <Card key={cycle.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{cycle.name}</h3>
                            <p className="text-sm text-gray-600">{cycle.period} • {cycle.type}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge className={statusColors[cycle.status]}>
                                {cycle.status}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {cycle.participants_count || 0} participants
                              </span>
                              <span className="text-sm text-gray-500">
                                {Math.round(cycle.completion_rate || 0)}% complete
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewCycle(cycle)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            <Button size="sm" variant="outline">
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Analytics
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {cycles.length === 0 && (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Review Cycles</h3>
                        <p className="text-gray-500 mb-4">
                          Get started by creating your first review cycle.
                        </p>
                        <Button onClick={() => setShowCycleForm(true)}>
                          Create Review Cycle
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="traits">
            <TraitManagement />
          </TabsContent>
        </Tabs>

        <EnhancedReviewCycleForm
          isOpen={showCycleForm}
          onClose={() => setShowCycleForm(false)}
          onSubmit={handleCycleSubmit}
        />

        <FreezeGoalsDialog
          isOpen={showFreezeDialog}
          onClose={() => setShowFreezeDialog(false)}
        />
      </div>
    )
  }

  // Cycle Detail View
  if (currentView === 'cycle-detail') {
    return (
      <CycleDetailView
        cycle={selectedCycle}
        onBack={handleBackToOverview}
        onViewAllReviews={() => setCurrentView('all-reviews')}
      />
    )
  }

  // All Reviews View (aggregated employee reviews with filtering)
  if (currentView === 'all-reviews') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView('cycle-detail')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cycle
          </Button>
          <div>
            <h2 className="text-xl font-semibold">All Employee Reviews</h2>
            <p className="text-sm text-gray-600">{selectedCycle?.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Review Aggregation</CardTitle>
            <CardDescription>
              Filter and view all employee reviews for this cycle with scoring and completion status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              Advanced filtering and employee review aggregation interface will be implemented here.
              This will include employee search, department filtering, completion status, and review scores.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}