'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Plus,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { VendorDocumentUpload } from './vendor-document-upload';
import { VendorDocumentList } from './vendor-document-list';
import { VendorDocumentAnalysisDisplay } from './vendor-document-analysis-display';
import { VendorDocumentPdfViewer } from './vendor-document-pdf-viewer';
import type { VendorDocument } from '@/types';

interface VendorDocumentsSectionProps {
  vendorId: string;
  vendorName?: string;
}

interface DocumentStats {
  totalDocuments: number;
  byType: Record<string, number>;
  expiringWithin30Days: number;
  withAnalysis: number;
  pendingAnalysis: number;
  totalSize: number;
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
 * Vendor documents section component
 * Displays documents with upload functionality
 */
export function VendorDocumentsSection({
  vendorId,
  vendorName,
}: VendorDocumentsSectionProps) {
  const [documents, setDocuments] = React.useState<VendorDocument[]>([]);
  const [stats, setStats] = React.useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showUpload, setShowUpload] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<VendorDocument | null>(null);
  const [showAnalysis, setShowAnalysis] = React.useState(false);
  const [analyzingDocumentId, setAnalyzingDocumentId] = React.useState<string | null>(null);
  const [pdfViewerDocument, setPdfViewerDocument] = React.useState<VendorDocument | null>(null);
  const [showPdfViewer, setShowPdfViewer] = React.useState(false);
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch documents on mount
  React.useEffect(() => {
    fetchDocuments();
  }, [vendorId]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/vendors/${vendorId}/documents?includeStats=true`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.data.documents);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (document: VendorDocument) => {
    // Refresh the document list
    fetchDocuments();
    setShowUpload(false);
  };

  const handleDocumentDeleted = (documentId: string) => {
    // Remove from local state
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    // Refresh stats
    fetchDocuments();
  };

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleAnalyze = async (documentId: string) => {
    // Set optimistic UI state
    setAnalyzingDocumentId(documentId);

    // Start polling to refresh status every 3 seconds
    pollingRef.current = setInterval(() => {
      fetchDocuments();
    }, 3000);

    try {
      const response = await fetch(
        `/api/vendors/${vendorId}/documents/${documentId}/analyze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      // Refresh documents to get final status
      await fetchDocuments();
    } catch (error) {
      console.error('Error analyzing document:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze document');
      // Refresh to show failed status
      await fetchDocuments();
    } finally {
      // Stop polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setAnalyzingDocumentId(null);
    }
  };

  const handleViewAnalysis = (document: VendorDocument) => {
    setSelectedDocument(document);
    setShowAnalysis(true);
  };

  const handleViewPdf = (document: VendorDocument) => {
    setPdfViewerDocument(document);
    setShowPdfViewer(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Documents
            </CardTitle>
            <CardDescription>
              {vendorName
                ? `Manage documents for ${vendorName}`
                : 'Manage contracts, SLAs, and other vendor documents'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        {stats && stats.totalDocuments > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.totalDocuments}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.withAnalysis}</p>
              <p className="text-sm text-muted-foreground">With AI Analysis</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.expiringWithin30Days}</p>
              <p className="text-sm text-muted-foreground">Expiring Soon</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              <p className="text-sm text-muted-foreground">Total Size</p>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <VendorDocumentUpload
            vendorId={vendorId}
            onUploadSuccess={handleUploadSuccess}
          />
        )}

        {/* Documents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <VendorDocumentList
            vendorId={vendorId}
            documents={documents}
            onDocumentDeleted={handleDocumentDeleted}
            onAnalyze={handleAnalyze}
            onViewAnalysis={handleViewAnalysis}
            onViewPdf={handleViewPdf}
            analyzingDocumentId={analyzingDocumentId}
          />
        )}

        {/* Analysis Dialog */}
        {selectedDocument?.aiAnalysis && (
          <VendorDocumentAnalysisDisplay
            analysis={selectedDocument.aiAnalysis}
            documentName={selectedDocument.title || selectedDocument.documentName}
            open={showAnalysis}
            onOpenChange={setShowAnalysis}
          />
        )}

        {/* PDF Viewer Dialog */}
        {pdfViewerDocument && (
          <VendorDocumentPdfViewer
            open={showPdfViewer}
            onOpenChange={setShowPdfViewer}
            vendorId={vendorId}
            documentId={pdfViewerDocument.id}
            documentName={pdfViewerDocument.title || pdfViewerDocument.documentName}
          />
        )}
      </CardContent>
    </Card>
  );
}
