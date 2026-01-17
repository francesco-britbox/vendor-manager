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

  const handleAnalyze = () => {
    // Refresh documents to get updated analysis status
    fetchDocuments();
  };

  const handleViewAnalysis = (document: VendorDocument) => {
    setSelectedDocument(document);
    setShowAnalysis(true);
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
      </CardContent>
    </Card>
  );
}
