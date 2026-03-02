'use client'

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Printer, FileText } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import { GET } from "@/lib/api"

// ─── Scoring helpers ────────────────────────────────────────────────────────

function avgSupervisorScore(goals) {
  const scored = goals
    .filter(g => g.status?.toUpperCase() !== 'DISCARDED' && g.supervisor_score != null)
    .map(g => Number(g.supervisor_score))
  if (!scored.length) return null
  return Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

function scoreColor(score, outOf = 5) {
  if (score == null) return "text-gray-400"
  const pct = score / outOf
  if (pct >= 0.8) return "text-green-700"
  if (pct >= 0.6) return "text-blue-700"
  if (pct >= 0.4) return "text-yellow-600"
  return "text-red-600"
}

function StatusPill({ status, achieved }) {
  const s = status?.toUpperCase()
  if (s === 'COMPLETED' && achieved) {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">Completed · Achieved</span>
  }
  if (s === 'COMPLETED') {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">Completed</span>
  }
  if (s === 'ACHIEVED') {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800">Achieved</span>
  }
  if (s === 'ACTIVE') {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">Active</span>
  }
  if (s === 'DISCARDED') {
    return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">Discarded</span>
  }
  return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 capitalize">{status}</span>
}

function fmtTarget(kpi) {
  if (kpi.target_value == null) return '—'
  return kpi.target_unit ? `${kpi.target_value} ${kpi.target_unit}` : String(kpi.target_value)
}

function fmtActual(kpi) {
  if (kpi.actual_value == null) return '—'
  return kpi.target_unit ? `${kpi.actual_value} ${kpi.target_unit}` : String(kpi.actual_value)
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ letter, title, children }) {
  return (
    <div className="scorecard-section border border-gray-300 rounded-none print:rounded-none overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 border-b border-gray-300">
        <span className="font-bold text-sm">{letter}.</span>
        <span className="font-semibold text-sm uppercase tracking-wider">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function EmployeeScorecardPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token } = useAuth()

  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState(null)
  const [cycle, setCycle] = useState(null)
  const [goals, setGoals] = useState([])

  const cycleId = searchParams.get('cycle')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const qp = new URLSearchParams()
      if (cycleId) qp.append('cycle_id', cycleId)

      const [perfData, goalsData, userData] = await Promise.all([
        GET(`/api/reviews/organization-performance?${qp}`).catch(() => null),
        GET(`/api/goals?owner_id=${params.employeeId}&scope=INDIVIDUAL&per_page=100`).catch(() => ({ goals: [] })),
        GET(`/api/users/${params.employeeId}`).catch(() => null),
      ])

      // Try to get employee from org-performance (has review scores)
      const emp = perfData?.employees?.find(e => e.id === params.employeeId)
      if (emp) {
        setEmployee(emp)
        setCycle(perfData.cycle)
      } else if (userData) {
        // Fall back to plain user profile (no review scores yet)
        setEmployee({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          department_name: userData.organization_name || userData.organization?.name || null,
          role_name: userData.job_title || userData.role_name || null,
          competency: [],
          competency_score: null,
          values: [],
          values_score: null,
        })
      }

      const goalsList = Array.isArray(goalsData) ? goalsData : (goalsData?.goals || [])
      setGoals(goalsList)
    } catch (err) {
      console.error('Scorecard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [params.employeeId, cycleId])

  useEffect(() => { if (params.employeeId) fetchData() }, [params.employeeId, cycleId, fetchData])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Scorecard Not Found</h2>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    )
  }

  // Filter goals by review cycle quarter when applicable
  const cycleQuarter = cycle?.period?.match(/^(Q[1-4])/)?.[1]
  const cycleYear = cycle?.period?.match(/\b(\d{4})\b/)?.[1]
  const filteredGoals = cycleQuarter
    ? goals.filter(g => g.quarter === cycleQuarter && (cycleYear ? String(g.year) === cycleYear : true))
    : goals

  const goalsAggregate = avgSupervisorScore(filteredGoals)
  const overallScore = [goalsAggregate, employee.competency_score, employee.values_score]
    .filter(s => s != null)
    .reduce((a, b, _, arr) => a + b / arr.length, 0) || null

  const periodLabel = cycle
    ? `${cycle.name} · ${new Date(cycle.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(cycle.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : '—'

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print Scorecard
        </Button>
      </div>

      {/* ── Document ── */}
      <div className="border border-gray-300 rounded-sm font-sans text-sm bg-white text-gray-900 scorecard-table">

        {/* ── Letterhead ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
          <div className="flex items-center gap-3">
            <Image src="/icon_light.png" alt="Nigcomsat" width={48} height={48} className="object-contain" />
            <div>
              <p className="font-bold text-base leading-tight">NIGCOMSAT LIMITED</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Performance Management System</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-base uppercase">Employee Scorecard</p>
            <p className="text-xs text-gray-500">{periodLabel}</p>
          </div>
        </div>

        {/* ── Employee Info ── */}
        <div className="border-b border-gray-300">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-4 py-2 font-semibold bg-gray-50 w-36 uppercase text-xs text-gray-500">Name</td>
                <td className="px-4 py-2 font-medium">{employee.name}</td>
                <td className="px-4 py-2 font-semibold bg-gray-50 w-36 uppercase text-xs text-gray-500">Role / Title</td>
                <td className="px-4 py-2">{employee.role_name || '—'}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-semibold bg-gray-50 uppercase text-xs text-gray-500">Department</td>
                <td className="px-4 py-2">{employee.department_name || '—'}</td>
                <td className="px-4 py-2 font-semibold bg-gray-50 uppercase text-xs text-gray-500">Review Period</td>
                <td className="px-4 py-2 text-xs">{periodLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Main content ── */}
        <div className="p-4 space-y-4">

          {/* ── Section A: Goals & KPIs ── */}
          <Section letter="A" title="Goals & Key Performance Indicators">
            {filteredGoals.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">
                {cycleQuarter ? `No ${cycleQuarter} goals assigned for this period` : 'No goals assigned for this period'}
              </p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider">
                    <th className="border-b border-gray-200 px-3 py-2 text-left">Goal</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left w-16">Period</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left">KPI</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-center w-24">Target</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-center w-24">Actual</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-right w-16">Sup. Score</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left w-36">Employee Comment</th>
                    <th className="border-b border-gray-200 px-3 py-2 text-left w-36">Supervisor Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGoals.map((goal) => {
                    const isDiscarded = goal.status?.toUpperCase() === 'DISCARDED'
                    const kpiCount = goal.kpis?.length || 1
                    const period = goal.quarter || (goal.type === 'YEARLY' ? 'Yearly' : goal.type)

                    return (goal.kpis?.length > 0 ? goal.kpis : [{}]).map((kpi, ki) => {
                      const isFirstKpi = ki === 0

                      return (
                        <tr
                          key={kpi.id ? `${goal.id}-kpi-${kpi.id}` : `${goal.id}-nokpi-${ki}`}
                          className={`border-b border-gray-100 ${isDiscarded ? 'opacity-50' : ''}`}
                        >
                          {isFirstKpi && (
                            <td className="px-3 py-2 align-top border-r border-gray-200 bg-gray-50 font-semibold text-gray-800" rowSpan={kpiCount}>
                              {goal.title}
                            </td>
                          )}
                          {isFirstKpi && (
                            <td className="px-3 py-2 align-top border-r border-gray-200 bg-gray-50 text-gray-600 font-medium" rowSpan={kpiCount}>
                              {period}
                            </td>
                          )}
                          <td className="px-3 py-1.5 text-gray-600">
                            {kpi.description || <span className="italic text-gray-400">No KPI</span>}
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-500 tabular-nums">
                            {kpi.target_value != null ? fmtTarget(kpi) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-center text-gray-700 tabular-nums font-medium">
                            {fmtActual(kpi)}
                          </td>
                          {isFirstKpi && (
                            <td className="px-3 py-2 align-top text-right font-semibold tabular-nums text-emerald-700" rowSpan={kpiCount}>
                              {goal.supervisor_score != null ? `${Number(goal.supervisor_score).toFixed(1)} / 5` : '—'}
                            </td>
                          )}
                          {isFirstKpi && (
                            <td className="px-3 py-2 align-top text-gray-600 italic" rowSpan={kpiCount}>
                              {goal.employee_comment || <span className="text-gray-300">—</span>}
                            </td>
                          )}
                          {isFirstKpi && (
                            <td className="px-3 py-2 align-top text-gray-600 italic" rowSpan={kpiCount}>
                              {goal.supervisor_comment || <span className="text-gray-300">—</span>}
                            </td>
                          )}
                        </tr>
                      )
                    })
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold text-xs border-t border-gray-300">
                    <td colSpan={7} className="px-3 py-2 text-right uppercase text-gray-500 text-[10px] tracking-wider">
                      Avg. Supervisor Score
                    </td>
                    <td className={`px-3 py-2 text-right font-bold text-sm ${scoreColor(goalsAggregate)}`}>
                      {goalsAggregate != null ? `${goalsAggregate.toFixed(1)} / 5` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Section>

          {/* ── Section B: Competency ── */}
          <Section letter="B" title="Competency Framework">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider">
                  <th className="border-b border-gray-200 px-3 py-2 text-left w-7">#</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-left">Competency Area</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-right w-24">Score /5</th>
                </tr>
              </thead>
              <tbody>
                {(!employee.competency || employee.competency.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No competency data for this cycle</td>
                  </tr>
                ) : employee.competency.map((c, i) => (
                  <tr key={c.trait_id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{c.trait_name}</td>
                    <td className={`px-3 py-2 text-right font-bold ${scoreColor(c.weighted_score)}`}>
                      {c.weighted_score != null ? c.weighted_score.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {employee.competency?.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t border-gray-300">
                    <td colSpan={2} className="px-3 py-2 text-right uppercase text-gray-500 text-[10px] tracking-wider">
                      Overall Competency Score
                    </td>
                    <td className={`px-3 py-2 text-right font-bold text-sm ${scoreColor(employee.competency_score)}`}>
                      {employee.competency_score != null ? `${employee.competency_score.toFixed(2)} / 5` : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Section>

          {/* ── Section C: Core Values ── */}
          <Section letter="C" title="Core Values / Behavioural">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] tracking-wider">
                  <th className="border-b border-gray-200 px-3 py-2 text-left w-7">#</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-left">Value</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-right w-24">Score /5</th>
                </tr>
              </thead>
              <tbody>
                {(!employee.values || employee.values.length === 0) ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No core values data for this cycle</td>
                  </tr>
                ) : employee.values.map((v, i) => (
                  <tr key={v.trait_id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium uppercase">{v.trait_name}</td>
                    <td className={`px-3 py-2 text-right font-bold ${scoreColor(v.weighted_score)}`}>
                      {v.weighted_score != null ? v.weighted_score.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {employee.values?.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t border-gray-300">
                    <td colSpan={2} className="px-3 py-2 text-right uppercase text-gray-500 text-[10px] tracking-wider">
                      Overall Core Values Score
                    </td>
                    <td className={`px-3 py-2 text-right font-bold text-sm ${scoreColor(employee.values_score)}`}>
                      {employee.values_score != null ? `${employee.values_score.toFixed(2)} / 5` : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Section>

          {/* ── Summary ── */}
          <Section letter="★" title="Performance Summary">
            <table className="w-full text-xs border-collapse">
              <tbody>
                {[
                  { label: "Avg. Supervisor Score", value: goalsAggregate },
                  { label: "Weighted Competency Score", value: employee.competency_score },
                  { label: "Core Values Score", value: employee.values_score },
                ].map(({ label, value }) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">{label}</td>
                    <td className={`px-4 py-2 text-right font-bold ${scoreColor(value)}`}>
                      {value != null ? `${Number(value).toFixed(2)} / 5` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-900 text-white font-bold">
                  <td className="px-4 py-3 uppercase tracking-wide text-sm">Overall Performance Score</td>
                  <td className="px-4 py-3 text-right text-lg">
                    {overallScore != null ? `${overallScore.toFixed(2)} / 5` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between text-[10px] text-gray-400">
          <span>Generated by Nigcomsat PMS · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <span>CONFIDENTIAL</span>
        </div>
      </div>
    </div>
  )
}
