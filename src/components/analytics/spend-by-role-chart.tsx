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

interface SpendByRole {
  roleId: string;
  roleName: string;
  totalSpend: number;
  memberCount: number;
}

interface SpendByRoleChartProps {
  data: SpendByRole[];
}

const COLORS = [
  'hsl(12, 76%, 61%)',
  'hsl(173, 58%, 39%)',
  'hsl(197, 37%, 24%)',
  'hsl(43, 74%, 66%)',
  'hsl(27, 87%, 67%)',
  'hsl(240, 50%, 55%)',
  'hsl(330, 60%, 55%)',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function SpendByRoleChart({ data }: SpendByRoleChartProps) {
  // Take top 7 roles and transform to chart-compatible format
  const topRoles = data.slice(0, 7).map((role, index) => ({
    ...role,
    name: role.roleName,
    value: role.totalSpend,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card data-testid="spend-by-role-chart">
      <CardHeader>
        <CardTitle>Spend by Role</CardTitle>
        <CardDescription>
          Estimated monthly spend distribution by role
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {topRoles.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topRoles}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => {
                    const displayName = String(name || '');
                    const truncatedName = displayName.length > 12
                      ? displayName.substring(0, 12) + '...'
                      : displayName;
                    const percentValue = typeof percent === 'number' ? percent : 0;
                    return `${truncatedName} (${(percentValue * 100).toFixed(0)}%)`;
                  }}
                >
                  {topRoles.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Monthly Spend']}
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
              No role data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
