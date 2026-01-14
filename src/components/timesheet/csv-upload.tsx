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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeOffCode } from '@/types';

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
}

interface CSVRow {
  rowNumber: number;
  teamMemberName: string;
  date: string;
  hours: string;
  holidayType: string;
  raw: string[];
}

interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value?: string;
}

interface ValidatedEntry {
  rowNumber: number;
  teamMemberId: string;
  teamMemberName: string;
  date: Date;
  hours: number | null;
  timeOffCode: TimeOffCode | null;
  isValid: boolean;
  errors: ValidationError[];
}

interface CSVUploadProps {
  onImportComplete?: () => void;
}

const VALID_TIME_OFF_CODES: TimeOffCode[] = ['VAC', 'HALF', 'SICK', 'MAT', 'CAS', 'UNPAID'];

const TIME_OFF_LABELS: Record<TimeOffCode, string> = {
  VAC: 'Vacation',
  HALF: 'Half Day',
  SICK: 'Sick Leave',
  MAT: 'Maternity Leave',
  CAS: 'Casual Leave',
  UNPAID: 'Unpaid Leave',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * CSV Bulk Upload component for timesheet entries
 */
export function CSVUpload({ onImportComplete }: CSVUploadProps) {
  // State
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('');
  const [month, setMonth] = React.useState(() => new Date().getMonth() + 1);
  const [year, setYear] = React.useState(() => new Date().getFullYear());

  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<CSVRow[]>([]);
  const [validatedEntries, setValidatedEntries] = React.useState<ValidatedEntry[]>([]);

  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = React.useState(false);
  const [existingEntriesCount, setExistingEntriesCount] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filtered team members for selected vendor
  const filteredTeamMembers = React.useMemo(() => {
    if (!selectedVendorId) return [];
    return teamMembers.filter((tm) => tm.vendorId === selectedVendorId);
  }, [teamMembers, selectedVendorId]);

  // Validation stats
  const validationStats = React.useMemo(() => {
    const valid = validatedEntries.filter((e) => e.isValid).length;
    const invalid = validatedEntries.filter((e) => !e.isValid).length;
    const errors = validatedEntries.flatMap((e) => e.errors);
    return { valid, invalid, total: validatedEntries.length, errors };
  }, [validatedEntries]);

  // Fetch vendors on mount
  React.useEffect(() => {
    fetchVendors();
  }, []);

  // Fetch team members when vendor changes
  React.useEffect(() => {
    if (selectedVendorId) {
      fetchTeamMembers();
    }
  }, [selectedVendorId]);

  // Re-validate when team members or month changes
  React.useEffect(() => {
    if (parsedRows.length > 0 && filteredTeamMembers.length > 0) {
      validateRows(parsedRows);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTeamMembers, month, year]);

  const fetchVendors = async () => {
    try {
      setIsLoadingVendors(true);
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

  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeamMembers(true);
      const response = await fetch(`/api/team-members?vendorId=${selectedVendorId}&status=active`);
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.data.teamMembers);
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
    // Reset file and validation state
    resetFileState();
  };

  const resetFileState = () => {
    setFile(null);
    setParsedRows([]);
    setValidatedEntries([]);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    // Parse CSV
    await parseCSV(selectedFile);
  };

  const parseCSV = async (csvFile: File) => {
    try {
      setIsParsing(true);
      const text = await csvFile.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 2) {
        setError('CSV file must have a header row and at least one data row');
        setParsedRows([]);
        return;
      }

      // Parse header to validate columns
      const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

      // Expected columns: team_member_name, date, hours, holiday_type (optional)
      const nameIndex = header.findIndex((h) =>
        h.includes('name') || h.includes('team') || h.includes('member')
      );
      const dateIndex = header.findIndex((h) => h.includes('date'));
      const hoursIndex = header.findIndex((h) => h.includes('hour'));
      const holidayIndex = header.findIndex((h) =>
        h.includes('holiday') || h.includes('absence') || h.includes('time_off') || h.includes('timeoff')
      );

      if (nameIndex === -1) {
        setError('CSV must have a column for team member name (e.g., "name", "team_member_name")');
        return;
      }
      if (dateIndex === -1) {
        setError('CSV must have a column for date');
        return;
      }
      if (hoursIndex === -1 && holidayIndex === -1) {
        setError('CSV must have a column for hours or holiday type');
        return;
      }

      // Parse data rows
      const rows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || values.every((v) => !v.trim())) continue;

        rows.push({
          rowNumber: i + 1, // 1-based row number (accounting for header)
          teamMemberName: values[nameIndex]?.trim() || '',
          date: values[dateIndex]?.trim() || '',
          hours: hoursIndex !== -1 ? values[hoursIndex]?.trim() || '' : '',
          holidayType: holidayIndex !== -1 ? values[holidayIndex]?.trim().toUpperCase() || '' : '',
          raw: values,
        });
      }

      setParsedRows(rows);

      // Validate rows
      if (filteredTeamMembers.length > 0) {
        await validateRows(rows);
      }
    } catch (err) {
      console.error('Failed to parse CSV:', err);
      setError('Failed to parse CSV file');
    } finally {
      setIsParsing(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  const validateRows = async (rows: CSVRow[]) => {
    setIsValidating(true);
    const validated: ValidatedEntry[] = [];

    // Get the valid date range for the selected month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    for (const row of rows) {
      const errors: ValidationError[] = [];
      let teamMemberId = '';
      let date: Date | null = null;
      let hours: number | null = null;
      let timeOffCode: TimeOffCode | null = null;

      // Validate team member name
      const matchedMember = findTeamMember(row.teamMemberName, filteredTeamMembers);
      if (!matchedMember) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'teamMemberName',
          message: `Team member "${row.teamMemberName}" not found under selected vendor`,
          value: row.teamMemberName,
        });
      } else {
        teamMemberId = matchedMember.id;
      }

      // Validate date
      const parsedDate = parseDate(row.date);
      if (!parsedDate) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'date',
          message: 'Invalid date format. Use YYYY-MM-DD',
          value: row.date,
        });
      } else if (parsedDate < startOfMonth || parsedDate > endOfMonth) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'date',
          message: `Date must be within ${MONTH_NAMES[month - 1]} ${year}`,
          value: row.date,
        });
      } else {
        date = parsedDate;
      }

      // Validate hours (if provided)
      if (row.hours) {
        const parsedHours = parseFloat(row.hours);
        if (isNaN(parsedHours)) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'hours',
            message: 'Hours must be a valid number',
            value: row.hours,
          });
        } else if (parsedHours < 0) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'hours',
            message: 'Hours cannot be negative',
            value: row.hours,
          });
        } else if (parsedHours > 24) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'hours',
            message: 'Hours cannot exceed 24',
            value: row.hours,
          });
        } else {
          hours = parsedHours;
        }
      }

      // Validate holiday type (if provided)
      if (row.holidayType) {
        const normalizedCode = normalizeTimeOffCode(row.holidayType);
        if (!normalizedCode) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'holidayType',
            message: `Invalid holiday type. Use: ${VALID_TIME_OFF_CODES.join(', ')}`,
            value: row.holidayType,
          });
        } else {
          timeOffCode = normalizedCode;
        }
      }

      // Validate that either hours or holiday type is provided
      if (!row.hours && !row.holidayType) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'hours/holidayType',
          message: 'Either hours or holiday type must be provided',
        });
      }

      validated.push({
        rowNumber: row.rowNumber,
        teamMemberId,
        teamMemberName: matchedMember
          ? `${matchedMember.firstName} ${matchedMember.lastName}`
          : row.teamMemberName,
        date: date || new Date(),
        hours,
        timeOffCode,
        isValid: errors.length === 0,
        errors,
      });
    }

    // Check for duplicates (same team member + date)
    const seen = new Map<string, number>();
    for (const entry of validated) {
      if (!entry.isValid) continue;

      const key = `${entry.teamMemberId}-${entry.date.toISOString().split('T')[0]}`;
      const existingRow = seen.get(key);

      if (existingRow) {
        entry.isValid = false;
        entry.errors.push({
          rowNumber: entry.rowNumber,
          field: 'duplicate',
          message: `Duplicate entry: same team member and date as row ${existingRow}`,
        });
      } else {
        seen.set(key, entry.rowNumber);
      }
    }

    setValidatedEntries(validated);
    setIsValidating(false);
  };

  const findTeamMember = (name: string, members: TeamMember[]): TeamMember | undefined => {
    const normalizedName = name.toLowerCase().trim();

    // Try exact match first
    let match = members.find((m) => {
      const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
      return fullName === normalizedName;
    });

    // Try partial match
    if (!match) {
      match = members.find((m) => {
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        const reverseName = `${m.lastName} ${m.firstName}`.toLowerCase();
        return fullName.includes(normalizedName) ||
               reverseName.includes(normalizedName) ||
               normalizedName.includes(fullName) ||
               normalizedName.includes(reverseName);
      });
    }

    // Try email match
    if (!match) {
      match = members.find((m) => m.email.toLowerCase() === normalizedName);
    }

    return match;
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Try YYYY-MM-DD format first
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      if (!isNaN(date.getTime())) return date;
    }

    // Try DD/MM/YYYY format
    const ukMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ukMatch) {
      const date = new Date(parseInt(ukMatch[3]), parseInt(ukMatch[2]) - 1, parseInt(ukMatch[1]));
      if (!isNaN(date.getTime())) return date;
    }

    // Try MM/DD/YYYY format
    const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const date = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
      if (!isNaN(date.getTime())) return date;
    }

    return null;
  };

  const normalizeTimeOffCode = (code: string): TimeOffCode | null => {
    const normalized = code.toUpperCase().trim();

    // Direct match
    if (VALID_TIME_OFF_CODES.includes(normalized as TimeOffCode)) {
      return normalized as TimeOffCode;
    }

    // Common aliases
    const aliases: Record<string, TimeOffCode> = {
      'VACATION': 'VAC',
      'HOLIDAY': 'VAC',
      'PTO': 'VAC',
      'ANNUAL': 'VAC',
      'SICK': 'SICK',
      'SICK_LEAVE': 'SICK',
      'ILLNESS': 'SICK',
      'MATERNITY': 'MAT',
      'MAT_LEAVE': 'MAT',
      'CASUAL': 'CAS',
      'CASUAL_LEAVE': 'CAS',
      'UNPAID': 'UNPAID',
      'UNPAID_LEAVE': 'UNPAID',
      'HALF': 'HALF',
      'HALF_DAY': 'HALF',
    };

    return aliases[normalized] || null;
  };

  const handleImportClick = async () => {
    if (validationStats.valid === 0) return;

    // Check for existing entries
    try {
      const teamMemberIds = [...new Set(validatedEntries.filter((e) => e.isValid).map((e) => e.teamMemberId))];
      const response = await fetch(
        `/api/timesheet-entries?teamMemberIds=${teamMemberIds.join(',')}&month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.success && data.data.entries.length > 0) {
        setExistingEntriesCount(data.data.entries.length);
        setShowOverwriteWarning(true);
        return;
      }
    } catch (err) {
      console.error('Failed to check existing entries:', err);
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmImport = async () => {
    setShowConfirmDialog(false);
    setShowOverwriteWarning(false);
    await importEntries();
  };

  const importEntries = async () => {
    try {
      setIsImporting(true);
      setError(null);

      const validEntries = validatedEntries.filter((e) => e.isValid);

      const entriesToImport = validEntries.map((entry) => ({
        teamMemberId: entry.teamMemberId,
        date: entry.date.toISOString(),
        hours: entry.hours,
        timeOffCode: entry.timeOffCode,
      }));

      const response = await fetch('/api/timesheet-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesToImport }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Successfully imported ${validEntries.length} timesheet entries`);
        resetFileState();
        onImportComplete?.();
      } else {
        setError(data.error || 'Failed to import entries');
      }
    } catch (err) {
      console.error('Failed to import entries:', err);
      setError('Failed to import entries');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    const errors = validatedEntries.flatMap((e) => e.errors);
    if (errors.length === 0) return;

    const csvContent = [
      ['Row', 'Field', 'Value', 'Error Message'].join(','),
      ...errors.map((err) => [
        err.rowNumber,
        err.field,
        `"${(err.value || '').replace(/"/g, '""')}"`,
        `"${err.message.replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-import-errors-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csvContent = [
      ['team_member_name', 'date', 'hours', 'holiday_type'].join(','),
      ['John Smith', `${year}-${String(month).padStart(2, '0')}-01`, '8', ''].join(','),
      ['Jane Doe', `${year}-${String(month).padStart(2, '0')}-01`, '', 'VAC'].join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timesheet-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
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

  // Get selected vendor name
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive flex items-start gap-2"
          data-testid="csv-upload-error"
        >
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700 flex items-start gap-2"
          data-testid="csv-upload-success"
        >
          <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Vendor and Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV Bulk Import
          </CardTitle>
          <CardDescription>
            Import timesheet entries from a CSV file for a specific vendor and month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label htmlFor="csv-vendor-select">Vendor</Label>
              <Select
                value={selectedVendorId}
                onValueChange={handleVendorChange}
                disabled={isLoadingVendors}
              >
                <SelectTrigger id="csv-vendor-select" data-testid="csv-vendor-select">
                  <SelectValue placeholder="Select a vendor first..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Navigation */}
            <div className="space-y-2">
              <Label>Target Period</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  disabled={isImporting}
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
                  disabled={isImporting}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          {selectedVendorId && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                  disabled={isLoadingTeamMembers || isImporting}
                />
                <label
                  htmlFor="csv-file-input"
                  className={cn(
                    'cursor-pointer flex flex-col items-center gap-2',
                    (isLoadingTeamMembers || isImporting) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {file ? (
                    <>
                      <FileText className="h-12 w-12 text-primary" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Click to select a different file
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground" />
                      <span className="font-medium">Click to upload CSV file</span>
                      <span className="text-sm text-muted-foreground">
                        or drag and drop
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Template Download */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Need a template?{' '}
                  <button
                    onClick={downloadTemplate}
                    className="text-primary hover:underline"
                  >
                    Download CSV template
                  </button>
                </span>
                {file && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFileState}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {(isParsing || isValidating) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              {isParsing ? 'Parsing CSV file...' : 'Validating entries...'}
            </p>
          </CardContent>
        </Card>
      )}

      {validatedEntries.length > 0 && !isParsing && !isValidating && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>
                  Review the validated entries before importing
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{validationStats.valid} valid</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span>{validationStats.invalid} invalid</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Table */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-[60px]">Row</TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Time Off</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedEntries.map((entry) => (
                    <TableRow
                      key={entry.rowNumber}
                      className={cn(!entry.isValid && 'bg-red-50/50')}
                    >
                      <TableCell className="font-mono text-xs">
                        {entry.rowNumber}
                      </TableCell>
                      <TableCell>{entry.teamMemberName}</TableCell>
                      <TableCell>
                        {entry.date.toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.hours !== null ? entry.hours : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.timeOffCode ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            {TIME_OFF_LABELS[entry.timeOffCode]}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-red-600 max-w-[200px] truncate">
                              {entry.errors[0]?.message}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              {validationStats.invalid > 0 && (
                <Button variant="outline" onClick={downloadErrorReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Error Report
                </Button>
              )}
              <div className="flex-1" />
              <Button
                onClick={handleImportClick}
                disabled={validationStats.valid === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validationStats.valid} Entries
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Import</DialogTitle>
            <DialogDescription>
              You are about to import {validationStats.valid} timesheet entries for{' '}
              {selectedVendor?.name} for {MONTH_NAMES[month - 1]} {year}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>
              <Upload className="h-4 w-4 mr-2" />
              Confirm Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite Warning Dialog */}
      <Dialog open={showOverwriteWarning} onOpenChange={setShowOverwriteWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Existing Entries Found
            </DialogTitle>
            <DialogDescription>
              There are {existingEntriesCount} existing timesheet entries for this period.
              Importing will overwrite any entries with the same team member and date.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOverwriteWarning(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmImport}
            >
              Overwrite Existing Entries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
