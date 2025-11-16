'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Filter } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GET } from "@/lib/api"

// My Reviews Component for Users
function MyReviews() {
  const router = useRouter()
  const [assignments, setAssignments] = useState([])
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState("")
  const [loading, setLoading] = useState(true)
  const [cyclesLoading, setCyclesLoading] = useState(true)

  useEffect(() => {
    fetchCycles()
  }, [])

  useEffect(() => {
    if (!cyclesLoading && cycles.length > 0 && !selectedCycle) {
      // Default to the most recent cycle (first in the list)
      console.log('Setting default cycle:', cycles[0].id)
      setSelectedCycle(cycles[0].id)
    }
  }, [cycles, cyclesLoading, selectedCycle])

  useEffect(() => {
    console.log('State changed:', { cyclesLoading, cycles: cycles.length, selectedCycle, assignments: assignments.length, loading })
  }, [cyclesLoading, cycles, selectedCycle, assignments, loading])

  useEffect(() => {
    if (selectedCycle) {
      fetchMyAssignments()
    }
  }, [selectedCycle, fetchMyAssignments])

  const fetchCycles = async () => {
    try {
      console.log('Fetching cycles...')
      const data = await GET('/api/reviews/cycles')
      console.log('Cycles fetched:', data)
      setCycles(data || [])
    } catch (error) {
      console.error('Error fetching cycles:', error)
    } finally {
      setCyclesLoading(false)
    }
  }

  const fetchMyAssignments = async () => {
    try {
      setLoading(true)
      console.log('Fetching assignments for cycle:', selectedCycle)
      const url = selectedCycle
        ? `/api/reviews/my-assignments?cycle_id=${selectedCycle}`
        : '/api/reviews/my-assignments'
      const data = await GET(url)
      console.log('Assignments fetched:', data)
      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartReview = (assignmentId) => {
    router.push(`/dashboard/reviews/assignment/${assignmentId}`)
  }

  // Assignments are already filtered by cycle_id from backend
  const selfReviews = assignments.filter(a => a.review_type === 'self')
  const peerReviews = assignments.filter(a => a.review_type === 'peer')
  const supervisorReviews = assignments.filter(a => a.review_type === 'supervisor')

  const renderAssignments = (assignmentsList, emptyMessage, reviewType) => {
    if (assignmentsList.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{emptyMessage}</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {assignmentsList.map((assignment) => {
          // For peer and supervisor reviews, show the person's name as title
          const cardTitle = (reviewType === 'peer' || reviewType === 'supervisor')
            ? assignment.reviewee_name
            : assignment.cycle_title

          return (
            <Card
              key={assignment.id}
              className={assignment.status === 'completed' ? 'opacity-75' : 'hover:shadow-md transition-shadow cursor-pointer'}
              onClick={() => assignment.status !== 'completed' && handleStartReview(assignment.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{cardTitle}</h4>
                    {(reviewType === 'peer' || reviewType === 'supervisor') && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.cycle_title}
                      </p>
                    )}
                  </div>
                  {assignment.status === 'completed' && (
                    <Badge className="bg-green-100 text-green-800">
                      Completed
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-sm text-muted-foreground">
                    {assignment.status === 'completed' ? (
                      <span className="text-green-600 font-medium">
                        All {assignment.total_questions || 0} questions answered
                      </span>
                    ) : assignment.completed_questions > 0 ? (
                      <span>
                        <span className="font-medium text-green-600">{assignment.completed_questions}</span> of {assignment.total_questions || 0} questions answered
                      </span>
                    ) : (
                      <span>{assignment.total_questions || 0} questions to answer</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  {assignment.due_date && (
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {assignment.status !== 'completed' && (
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartReview(assignment.id)
                      }}
                    >
                      Start Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cycle Filter - Prominent */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Review Cycle</label>
              <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                <SelectTrigger className="w-full max-w-md bg-background">
                  <SelectValue placeholder="Select a review cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name} ({cycle.period})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state while fetching assignments */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews</h3>
            <p className="text-gray-500">
              You don&apos;t have any review assignments for this cycle.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Tabs */
        <Tabs defaultValue="self" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="self">
              Self ({selfReviews.length})
            </TabsTrigger>
            <TabsTrigger value="peer">
              Peer ({peerReviews.length})
            </TabsTrigger>
            <TabsTrigger value="supervisor">
              Supervisee ({supervisorReviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="self">
            {renderAssignments(selfReviews, "You don't have any self-review assignments for this cycle.", 'self')}
          </TabsContent>

          <TabsContent value="peer">
            {renderAssignments(peerReviews, "You don't have any peer review assignments for this cycle.", 'peer')}
          </TabsContent>

          <TabsContent value="supervisor">
            {renderAssignments(supervisorReviews, "You don't have any supervisee review assignments for this cycle.", 'supervisor')}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// Main Reviews Page Component - Simple, just My Reviews
export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Reviews</h1>
      </div>

      <MyReviews />
    </div>
  )
}