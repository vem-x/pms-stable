'use client'

import { useState, useEffect } from "react"
import { Plus, Users, Search, Filter, MoreHorizontal, Edit, Trash2, Mail, Eye, Send, Key } from "lucide-react"
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

function UserForm({ user, isOpen, onClose, onSubmit }) {
  console.log(user)
   const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    middle_name: user?.middle_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    skillset: user?.skillset || "",
    level: user?.level || "",
    job_title: user?.job_title || "",
    organization_id: user?.organization_id || "",
    role_id: user?.role_id || "",
    supervisor_id: user?.supervisor_id || "",
  })
  useEffect(() => {
  if (user) {
    setFormData({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      middle_name: user.middle_name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
      skillset: user.skillset || "",
      level: user.level || "",
      job_title: user.job_title || "",
      organization_id: user.organization_id || "",
      role_id: user.role_id || "",
      supervisor_id: user.supervisor_id || "",
    })
  } else {
    // Reset form when creating new user
    setFormData({
      first_name: "",
      last_name: "",
      middle_name: "",
      email: "",
      phone: "",
      address: "",
      skillset: "",
      level: "",
      job_title: "",
      organization_id: "",
      role_id: "",
      supervisor_id: "",
    })
  }
}, [user])

  

  const { data: organizations = [] } = useOrganizations()
  const { data: roles = [] } = useRoles()
  const [eligibleSupervisors, setEligibleSupervisors] = useState([])

  // Fetch eligible supervisors when organization or level changes
  useEffect(() => {
    const fetchSupervisors = async () => {
      if (!formData.organization_id) {
        setEligibleSupervisors([])
        return
      }

      try {
        const response = await GET(`/api/users?organization_id=${formData.organization_id}&status_filter=ACTIVE`)
        const filtered = response.users?.filter(u =>
          u.id !== user?.id && (!formData.level || u.level > formData.level)
        ) || []
        setEligibleSupervisors(filtered)
      } catch (error) {
        console.error('Error fetching supervisors:', error)
        setEligibleSupervisors([])
      }
    }

    fetchSupervisors()
  }, [formData.organization_id, formData.level, user?.id])

  const handleSubmit = (e) => {
    e.preventDefault()
    // Clean up form data - convert empty strings to null for UUID fields
    const cleanedData = {
      ...formData,
      supervisor_id: formData.supervisor_id || null,
      level: formData.level || null
    }
    onSubmit(cleanedData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {user ? 'Edit User' : 'Create User'}
            </DialogTitle>
            <DialogDescription>
              {user
                ? 'Update the user details below.'
                : 'Create a new user account. An onboarding email will be sent automatically.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="middle_name">Middle Name(s)</Label>
                <Input
                  id="middle_name"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@nigcomsat.gov.ng"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+234 123 456 7890"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street, Lagos, Nigeria"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="organization">Organizational Unit</Label>
                <SearchableSelect
                  value={formData.organization_id}
                  onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                  placeholder="Select organizational unit"
                  searchPlaceholder="Search units..."
                  options={organizations.map((org) => ({
                    value: org.id,
                    label: `${org.name} (${org.level})`
                  }))}
                  className="w-full overflow-x-hidden"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <SearchableSelect
                  value={formData.role_id}
                  onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                  placeholder="Select role"
                  searchPlaceholder="Search roles..."
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.name
                  }))}
                  className="relative w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="level">Grade Level</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  max="17"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || "" })}
                  placeholder="1-17 (Civil Service Grade Level)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="skillset">Skillset</Label>
                <Input
                  id="skillset"
                  value={formData.skillset}
                  onChange={(e) => setFormData({ ...formData, skillset: e.target.value })}
                  placeholder="JavaScript, React, Python, etc."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supervisor">Supervisor (Optional)</Label>
              <SearchableSelect
                value={formData.supervisor_id}
                onValueChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                placeholder="Select supervisor"
                searchPlaceholder="Search supervisors..."
                options={eligibleSupervisors.map(u => ({
                  value: u.id,
                  label: `${u.name} (Level ${u.level})`
                }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Must be from same unit with higher grade level</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {user ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UserDetailsDialog({ user, isOpen, onClose }) {
  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user.profile_image_url ? `${process.env.NEXT_PUBLIC_API_URL}${user.profile_image_url}` : undefined}
                alt={user.name || 'User'}
              />
              <AvatarFallback>
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Job Title</Label>
              <p className="mt-1">{user.job_title || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Level</Label>
              <p className="mt-1">{user.level || 'Not specified'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Organizational Unit</Label>
              <p className="mt-1">{user.organization_name || 'Not assigned'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Role</Label>
              <p className="mt-1">{user.role_name || 'Not assigned'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
              <p className="mt-1">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <Badge className={`mt-1 ${statusColors[user.status]}`}>
                {statusLabels[user.status]}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Address</Label>
            <p className="mt-1">{user.address || 'Not provided'}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">Skillset</Label>
            <p className="mt-1">{user.skillset || 'Not specified'}</p>
          </div>

          {user.supervisor_id && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Supervisor</Label>
              <p className="mt-1">{user.supervisor_name || 'Unknown'}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p className="mt-1">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
              <p className="mt-1">{new Date(user.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Confirmation Dialog Component
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [viewingUser, setViewingUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', description: '', onConfirm: () => {} })

  const { data: users = [], isLoading } = useUsers({
    page: currentPage,
    per_page: 50,
    ...(searchQuery && { search: searchQuery }),
    ...(statusFilter !== "all" && { status_filter: statusFilter })
  })
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

  const handleView = (user) => {
    setViewingUser(user)
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

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingUser(null)
  }

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

  const filteredUsers = enhancedUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              Users ({filteredUsers.length})
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
            ) : filteredUsers.length > 0 ? (
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
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
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
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>

                            {/* Status Actions */}
                            {user.status === 'ACTIVE' ? (
                              <>
                                <DropdownMenuItem onClick={() => handleSendPasswordReset(user)}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Send Password Reset
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(user, 'SUSPENDED')}>
                                  Suspend
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(user, 'ON_LEAVE')}>
                                  Mark as On Leave
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(user, 'ARCHIVED')}>
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : user.status === 'PENDING_ACTIVATION' ? (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Resend Invite Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(user, 'ARCHIVED')}>
                                  Archive
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(user, 'ACTIVE')}>
                                  Reactivate
                                </DropdownMenuItem>
                                {user.status !== 'ARCHIVED' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(user, 'ARCHIVED')}>
                                    Archive
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
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
                  {searchQuery || statusFilter !== 'all'
                    ? 'No users match your current filters.'
                    : 'Get started by creating your first user.'}
                </p>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
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
        />

        <UserDetailsDialog
          user={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
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