'use client'

import { useState } from 'react'
import { Plus, Check, X, Edit2, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  useInitiativeSubTasks,
  useCreateSubTask,
  useUpdateSubTask,
  useDeleteSubTask
} from '@/lib/react-query'

function SubTaskItem({ subTask, initiativeId, onEdit, onDelete, onToggle }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subTask.title)
  const [editDescription, setEditDescription] = useState(subTask.description || '')

  const updateMutation = useUpdateSubTask()

  const handleSave = () => {
    updateMutation.mutate({
      initiativeId,
      subTaskId: subTask.id,
      subTask: {
        title: editTitle,
        description: editDescription
      }
    }, {
      onSuccess: () => {
        setIsEditing(false)
      }
    })
  }

  const handleToggle = () => {
    const newStatus = subTask.status === 'completed' ? 'pending' : 'completed'
    updateMutation.mutate({
      initiativeId,
      subTaskId: subTask.id,
      subTask: {
        status: newStatus
      }
    })
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/50">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Sub-task title"
          className="font-medium"
        />
        <Textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="text-sm"
        />
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsEditing(false)
              setEditTitle(subTask.title)
              setEditDescription(subTask.description || '')
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!editTitle.trim()}
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
      subTask.status === 'completed' ? 'bg-green-50/50' : ''
    }`}>
      <Checkbox
        checked={subTask.status === 'completed'}
        onCheckedChange={handleToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${subTask.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
          {subTask.title}
        </p>
        {subTask.description && (
          <p className="text-xs text-muted-foreground mt-1">{subTask.description}</p>
        )}
        {subTask.completed_at && (
          <p className="text-xs text-green-600 mt-1">
            Completed {new Date(subTask.completed_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-red-100"
          onClick={() => onDelete(subTask.id)}
        >
          <Trash2 className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    </div>
  )
}

export function SubTaskList({ initiativeId, initiativeStatus }) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const { data: subTasks = [], isLoading } = useInitiativeSubTasks(initiativeId)
  const createMutation = useCreateSubTask()
  const deleteMutation = useDeleteSubTask()

  const canEdit = initiativeStatus === 'ONGOING' || initiativeStatus === 'ongoing'

  const handleCreate = () => {
    if (!newTitle.trim()) return

    createMutation.mutate({
      initiativeId,
      subTask: {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined
      }
    }, {
      onSuccess: () => {
        setNewTitle('')
        setNewDescription('')
        setIsAddingNew(false)
      }
    })
  }

  const handleDelete = (subTaskId) => {
    if (confirm('Are you sure you want to delete this sub-task?')) {
      deleteMutation.mutate({ initiativeId, subTaskId })
    }
  }

  // Calculate progress
  const completedCount = subTasks.filter(st => st.status === 'completed').length
  const totalCount = subTasks.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Sub-Tasks</h3>
          {totalCount > 0 && (
            <Badge variant="outline">
              {completedCount} / {totalCount}
            </Badge>
          )}
        </div>
        {canEdit && !isAddingNew && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Sub-Task
          </Button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Progress value={progressPercentage} className="h-2" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {progressPercentage}%
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading sub-tasks...</div>
      ) : (
        <div className="space-y-2">
          {subTasks.map((subTask) => (
            <SubTaskItem
              key={subTask.id}
              subTask={subTask}
              initiativeId={initiativeId}
              onDelete={handleDelete}
            />
          ))}

          {isAddingNew && (
            <div className="flex flex-col gap-2 p-3 border-2 border-dashed rounded-lg bg-muted/30">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Sub-task title"
                className="font-medium"
                autoFocus
              />
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingNew(false)
                    setNewTitle('')
                    setNewDescription('')
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || createMutation.isPending}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}

          {totalCount === 0 && !isAddingNew && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {canEdit ? (
                <>
                  No sub-tasks yet. Break down this initiative into smaller tasks to track progress better.
                  <Button
                    variant="link"
                    size="sm"
                    className="block mx-auto mt-2"
                    onClick={() => setIsAddingNew(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add your first sub-task
                  </Button>
                </>
              ) : (
                'No sub-tasks for this initiative.'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
