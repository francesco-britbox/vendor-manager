'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MonthlyCalendar } from './monthly-calendar';
import {
  Clock,
  DollarSign,
  Users,
  Calendar,
  Palmtree,
} from 'lucide-react';
import type { TeamMember, TimeOffCode } from '@/types';

interface TeamMemberWithRelations extends TeamMember {
  vendor?: {
    id: string;
    name: string;
  };
  role?: {
    id: string;
    name: string;
  };
}

interface CalendarDayEntry {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  entry?: {
    id: string;
    hours?: number;
    timeOffCode?: TimeOffCode;
  };
}

interface TimesheetStats {
  totalTeamMembers: number;
  totalHoursLogged: number;
  totalSpend: number;
  averageHoursPerMember: number;
  timeOffDays: number;
}

interface MonthlyTimesheetSummary {
  teamMemberId: string;
  teamMemberName: string;
  month: number;
  year: number;
  totalHours: number;
  totalWorkingDays: number;
  timeOffBreakdown: Record<TimeOffCode, number>;
  dailyRate: number;
  currency: string;
  totalSpend: number;
}

/**
 * Full timesheet configuration interface with team member selection,
 * monthly calendar, and statistics dashboard
 */
export function TimesheetConfig() {
  // State
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberWithRelations[]>([]);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = React.useState<string>('');
  const [month, setMonth] = React.useState(() => new Date().getMonth() + 1);
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  const [calendar, setCalendar] = React.useState<CalendarDayEntry[]>([]);
  const [stats, setStats] = React.useState<TimesheetStats | null>(null);
  const [summaries, setSummaries] = React.useState<MonthlyTimesheetSummary[]>([]);

  // Loading states
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = React.useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Error and success messages
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Fetch team members on mount
  React.useEffect(() => {
    fetchTeamMembers();
  }, []);

  // Fetch calendar data when team member or month changes
  React.useEffect(() => {
    if (selectedTeamMemberId) {
      fetchCalendarData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamMemberId, month, year]);

  // Fetch stats when month changes
  React.useEffect(() => {
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeamMembers(true);
      const response = await fetch('/api/team-members?status=active');
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.data.teamMembers);
        // Auto-select first team member if available
        if (data.data.teamMembers.length > 0 && !selectedTeamMemberId) {
          setSelectedTeamMemberId(data.data.teamMembers[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch team members');
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      setError('Failed to fetch team members');
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const fetchCalendarData = async () => {
    if (!selectedTeamMemberId) return;

    try {
      setIsLoadingCalendar(true);
      const response = await fetch(
        `/api/timesheet-entries/calendar?teamMemberId=${selectedTeamMemberId}&month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.success) {
        setCalendar(data.data.calendar);
      } else {
        setError(data.error || 'Failed to fetch calendar data');
      }
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
      setError('Failed to fetch calendar data');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `/api/timesheet-entries?month=${month}&year=${year}&includeStats=true&includeSummary=true`
      );
      const data = await response.json();

      if (data.success) {
        if (data.data.stats) {
          setStats(data.data.stats);
        }
        if (data.data.summary) {
          setSummaries(data.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleMonthChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleSave = async (
    entries: { date: string; hours?: number | null; timeOffCode?: TimeOffCode | null }[]
  ) => {
    if (!selectedTeamMemberId) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/timesheet-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: entries.map((e) => ({
            teamMemberId: selectedTeamMemberId,
            date: new Date(e.date).toISOString(),
            hours: e.hours,
            timeOffCode: e.timeOffCode,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Timesheet entries saved successfully');
        // Refresh calendar and stats
        await Promise.all([fetchCalendarData(), fetchStats()]);
      } else {
        setError(data.error || 'Failed to save timesheet entries');
      }
    } catch (err) {
      console.error('Failed to save timesheet entries:', err);
      setError('Failed to save timesheet entries');
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected team member details
  const selectedTeamMember = teamMembers.find((tm) => tm.id === selectedTeamMemberId);
  const selectedMemberSummary = summaries.find((s) => s.teamMemberId === selectedTeamMemberId);

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          data-testid="timesheet-stats"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Team Members</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-team-members">
                {stats.totalTeamMembers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total Hours</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-total-hours">
                {stats.totalHoursLogged}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Total Spend</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-total-spend">
                {formatCurrency(stats.totalSpend)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Avg Hours/Member</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-avg-hours">
                {stats.averageHoursPerMember}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Palmtree className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Time Off Days</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-time-off">
                {stats.timeOffDays}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="timesheet-error-message"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="timesheet-success-message"
        >
          {success}
        </div>
      )}

      {/* Team Member Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet Entry
          </CardTitle>
          <CardDescription>
            Select a team member and enter their daily hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Team Member</label>
              <Select
                value={selectedTeamMemberId}
                onValueChange={setSelectedTeamMemberId}
                disabled={isLoadingTeamMembers}
              >
                <SelectTrigger data-testid="team-member-select">
                  <SelectValue placeholder="Select a team member..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((tm) => (
                    <SelectItem key={tm.id} value={tm.id}>
                      {tm.firstName} {tm.lastName}
                      {tm.vendor && (
                        <span className="text-muted-foreground ml-2">
                          ({tm.vendor.name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Rate Info */}
            {selectedTeamMember && (
              <div className="flex flex-col md:flex-row gap-4 md:items-end">
                <div>
                  <span className="text-sm text-muted-foreground">Daily Rate:</span>
                  <p className="font-semibold">
                    {formatCurrency(selectedTeamMember.dailyRate, selectedTeamMember.currency)}
                  </p>
                </div>
                {selectedMemberSummary && (
                  <div>
                    <span className="text-sm text-muted-foreground">Monthly Spend:</span>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(selectedMemberSummary.totalSpend, selectedTeamMember.currency)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Calendar */}
      {selectedTeamMemberId && selectedTeamMember && (
        <MonthlyCalendar
          teamMemberId={selectedTeamMemberId}
          teamMemberName={`${selectedTeamMember.firstName} ${selectedTeamMember.lastName}`}
          calendar={calendar}
          month={month}
          year={year}
          onMonthChange={handleMonthChange}
          onSave={handleSave}
          isLoading={isLoadingCalendar}
          isSaving={isSaving}
        />
      )}

      {/* Monthly Summaries Table */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary by Team Member</CardTitle>
            <CardDescription>
              Hours logged and spend calculations for all team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Team Member</th>
                    <th className="text-right py-3 px-4 font-medium">Hours</th>
                    <th className="text-right py-3 px-4 font-medium">Work Days</th>
                    <th className="text-right py-3 px-4 font-medium">Time Off</th>
                    <th className="text-right py-3 px-4 font-medium">Daily Rate</th>
                    <th className="text-right py-3 px-4 font-medium">Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((summary) => {
                    const totalTimeOff = Object.values(summary.timeOffBreakdown).reduce(
                      (a, b) => a + b,
                      0
                    );
                    return (
                      <tr
                        key={summary.teamMemberId}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedTeamMemberId(summary.teamMemberId)}
                        data-testid={`summary-row-${summary.teamMemberId}`}
                      >
                        <td className="py-3 px-4">{summary.teamMemberName}</td>
                        <td className="py-3 px-4 text-right">{summary.totalHours}</td>
                        <td className="py-3 px-4 text-right">{summary.totalWorkingDays}</td>
                        <td className="py-3 px-4 text-right">
                          {totalTimeOff > 0 ? `${totalTimeOff} days` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(summary.dailyRate, summary.currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          {formatCurrency(summary.totalSpend, summary.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4 text-right">
                      {summaries.reduce((sum, s) => sum + s.totalHours, 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {summaries.reduce((sum, s) => sum + s.totalWorkingDays, 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {summaries.reduce(
                        (sum, s) =>
                          sum + Object.values(s.timeOffBreakdown).reduce((a, b) => a + b, 0),
                        0
                      )}{' '}
                      days
                    </td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-green-600">
                      {formatCurrency(summaries.reduce((sum, s) => sum + s.totalSpend, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
