'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SpendByCurrency {
  currency: string;
  totalSpend: number;
  invoiceCount: number;
}

interface SpendByCurrencyChartProps {
  data: SpendByCurrency[];
}

const COLORS = [
  'hsl(12, 76%, 61%)',
  'hsl(173, 58%, 39%)',
  'hsl(197, 37%, 24%)',
  'hsl(43, 74%, 66%)',
  'hsl(27, 87%, 67%)',
];

const formatAmount = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
};

export function SpendByCurrencyChart({ data }: SpendByCurrencyChartProps) {
  return (
    <Card data-testid="spend-by-currency-chart">
      <CardHeader>
        <CardTitle>Spend by Currency</CardTitle>
        <CardDescription>
          Total spend breakdown by currency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="currency" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, _, props) => {
                    const currency = props?.payload?.currency || 'GBP';
                    return [formatAmount(Number(value), currency), 'Total Spend'];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="totalSpend" radius={[4, 4, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No currency data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
