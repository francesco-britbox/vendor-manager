'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface SpendOverTime {
  month: string;
  year: number;
  totalSpend: number;
  invoiceCount: number;
}

interface SpendOverTimeChartProps {
  data: SpendOverTime[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SpendOverTimeChart({ data }: SpendOverTimeChartProps) {
  // Format data for display
  const chartData = data.map(d => ({
    ...d,
    label: `${d.month} ${d.year}`,
  }));

  return (
    <Card data-testid="spend-over-time-chart">
      <CardHeader>
        <CardTitle>Spend Over Time</CardTitle>
        <CardDescription>
          Monthly spend trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Total Spend']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalSpend"
                  stroke="hsl(173, 58%, 39%)"
                  fillOpacity={1}
                  fill="url(#colorSpend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No spend data available for this period
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
