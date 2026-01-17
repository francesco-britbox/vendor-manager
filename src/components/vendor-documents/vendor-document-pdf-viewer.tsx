'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, FileText, Download, Maximize2, Minimize2 } from 'lucide-react';

interface VendorDocumentPdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  documentId: string;
  documentName: string;
}

type ViewerState = 'loading' | 'loaded' | 'error';

/**
 * PDF Viewer Modal Component
 * Displays PDF documents in an inline preview modal using the browser's native PDF viewer
 */
export function VendorDocumentPdfViewer({
  open,
  onOpenChange,
  vendorId,
  documentId,
  documentName,
}: VendorDocumentPdfViewerProps) {
  const [state, setState] = React.useState<ViewerState>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const pdfUrlRef = React.useRef<string | null>(null);

  // Fetch and create PDF blob URL when modal opens
  React.useEffect(() => {
    if (!open || !documentId || !vendorId) {
      return;
    }

    setState('loading');
    setError(null);

    // Clean up previous URL if exists
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfUrl(null);

    const abortController = new AbortController();

    const fetchPdf = async () => {
      try {
        const response = await fetch(
          `/api/vendors/${vendorId}/documents/${documentId}/download`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Document not found. It may have been deleted.');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this document.');
          } else {
            throw new Error(`Failed to load document (HTTP ${response.status})`);
          }
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/pdf')) {
          throw new Error('This document is not a PDF file and cannot be previewed.');
        }

        const blob = await response.blob();

        // Validate PDF magic bytes
        const arrayBuffer = await blob.slice(0, 5).arrayBuffer();
        const header = new Uint8Array(arrayBuffer);
        const pdfMagic = String.fromCharCode(...header);

        if (!pdfMagic.startsWith('%PDF')) {
          throw new Error('The document appears to be corrupted or is not a valid PDF.');
        }

        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
        setState('loaded');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Ignore abort errors
        }
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
        setState('error');
      }
    };

    fetchPdf();

    // Cleanup function to revoke blob URL and abort fetch
    return () => {
      abortController.abort();
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, [open, documentId, vendorId]);

  // Handle escape key for fullscreen
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, isFullscreen]);

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Clean up blob URL when closing
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
      setPdfUrl(null);
      setState('loading');
      setError(null);
      setIsFullscreen(false);
    }
    onOpenChange(newOpen);
  };

  const handleDownload = () => {
    window.open(`/api/vendors/${vendorId}/documents/${documentId}/download`, '_blank');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex flex-col p-0 gap-0 overflow-hidden"
        style={isFullscreen
          ? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0 }
          : { width: '95vw', maxWidth: '1200px', height: '90vh', maxHeight: '90vh' }
        }
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate pr-4">
                  {documentName}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  PDF document preview
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="hidden sm:flex"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 bg-muted/30">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Unable to load document</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {error}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Instead
                </Button>
              </div>
            </div>
          )}

          {state === 'loaded' && pdfUrl && (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={`PDF Preview: ${documentName}`}
              onError={() => {
                setError('Failed to render PDF. Your browser may not support inline PDF viewing.');
                setState('error');
              }}
            />
          )}
        </div>

        {/* Footer for mobile download */}
        <div className="px-6 py-3 border-t flex-shrink-0 sm:hidden">
          <Button onClick={handleDownload} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
