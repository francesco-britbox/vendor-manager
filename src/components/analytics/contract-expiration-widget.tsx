'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Clock } from 'lucide-react';

interface ExpiringContract {
  id: string;
  title: string;
  vendorName: string;
  endDate: string;
  daysUntilExpiration: number;
  value: number;
  currency: string;
}

interface ContractExpirationWidgetProps {
  contracts: ExpiringContract[];
}

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getUrgencyColor = (days: number) => {
  if (days <= 7) return 'destructive';
  if (days <= 14) return 'warning';
  return 'secondary';
};

export function ContractExpirationWidget({ contracts }: ContractExpirationWidgetProps) {
  // Sort by days until expiration (most urgent first)
  const sortedContracts = [...contracts].sort(
    (a, b) => a.daysUntilExpiration - b.daysUntilExpiration
  );

  // Take top 5
  const displayContracts = sortedContracts.slice(0, 5);

  return (
    <Card data-testid="contract-expiration-widget">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Expiring Contracts
            </CardTitle>
            <CardDescription>
              Contracts expiring within 30 days
            </CardDescription>
          </div>
          <Badge variant="outline">{contracts.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {displayContracts.length > 0 ? (
          <div className="space-y-4">
            {displayContracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm leading-tight">
                    {contract.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {contract.vendorName}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(contract.endDate)}
                    </span>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Badge variant={getUrgencyColor(contract.daysUntilExpiration) as 'destructive' | 'secondary' | 'outline' | 'default'}>
                    <Clock className="h-3 w-3 mr-1" />
                    {contract.daysUntilExpiration} days
                  </Badge>
                  <p className="text-sm font-medium">
                    {formatCurrency(contract.value, contract.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No contracts expiring soon</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
