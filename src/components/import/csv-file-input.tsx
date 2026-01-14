'use client';

import * as React from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CSVFileInputProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  selectedFile: File | null;
  isLoading?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
  templateUrl?: string;
}

/**
 * CSV File Input Component
 *
 * Drag-and-drop file input with template download option
 */
export function CSVFileInput({
  onFileSelect,
  onClear,
  selectedFile,
  isLoading = false,
  accept = '.csv',
  maxSize = 10 * 1024 * 1024, // 10MB default
  templateUrl,
}: CSVFileInputProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return 'Please select a CSV file';
    }
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClear();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isLoading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="csv-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
          data-testid="csv-file-input"
        />

        {selectedFile ? (
          // File Selected State
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium text-sm" data-testid="selected-file-name">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isLoading}
                className="ml-2"
                data-testid="clear-file-button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Empty State
          <div className="flex flex-col items-center gap-4 text-center">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleBrowseClick}
              disabled={isLoading}
              data-testid="browse-files-button"
            >
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
          data-testid="file-error-message"
        >
          {error}
        </div>
      )}

      {/* Template Download */}
      {templateUrl && !selectedFile && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Need a template?</span>
          <a
            href={templateUrl}
            download
            className="inline-flex items-center gap-1 text-primary hover:underline"
            data-testid="download-template-link"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </a>
        </div>
      )}
    </div>
  );
}
