'use client'

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Users, Calendar, BarChart3, Settings, Plus, Edit, Trash2, Eye, Search, X, Filter } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { GET, POST, DELETE } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useOrganizations } from "@/lib/react-query"
import { toast } from "sonner"

export default function ReviewCycleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const cycleId = params.cycleId

  const [cycle, setCycle] = useState(null)
  const [traits, setTraits] = useState([])
  const [questions, setQuestions] = useState({})
  const [selectedTrait, setSelectedTrait] = useState(null)
  const [currentReviewType, setCurrentReviewType] = useState(null)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', description: '', onConfirm: () => {} })

  const { data: organizations = [] } = useOrganizations()

  // Get department options from organizations
  const departmentOptions = [
    { value: "all", label: "All Departments" },
    ...organizations
      .filter(org => org.level === "department")
      .map(org => ({
        value: org.name,
        label: org.name
      }))
  ]

  const fetchCycleDetails = useCallback(async () => {
    try {
       
      const cycleData = await GET(`/api/reviews/cycles/${cycleId}`)
      setCycle(cycleData)

      // Fetch traits for this cycle
      const traitsData = await GET('/api/reviews/traits')

      // Filter traits that are included in this cycle
      const cycleTraitIds = cycleData.selected_traits || []
      const cycleTraits = traitsData.filter(trait => cycleTraitIds.includes(trait.id))
      setTraits(cycleTraits)

      // Fetch questions for each trait
      const questionsData = {}
      for (const trait of cycleTraits) {
        try {
          const traitQuestions = await GET(`/api/reviews/traits/${trait.id}/questions`)
          questionsData[trait.id] = {
            self: traitQuestions.filter(q => q.applies_to_self),
            peer: traitQuestions.filter(q => q.applies_to_peer),
            supervisor: traitQuestions.filter(q => q.applies_to_supervisor)
          }
        } catch (error) {
          console.error(`Error fetching questions for trait ${trait.id}:`, error)
          questionsData[trait.id] = { self: [], peer: [], supervisor: [] }
        }
      }
      setQuestions(questionsData)

    } catch (error) {
      console.error('Error fetching cycle details:', error)
    } finally {
      setLoading(false)
    }
  }, [cycleId])

  const fetchReviews = useCallback(async () => {
    try {
      // Fetch aggregated review scores for all users in this cycle
      const data = await GET(`/api/reviews/cycles/${cycleId}/user-scores`)
      setReviews(data)
    } catch (error) {
      console.error('Error fetching reviews:', error)
      setReviews([])
    }
  }, [cycleId])

  useEffect(() => {
    if (cycleId) {
      fetchCycleDetails()
    }
  }, [cycleId, fetchCycleDetails])

  useEffect(() => {
    if (cycle?.status === 'active' || cycle?.status === 'completed') {
      fetchReviews()
    }
  }, [cycle?.status, fetchReviews])

  const addQuestionToTrait = async (traitId, questionData) => {
    try {
      await POST(`/api/reviews/traits/${traitId}/questions`, questionData)
      fetchCycleDetails() // Refresh the data
      setShowQuestionDialog(false)
    } catch (error) {
      console.error('Error adding question:', error)
    }
  }

  const deleteQuestion = (questionId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Question',
      description: 'Are you sure you want to delete this question? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await DELETE(`/api/reviews/cycles/${cycleId}/questions/${questionId}`)
          toast.success('Question deleted successfully')
          fetchCycleDetails() // Refresh the data
        } catch (error) {
          console.error('Error deleting question:', error)
          toast.error(error.message || 'Failed to delete question')
        }
      }
    })
  }

  const activateCycle = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Activate Review Cycle',
      description: 'Are you sure you want to activate this review cycle? This will generate review assignments for all users and the cycle will go live.',
      onConfirm: async () => {
        try {
          await POST(`/api/reviews/cycles/${cycleId}/activate`, {})
          toast.success('Review cycle activated successfully!')
          fetchCycleDetails() // Refresh to show new status
        } catch (error) {
          console.error('Error activating cycle:', error)
          toast.error(error.message || 'Failed to activate cycle')
        }
      }
    })
  }

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase()
    switch (normalizedStatus) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-purple-100 text-purple-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!cycle) {
    return (
      <div className="text-center py-8">
        <h2 className="text-lg font-medium text-gray-900">Review Cycle Not Found</h2>
        <p className="text-gray-500 mt-2">The requested review cycle could not be found.</p>
        <Button onClick={() => router.push('/dashboard/review-management')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Review Management
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/review-management')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{cycle.name}</h1>
            <div className="flex items-center gap-4 mt-1">
              <Badge className={getStatusColor(cycle.status)}>
                {cycle.status}
              </Badge>
              <span className="text-sm text-gray-500">
                {cycle.type} • {cycle.period}
              </span>
            </div>
          </div>
        </div>
        {cycle.status?.toUpperCase() === 'DRAFT' && (
          <Button onClick={activateCycle}>
            <Settings className="w-4 h-4 mr-2" />
            Launch Cycle
          </Button>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cycle Info */}
          <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="text-sm font-medium mt-1">
                {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Traits</p>
              <p className="text-sm font-medium mt-1">{traits.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Questions</p>
              <p className="text-sm font-medium mt-1">
                {Object.values(questions).reduce((total, traitQuestions) =>
                  total + Object.values(traitQuestions).flat().length, 0
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Review Types</p>
              <p className="text-sm font-medium mt-1">Self, Peer, Supervisor</p>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
      {/* Review Types Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review Questions Configuration</CardTitle>
              <CardDescription>
                Configure questions for each review type. All company traits are included by default.
              </CardDescription>
            </div>
            {cycle.status === 'draft' && (
              <Badge className="bg-amber-100 text-amber-800">Draft - Configure Questions</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="self" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              {[
                { key: 'self', label: 'Self Review' },
                { key: 'peer', label: 'Peer Review' },
                { key: 'supervisor', label: 'Supervisor Review' }
              ].map(type => {
                const totalQuestions = Object.values(questions).reduce((total, traitQuestions) =>
                  total + (traitQuestions[type.key]?.length || 0), 0
                )
                return (
                  <TabsTrigger key={type.key} value={type.key} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{totalQuestions}</Badge>
                    {type.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {[
              { key: 'self', label: 'Self Review' },
              { key: 'peer', label: 'Peer Review' },
              { key: 'supervisor', label: 'Supervisor Review' }
            ].map(reviewType => (
              <TabsContent key={reviewType.key} value={reviewType.key} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{reviewType.label} Questions</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCurrentReviewType(reviewType.key)
                      setSelectedTrait(null)
                      setShowQuestionDialog(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {/* Group questions by trait */}
                <div className="space-y-4">
                  {traits.map((trait) => {
                    const traitQuestions = questions[trait.id]?.[reviewType.key] || []
                    return (
                      <div key={trait.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{trait.name}</h4>
                            {trait.description && (
                              <p className="text-xs text-gray-600 mt-1">{trait.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {traitQuestions.length} questions
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentReviewType(reviewType.key)
                                setSelectedTrait(trait)
                                setShowQuestionDialog(true)
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>

                        {traitQuestions.length > 0 ? (
                          <div className="space-y-2">
                            {traitQuestions.map((question, index) => (
                              <div key={question.id} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <span className="text-gray-500 mr-2">{index + 1}.</span>
                                    {question.question_text}
                                  </p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    1-10 Scale
                                  </Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteQuestion(question.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded">
                            <p className="text-sm text-gray-500 mb-2">No questions for {trait.name}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCurrentReviewType(reviewType.key)
                                setSelectedTrait(trait)
                                setShowQuestionDialog(true)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Question
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
      {/* User Reviews Table */}
      <Card>
          <CardHeader>
            <CardTitle>Employee Reviews</CardTitle>
            <CardDescription>
              View aggregated review scores for all participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setDepartmentFilter("all")
                    setStatusFilter("all")
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

                <SearchableSelect
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                  options={departmentOptions}
                  placeholder="All Departments"
                  searchPlaceholder="Search departments..."
                  emptyText="No departments found."
                  className="w-[250px]"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reviews.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    {traits.map(trait => (
                      <TableHead key={trait.id}>{trait.name}</TableHead>
                    ))}
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews
                    .filter(review => {
                      const matchesSearch = !searchTerm ||
                        review.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        review.department_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      const matchesDepartment = departmentFilter === "all" || review.department_name === departmentFilter
                      const matchesStatus = statusFilter === "all" || review.completion_status === statusFilter
                      return matchesSearch && matchesDepartment && matchesStatus
                    })
                    .map((review) => (
                    <TableRow key={review.user_id}>
                      <TableCell className="font-medium">{review.user_name}</TableCell>
                      <TableCell>{review.department_name}</TableCell>
                      {traits.map(trait => (
                        <TableCell key={trait.id}>
                          {review.trait_scores?.[trait.id]
                            ? <span className="font-medium">{review.trait_scores[trait.id].toFixed(1)}</span>
                            : <span className="text-gray-400">-</span>
                          }
                        </TableCell>
                      ))}
                      <TableCell>
                        <span className="font-semibold">{review.overall_score?.toFixed(1) || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={review.completion_status === 'completed' ? 'default' : 'secondary'}>
                          {review.completion_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => router.push(`/dashboard/review-management/${cycleId}/user/${review.user_id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No review data available yet. Reviews will appear here once participants start submitting.
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Add Question Dialog */}
      <QuestionDialog
        open={showQuestionDialog}
        onClose={() => {
          setShowQuestionDialog(false)
          setSelectedTrait(null)
          setCurrentReviewType(null)
        }}
        onSubmit={(questionData) => addQuestionToTrait(selectedTrait?.id || questionData.trait_id, questionData)}
        trait={selectedTrait}
        reviewType={currentReviewType}
        traits={traits}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}>
              Cancel
            </Button>
            <Button onClick={() => {
              confirmDialog.onConfirm()
              setConfirmDialog({ ...confirmDialog, isOpen: false })
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Question Dialog Component
function QuestionDialog({ open, onClose, onSubmit, trait, reviewType, traits }) {
  const [formData, setFormData] = useState({
    question_text: "",
    trait_id: trait?.id || ""
  })

  const reviewTypeLabels = {
    self: 'Self Review',
    peer: 'Peer Review',
    supervisor: 'Supervisor Review'
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Build the final question data with review type flags
    const questionData = {
      question_text: formData.question_text,
      applies_to_self: reviewType === 'self',
      applies_to_peer: reviewType === 'peer',
      applies_to_supervisor: reviewType === 'supervisor',
      trait_id: formData.trait_id
    }

    onSubmit(questionData)
    setFormData({
      question_text: "",
      trait_id: trait?.id || ""
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add {reviewTypeLabels[reviewType] || 'Review'} Question</DialogTitle>
            <DialogDescription>
              This question will only appear in {reviewTypeLabels[reviewType]?.toLowerCase() || 'reviews'} and will be rated on a 1-10 scale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!trait && (
              <div>
                <Label htmlFor="trait">Performance Trait</Label>
                <Select
                  value={formData.trait_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trait_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a trait" />
                  </SelectTrigger>
                  <SelectContent>
                    {traits.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">The trait this question evaluates</p>
              </div>
            )}

            <div>
              <Label htmlFor="question">Question Text</Label>
              <Textarea
                id="question"
                value={formData.question_text}
                onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                placeholder="E.g., How effectively does this person communicate ideas?"
                required
                className="min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-1">Will be rated on a scale of 1-10</p>
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