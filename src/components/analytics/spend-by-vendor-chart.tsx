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

interface SpendByVendor {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  invoiceCount: number;
}

interface SpendByVendorChartProps {
  data: SpendByVendor[];
}

const COLORS = [
  'hsl(12, 76%, 61%)',
  'hsl(173, 58%, 39%)',
  'hsl(197, 37%, 24%)',
  'hsl(43, 74%, 66%)',
  'hsl(27, 87%, 67%)',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SpendByVendorChart({ data }: SpendByVendorChartProps) {
  // Take top 10 vendors
  const topVendors = data.slice(0, 10);

  // Truncate long vendor names
  const chartData = topVendors.map(v => ({
    ...v,
    displayName: v.vendorName.length > 15
      ? `${v.vendorName.substring(0, 15)}...`
      : v.vendorName,
  }));

  return (
    <Card data-testid="spend-by-vendor-chart">
      <CardHeader>
        <CardTitle>Spend by Vendor</CardTitle>
        <CardDescription>
          Top vendors by total spend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Total Spend']}
                  labelFormatter={(label) => {
                    const vendor = chartData.find(v => v.displayName === label);
                    return vendor?.vendorName || String(label);
                  }}
                />
                <Bar dataKey="totalSpend" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No vendor spend data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
