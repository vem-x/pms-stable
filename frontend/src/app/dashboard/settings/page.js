'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Upload, Trash2, Loader2 } from 'lucide-react'
import { PUT, DELETE } from '@/lib/api'
import Cookies from 'js-cookie'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    address: '',
    skillset: ''
  })

  // Update profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        middle_name: user.middle_name || '',
        phone: user.phone || '',
        address: user.address || '',
        skillset: user.skillset || ''
      })
    }
  }, [user])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await PUT('/api/users/me', profileData)
      await refreshUser()
      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must not exceed 5MB' })
      return
    }

    setUploadingImage(true)
    setMessage({ type: '', text: '' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Get token from cookies (same way the API client does)
      const token = Cookies.get('auth_token')
      if (!token) {
        throw new Error('Authentication required. Please log in again.')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to upload image')
      }

      await refreshUser()
      setMessage({ type: 'success', text: 'Profile image uploaded successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile image?')) return

    setUploadingImage(true)
    setMessage({ type: '', text: '' })

    try {
      await DELETE('/api/users/me/profile-image')
      await refreshUser()
      setMessage({ type: 'success', text: 'Profile image deleted successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete image' })
    } finally {
      setUploadingImage(false)
    }
  }

  const getInitials = () => {
    if (!user) return 'U'
    const first = user.first_name?.[0] || ''
    const last = user.last_name?.[0] || ''
    return (first + last).toUpperCase()
  }

  // Show loading state while user data is loading
  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and profile</p>
      </div>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Image
            </CardTitle>
            <CardDescription>Upload a profile picture to personalize your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={user?.profile_image_url ? `${process.env.NEXT_PUBLIC_API_URL}${user.profile_image_url}` : undefined}
                  alt={user?.name || 'User'}
                />
                <AvatarFallback className="text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={uploadingImage}
                    onClick={() => document.getElementById('profile-image-input')?.click()}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload New Image
                      </>
                    )}
                  </Button>

                  {user?.profile_image_path && (
                    <Button
                      variant="outline"
                      disabled={uploadingImage}
                      onClick={handleImageDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Recommended: Square image, at least 200x200px. Max size: 5MB
                </p>

                <input
                  id="profile-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name (Optional)</Label>
                <Input
                  id="middle_name"
                  value={profileData.middle_name}
                  onChange={(e) => setProfileData({ ...profileData, middle_name: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skillset">Skills</Label>
                <Input
                  id="skillset"
                  value={profileData.skillset}
                  onChange={(e) => setProfileData({ ...profileData, skillset: e.target.value })}
                  placeholder="E.g., Project Management, Python, Communication"
                  disabled={loading}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Information (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your organization and role details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{user?.email}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Job Title</Label>
                <p className="font-medium">{user?.job_title || 'Not set'}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Organization</Label>
                <p className="font-medium">{user?.organization_name}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="font-medium">{user?.role_name}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="font-medium capitalize">{user?.status?.replace('_', ' ')}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Level</Label>
                <p className="font-medium">{user?.level || 'Not set'}</p>
              </div>

              {user?.supervisor_name && (
                <div>
                  <Label className="text-muted-foreground">Supervisor</Label>
                  <p className="font-medium">{user.supervisor_name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
