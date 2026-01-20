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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  Calendar,
} from 'lucide-react';

// Types
interface Vendor {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
  dailyRate: number;
  plannedUtilization?: number | null;
  startDate: string;
  endDate?: string | null;
}

interface GeneratedRow {
  teamMemberName: string;
  date: string;
  hours: number;
  holidayType: string;
}

interface CSVTimesheetGeneratorProps {
  /**
   * Initial month (1-12)
   */
  initialMonth?: number;
  /**
   * Initial year
   */
  initialYear?: number;
  /**
   * Callback when CSV is generated
   */
  onGenerateComplete?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Default daily hours for team members (8 hours standard workday)
const DEFAULT_DAILY_HOURS = 8;

/**
 * Escapes a CSV field value to handle commas, quotes, and newlines
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Gets the number of days in a specific month
 */
function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats a date as yyyy-mm-dd
 */
function formatDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * CSV Timesheet Generator component
 * Generates pre-filled CSV timesheet templates for vendors
 */
export function CSVTimesheetGenerator({
  initialMonth,
  initialYear,
  onGenerateComplete,
}: CSVTimesheetGeneratorProps) {
  // State
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [eligibleVendors, setEligibleVendors] = React.useState<Vendor[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('');
  const [month, setMonth] = React.useState(() => initialMonth ?? new Date().getMonth() + 1);
  const [year, setYear] = React.useState(() => initialYear ?? new Date().getFullYear());

  const [generatedRows, setGeneratedRows] = React.useState<GeneratedRow[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Preview pagination
  const [previewPage, setPreviewPage] = React.useState(0);
  const rowsPerPage = 10;

  // Get selected vendor
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Calculate preview pagination
  const totalPreviewPages = Math.ceil(generatedRows.length / rowsPerPage);
  const previewRows = generatedRows.slice(
    previewPage * rowsPerPage,
    (previewPage + 1) * rowsPerPage
  );

  // Fetch vendors on mount
  React.useEffect(() => {
    fetchVendors();
  }, []);

  // Update eligible vendors when month/year changes
  React.useEffect(() => {
    filterEligibleVendors();
    // Reset selection when month/year changes
    setSelectedVendorId('');
    setGeneratedRows([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, vendors]);

  // Fetch team members when vendor changes
  React.useEffect(() => {
    if (selectedVendorId) {
      fetchTeamMembers();
      setGeneratedRows([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendorId]);

  const fetchVendors = async () => {
    try {
      setIsLoadingVendors(true);
      setError(null);
      const response = await fetch('/api/vendors?status=active');
      const data = await response.json();

      if (data.success) {
        setVendors(data.data.vendors);
      } else {
        setError(data.error || 'Failed to fetch vendors');
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setError('Failed to fetch vendors');
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const filterEligibleVendors = async () => {
    // Filter vendors that have:
    // 1. Active team members
    // 2. Team members with start dates on or before the end of the selected month
    // 3. Team members with end dates after the start of the selected month (or no end date)

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const eligible: Vendor[] = [];

    for (const vendor of vendors) {
      try {
        const response = await fetch(`/api/team-members?vendorId=${vendor.id}&status=active`);
        const data = await response.json();

        if (data.success && data.data.teamMembers) {
          // Check if any team members are active during the selected month
          const activeMembers = data.data.teamMembers.filter((tm: { startDate: string; endDate?: string | null }) => {
            const memberStart = new Date(tm.startDate);
            const memberEnd = tm.endDate ? new Date(tm.endDate) : null;

            // Member is active if:
            // - Their start date is on or before the end of the month
            // - Their end date is after the start of the month (or no end date)
            return memberStart <= endOfMonth && (!memberEnd || memberEnd >= startOfMonth);
          });

          if (activeMembers.length > 0) {
            eligible.push(vendor);
          }
        }
      } catch (err) {
        console.error(`Failed to fetch team members for vendor ${vendor.id}:`, err);
      }
    }

    setEligibleVendors(eligible);
  };

  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeamMembers(true);
      setError(null);
      const response = await fetch(`/api/team-members?vendorId=${selectedVendorId}&status=active`);
      const data = await response.json();

      if (data.success) {
        // Filter team members active during the selected month
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const activeMembers = data.data.teamMembers.filter((tm: { startDate: string; endDate?: string | null }) => {
          const memberStart = new Date(tm.startDate);
          const memberEnd = tm.endDate ? new Date(tm.endDate) : null;
          return memberStart <= endOfMonth && (!memberEnd || memberEnd >= startOfMonth);
        });

        setTeamMembers(activeMembers);
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

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setPreviewPage(0);
  };

  const handlePreviousMonth = () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setMonth(prevMonth);
    setYear(prevYear);
    setPreviewPage(0);
  };

  const handleNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setMonth(nextMonth);
    setYear(nextYear);
    setPreviewPage(0);
  };

  const handleGenerateCSV = () => {
    if (teamMembers.length === 0) {
      setError('No team members found for the selected vendor');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const rows: GeneratedRow[] = [];
      const daysInMonth = getDaysInMonth(month, year);
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);

      for (const member of teamMembers) {
        // Calculate daily hours based on planned utilization
        // If plannedUtilization is set (0-100%), use it to calculate hours
        // e.g., 100% = 8 hours, 50% = 4 hours, etc.
        let dailyHours = DEFAULT_DAILY_HOURS;
        if (member.plannedUtilization !== null && member.plannedUtilization !== undefined) {
          dailyHours = (member.plannedUtilization / 100) * DEFAULT_DAILY_HOURS;
        }

        // Determine the date range for this team member
        const memberStart = new Date(member.startDate);
        const memberEnd = member.endDate ? new Date(member.endDate) : null;

        // Effective start and end within the month
        const effectiveStart = memberStart > startOfMonth ? memberStart : startOfMonth;
        const effectiveEnd = memberEnd && memberEnd < endOfMonth ? memberEnd : endOfMonth;

        for (let day = 1; day <= daysInMonth; day++) {
          const currentDate = new Date(year, month - 1, day);

          // Skip if outside the team member's effective period
          if (currentDate < effectiveStart || currentDate > effectiveEnd) {
            continue;
          }

          const fullName = `${member.firstName} ${member.lastName}`;
          const dateStr = formatDateISO(year, month, day);

          rows.push({
            teamMemberName: fullName,
            date: dateStr,
            hours: dailyHours,
            holidayType: '', // Left blank for user to fill
          });
        }
      }

      setGeneratedRows(rows);
      setPreviewPage(0);
    } catch (err) {
      console.error('Failed to generate CSV:', err);
      setError('Failed to generate CSV data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (generatedRows.length === 0) return;

    // Build CSV content with headers matching the import format
    const headers = ['team_member_name', 'date', 'hours', 'holiday_type'];
    const csvRows = [
      headers.join(','),
      ...generatedRows.map((row) =>
        [
          escapeCSVField(row.teamMemberName),
          escapeCSVField(row.date),
          escapeCSVField(row.hours),
          escapeCSVField(row.holidayType),
        ].join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Generate filename: timesheets_[vendor]_[month]_[year].csv
    const vendorName = selectedVendor?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'vendor';
    const filename = `timesheets_${vendorName}_${MONTH_NAMES[month - 1]}_${year}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onGenerateComplete?.();
  };

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive flex items-start gap-2"
          data-testid="csv-generator-error"
        >
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Generate CSV Timesheets
          </CardTitle>
          <CardDescription>
            Generate pre-filled CSV timesheet templates for vendors. The generated CSV is compatible with the CSV Import feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Navigation */}
            <div className="space-y-2">
              <Label>Target Period</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  disabled={isGenerating}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center font-medium">
                  {MONTH_NAMES[month - 1]} {year}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isGenerating}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label htmlFor="csv-generator-vendor-select">Vendor</Label>
              <Select
                value={selectedVendorId}
                onValueChange={handleVendorChange}
                disabled={isLoadingVendors || isGenerating}
              >
                <SelectTrigger id="csv-generator-vendor-select" data-testid="csv-generator-vendor-select">
                  <SelectValue placeholder={
                    isLoadingVendors
                      ? "Loading vendors..."
                      : eligibleVendors.length === 0
                        ? "No eligible vendors for this period"
                        : "Select a vendor..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {eligibleVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isLoadingVendors && eligibleVendors.length === 0 && vendors.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  No vendors have active team members for {MONTH_NAMES[month - 1]} {year}
                </p>
              )}
            </div>
          </div>

          {/* Team Members Info */}
          {selectedVendorId && !isLoadingTeamMembers && teamMembers.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{teamMembers.length}</span>
                <span className="text-muted-foreground">team member{teamMembers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{getDaysInMonth(month, year)}</span>
                <span className="text-muted-foreground">days in month</span>
              </div>
            </div>
          )}

          {isLoadingTeamMembers && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading team members...</span>
            </div>
          )}

          {/* Generate Button */}
          {selectedVendorId && !isLoadingTeamMembers && teamMembers.length > 0 && (
            <Button
              onClick={handleGenerateCSV}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generate Timesheet Data
                </>
              )}
            </Button>
          )}

          {selectedVendorId && !isLoadingTeamMembers && teamMembers.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No active team members found for this vendor in {MONTH_NAMES[month - 1]} {year}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      {generatedRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Generated Data Preview</CardTitle>
                <CardDescription>
                  {generatedRows.length} rows generated for {selectedVendor?.name}
                </CardDescription>
              </div>
              <Button onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Preview Table */}
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Holiday Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => (
                    <TableRow key={`${row.teamMemberName}-${row.date}-${index}`}>
                      <TableCell className="font-medium">{row.teamMemberName}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="text-right">{row.hours}</TableCell>
                      <TableCell>
                        {row.holidayType || (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPreviewPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {previewPage * rowsPerPage + 1} - {Math.min((previewPage + 1) * rowsPerPage, generatedRows.length)} of {generatedRows.length} rows
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                    disabled={previewPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {previewPage + 1} of {totalPreviewPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))}
                    disabled={previewPage >= totalPreviewPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Usage Instructions */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              <h4 className="font-medium mb-2">How to use this CSV:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click &quot;Export as CSV&quot; to download the generated timesheet</li>
                <li>Open the CSV in Excel or Google Sheets</li>
                <li>Review and modify the hours as needed</li>
                <li>Fill in the &quot;holiday_type&quot; column for any time-off days (VAC, SICK, HALF, MAT, CAS, UNPAID)</li>
                <li>Import the modified CSV using the &quot;CSV Import&quot; feature</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
