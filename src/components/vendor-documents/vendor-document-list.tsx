'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Download,
  Trash2,
  MoreHorizontal,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import type { VendorDocument, DocumentType } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

interface VendorDocumentListProps {
  vendorId: string;
  documents: VendorDocument[];
  onDocumentDeleted?: (documentId: string) => void;
  onAnalyze?: (documentId: string) => void;
  onViewAnalysis?: (document: VendorDocument) => void;
  isLoading?: boolean;
}

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
 * Format date for display
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get document type badge style
 */
function getDocumentTypeBadge(type: DocumentType) {
  const styles: Record<DocumentType, string> = {
    CONTRACT: 'bg-blue-100 text-blue-700',
    SOW: 'bg-purple-100 text-purple-700',
    SLA: 'bg-green-100 text-green-700',
    NDA: 'bg-orange-100 text-orange-700',
    MSA: 'bg-indigo-100 text-indigo-700',
    AMENDMENT: 'bg-yellow-100 text-yellow-700',
    ADDENDUM: 'bg-cyan-100 text-cyan-700',
    INVOICE: 'bg-red-100 text-red-700',
    PROPOSAL: 'bg-pink-100 text-pink-700',
    INSURANCE: 'bg-emerald-100 text-emerald-700',
    COMPLIANCE: 'bg-violet-100 text-violet-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };

  return styles[type] || styles.OTHER;
}

/**
 * Get extraction status badge
 */
function getExtractionStatusBadge(status: string | undefined) {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle2,
        className: 'text-green-600',
        label: 'Analyzed',
      };
    case 'processing':
      return {
        icon: Loader2,
        className: 'text-blue-600 animate-spin',
        label: 'Processing',
      };
    case 'pending':
      return {
        icon: Clock,
        className: 'text-yellow-600',
        label: 'Pending',
      };
    case 'failed':
      return {
        icon: AlertCircle,
        className: 'text-red-600',
        label: 'Failed',
      };
    default:
      return null;
  }
}

/**
 * Vendor document list component
 */
export function VendorDocumentList({
  vendorId,
  documents,
  onDocumentDeleted,
  onAnalyze,
  onViewAnalysis,
  isLoading = false,
}: VendorDocumentListProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = React.useState<string | null>(null);

  /**
   * Handle document download
   */
  const handleDownload = (documentId: string) => {
    window.open(`/api/vendors/${vendorId}/documents/${documentId}/download`, '_blank');
  };

  /**
   * Handle document deletion
   */
  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setDeletingId(documentId);

    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/documents/${documentId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete document');
      }

      onDocumentDeleted?.(documentId);
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Handle AI analysis trigger
   */
  const handleAnalyze = async (documentId: string) => {
    setAnalyzingId(documentId);

    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/documents/${documentId}/analyze`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      onAnalyze?.(documentId);
    } catch (error) {
      console.error('Error analyzing document:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze document');
    } finally {
      setAnalyzingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No documents yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents to store contracts, SLAs, and other vendor documents
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>AI Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const extractionBadge = getExtractionStatusBadge(doc.extractionStatus);
            const isDeleting = deletingId === doc.id;
            const isAnalyzing = analyzingId === doc.id;

            return (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {doc.title || doc.documentName}
                      </span>
                      {doc.title && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {doc.documentName}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getDocumentTypeBadge(doc.documentType)}>
                    {DOCUMENT_TYPE_LABELS[doc.documentType]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(doc.documentSize)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(doc.uploadedAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {doc.expiryDate ? (
                    <span className={
                      new Date(doc.expiryDate) < new Date()
                        ? 'text-red-600'
                        : new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                    }>
                      {formatDate(doc.expiryDate)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {extractionBadge ? (
                    <div className="flex items-center gap-1">
                      <extractionBadge.icon className={`h-4 w-4 ${extractionBadge.className}`} />
                      <span className="text-xs text-muted-foreground">
                        {extractionBadge.label}
                      </span>
                    </div>
                  ) : doc.enableAiExtraction ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Disabled</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {doc.aiAnalysis && (
                        <DropdownMenuItem onClick={() => onViewAnalysis?.(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Analysis
                        </DropdownMenuItem>
                      )}
                      {doc.enableAiExtraction && doc.documentMimeType === 'application/pdf' && (
                        <DropdownMenuItem
                          onClick={() => handleAnalyze(doc.id)}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {doc.aiAnalysis ? 'Re-analyze' : 'Analyze with AI'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting}
                        className="text-destructive focus:text-destructive"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
