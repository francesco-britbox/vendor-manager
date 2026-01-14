'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Calculator } from 'lucide-react';
import type { InvoiceValidationResult, TeamMemberSpendBreakdown } from '@/lib/invoices';

interface ValidationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: InvoiceValidationResult | null;
}

/**
 * Format currency value with proper formatting
 */
function formatCurrency(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Dialog showing invoice validation details with breakdown
 */
export function ValidationDetailsDialog({
  open,
  onOpenChange,
  validationResult,
}: ValidationDetailsDialogProps) {
  if (!validationResult) {
    return null;
  }

  const {
    invoiceAmount,
    expectedAmount,
    discrepancy,
    discrepancyPercentage,
    toleranceThreshold,
    isWithinTolerance,
    validationDetails,
  } = validationResult;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]" data-testid="validation-details-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Invoice Validation Results
          </DialogTitle>
          <DialogDescription>
            Comparison of invoice amount against calculated timesheet spend
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Invoice Amount</p>
              <p className="text-xl font-bold">{formatCurrency(invoiceAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Expected Amount</p>
              <p className="text-xl font-bold">{formatCurrency(expectedAmount)}</p>
            </CardContent>
          </Card>
          <Card className={isWithinTolerance ? 'bg-green-50' : 'bg-red-50'}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Discrepancy</p>
              <p
                className={`text-xl font-bold ${
                  isWithinTolerance ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(discrepancy)}
                <span className="text-sm font-normal ml-1">
                  ({discrepancyPercentage.toFixed(1)}%)
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Validation Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Tolerance Threshold</p>
            <p className="text-lg font-medium">{toleranceThreshold}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Validation Status</p>
            {isWithinTolerance ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Within Tolerance
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Exceeds Tolerance
              </Badge>
            )}
          </div>
        </div>

        {/* Breakdown by Team Member */}
        {validationDetails.length > 0 ? (
          <div data-testid="validation-breakdown">
            <h4 className="text-sm font-medium mb-2">Spend Breakdown by Team Member</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Daily Rate</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationDetails.map((detail: TeamMemberSpendBreakdown) => (
                    <TableRow key={detail.teamMemberId}>
                      <TableCell className="font-medium">
                        {detail.teamMemberName}
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.totalHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(detail.dailyRate, detail.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(detail.totalSpend, detail.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-medium text-right">
                      Total Expected Amount
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(expectedAmount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground" data-testid="no-timesheet-data">
            <p>No timesheet data found for this billing period.</p>
            <p className="text-sm mt-1">
              Make sure team members have logged hours for this vendor.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
