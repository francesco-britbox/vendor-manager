'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  DollarSign,
  Users,
  Palmtree,
  Building2,
  Calendar,
  Upload,
  CalendarDays,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  FilePlus2,
} from 'lucide-react';
import { VendorTimesheetEntry } from './vendor-timesheet-entry';
import { CSVUpload } from './csv-upload';
import { CalendarReview } from './calendar-review';
import { CSVTimesheetGenerator } from './csv-timesheet-generator';
import type { TimeOffCode } from '@/types';

// Types
interface TimesheetStats {
  totalTeamMembers: number;
  totalHoursLogged: number;
  totalSpend: number;
  averageHoursPerMember: number;
  timeOffDays: number;
}

interface VendorSummary {
  vendorId: string;
  vendorName: string;
  month: number;
  year: number;
  totalTeamMembers: number;
  totalHours: number;
  totalDays: number;
  totalSpend: number;
  timeOffBreakdown: Record<TimeOffCode, number>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type ViewMode = 'overview' | 'vendor-entry' | 'calendar-review' | 'csv-import' | 'csv-generate';

interface TimesheetManagementProps {
  defaultView?: ViewMode;
}

/**
 * Main Timesheet Management component with multiple views
 * - Overview: Dashboard with stats and vendor summaries
 * - Vendor Entry: Bulk entry for all team members in a vendor
 * - Calendar Review: Visual calendar with inline editing
 * - CSV Import: Bulk import from CSV files
 */
export function TimesheetManagement({
  defaultView = 'overview',
}: TimesheetManagementProps) {
  // State
  const [activeView, setActiveView] = React.useState<ViewMode>(defaultView);
  const [month, setMonth] = React.useState(() => new Date().getMonth() + 1);
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  const [stats, setStats] = React.useState<TimesheetStats | null>(null);
  const [vendorSummaries, setVendorSummaries] = React.useState<VendorSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch dashboard data
  React.useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, refreshKey]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch stats
      const statsResponse = await fetch(
        `/api/timesheet-entries?month=${month}&year=${year}&includeStats=true&includeSummary=true`
      );
      const statsData = await statsResponse.json();

      if (statsData.success) {
        if (statsData.data.stats) {
          setStats(statsData.data.stats);
        }
      }

      // Fetch vendor summaries
      const vendorsResponse = await fetch('/api/vendors?status=active');
      const vendorsData = await vendorsResponse.json();

      if (vendorsData.success && vendorsData.data.vendors) {
        // For each vendor, get their timesheet summary
        const summaries: VendorSummary[] = [];

        for (const vendor of vendorsData.data.vendors) {
          const teamMembersResponse = await fetch(
            `/api/team-members?vendorId=${vendor.id}&status=active`
          );
          const teamMembersData = await teamMembersResponse.json();

          if (teamMembersData.success && teamMembersData.data.teamMembers.length > 0) {
            const teamMemberIds = teamMembersData.data.teamMembers.map((tm: { id: string }) => tm.id);

            const entriesResponse = await fetch(
              `/api/timesheet-entries?teamMemberIds=${teamMemberIds.join(',')}&month=${month}&year=${year}&includeSummary=true`
            );
            const entriesData = await entriesResponse.json();

            if (entriesData.success && entriesData.data.summary) {
              // Aggregate summary for vendor
              let totalHours = 0;
              let totalDays = 0;
              let totalSpend = 0;
              const timeOffBreakdown: Record<TimeOffCode, number> = {
                VAC: 0,
                HALF: 0,
                SICK: 0,
                MAT: 0,
                CAS: 0,
                UNPAID: 0,
              };

              for (const summary of entriesData.data.summary) {
                totalHours += summary.totalHours;
                totalDays += summary.totalWorkingDays;
                totalSpend += summary.totalSpend;

                for (const [code, count] of Object.entries(summary.timeOffBreakdown)) {
                  timeOffBreakdown[code as TimeOffCode] += count as number;
                }
              }

              summaries.push({
                vendorId: vendor.id,
                vendorName: vendor.name,
                month,
                year,
                totalTeamMembers: entriesData.data.summary.length,
                totalHours: Math.round(totalHours * 100) / 100,
                totalDays: Math.round(totalDays * 100) / 100,
                totalSpend: Math.round(totalSpend * 100) / 100,
                timeOffBreakdown,
              });
            }
          }
        }

        setVendorSummaries(summaries);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handlePreviousMonth = () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setMonth(prevMonth);
    setYear(prevYear);
  };

  const handleNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleExportCSV = () => {
    // Build CSV content
    const headers = ['Vendor', 'Team Members', 'Total Hours', 'Work Days', 'Time Off', 'Total Spend'];
    const rows = vendorSummaries.map((summary) => {
      const totalTimeOff = Object.values(summary.timeOffBreakdown).reduce((a, b) => a + b, 0);
      return [
        summary.vendorName,
        summary.totalTeamMembers,
        summary.totalHours,
        summary.totalDays,
        totalTimeOff,
        summary.totalSpend,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-summary-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  // View navigation tabs
  const viewTabs = [
    { id: 'overview' as ViewMode, label: 'Overview', icon: LayoutGrid },
    { id: 'vendor-entry' as ViewMode, label: 'Vendor Entry', icon: Building2 },
    { id: 'calendar-review' as ViewMode, label: 'Calendar Review', icon: CalendarDays },
    { id: 'csv-import' as ViewMode, label: 'CSV Import', icon: Upload },
    { id: 'csv-generate' as ViewMode, label: 'Generate CSV', icon: FilePlus2 },
  ];

  return (
    <div className="space-y-6">
      {/* View Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeView === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView(tab.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Month Navigation (for Overview view) */}
        {activeView === 'overview' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              disabled={isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="min-w-[140px]"
              onClick={handleCurrentMonth}
              disabled={isLoading}
            >
              {MONTH_NAMES[month - 1]} {year}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          {/* Statistics Dashboard */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Team Members</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalTeamMembers}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">Total Hours</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalHoursLogged}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">Total Spend</span>
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalSpend)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-muted-foreground">Avg Hours/Member</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.averageHoursPerMember}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Palmtree className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-muted-foreground">Time Off Days</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.timeOffDays}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Vendor Summaries */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Vendor Summary
                      </CardTitle>
                      <CardDescription>
                        Monthly timesheet summary by vendor
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExportDialog(true)}
                      disabled={vendorSummaries.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {vendorSummaries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No timesheet data for this period
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Vendor</th>
                            <th className="text-right py-3 px-4 font-medium">Team Members</th>
                            <th className="text-right py-3 px-4 font-medium">Hours</th>
                            <th className="text-right py-3 px-4 font-medium">Work Days</th>
                            <th className="text-right py-3 px-4 font-medium">Time Off</th>
                            <th className="text-right py-3 px-4 font-medium">Total Spend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorSummaries.map((summary) => {
                            const totalTimeOff = Object.values(summary.timeOffBreakdown).reduce(
                              (a, b) => a + b,
                              0
                            );
                            return (
                              <tr
                                key={summary.vendorId}
                                className="border-b hover:bg-muted/50"
                              >
                                <td className="py-3 px-4 font-medium">{summary.vendorName}</td>
                                <td className="py-3 px-4 text-right">{summary.totalTeamMembers}</td>
                                <td className="py-3 px-4 text-right">{summary.totalHours}</td>
                                <td className="py-3 px-4 text-right">{summary.totalDays}</td>
                                <td className="py-3 px-4 text-right">
                                  {totalTimeOff > 0 ? `${totalTimeOff} days` : '-'}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold text-green-600">
                                  {formatCurrency(summary.totalSpend)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30 font-semibold">
                            <td className="py-3 px-4">Total</td>
                            <td className="py-3 px-4 text-right">
                              {vendorSummaries.reduce((sum, s) => sum + s.totalTeamMembers, 0)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {vendorSummaries.reduce((sum, s) => sum + s.totalHours, 0).toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {vendorSummaries.reduce((sum, s) => sum + s.totalDays, 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {vendorSummaries.reduce(
                                (sum, s) =>
                                  sum + Object.values(s.timeOffBreakdown).reduce((a, b) => a + b, 0),
                                0
                              )}{' '}
                              days
                            </td>
                            <td className="py-3 px-4 text-right text-green-600">
                              {formatCurrency(
                                vendorSummaries.reduce((sum, s) => sum + s.totalSpend, 0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveView('vendor-entry')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Vendor Entry</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter timesheets for entire vendor teams
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveView('calendar-review')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CalendarDays className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Calendar Review</h3>
                        <p className="text-sm text-muted-foreground">
                          Review and edit entries in calendar view
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveView('csv-import')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Upload className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">CSV Import</h3>
                        <p className="text-sm text-muted-foreground">
                          Bulk import timesheets from CSV files
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setActiveView('csv-generate')}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <FilePlus2 className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Generate CSV Timesheets</h3>
                        <p className="text-sm text-muted-foreground">
                          Create pre-filled CSV templates for vendors
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {/* Vendor Entry View */}
      {activeView === 'vendor-entry' && (
        <VendorTimesheetEntry workdayHours={8} />
      )}

      {/* Calendar Review View */}
      {activeView === 'calendar-review' && (
        <CalendarReview onDataChange={handleRefresh} />
      )}

      {/* CSV Import View */}
      {activeView === 'csv-import' && (
        <CSVUpload onImportComplete={handleRefresh} />
      )}

      {/* CSV Generate View */}
      {activeView === 'csv-generate' && (
        <CSVTimesheetGenerator
          initialMonth={month}
          initialYear={year}
          onGenerateComplete={handleRefresh}
        />
      )}

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Summary</DialogTitle>
            <DialogDescription>
              Export the vendor timesheet summary for {MONTH_NAMES[month - 1]} {year}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
