'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Calendar,
  Building2,
  Shield,
  Clock,
  FileText,
  DollarSign,
  Users,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { VendorDocumentAnalysis } from '@/types';

interface VendorDocumentAnalysisDisplayProps {
  analysis: VendorDocumentAnalysis;
  documentName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'inline' | 'dialog';
}

/**
 * Get confidence level style
 */
function getConfidenceStyle(score: number): {
  label: string;
  className: string;
} {
  if (score >= 0.8) {
    return {
      label: 'High',
      className: 'bg-green-100 text-green-700',
    };
  } else if (score >= 0.5) {
    return {
      label: 'Medium',
      className: 'bg-yellow-100 text-yellow-700',
    };
  } else if (score > 0) {
    return {
      label: 'Low',
      className: 'bg-red-100 text-red-700',
    };
  }
  return {
    label: 'N/A',
    className: 'bg-gray-100 text-gray-500',
  };
}

/**
 * Analysis field component
 */
function AnalysisField({
  label,
  value,
  confidence,
  icon: Icon,
}: {
  label: string;
  value?: string;
  confidence?: number;
  icon?: React.ElementType;
}) {
  if (!value && confidence === 0) return null;

  const confidenceStyle = getConfidenceStyle(confidence || 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {Icon && <Icon className="h-4 w-4" />}
          {label}
        </div>
        {confidence !== undefined && confidence > 0 && (
          <Badge variant="secondary" className={`text-xs ${confidenceStyle.className}`}>
            {Math.round(confidence * 100)}% confident
          </Badge>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap">
        {value || <span className="text-muted-foreground italic">Not found</span>}
      </p>
    </div>
  );
}

/**
 * Analysis content component
 */
function AnalysisContent({ analysis }: { analysis: VendorDocumentAnalysis }) {
  const scores = analysis.confidenceScores || {};

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {analysis.summary && (
        <Card>
          <CardContent className="pt-4">
            <AnalysisField
              label="Summary"
              value={analysis.summary}
              confidence={scores.summary}
              icon={FileText}
            />
          </CardContent>
        </Card>
      )}

      {/* Key Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalysisField
          label="Contract/Document Date"
          value={analysis.contractCreationDate}
          confidence={scores.contractCreationDate}
          icon={Calendar}
        />
        <AnalysisField
          label="Expiry/Renewal Date"
          value={analysis.expiryRenewalDate}
          confidence={scores.expiryRenewalDate}
          icon={Calendar}
        />
      </div>

      {/* Involved Entities */}
      <AnalysisField
        label="Involved Entities"
        value={analysis.involvedEntities}
        confidence={scores.involvedEntities}
        icon={Building2}
      />

      {/* SLA Section */}
      {(analysis.slaDetails || analysis.uptimeGuarantee || analysis.responseTime) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Service Level Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnalysisField
              label="SLA Details"
              value={analysis.slaDetails}
              confidence={scores.slaDetails}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <AnalysisField
                label="Uptime Guarantee"
                value={analysis.uptimeGuarantee}
                confidence={scores.uptimeGuarantee}
              />
              <AnalysisField
                label="Response Time"
                value={analysis.responseTime}
                confidence={scores.responseTime}
                icon={Clock}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scope and Terms */}
      <AnalysisField
        label="Scope of Work"
        value={analysis.scopeOfWork}
        confidence={scores.scopeOfWork}
        icon={FileText}
      />

      <AnalysisField
        label="Terms & Conditions"
        value={analysis.termsAndConditions}
        confidence={scores.termsAndConditions}
      />

      {/* Commercial Terms */}
      {(analysis.commercialTerms || analysis.paymentSchedule || analysis.totalValue) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Commercial Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnalysisField
              label="Commercial Terms"
              value={analysis.commercialTerms}
              confidence={scores.commercialTerms}
            />
            <AnalysisField
              label="Payment Schedule"
              value={analysis.paymentSchedule}
              confidence={scores.paymentSchedule}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <AnalysisField
                label="Total Value"
                value={analysis.totalValue}
                confidence={scores.totalValue}
              />
              <AnalysisField
                label="Currency"
                value={analysis.currency}
                confidence={scores.currency}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Termination and Renewal */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalysisField
          label="Termination Clauses"
          value={analysis.terminationClauses}
          confidence={scores.terminationClauses}
          icon={AlertTriangle}
        />
        <AnalysisField
          label="Notice Period"
          value={analysis.noticePeriod}
          confidence={scores.noticePeriod}
          icon={Clock}
        />
      </div>

      <AnalysisField
        label="Renewal Terms"
        value={analysis.renewalTerms}
        confidence={scores.renewalTerms}
        icon={RefreshCw}
      />

      {/* Key Contacts */}
      <AnalysisField
        label="Key Contacts"
        value={analysis.keyContacts}
        confidence={scores.keyContacts}
        icon={Users}
      />

      {/* Metadata */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Analyzed on {new Date(analysis.analyzedAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {analysis.aiProvider && ` using ${analysis.aiProvider}`}
          {analysis.aiModel && ` (${analysis.aiModel})`}
          {analysis.processingTimeMs && ` in ${(analysis.processingTimeMs / 1000).toFixed(1)}s`}
        </p>
      </div>
    </div>
  );
}

/**
 * Vendor document analysis display component
 */
export function VendorDocumentAnalysisDisplay({
  analysis,
  documentName,
  open,
  onOpenChange,
  mode = 'dialog',
}: VendorDocumentAnalysisDisplayProps) {
  // Inline mode
  if (mode === 'inline') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Analysis
          </CardTitle>
          <CardDescription>
            Extracted information from the document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnalysisContent analysis={analysis} />
        </CardContent>
      </Card>
    );
  }

  // Dialog mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Analysis
          </DialogTitle>
          <DialogDescription>
            {documentName
              ? `Extracted information from "${documentName}"`
              : 'Extracted information from the document'}
          </DialogDescription>
        </DialogHeader>
        <AnalysisContent analysis={analysis} />
      </DialogContent>
    </Dialog>
  );
}
