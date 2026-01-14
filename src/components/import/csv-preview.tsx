'use client';

import * as React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ImportPreview, ImportRow, ImportPreviewStats } from '@/types/csv-import';

interface CSVPreviewProps {
  preview: ImportPreview;
  onRowSelect?: (rowNumbers: number[]) => void;
  selectedRows?: number[];
}

/**
 * CSV Preview Component
 *
 * Displays import preview with validation results, errors, warnings, and duplicate detection
 */
export function CSVPreview({
  preview,
  onRowSelect,
  selectedRows = [],
}: CSVPreviewProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [filter, setFilter] = React.useState<'all' | 'valid' | 'invalid' | 'warning' | 'duplicate'>('all');

  const toggleRowExpanded = (rowNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedRows(newExpanded);
  };

  const filteredRows = React.useMemo(() => {
    if (filter === 'all') return preview.rows;
    return preview.rows.filter((row) => row.status === filter);
  }, [preview.rows, filter]);

  const getStatusIcon = (status: ImportRow['status']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'duplicate':
        return <Copy className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: ImportRow['status']) => {
    const variants: Record<ImportRow['status'], string> = {
      valid: 'bg-green-100 text-green-800',
      invalid: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      duplicate: 'bg-orange-100 text-orange-800',
    };

    return (
      <Badge className={cn('capitalize', variants[status])}>
        {status}
      </Badge>
    );
  };

  // Display key columns
  const displayColumns = ['firstName', 'lastName', 'email', 'dailyRate', 'startDate'];

  return (
    <div className="space-y-4">
      {/* Missing Headers Warning */}
      {preview.missingRequiredHeaders.length > 0 && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="missing-headers-error"
        >
          <div className="flex items-start gap-2">
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Missing Required Headers</p>
              <p className="text-sm mt-1">
                The following required columns are missing from your CSV:
              </p>
              <ul className="list-disc list-inside text-sm mt-2">
                {preview.missingRequiredHeaders.map((header) => (
                  <li key={header}>{header}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
        data-testid="preview-stats"
      >
        <StatCard
          label="Total Rows"
          value={preview.stats.total}
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <StatCard
          label="Valid"
          value={preview.stats.valid}
          color="green"
          onClick={() => setFilter('valid')}
          active={filter === 'valid'}
        />
        <StatCard
          label="Invalid"
          value={preview.stats.invalid}
          color="red"
          onClick={() => setFilter('invalid')}
          active={filter === 'invalid'}
        />
        <StatCard
          label="Warnings"
          value={preview.stats.warnings}
          color="yellow"
          onClick={() => setFilter('warning')}
          active={filter === 'warning'}
        />
        <StatCard
          label="Duplicates"
          value={preview.stats.duplicates}
          color="orange"
          onClick={() => setFilter('duplicate')}
          active={filter === 'duplicate'}
        />
      </div>

      {/* Header Mappings Info */}
      {Object.keys(preview.headerMappings).length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View column mappings
          </summary>
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(preview.headerMappings).map(([original, mapped]) => (
                <div key={original} className="text-xs">
                  <span className="font-mono bg-background px-1 rounded">{original}</span>
                  {original !== mapped && (
                    <>
                      <span className="mx-1">→</span>
                      <span className="font-mono text-primary">{mapped}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Preview Table */}
      {filteredRows.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[50px]">Row</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  {displayColumns.map((col) => (
                    <TableHead key={col} className="capitalize">
                      {col.replace(/([A-Z])/g, ' $1').trim()}
                    </TableHead>
                  ))}
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <React.Fragment key={row.rowNumber}>
                    <TableRow
                      className={cn(
                        row.status === 'invalid' && 'bg-red-50',
                        row.status === 'warning' && 'bg-yellow-50',
                        row.status === 'duplicate' && 'bg-orange-50'
                      )}
                      data-testid={`preview-row-${row.rowNumber}`}
                    >
                      <TableCell className="font-mono text-xs">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(row.status)}
                          {getStatusBadge(row.status)}
                        </div>
                      </TableCell>
                      {displayColumns.map((col) => (
                        <TableCell key={col} className="max-w-[150px] truncate">
                          {row.originalData[col] ||
                            row.originalData[
                              Object.keys(preview.headerMappings).find(
                                (k) => preview.headerMappings[k] === col
                              ) || ''
                            ] ||
                            '-'}
                        </TableCell>
                      ))}
                      <TableCell>
                        {(row.errors.length > 0 || row.warnings.length > 0 || row.duplicateInfo) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpanded(row.rowNumber)}
                            data-testid={`expand-row-${row.rowNumber}`}
                          >
                            {expandedRows.has(row.rowNumber) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Expanded Row Details */}
                    {expandedRows.has(row.rowNumber) && (
                      <TableRow>
                        <TableCell colSpan={displayColumns.length + 3}>
                          <div className="p-3 space-y-3 bg-muted/50 rounded">
                            {/* Errors */}
                            {row.errors.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-red-600 mb-1">
                                  Errors:
                                </p>
                                <ul className="space-y-1">
                                  {row.errors.map((error, idx) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-red-600 flex items-start gap-2"
                                    >
                                      <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                      <span>
                                        <strong>{error.field}:</strong> {error.message}
                                        {error.value && (
                                          <span className="text-muted-foreground">
                                            {' '}(value: &quot;{error.value}&quot;)
                                          </span>
                                        )}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Warnings */}
                            {row.warnings.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-yellow-600 mb-1">
                                  Warnings:
                                </p>
                                <ul className="space-y-1">
                                  {row.warnings.map((warning, idx) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-yellow-600 flex items-start gap-2"
                                    >
                                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                      <span>
                                        <strong>{warning.field}:</strong> {warning.message}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Duplicate Info */}
                            {row.duplicateInfo && (
                              <div>
                                <p className="text-sm font-medium text-orange-600 mb-1">
                                  Duplicate Detected:
                                </p>
                                <p className="text-sm text-orange-600 flex items-start gap-2">
                                  <Copy className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  {row.duplicateInfo.type === 'database' ? (
                                    <span>
                                      Email &quot;{row.duplicateInfo.matchedEmail}&quot; already exists
                                      in the database
                                    </span>
                                  ) : (
                                    <span>
                                      Duplicate of row {row.duplicateInfo.matchedRowNumber} in
                                      this CSV file
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : preview.missingRequiredHeaders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No rows match the current filter
        </div>
      ) : null}
    </div>
  );
}

// Stat Card Sub-component
interface StatCardProps {
  label: string;
  value: number;
  color?: 'green' | 'red' | 'yellow' | 'orange';
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, color, onClick, active }: StatCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border text-left transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-transparent bg-muted hover:bg-muted/80'
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-bold', color && colorClasses[color])}>
        {value}
      </p>
    </button>
  );
}
