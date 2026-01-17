'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { DocumentType, VendorDocument } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

interface VendorDocumentUploadProps {
  vendorId: string;
  onUploadSuccess?: (document: VendorDocument) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Vendor document upload component with document type selection
 */
export function VendorDocumentUpload({
  vendorId,
  onUploadSuccess,
  onError,
  disabled = false,
}: VendorDocumentUploadProps) {
  const [uploadState, setUploadState] = React.useState<UploadState>('idle');
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Form fields
  const [documentType, setDocumentType] = React.useState<DocumentType>('OTHER');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [enableAiExtraction, setEnableAiExtraction] = React.useState(true);
  const [documentDate, setDocumentDate] = React.useState('');
  const [expiryDate, setExpiryDate] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setError('File size exceeds the maximum allowed size of 25MB');
      onError?.('File size exceeds the maximum allowed size of 25MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('File type not allowed. Please upload PDF, Word, or Image files.');
      onError?.('File type not allowed');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Auto-set title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  /**
   * Handle upload
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    setUploadState('uploading');
    setProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      formData.append('enableAiExtraction', enableAiExtraction.toString());
      if (documentDate) formData.append('documentDate', documentDate);
      if (expiryDate) formData.append('expiryDate', expiryDate);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Upload file
      const response = await fetch(`/api/vendors/${vendorId}/documents`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setProgress(100);
      setUploadState('success');

      onUploadSuccess?.(data.data);

      // Reset form after success
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      setUploadState('error');
      onError?.(errorMessage);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setSelectedFile(null);
    setUploadState('idle');
    setProgress(0);
    setError(null);
    setDocumentType('OTHER');
    setTitle('');
    setDescription('');
    setEnableAiExtraction(true);
    setDocumentDate('');
    setExpiryDate('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploadState === 'uploading'}
        data-testid="document-file-input"
      />

      {/* File Selection Area */}
      {!selectedFile && uploadState !== 'uploading' && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${disabled ? 'bg-muted/50 border-muted cursor-not-allowed' : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer'}
          `}
          onClick={() => !disabled && triggerFileInput()}
          data-testid="document-upload-area"
        >
          <Upload
            className={`mx-auto h-10 w-10 mb-3 ${
              disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'
            }`}
          />
          <p className={`text-sm font-medium ${disabled ? 'text-muted-foreground/50' : 'text-foreground'}`}>
            <span className="text-primary">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, Word, Images (JPG, PNG, GIF, WebP) up to 25MB
          </p>
        </div>
      )}

      {/* Selected File Display */}
      {selectedFile && uploadState !== 'success' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>
            </div>
            {uploadState !== 'uploading' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Document Details Form */}
          {uploadState !== 'uploading' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select
                    value={documentType}
                    onValueChange={(value: DocumentType) => setDocumentType(value)}
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentDate">Document Date (Optional)</Label>
                  <Input
                    id="documentDate"
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this document"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              {/* AI Extraction Toggle */}
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-md">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableAiExtraction"
                    checked={enableAiExtraction}
                    onChange={(e) => setEnableAiExtraction(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="enableAiExtraction" className="flex items-center gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Enable AI-powered data extraction
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Automatically extract key information like dates, entities, SLAs, and commercial terms using AI
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {uploadState === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-sm font-medium">Uploading document...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          )}

          {/* Upload Button */}
          {(uploadState === 'idle' || uploadState === 'error') && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || disabled}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      )}

      {/* Success Message */}
      {uploadState === 'success' && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-md">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Document uploaded successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => {
              setError(null);
              setUploadState('idle');
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
