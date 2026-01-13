'use client'

import { useState } from "react"
import { Plus, Building2, Users, Edit, Trash2, MoreHorizontal } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { PermissionGuard } from "@/lib/auth-context"
import {
  useOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from "@/lib/react-query"

const levelColors = {
  GLOBAL: "bg-blue-100 text-blue-800",
  DIRECTORATE: "bg-green-100 text-green-800",
  DEPARTMENT: "bg-orange-100 text-orange-800",
  DIVISION: "bg-purple-100 text-purple-800",
  UNIT: "bg-gray-100 text-gray-800"
}

const levelLabels = {
  GLOBAL: "Global",
  DIRECTORATE: "Directorate",
  DEPARTMENT: "Department",
  DIVISION: "Division",
  UNIT: "Unit"
}

function OrganizationForm({ organization, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: organization?.name || "",
    description: organization?.description || "",
    level: organization?.level || "DIRECTORATE",
    parent_id: organization?.parent_id || ""
  })

  const { data: organizations = [] } = useOrganizations()

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  const organizationsArray = Array.isArray(organizations) ? organizations : []
  const parentOptions = organizationsArray.filter(org => {
    const currentLevel = formData.level
    // 5-level hierarchy: Global → Directorate → Department → Division → Unit
    if (currentLevel === 'GLOBAL') return false
    if (currentLevel === 'DIRECTORATE') return org.level === 'GLOBAL'
    if (currentLevel === 'DEPARTMENT') return org.level === 'DIRECTORATE'
    if (currentLevel === 'DIVISION') return org.level === 'DEPARTMENT'
    if (currentLevel === 'UNIT') return org.level === 'DIVISION'
    return false
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {organization ? 'Edit Unit' : 'Add Unit'}
            </DialogTitle>
            <DialogDescription>
              {organization
                ? 'Update the unit details below.'
                : 'Add a new unit to Nigcomsat organizational hierarchy.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Organization name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value, parent_id: "" })}
                disabled={!!organization} // Don't allow level change when editing
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="DIRECTORATE">Directorate</SelectItem>
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                  <SelectItem value="DIVISION">Division</SelectItem>
                  <SelectItem value="UNIT">Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.level !== 'GLOBAL' && (
              <div className="grid gap-2">
                <Label htmlFor="parent">Parent Organization</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({levelLabels[org.level]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Organization description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {organization ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function OrganizationCard({ organization, onEdit, onDelete, getParentName }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{organization.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={levelColors[organization.level]}>
              {levelLabels[organization.level]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(organization)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(organization)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-3">
          {organization.description || "No description provided"}
        </CardDescription>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>0 users</span>
          </div>
          {organization.parent_id && (
            <div>
              Parent: {getParentName(organization.parent_id)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function OrganizationPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState(null)
  const [filter, setFilter] = useState('all')

  const { data: organizations = [], isLoading } = useOrganizations()
  const createMutation = useCreateOrganization()
  const updateMutation = useUpdateOrganization()
  const deleteMutation = useDeleteOrganization()

  const handleCreate = (data) => {
    createMutation.mutate(data)
  }

  const handleUpdate = (data) => {
    if (editingOrganization) {
      updateMutation.mutate({ id: editingOrganization.id, ...data })
    }
  }

  const handleEdit = (organization) => {
    setEditingOrganization(organization)
    setIsFormOpen(true)
  }

  const handleDelete = (organization) => {
    if (confirm(`Are you sure you want to delete "${organization.name}"?`)) {
      deleteMutation.mutate(organization.id)
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingOrganization(null)
  }

  const organizationsArray = Array.isArray(organizations) ? organizations : []

  // Helper function to get parent organization name
  const getParentName = (parentId) => {
    if (!parentId) return null
    const parent = organizationsArray.find(org => org.id === parentId)
    return parent ? parent.name : 'Unknown'
  }
  const filteredOrganizations = organizationsArray.filter(org => {
    if (filter === 'all') return true
    return org.level === filter
  })

  const organizationsByLevel = {
    GLOBAL: filteredOrganizations.filter(org => org.level === 'GLOBAL'),
    DIRECTORATE: filteredOrganizations.filter(org => org.level === 'DIRECTORATE'),
    DEPARTMENT: filteredOrganizations.filter(org => org.level === 'DEPARTMENT'),
    DIVISION: filteredOrganizations.filter(org => org.level === 'DIVISION'),
    UNIT: filteredOrganizations.filter(org => org.level === 'UNIT'),
  }

  return (
    <PermissionGuard permission="organization_create">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Organization Structure</h1>
              <p className="text-muted-foreground">
                Manage the organizational hierarchy and structure
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Levels
          </Button>
          {Object.entries(levelLabels).map(([level, label]) => (
            <Button
              key={level}
              variant={filter === level ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(level)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Organizations Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(organizationsByLevel).map(([level, orgs]) => {
              if (filter !== 'all' && filter !== level) return null
              if (orgs.length === 0) return null

              return (
                <div key={level}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Badge className={levelColors[level]}>
                      {levelLabels[level]}
                    </Badge>
                    <span className="text-muted-foreground">({orgs.length})</span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {orgs.map((organization) => (
                      <OrganizationCard
                        key={organization.id}
                        organization={organization}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        getParentName={getParentName}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredOrganizations.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No organizations found</h3>
                <p className="text-muted-foreground mb-4">
                  {filter === 'all'
                    ? 'Get started by creating your first organizational unit.'
                    : `No organizations found at the ${levelLabels[filter]} level.`}
                </p>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Unit
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Form Dialog */}
        <OrganizationForm
          organization={editingOrganization}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingOrganization ? handleUpdate : handleCreate}
        />
      </div>
    </PermissionGuard>
  )
}