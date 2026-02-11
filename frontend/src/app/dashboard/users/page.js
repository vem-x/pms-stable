'use client'

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users, Search, Filter, MoreHorizontal, Edit, Trash2, Mail, Eye, Send, Key, ChevronLeft, ChevronRight, Ban, CalendarOff, Archive, UserCheck } from "lucide-react"
import { GET, POST } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { PermissionGuard } from "@/lib/auth-context"
import {
  useUsers,
  useOrganizations,
  useRoles,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
} from "@/lib/react-query"
import { UserForm } from "@/components/dashboard/UserForm"

const statusColors = {
  PENDING_ACTIVATION: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
  ON_LEAVE: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-800"
}

const statusLabels = {
  PENDING_ACTIVATION: "Pending Activation",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ON_LEAVE: "On Leave",
  ARCHIVED: "Archived"
}

function ConfirmDialog({ isOpen, onClose, onConfirm, title, description }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            onConfirm()
            onClose()
          }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', description: '', onConfirm: () => {} })

  // Debounce search input - wait 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading } = useUsers({
    page: currentPage,
    per_page: perPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status_filter: statusFilter })
  })
  const users = data?.users || []
  const totalUsers = data?.total || 0
  const totalPages = Math.ceil(totalUsers / perPage)
  const { data: organizations = [] } = useOrganizations()
  const { data: roles = [] } = useRoles()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const updateStatusMutation = useUpdateUserStatus()

  const handleCreate = (data) => {
    createMutation.mutate(data)
  }

  const handleUpdate = (data) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, ...data })
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleStatusChange = (user, newStatus) => {
    updateStatusMutation.mutate({ id: user.id, status: newStatus })
  }

  const handleResendInvite = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Resend Onboarding Invite',
      description: `Send a new onboarding invite to ${user.email}?`,
      onConfirm: async () => {
        try {
          await POST(`/api/users/${user.id}/resend-onboarding`, {})
          toast.success(`Onboarding invite successfully resent to ${user.email}`)
        } catch (error) {
          console.error('Error resending invite:', error)
          toast.error(error.message || 'Failed to resend invite')
        }
      }
    })
  }

  const handleSendPasswordReset = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Send Password Reset Link',
      description: `Send a password reset link to ${user.email}?`,
      onConfirm: async () => {
        try {
          await POST(`/api/users/${user.id}/send-password-reset`, {})
          toast.success(`Password reset link successfully sent to ${user.email}`)
        } catch (error) {
          console.error('Error sending password reset:', error)
          toast.error(error.message || 'Failed to send password reset link')
        }
      }
    })
  }

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User Permanently',
      description: `Are you sure you want to permanently delete ${user.name} (${user.email})? This action cannot be undone and will remove all associated data.`,
      onConfirm: async () => {
        try {
          const { DELETE } = await import('@/lib/api')
          await DELETE(`/api/users/${user.id}`)
          toast.success(`User ${user.name} has been permanently deleted`)
          refetchUsers()
        } catch (error) {
          console.error('Error deleting user:', error)
          toast.error(error.message || 'Failed to delete user. They may have associated data that must be removed first.')
        }
      }
    })
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingUser(null)
  }

  // Fetch eligible supervisors for a given organization and level
  const fetchEligibleSupervisors = useCallback(async (organizationId, userLevel) => {
    if (!organizationId) return []

    const usersArray = Array.isArray(users) ? users : []

    // Filter users from the same organization who could be supervisors
    const eligibleSupervisors = usersArray.filter(user => {
      // Must be from the same organization
      if (user.organization_id !== organizationId) return false

      // Must be active
      if (user.status !== 'ACTIVE') return false

      // Exclude the user being edited
      if (editingUser && user.id === editingUser.id) return false

      // If userLevel is provided, supervisor should have a higher level (lower number = higher rank)
      // Or we could require supervisor to have a higher level number depending on system design
      // For now, just return all active users from same org as potential supervisors
      if (userLevel && user.level) {
        // Assuming higher level number = more senior (adjust if needed)
        return Number(user.level) > Number(userLevel)
      }

      return true
    }).map(user => ({
      id: user.id,
      name: user.name || [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' '),
      level: user.level,
      job_title: user.job_title,
    }))

    return eligibleSupervisors
  }, [users, editingUser])

  // Helper functions to get organization and role names
  const getOrganizationName = (orgId) => {
    const organizationsArray = Array.isArray(organizations) ? organizations : []
    const org = organizationsArray.find(o => o.id === orgId)
    return org ? org.name : 'Unknown Organization'
  }

  const getRoleName = (roleId) => {
    const rolesArray = Array.isArray(roles) ? roles : []
    const role = rolesArray.find(r => r.id === roleId)
    return role ? role.name : 'Unknown Role'
  }

  // Enhance users with organization and role names and computed name
  const usersArray = Array.isArray(users) ? users : []
  const enhancedUsers = usersArray.map(user => ({
    ...user,
    organization_name: user.organization_name || getOrganizationName(user.organization_id),
    role_name: user.role_name || getRoleName(user.role_id),
    // Compute full name from separate fields if not provided by backend
    name: user.name || [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ')
  }))

  // Search and status filtering is now handled server-side

  return (
    <PermissionGuard permission="user_view_all">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground">
                Manage users, roles, and permissions across the organization
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1) }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING_ACTIVATION">Pending Activation</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({totalUsers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : enhancedUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organizational Unit</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enhancedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/users/${user.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.profile_image_url ? `${process.env.NEXT_PUBLIC_API_URL}${user.profile_image_url}` : undefined}
                              alt={user.name || 'User'}
                            />
                            <AvatarFallback>
                              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.organization_name}</div>
                          <div className="text-sm text-muted-foreground">{user.job_title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.status]}>
                          {statusLabels[user.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(user); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>

                            {/* Status Actions */}
                            {user.status === 'ACTIVE' ? (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendPasswordReset(user); }}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Send Password Reset
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(user, 'SUSPENDED'); }}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(user, 'ON_LEAVE'); }}>
                                  <CalendarOff className="mr-2 h-4 w-4" />
                                  Mark as On Leave
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(user, 'ARCHIVED'); }}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : user.status === 'PENDING_ACTIVATION' ? (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleResendInvite(user); }}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Resend Invite Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(user, 'ARCHIVED'); }}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(user, 'ACTIVE'); }}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Reactivate
                                </DropdownMenuItem>
                                {user.status !== 'ARCHIVED' && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(user, 'ARCHIVED'); }}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Delete Option - available for all statuses */}
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDeleteUser(user); }}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No users found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchInput || statusFilter !== 'all'
                    ? 'No users match your current filters.'
                    : 'Get started by creating your first user.'}
                </p>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(perPage)} onValueChange={(val) => { setPerPage(Number(val)); setCurrentPage(1) }}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <UserForm
          user={editingUser}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingUser ? handleUpdate : handleCreate}
          organizations={organizations}
          roles={roles}
          onFetchSupervisors={fetchEligibleSupervisors}
        />

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          description={confirmDialog.description}
        />
      </div>
    </PermissionGuard>
  )
}