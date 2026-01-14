'use client';

import * as React from 'react';
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CSVFileInput } from './csv-file-input';
import { CSVPreview } from './csv-preview';
import type { Vendor } from '@/types';
import type { ImportPreview, ImportResult } from '@/types/csv-import';

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  vendors: Vendor[];
  entityType: 'team-members';
}

/**
 * CSV Import Dialog Component
 *
 * Multi-step dialog for importing CSV data with vendor selection,
 * file upload, preview, and confirmation.
 */
export function CSVImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  vendors,
  entityType,
}: CSVImportDialogProps) {
  const [step, setStep] = React.useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('');
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('upload');
        setSelectedFile(null);
        setSelectedVendorId('');
        setPreview(null);
        setImportResult(null);
        setError(null);
        setSkipDuplicates(true);
      }, 200);
    }
  }, [open]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleFileClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  const handleGeneratePreview = async () => {
    if (!selectedFile || !selectedVendorId) {
      setError('Please select a vendor and upload a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('vendorId', selectedVendorId);

      const response = await fetch(`/api/import/${entityType}/preview`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      setPreview(data.data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview || !selectedVendorId) return;

    // Filter rows to import
    const rowsToImport = preview.rows.filter((row) => {
      if (row.status === 'invalid') return false;
      if (row.status === 'duplicate' && skipDuplicates) return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      setError('No valid rows to import');
      return;
    }

    setStep('importing');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/import/${entityType}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rowsToImport,
          vendorId: selectedVendorId,
          skipDuplicates,
          updateExisting: false,
        }),
      });

      const data = await response.json();

      if (!data.success && data.data?.failed === data.data?.created + data.data?.failed) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data.data);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute import');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'complete') {
      onImportComplete();
    }
    onOpenChange(false);
  };

  const canProceedToPreview = selectedFile && selectedVendorId;
  const canConfirmImport =
    preview &&
    preview.missingRequiredHeaders.length === 0 &&
    (preview.stats.valid > 0 || preview.stats.warnings > 0);

  const getTitle = () => {
    switch (entityType) {
      case 'team-members':
        return 'Import Team Members';
      default:
        return 'Import CSV';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="csv-import-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Select a vendor and upload a CSV file to import team members.'}
            {step === 'preview' && 'Review the import preview and fix any errors before importing.'}
            {step === 'importing' && 'Importing data, please wait...'}
            {step === 'complete' && 'Import completed!'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Vendor Selection */}
              <div className="space-y-2">
                <Label htmlFor="vendor-select">
                  Select Vendor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedVendorId}
                  onValueChange={setSelectedVendorId}
                >
                  <SelectTrigger
                    id="vendor-select"
                    data-testid="import-vendor-select"
                  >
                    <SelectValue placeholder="Choose a vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  All imported team members will be assigned to this vendor.
                </p>
              </div>

              {/* File Input */}
              <div className="space-y-2">
                <Label>
                  CSV File <span className="text-destructive">*</span>
                </Label>
                <CSVFileInput
                  onFileSelect={handleFileSelect}
                  onClear={handleFileClear}
                  selectedFile={selectedFile}
                  isLoading={isLoading}
                  templateUrl={`/api/import/${entityType}/template`}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div
                  className="rounded-md bg-destructive/15 p-4 text-destructive"
                  data-testid="import-error-message"
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  File: <strong>{preview.fileName}</strong>
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded border-gray-300"
                    data-testid="skip-duplicates-checkbox"
                  />
                  Skip duplicate entries
                </label>
              </div>

              <CSVPreview preview={preview} />

              {/* Error Message */}
              {error && (
                <div
                  className="rounded-md bg-destructive/15 p-4 text-destructive"
                  data-testid="import-error-message"
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Importing team members...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment. Please don&apos;t close this window.
              </p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && importResult && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center gap-4 text-center">
                {importResult.success ? (
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-yellow-500" />
                )}
                <div>
                  <p className="text-xl font-semibold">
                    {importResult.success ? 'Import Successful!' : 'Import Completed with Issues'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {importResult.created} team members created
                    {importResult.updated > 0 && `, ${importResult.updated} updated`}
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                    {importResult.failed > 0 && `, ${importResult.failed} failed`}
                  </p>
                </div>
              </div>

              {/* Import Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                  <p className="text-sm text-green-600">Created</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-sm text-blue-600">Updated</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
                  <p className="text-sm text-gray-600">Skipped</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  <div className="max-h-[200px] overflow-auto">
                    <ul className="space-y-1 text-sm">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx} className="text-destructive flex items-start gap-2">
                          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          {err.rowNumber > 0 && <span>Row {err.rowNumber}:</span>}
                          <span>{err.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={!canProceedToPreview || isLoading}
                data-testid="preview-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Preview Import'
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={!canConfirmImport || isLoading}
                data-testid="confirm-import-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${
                    preview
                      ? skipDuplicates
                        ? preview.stats.valid + preview.stats.warnings
                        : preview.stats.valid + preview.stats.warnings + preview.stats.duplicates
                      : 0
                  } Team Members`
                )}
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose} data-testid="done-button">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
