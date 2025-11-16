'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { GET } from "@/lib/api"

export default function EmployeeScorecardPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState(null)
  const [cycle, setCycle] = useState(null)
  const [supervisor, setSupervisor] = useState(null)

  const cycleId = searchParams.get('cycle')

  useEffect(() => {
    if (params.employeeId && cycleId) {
      fetchEmployeeScorecard()
    }
  }, [params.employeeId, cycleId, fetchEmployeeScorecard])

  const fetchEmployeeScorecard = async () => {
    try {
      setLoading(true)
      // Fetch organization performance data which includes employee details
      const data = await GET(`/api/reviews/organization-performance?cycle_id=${cycleId}`)

      // Find the specific employee
      const employeeData = data.employees.find(emp => emp.id === params.employeeId)

      if (employeeData) {
        setEmployee(employeeData)
        setCycle(data.cycle)

        // Fetch supervisor info if available
        // TODO: Add supervisor field to employee data or fetch separately
      }
    } catch (error) {
      console.error('Error fetching scorecard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (!score) return "text-gray-400"
    if (score >= 8) return "text-green-600 font-semibold"
    if (score >= 6) return "text-blue-600"
    if (score >= 4) return "text-orange-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Scorecard Not Found</h2>
        <p className="text-muted-foreground mb-4">
          Unable to load employee scorecard.
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">EMPLOYEE SCORECARD</h1>
          <p className="text-muted-foreground">
            Performance review for {cycle?.period}
          </p>
        </div>
      </div>

      {/* Scorecard Header Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex gap-4">
                <span className="font-semibold min-w-[120px]">NAME</span>
                <span className="text-muted-foreground">{employee.name}</span>
              </div>
              <div className="flex gap-4">
                <span className="font-semibold min-w-[120px]">STAFF ID</span>
                <span className="text-muted-foreground">{employee.id}</span>
              </div>
              <div className="flex gap-4">
                <span className="font-semibold min-w-[120px]">SUPERVISOR</span>
                <span className="text-muted-foreground">{supervisor || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-4">
                <span className="font-semibold min-w-[120px]">ROLE</span>
                <span className="text-muted-foreground">{employee.role_name || 'N/A'}</span>
              </div>
              <div className="flex gap-4">
                <span className="font-semibold min-w-[120px]">DEPARTMENT</span>
                <span className="text-muted-foreground">{employee.department_name || 'N/A'}</span>
              </div>
              <div className="flex gap-4">
                <span className="font-semibold min-w-[120px]">PERIOD</span>
                <span className="text-muted-foreground">
                  {cycle ? `${cycle.name} (${new Date(cycle.start_date).toLocaleDateString()} - ${new Date(cycle.end_date).toLocaleDateString()})` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Description/Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle>JOB DESCRIPTION / TASKS</CardTitle>
        </CardHeader>
        <CardContent>
          {employee.tasks && employee.tasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Task Description</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.tasks.map((task, index) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{task.title}</div>
                      {task.due_date && (
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xl font-bold ${getScoreColor(task.score)}`}>
                        {task.score ? `${task.score}/10` : 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm capitalize">{task.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tasks assigned during this review period
            </div>
          )}

          {/* Task Summary */}
          {employee.tasks && employee.tasks.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-end gap-8">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Tasks</div>
                  <div className="text-2xl font-bold">{employee.total_tasks}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="text-2xl font-bold text-green-600">{employee.completed_tasks}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Average Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(employee.avg_task_score)}`}>
                    {employee.avg_task_score ? `${employee.avg_task_score}/10` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competency Framework Section */}
      <Card>
        <CardHeader>
          <CardTitle>COMPETENCY FRAMEWORK</CardTitle>
        </CardHeader>
        <CardContent>
          {employee.competency && employee.competency.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competency</TableHead>
                    <TableHead className="text-right">Final Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.competency.map((competency) => (
                    <TableRow key={competency.trait_id}>
                      <TableCell>
                        <div className="font-medium text-black">{competency.trait_name}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xl font-bold ${getScoreColor(competency.weighted_score ? competency.weighted_score * 2 : null)}`}>
                          {competency.weighted_score ? competency.weighted_score.toFixed(2) : 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Competency Total */}
              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Overall Competency Score</div>
                  <div className={`text-3xl font-bold ${getScoreColor(employee.competency_score ? employee.competency_score * 2 : null)}`}>
                    {employee.competency_score ? `${employee.competency_score.toFixed(2)}/5` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No competency data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavioral/Core Values Section */}
      <Card>
        <CardHeader>
          <CardTitle>BEHAVIORAL / CORE VALUES</CardTitle>
        </CardHeader>
        <CardContent>
          {employee.values && employee.values.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Final Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.values.map((value) => (
                    <TableRow key={value.trait_id}>
                      <TableCell>
                        <div className="font-medium uppercase text-black">{value.trait_name}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xl font-bold ${getScoreColor(value.weighted_score ? value.weighted_score * 2 : null)}`}>
                          {value.weighted_score ? value.weighted_score.toFixed(2) : 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Values Total */}
              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Overall Core Values Score</div>
                  <div className={`text-3xl font-bold ${getScoreColor(employee.values_score ? employee.values_score * 2 : null)}`}>
                    {employee.values_score ? `${employee.values_score.toFixed(2)}/5` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No core values data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Performance List
        </Button>
        <Button onClick={() => window.print()}>
          <FileText className="mr-2 h-4 w-4" />
          Print Scorecard
        </Button>
      </div>
    </div>
  )
}
