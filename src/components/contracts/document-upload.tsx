'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Upload,
  X,
  FileText,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

/**
 * Document info from API or initial data
 */
export interface DocumentInfo {
  documentKey?: string;
  documentName?: string;
  documentSize?: number;
  documentType?: string;
  documentUploadedAt?: Date | string;
}

/**
 * Props for DocumentUpload component
 */
interface DocumentUploadProps {
  /** Contract ID for upload endpoint */
  contractId?: string;
  /** Initial document info */
  initialDocument?: DocumentInfo;
  /** Called when document is successfully uploaded */
  onUploadSuccess?: (document: DocumentInfo) => void;
  /** Called when document is deleted */
  onDeleteSuccess?: () => void;
  /** Called on any error */
  onError?: (error: string) => void;
  /** Whether uploads are disabled */
  disabled?: boolean;
  /** Whether to show compact version */
  compact?: boolean;
}

/**
 * Upload state
 */
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
 * Get file type label
 */
function getFileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  };
  return labels[type] || 'Document';
}

/**
 * Document upload component with progress indicators
 */
export function DocumentUpload({
  contractId,
  initialDocument,
  onUploadSuccess,
  onDeleteSuccess,
  onError,
  disabled = false,
  compact = false,
}: DocumentUploadProps) {
  const [document, setDocument] = React.useState<DocumentInfo | undefined>(
    initialDocument
  );
  const [uploadState, setUploadState] = React.useState<UploadState>('idle');
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Update document when initialDocument changes
  React.useEffect(() => {
    setDocument(initialDocument);
  }, [initialDocument]);

  /**
   * Handle file selection
   */
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setUploadState('uploading');
    setProgress(0);

    // Client-side validation
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setError('File size exceeds the maximum allowed size of 25MB');
      setUploadState('error');
      onError?.('File size exceeds the maximum allowed size of 25MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      setError('File type not allowed. Please upload a PDF or Word document.');
      setUploadState('error');
      onError?.('File type not allowed. Please upload a PDF or Word document.');
      return;
    }

    if (!contractId) {
      setError('Contract must be saved before uploading documents');
      setUploadState('error');
      onError?.('Contract must be saved before uploading documents');
      return;
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress (XHR would give real progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Upload file
      const response = await fetch(`/api/contracts/${contractId}/upload`, {
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
      setDocument({
        documentKey: data.data.documentKey,
        documentName: data.data.documentName,
        documentSize: data.data.documentSize,
        documentType: data.data.documentType,
        documentUploadedAt: data.data.documentUploadedAt,
      });

      onUploadSuccess?.({
        documentKey: data.data.documentKey,
        documentName: data.data.documentName,
        documentSize: data.data.documentSize,
        documentType: data.data.documentType,
        documentUploadedAt: data.data.documentUploadedAt,
      });

      // Reset to idle after success message
      setTimeout(() => {
        setUploadState('idle');
        setProgress(0);
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      setUploadState('error');
      onError?.(errorMessage);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle document deletion
   */
  const handleDelete = async () => {
    if (!contractId || !document?.documentKey) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/upload`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      setDocument(undefined);
      onDeleteSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete document';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle download
   */
  const handleDownload = () => {
    if (!contractId) return;
    window.open(`/api/contracts/${contractId}/download`, '_blank');
  };

  /**
   * Trigger file input click
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Render compact version
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploadState === 'uploading'}
          data-testid="document-file-input"
        />

        {document?.documentKey ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={disabled}
              data-testid="document-download-button"
            >
              <Download className="h-4 w-4 mr-1" />
              {document.documentName || 'Download'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={disabled || isDeleting}
              data-testid="document-delete-button"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={disabled || uploadState === 'uploading' || !contractId}
            data-testid="document-upload-button"
          >
            {uploadState === 'uploading' ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Upload Document
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Full version with progress
  return (
    <div className="space-y-3" data-testid="document-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploadState === 'uploading'}
        data-testid="document-file-input"
      />

      {/* Current Document Display */}
      {document?.documentKey && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {document.documentName || 'Document'}
              </span>
              <span className="text-xs text-muted-foreground">
                {document.documentType && getFileTypeLabel(document.documentType)}
                {document.documentSize &&
                  ` - ${formatFileSize(document.documentSize)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={disabled}
              data-testid="document-download-button"
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={disabled || isDeleting}
              data-testid="document-delete-button"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!document?.documentKey && uploadState !== 'uploading' && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${
              disabled || !contractId
                ? 'bg-muted/50 border-muted cursor-not-allowed'
                : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
            }
          `}
          onClick={() => !disabled && contractId && triggerFileInput()}
          data-testid="document-upload-area"
        >
          <Upload
            className={`mx-auto h-8 w-8 mb-2 ${
              disabled || !contractId
                ? 'text-muted-foreground/50'
                : 'text-muted-foreground'
            }`}
          />
          <p
            className={`text-sm ${
              disabled || !contractId
                ? 'text-muted-foreground/50'
                : 'text-muted-foreground'
            }`}
          >
            {!contractId ? (
              'Save contract first to upload documents'
            ) : (
              <>
                <span className="font-medium text-primary">Click to upload</span>{' '}
                or drag and drop
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOC, DOCX up to 25MB
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState === 'uploading' && (
        <div className="border rounded-lg p-4" data-testid="document-upload-progress">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm font-medium">Uploading document...</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
        </div>
      )}

      {/* Success Message */}
      {uploadState === 'success' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-md">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Document uploaded successfully</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md"
          data-testid="document-upload-error"
        >
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

      {/* Replace Document Button */}
      {document?.documentKey && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={uploadState === 'uploading'}
          className="w-full"
          data-testid="document-replace-button"
        >
          <Upload className="h-4 w-4 mr-2" />
          Replace Document
        </Button>
      )}
    </div>
  );
}
