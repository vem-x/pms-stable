'use client'

import { useState, useRef } from "react"
import NextImage from "next/image"
import { Upload, X, File, FileText, Image, Video, Music } from "lucide-react"
import { Button } from "./button"
import { Label } from "./label"
import { Progress } from "./progress"

const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />
  if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />
  if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />
  if (fileType === 'application/pdf' || fileType.startsWith('text/')) return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FileUpload({
  files = [],
  onFilesChange,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = "*",
  label = "Upload Files",
  description = "Select files to upload",
  optional = true,
  disabled = false
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const fileInputRef = useRef(null)

  const handleFileSelect = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles)
    const validFiles = []
    const errors = []

    fileArray.forEach(file => {
      // Check file count limit
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name} is too large (max ${formatFileSize(maxSize)})`)
        return
      }

      // Check if file already exists
      if (files.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
        errors.push(`${file.name} is already selected`)
        return
      }

      validFiles.push({
        file,
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      })
    })

    if (errors.length > 0) {
      console.warn('File upload errors:', errors)
      // In a real app, you might want to show these errors to the user
    }

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles])
    }
  }

  const removeFile = (fileId) => {
    const updatedFiles = files.filter(f => f.id !== fileId)
    // Cleanup preview URLs
    files.forEach(f => {
      if (f.preview && f.id === fileId) {
        URL.revokeObjectURL(f.preview)
      }
    })
    onFilesChange(updatedFiles)
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = e.dataTransfer.files
    handleFileSelect(droppedFiles)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}
          {!optional && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <p className="text-xs text-muted-foreground">
          {description}
          {maxFiles > 1 && ` (Max ${maxFiles} files, ${formatFileSize(maxSize)} each)`}
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="text-center space-y-4">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm font-medium">
              {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedTypes === "*" ? "Any file type" : `Accepted types: ${acceptedTypes}`}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <Upload className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Selected Files ({files.length})</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((fileWrapper) => (
              <div
                key={fileWrapper.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20"
              >
                {/* File Icon */}
                <div className="flex-shrink-0 text-muted-foreground">
                  {getFileIcon(fileWrapper.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileWrapper.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileWrapper.size)}
                    {fileWrapper.type && ` • ${fileWrapper.type}`}
                  </p>
                  {uploadProgress[fileWrapper.id] !== undefined && (
                    <Progress
                      value={uploadProgress[fileWrapper.id]}
                      className="mt-2 h-1"
                    />
                  )}
                </div>

                {/* Preview (for images) */}
                {fileWrapper.preview && (
                  <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileWrapper.preview}
                      alt={`Preview of ${fileWrapper.name}`}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  </div>
                )}

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(fileWrapper.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-red-600"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload