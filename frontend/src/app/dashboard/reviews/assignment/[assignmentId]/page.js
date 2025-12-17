'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, CheckCircle, AlertCircle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { GET, POST } from "@/lib/api"

export default function AssignmentReviewPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.assignmentId

  const [assignment, setAssignment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [responses, setResponses] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      setLoading(true)
      const data = await GET(`/api/reviews/assignments/${assignmentId}`)
      setAssignment(data)
      setQuestions(data.questions || [])

      // Initialize responses from existing data
      const existingResponses = {}
      if (data.responses && Array.isArray(data.responses)) {
        data.responses.forEach(resp => {
          existingResponses[resp.question_id] = {
            rating: resp.rating
          }
        })
      }
      setResponses(existingResponses)
    } catch (error) {
      console.error('Error fetching assignment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRatingChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        rating: value[0]
      }
    }))
  }

  const handleSaveProgress = async () => {
    try {
      setSubmitting(true)

      // Format responses for backend (only save rated questions)
      const formattedResponses = Object.entries(responses)
        .filter(([_, data]) => data.rating !== undefined && data.rating !== null)
        .map(([questionId, data]) => ({
          question_id: questionId,
          rating: data.rating
        }))

      if (formattedResponses.length === 0) {
        return
      }

      await POST(`/api/reviews/assignments/${assignmentId}/submit`, {
        responses: formattedResponses,
        is_draft: true
      })

      // Refresh assignment data
      fetchAssignment()
    } catch (error) {
      console.error('Error saving progress:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReview = async () => {
    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => !responses[q.id]?.rating)

    if (unansweredQuestions.length > 0) {
      return
    }

    try {
      setSubmitting(true)

      // Format responses for backend
      const formattedResponses = Object.entries(responses).map(([questionId, data]) => ({
        question_id: questionId,
        rating: data.rating
      }))

      await POST(`/api/reviews/assignments/${assignmentId}/submit`, {
        responses: formattedResponses
      })

      // Navigate back to reviews list immediately
      router.push('/dashboard/reviews')
    } catch (error) {
      console.error('Error submitting review:', error)
      // Still navigate back even on error
      router.push('/dashboard/reviews')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-lg font-medium text-gray-900">Assignment Not Found</h2>
        <p className="text-gray-500 mt-2">The requested review assignment could not be found.</p>
        <Button onClick={() => router.push('/dashboard/reviews')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reviews
        </Button>
      </div>
    )
  }

  const completedCount = Object.keys(responses).filter(qId => responses[qId]?.rating).length
  const progressPercentage = (completedCount / questions.length * 100) || 0
  const isCompleted = assignment.status === 'completed'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/reviews')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {assignment.review_type === 'self' ? 'Self Review' :
               assignment.review_type === 'peer' ? `Peer Review - ${assignment.reviewee_name}` :
               `Supervisor Review - ${assignment.reviewee_name}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {assignment.cycle_title}
            </p>
          </div>
        </div>
        {isCompleted && (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        )}
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} of {questions.length} questions answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => {
          const response = responses[question.id] || {}
          const hasRating = response.rating !== undefined && response.rating !== null

          return (
            <Card key={question.id} className={hasRating ? 'border-green-200' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      Question {index + 1} of {questions.length}
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {question.question_text}
                    </CardDescription>
                  </div>
                  {hasRating && (
                    <CheckCircle className="w-5 h-5 text-green-600 ml-4" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rating Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Rating (1-10)</Label>
                    <span className="text-2xl font-bold text-gray-900">
                      {response.rating || '-'}
                    </span>
                  </div>
                  <Slider
                    value={[response.rating || 1]}
                    onValueChange={(value) => handleRatingChange(question.id, value)}
                    min={1}
                    max={10}
                    step={1}
                    disabled={isCompleted}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 - Poor</span>
                    <span>5 - Average</span>
                    <span>10 - Excellent</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="flex items-center justify-end gap-4 sticky bottom-4 bg-white p-4 rounded-lg border shadow-lg">
          <Button
            variant="outline"
            onClick={handleSaveProgress}
            disabled={submitting || Object.keys(responses).length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Progress
          </Button>
          <Button
            onClick={handleSubmitReview}
            disabled={submitting || completedCount < questions.length}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      )}
    </div>
  )
}
