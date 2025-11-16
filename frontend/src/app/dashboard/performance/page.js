'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, X, ArrowUpDown, Eye, BarChart3, CheckCircle2, XCircle, Clock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { GET } from "@/lib/api"

const getInitials = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function PerformanceManagementPage() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [cyclesLoading, setCyclesLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [cycle, setCycle] = useState(null)
  const [traits, setTraits] = useState([])
  const [cycles, setCycles] = useState([])
  const [selectedCycleId, setSelectedCycleId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    fetchCycles()
  }, [])

  useEffect(() => {
    if (selectedCycleId || (!cyclesLoading && cycles.length > 0)) {
      fetchPerformanceData()
    }
  }, [selectedCycleId, departmentFilter, cyclesLoading, cycles.length, fetchPerformanceData])

  const fetchCycles = async () => {
    try {
      setCyclesLoading(true)
      const data = await GET('/api/reviews/cycles')
      setCycles(data || [])
      // Set the most recent cycle as default
      if (data && data.length > 0) {
        setSelectedCycleId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching cycles:', error)
    } finally {
      setCyclesLoading(false)
    }
  }

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCycleId) {
        params.append("cycle_id", selectedCycleId)
      }
      if (departmentFilter && departmentFilter !== "all") {
        params.append("department", departmentFilter)
      }

      const data = await GET(`/api/reviews/organization-performance?${params}`)

      setEmployees(data.employees || [])
      setCycle(data.cycle || null)
      setTraits(data.traits || [])

      // Extract unique departments
      const uniqueDepts = [...new Set(
        data.employees
          .map(emp => emp.department_name)
          .filter(Boolean)
      )]
      setDepartments(uniqueDepts)
    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const filteredAndSortedEmployees = employees
    .filter(employee => {
      const matchesSearch = !searchTerm ||
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department_name?.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })
    .sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case "name":
          aVal = a.name
          bVal = b.name
          break
        case "department":
          aVal = a.department_name || ""
          bVal = b.department_name || ""
          break
        case "competency":
          aVal = a.competency_score || 0
          bVal = b.competency_score || 0
          break
        case "tasks":
          aVal = a.task_completion_rate || 0
          bVal = b.task_completion_rate || 0
          break
        default:
          return 0
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  const clearFilters = () => {
    setSearchTerm("")
    setDepartmentFilter("all")
  }

  const getScoreColor = (score, outOf = 5) => {
    if (!score) return "text-gray-400"
    // Great score: >= 70% = black, otherwise gray
    const percentage = (score / outOf) * 100
    if (percentage >= 70) return "text-black font-semibold"
    return "text-gray-500"
  }

  if (loading || cyclesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Management</h1>
          <p className="text-muted-foreground">
            Monitor and analyze employee performance based on review cycles
          </p>
        </div>

        {/* Review Cycle Selector and Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Review Cycle:</span>
              </div>

              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select Review Cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.period})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {cycle && (
                <div className="text-sm text-muted-foreground">
                  {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                </div>
              )}
            </div>

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

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={clearFilters}
                className="whitespace-nowrap"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Performance Overview</CardTitle>
          <CardDescription>
            Showing {filteredAndSortedEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedEmployees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3" onClick={() => handleSort("name")}>
                      Employee <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3" onClick={() => handleSort("department")}>
                      Department <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3" onClick={() => handleSort("tasks")}>
                      Avg Task Rating <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3" onClick={() => handleSort("competency")}>
                      Weighted Competency <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Values Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEmployees.map((employee) => {
                  // Convert task score from 10-scale to 5-scale for display
                  const taskRating = employee.avg_task_score ? (employee.avg_task_score / 2) : null

                  return (
                    <TableRow
                      key={employee.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/performance/${employee.id}?cycle=${selectedCycleId}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{employee.department_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{employee.role_name || 'No role'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg">
                          {taskRating ? taskRating.toFixed(1) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg">
                          {employee.competency_score ? employee.competency_score.toFixed(1) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg">
                          {employee.values_score ? employee.values_score.toFixed(1) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/performance/${employee.id}?cycle=${selectedCycleId}`)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No employees found</h3>
              <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
