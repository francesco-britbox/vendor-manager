'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Brain,
  Calendar,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Users,
  DollarSign,
  Shield,
  Bell,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import type { ContractAnalysis } from '@/types';

/**
 * Props for ContractAnalysisDisplay component
 */
interface ContractAnalysisDisplayProps {
  /** Contract ID for API calls */
  contractId: string;
  /** Initial analysis data (if already fetched) */
  initialAnalysis?: ContractAnalysis | null;
  /** Whether the contract has a document uploaded */
  hasDocument?: boolean;
  /** Called when analysis is updated */
  onAnalysisUpdate?: (analysis: ContractAnalysis | null) => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Analysis field configuration
 */
interface AnalysisField {
  key: keyof Omit<ContractAnalysis, 'confidenceScores' | 'analyzedAt'>;
  label: string;
  icon: React.ElementType;
  description: string;
}

const ANALYSIS_FIELDS: AnalysisField[] = [
  {
    key: 'expirationDate',
    label: 'Expiration Date',
    icon: Calendar,
    description: 'Contract end or expiration date',
  },
  {
    key: 'renewalTerms',
    label: 'Renewal Terms',
    icon: RefreshCw,
    description: 'Auto-renewal and renewal conditions',
  },
  {
    key: 'sla',
    label: 'SLA',
    icon: Shield,
    description: 'Service Level Agreements',
  },
  {
    key: 'paymentTerms',
    label: 'Payment Terms',
    icon: DollarSign,
    description: 'Payment schedules and conditions',
  },
  {
    key: 'noticePeriod',
    label: 'Notice Period',
    icon: Bell,
    description: 'Required notice for termination',
  },
  {
    key: 'keyContacts',
    label: 'Key Contacts',
    icon: Users,
    description: 'Important contacts mentioned',
  },
  {
    key: 'scopeSummary',
    label: 'Scope Summary',
    icon: FileText,
    description: 'Summary of services/scope',
  },
  {
    key: 'terminationClauses',
    label: 'Termination Clauses',
    icon: XCircle,
    description: 'Termination conditions',
  },
];

/**
 * Get confidence level styling
 */
function getConfidenceStyle(confidence: number): {
  className: string;
  label: string;
  icon: React.ElementType;
} {
  if (confidence >= 0.8) {
    return {
      className: 'text-green-600 bg-green-50',
      label: 'High',
      icon: CheckCircle,
    };
  }
  if (confidence >= 0.5) {
    return {
      className: 'text-yellow-600 bg-yellow-50',
      label: 'Medium',
      icon: AlertCircle,
    };
  }
  if (confidence > 0) {
    return {
      className: 'text-orange-600 bg-orange-50',
      label: 'Low',
      icon: AlertCircle,
    };
  }
  return {
    className: 'text-gray-400 bg-gray-50',
    label: 'Not found',
    icon: Info,
  };
}

/**
 * Confidence badge component
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { className, label, icon: Icon } = getConfidenceStyle(confidence);
  const percentage = Math.round(confidence * 100);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      title={`${percentage}% confidence`}
    >
      <Icon className="h-3 w-3" />
      {percentage}%
    </span>
  );
}

/**
 * Analysis field card component
 */
function AnalysisFieldCard({
  field,
  value,
  confidence,
}: {
  field: AnalysisField;
  value?: string;
  confidence: number;
}) {
  const Icon = field.icon;
  const hasValue = !!value;

  return (
    <div
      className={`p-4 rounded-lg border ${
        hasValue ? 'bg-white' : 'bg-gray-50 border-dashed'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded ${
              hasValue ? 'bg-primary/10' : 'bg-gray-100'
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                hasValue ? 'text-primary' : 'text-gray-400'
              }`}
            />
          </div>
          <span className="font-medium text-sm">{field.label}</span>
        </div>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <p
        className={`text-sm ${hasValue ? 'text-foreground' : 'text-muted-foreground italic'}`}
      >
        {value || 'Not found in document'}
      </p>
    </div>
  );
}

/**
 * Contract Analysis Display Component
 *
 * Displays AI-extracted contract terms with confidence scores
 */
export function ContractAnalysisDisplay({
  contractId,
  initialAnalysis,
  hasDocument = false,
  onAnalysisUpdate,
  compact = false,
}: ContractAnalysisDisplayProps) {
  const [analysis, setAnalysis] = React.useState<ContractAnalysis | null>(
    initialAnalysis || null
  );
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(
    initialAnalysis?.analyzedAt ? new Date(initialAnalysis.analyzedAt) : null
  );

  // Update when initialAnalysis changes
  React.useEffect(() => {
    setAnalysis(initialAnalysis || null);
    setLastUpdated(
      initialAnalysis?.analyzedAt ? new Date(initialAnalysis.analyzedAt) : null
    );
  }, [initialAnalysis]);

  /**
   * Trigger AI analysis
   */
  const handleAnalyze = async (force: boolean = false) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const newAnalysis = data.data.analysis;
      setAnalysis(newAnalysis);
      setLastUpdated(new Date(newAnalysis.analyzedAt));
      onAnalysisUpdate?.(newAnalysis);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to analyze contract';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Format relative time
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Compact view
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Analysis</span>
          </div>
          {analysis && lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(lastUpdated)}
            </span>
          )}
        </div>

        {!hasDocument ? (
          <p className="text-sm text-muted-foreground">
            Upload a document to enable AI analysis
          </p>
        ) : !analysis ? (
          <Button
            size="sm"
            onClick={() => handleAnalyze()}
            disabled={isAnalyzing}
            data-testid="analyze-button"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze Contract
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            {ANALYSIS_FIELDS.slice(0, 4).map((field) => {
              const value = analysis[field.key];
              const confidence = analysis.confidenceScores?.[field.key] || 0;
              if (!value) return null;
              return (
                <div key={field.key} className="flex items-start gap-2 text-sm">
                  <field.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="flex-1 line-clamp-1">{value}</span>
                  <ConfidenceBadge confidence={confidence} />
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // Full view
  return (
    <Card data-testid="contract-analysis-display">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Contract Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(lastUpdated)}
              </span>
            )}
            {hasDocument && (
              <Button
                size="sm"
                variant={analysis ? 'outline' : 'default'}
                onClick={() => handleAnalyze(!!analysis)}
                disabled={isAnalyzing}
                data-testid="analyze-button"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : analysis ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-analyze
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!hasDocument ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No document uploaded</p>
            <p className="text-sm mt-1">
              Upload a PDF document to enable AI analysis
            </p>
          </div>
        ) : !analysis && !isAnalyzing ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Ready to analyze</p>
            <p className="text-sm mt-1 mb-4">
              Click the Analyze button to extract key contract terms using AI
            </p>
            <Button onClick={() => handleAnalyze()} data-testid="analyze-button-center">
              <Brain className="h-4 w-4 mr-2" />
              Analyze Contract
            </Button>
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-primary" />
            <p className="font-medium">Analyzing contract...</p>
            <p className="text-sm text-muted-foreground mt-1">
              This may take a few moments
            </p>
          </div>
        ) : analysis ? (
          <div className="grid gap-3 md:grid-cols-2">
            {ANALYSIS_FIELDS.map((field) => (
              <AnalysisFieldCard
                key={field.key}
                field={field}
                value={analysis[field.key]}
                confidence={analysis.confidenceScores?.[field.key] || 0}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
