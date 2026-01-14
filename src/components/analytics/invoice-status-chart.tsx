'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Badge } from '@/components/ui/badge';

interface InvoiceStats {
  totalInvoices: number;
  pendingInvoices: number;
  validatedInvoices: number;
  disputedInvoices: number;
  paidInvoices: number;
  totalAmount: number;
  totalExpectedAmount: number;
  invoicesExceedingTolerance: number;
}

interface InvoiceStatusChartProps {
  stats: InvoiceStats;
}

const COLORS = {
  pending: 'hsl(43, 74%, 66%)',      // Yellow
  validated: 'hsl(173, 58%, 39%)',   // Teal/Green
  disputed: 'hsl(12, 76%, 61%)',     // Red/Orange
  paid: 'hsl(197, 37%, 24%)',        // Blue
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function InvoiceStatusChart({ stats }: InvoiceStatusChartProps) {
  const chartData = [
    { name: 'Pending', value: stats.pendingInvoices, color: COLORS.pending },
    { name: 'Validated', value: stats.validatedInvoices, color: COLORS.validated },
    { name: 'Disputed', value: stats.disputedInvoices, color: COLORS.disputed },
    { name: 'Paid', value: stats.paidInvoices, color: COLORS.paid },
  ].filter(d => d.value > 0);

  return (
    <Card data-testid="invoice-status-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice Status</CardTitle>
            <CardDescription>
              Distribution of invoices by status
            </CardDescription>
          </div>
          {stats.invoicesExceedingTolerance > 0 && (
            <Badge variant="destructive">
              {stats.invoicesExceedingTolerance} over tolerance
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Expected Amount</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalExpectedAmount)}</p>
          </div>
        </div>
        <div className="h-[250px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} invoices`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No invoice data available
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS.pending }} />
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="font-medium">{stats.pendingInvoices}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS.validated }} />
            <p className="text-xs text-muted-foreground">Validated</p>
            <p className="font-medium">{stats.validatedInvoices}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS.disputed }} />
            <p className="text-xs text-muted-foreground">Disputed</p>
            <p className="font-medium">{stats.disputedInvoices}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLORS.paid }} />
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-medium">{stats.paidInvoices}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
