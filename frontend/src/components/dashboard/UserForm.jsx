"use client"
import { useState, useEffect } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"

export function UserForm({
  user,
  isOpen,
  onClose,
  onSubmit,
  organizations = [],
  roles = [],
  onFetchSupervisors,
  loading = false,
}) {
  const [formData, setFormData] = useState({
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

  const [eligibleSupervisors, setEligibleSupervisors] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [touched, setTouched] = useState({})

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
      resetForm()
    }
    setError(null)
    setTouched({})
  }, [user, isOpen])

  useEffect(() => {
    const fetchSupervisors = async () => {
      if (!formData.organization_id || !onFetchSupervisors) {
        setEligibleSupervisors([])
        return
      }

      try {
        const supervisors = await onFetchSupervisors(
          formData.organization_id,
          formData.level ? Number(formData.level) : undefined,
        )
        setEligibleSupervisors(supervisors || [])
      } catch (err) {
        console.error("Error fetching supervisors:", err)
        setEligibleSupervisors([])
      }
    }

    fetchSupervisors()
  }, [formData.organization_id, formData.level, onFetchSupervisors])

  const resetForm = () => {
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

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      setError("First name is required")
      return false
    }
    if (!formData.last_name.trim()) {
      setError("Last name is required")
      return false
    }
    if (!formData.email.trim()) {
      setError("Email is required")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }
    if (formData.level && (Number(formData.level) < 1 || Number(formData.level) > 17)) {
      setError("Grade level must be between 1 and 17")
      return false
    }
    setError(null)
    return true
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      const cleanedData = {
        ...formData,
        supervisor_id: formData.supervisor_id || null,
        level: formData.level ? Number(formData.level) : null,
      }
      await onSubmit(cleanedData)
      resetForm()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const isFieldInvalid = (field) => {
    if (!touched[field]) return false
    if (field === "first_name" || field === "last_name") {
      return !formData[field]?.toString().trim()
    }
    if (field === "email") {
      const email = formData[field]?.toString() || ""
      return !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }
    return false
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold">{user ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription className="text-base">
              {user
                ? "Update the user details below. Changes will be saved immediately."
                : "Create a new user account. An onboarding email will be sent automatically."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label
                    htmlFor="first_name"
                    className={cn("text-sm font-medium", isFieldInvalid("first_name") && "text-destructive")}
                  >
                    First Name *
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    onBlur={() => handleBlur("first_name")}
                    placeholder="John"
                    disabled={submitting || loading}
                    className={cn(isFieldInvalid("first_name") && "border-destructive focus:ring-destructive")}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label
                    htmlFor="last_name"
                    className={cn("text-sm font-medium", isFieldInvalid("last_name") && "text-destructive")}
                  >
                    Last Name *
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    onBlur={() => handleBlur("last_name")}
                    placeholder="Doe"
                    disabled={submitting || loading}
                    className={cn(isFieldInvalid("last_name") && "border-destructive focus:ring-destructive")}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="middle_name" className="text-sm font-medium">
                    Middle Name(s)
                  </Label>
                  <Input
                    id="middle_name"
                    value={formData.middle_name}
                    onChange={(e) => handleChange("middle_name", e.target.value)}
                    placeholder="Optional"
                    disabled={submitting || loading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label
                    htmlFor="email"
                    className={cn("text-sm font-medium", isFieldInvalid("email") && "text-destructive")}
                  >
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    placeholder="john@example.com"
                    disabled={submitting || loading}
                    className={cn(isFieldInvalid("email") && "border-destructive focus:ring-destructive")}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    disabled={submitting || loading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="job_title" className="text-sm font-medium">
                    Job Title
                  </Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => handleChange("job_title", e.target.value)}
                    placeholder="Software Engineer"
                    disabled={submitting || loading}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="address" className="text-sm font-medium">
                  Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main Street, City, State"
                  disabled={submitting || loading}
                />
              </div>
            </div>

            {/* Organization Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Organization Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="organization" className="text-sm font-medium">
                    Organizational Unit
                  </Label>
                  <SearchableSelect
                    value={formData.organization_id || ""}
                    onValueChange={(value) => handleChange("organization_id", value)}
                    placeholder="Select organizational unit"
                    searchPlaceholder="Search units..."
                    options={organizations.map((org) => ({
                      value: org.id,
                      label: `${org.name} (Level ${org.level})`,
                    }))}
                    disabled={submitting || loading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role
                  </Label>
                  <SearchableSelect
                    value={formData.role_id || ""}
                    onValueChange={(value) => handleChange("role_id", value)}
                    placeholder="Select role"
                    searchPlaceholder="Search roles..."
                    options={roles.map((role) => ({
                      value: role.id,
                      label: role.name,
                    }))}
                    disabled={submitting || loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="grid gap-3">
                  <Label htmlFor="level" className="text-sm font-medium">
                    Grade Level
                  </Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="17"
                    value={formData.level}
                    onChange={(e) => handleChange("level", e.target.value ? Number.parseInt(e.target.value) : "")}
                    placeholder="1-17 (Civil Service Grade)"
                    disabled={submitting || loading}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="skillset" className="text-sm font-medium">
                    Skillset
                  </Label>
                  <Input
                    id="skillset"
                    value={formData.skillset}
                    onChange={(e) => handleChange("skillset", e.target.value)}
                    placeholder="e.g., JavaScript, React, Python"
                    disabled={submitting || loading}
                  />
                </div>
              </div>
            </div>

            {/* Supervisor Section */}
            <div className="space-y-4">
              <div className="grid gap-3">
                <Label htmlFor="supervisor" className="text-sm font-medium">
                  Supervisor (Optional)
                </Label>
                <SearchableSelect
                  value={formData.supervisor_id || ""}
                  onValueChange={(value) => handleChange("supervisor_id", value)}
                  placeholder="Select supervisor"
                  searchPlaceholder="Search supervisors..."
                  options={eligibleSupervisors.map((u) => ({
                    value: u.id,
                    label: `${u.name} (Level ${u.level})`,
                  }))}
                  disabled={submitting || loading || !formData.organization_id}
                />
                <p className="text-xs text-muted-foreground">Must be from same unit with higher grade level</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting || loading}
              className="px-6 bg-transparent"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loading} className="px-6 gap-2">
              {submitting || loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {user ? "Updating..." : "Creating..."}
                </>
              ) : user ? (
                "Update User"
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
