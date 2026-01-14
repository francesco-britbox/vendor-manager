/**
 * Timesheet Service
 *
 * Manages timesheet entry CRUD operations with Zod validation.
 * Provides data access functions for the TimesheetEntry model.
 * Includes calculation functions for monthly totals and spend calculations.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import type { TimesheetEntry, TimeOffCode } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for time-off codes
 */
export const timeOffCodeSchema = z.enum(['VAC', 'HALF', 'SICK', 'MAT', 'CAS', 'UNPAID']);

/**
 * Zod schema for creating/updating a timesheet entry
 */
export const createTimesheetEntrySchema = z.object({
  teamMemberId: z.string().cuid('Invalid team member ID format'),
  date: z.coerce.date(),
  hours: z
    .number()
    .min(0, 'Hours must be at least 0')
    .max(24, 'Hours cannot exceed 24')
    .optional()
    .nullable(),
  timeOffCode: timeOffCodeSchema.optional().nullable(),
}).refine(
  (data) => data.hours !== null || data.timeOffCode !== null || (data.hours === null && data.timeOffCode === null),
  { message: 'Entry must have either hours or a time-off code (or neither to clear)' }
);

/**
 * Zod schema for bulk creating/updating timesheet entries
 */
export const bulkTimesheetEntriesSchema = z.object({
  entries: z.array(createTimesheetEntrySchema),
});

/**
 * Zod schema for timesheet entry ID parameter
 */
export const timesheetEntryIdSchema = z.string().cuid('Invalid timesheet entry ID format');

/**
 * Zod schema for querying timesheet entries
 */
export const timesheetQuerySchema = z.object({
  teamMemberId: z.string().cuid('Invalid team member ID format').optional(),
  teamMemberIds: z.array(z.string().cuid('Invalid team member ID format')).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2000).max(2100).optional(),
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a timesheet entry
 */
export type CreateTimesheetEntryInput = z.infer<typeof createTimesheetEntrySchema>;

/**
 * Input type for bulk timesheet entries
 */
export type BulkTimesheetEntriesInput = z.infer<typeof bulkTimesheetEntriesSchema>;

/**
 * Query options for fetching timesheet entries
 */
export type TimesheetQueryOptions = z.infer<typeof timesheetQuerySchema>;

/**
 * Timesheet entry with team member details
 */
export interface TimesheetEntryWithMember extends TimesheetEntry {
  teamMember: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dailyRate: number;
    currency: string;
    vendor?: {
      id: string;
      name: string;
    };
  };
}

/**
 * Monthly summary for a team member
 */
export interface MonthlyTimesheetSummary {
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
 * Calendar day entry for UI
 */
export interface CalendarDayEntry {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  entry?: {
    id: string;
    hours?: number;
    timeOffCode?: TimeOffCode;
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate timesheet entry input
 */
export function validateTimesheetEntryInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateTimesheetEntryInput;
} {
  const result = createTimesheetEntrySchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

/**
 * Validate bulk timesheet entries input
 */
export function validateBulkTimesheetEntriesInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: BulkTimesheetEntriesInput;
} {
  const result = bulkTimesheetEntriesSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

/**
 * Validate timesheet query options
 */
export function validateTimesheetQuery(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: TimesheetQueryOptions;
} {
  const result = timesheetQuerySchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Transform database timesheet entry to API type
 */
function transformTimesheetEntry(dbEntry: {
  id: string;
  teamMemberId: string;
  date: Date;
  hours: { toNumber: () => number } | number | null;
  timeOffCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  teamMember?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dailyRate: { toNumber: () => number } | number;
    currency: string;
    vendor?: {
      id: string;
      name: string;
    };
  };
}): TimesheetEntry | TimesheetEntryWithMember {
  const hours = dbEntry.hours
    ? (typeof dbEntry.hours === 'object' && 'toNumber' in dbEntry.hours
      ? dbEntry.hours.toNumber()
      : dbEntry.hours as number)
    : undefined;

  const baseEntry: TimesheetEntry = {
    id: dbEntry.id,
    teamMemberId: dbEntry.teamMemberId,
    date: dbEntry.date,
    hours,
    timeOffCode: dbEntry.timeOffCode as TimeOffCode | undefined,
    createdAt: dbEntry.createdAt,
    updatedAt: dbEntry.updatedAt,
  };

  if (dbEntry.teamMember) {
    const dailyRate = typeof dbEntry.teamMember.dailyRate === 'object' && 'toNumber' in dbEntry.teamMember.dailyRate
      ? dbEntry.teamMember.dailyRate.toNumber()
      : dbEntry.teamMember.dailyRate as number;

    return {
      ...baseEntry,
      teamMember: {
        id: dbEntry.teamMember.id,
        firstName: dbEntry.teamMember.firstName,
        lastName: dbEntry.teamMember.lastName,
        email: dbEntry.teamMember.email,
        dailyRate,
        currency: dbEntry.teamMember.currency,
        ...(dbEntry.teamMember.vendor && { vendor: dbEntry.teamMember.vendor }),
      },
    };
  }

  return baseEntry;
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get timesheet entries with optional filtering
 */
export async function getTimesheetEntries(options?: TimesheetQueryOptions): Promise<{
  entries: TimesheetEntryWithMember[];
  total: number;
}> {
  const where: {
    teamMemberId?: string | { in: string[] };
    date?: { gte?: Date; lte?: Date };
  } = {};

  // Team member filter
  if (options?.teamMemberId) {
    where.teamMemberId = options.teamMemberId;
  } else if (options?.teamMemberIds && options.teamMemberIds.length > 0) {
    where.teamMemberId = { in: options.teamMemberIds };
  }

  // Date range filter
  if (options?.dateFrom || options?.dateTo) {
    where.date = {};
    if (options.dateFrom) {
      where.date.gte = options.dateFrom;
    }
    if (options.dateTo) {
      where.date.lte = options.dateTo;
    }
  }

  // Month/Year filter (if no date range specified)
  if (options?.month && options?.year && !options?.dateFrom && !options?.dateTo) {
    const startOfMonth = new Date(options.year, options.month - 1, 1);
    const endOfMonth = new Date(options.year, options.month, 0);
    where.date = {
      gte: startOfMonth,
      lte: endOfMonth,
    };
  }

  const [entries, total] = await Promise.all([
    prisma.timesheetEntry.findMany({
      where,
      include: {
        teamMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dailyRate: true,
            currency: true,
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }],
    }),
    prisma.timesheetEntry.count({ where }),
  ]);

  return {
    entries: entries.map((e) => transformTimesheetEntry(e) as TimesheetEntryWithMember),
    total,
  };
}

/**
 * Get a single timesheet entry by ID
 */
export async function getTimesheetEntryById(id: string): Promise<TimesheetEntryWithMember | null> {
  const entry = await prisma.timesheetEntry.findUnique({
    where: { id },
    include: {
      teamMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          dailyRate: true,
          currency: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return entry ? (transformTimesheetEntry(entry) as TimesheetEntryWithMember) : null;
}

/**
 * Create or update a timesheet entry
 * Uses upsert to handle the unique constraint on teamMemberId + date
 */
export async function upsertTimesheetEntry(
  input: CreateTimesheetEntryInput
): Promise<TimesheetEntry> {
  // Verify team member exists
  const teamMember = await prisma.teamMember.findUnique({
    where: { id: input.teamMemberId },
  });
  if (!teamMember) {
    throw new Error('Team member not found');
  }

  // If both hours and timeOffCode are null, delete the entry if it exists
  if (input.hours === null && input.timeOffCode === null) {
    const existing = await prisma.timesheetEntry.findUnique({
      where: {
        teamMemberId_date: {
          teamMemberId: input.teamMemberId,
          date: input.date,
        },
      },
    });
    if (existing) {
      await prisma.timesheetEntry.delete({
        where: { id: existing.id },
      });
    }
    // Return a placeholder entry for consistency
    return {
      id: '',
      teamMemberId: input.teamMemberId,
      date: input.date,
      hours: undefined,
      timeOffCode: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const entry = await prisma.timesheetEntry.upsert({
    where: {
      teamMemberId_date: {
        teamMemberId: input.teamMemberId,
        date: input.date,
      },
    },
    create: {
      teamMemberId: input.teamMemberId,
      date: input.date,
      hours: input.hours ?? null,
      timeOffCode: input.timeOffCode ?? null,
    },
    update: {
      hours: input.hours ?? null,
      timeOffCode: input.timeOffCode ?? null,
    },
  });

  return transformTimesheetEntry(entry) as TimesheetEntry;
}

/**
 * Bulk upsert timesheet entries
 */
export async function bulkUpsertTimesheetEntries(
  entries: CreateTimesheetEntryInput[]
): Promise<{ created: number; updated: number; deleted: number }> {
  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Process entries in a transaction
  await prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      // Check if entry exists
      const existing = await tx.timesheetEntry.findUnique({
        where: {
          teamMemberId_date: {
            teamMemberId: entry.teamMemberId,
            date: entry.date,
          },
        },
      });

      // If both hours and timeOffCode are null, delete the entry
      if (entry.hours === null && entry.timeOffCode === null) {
        if (existing) {
          await tx.timesheetEntry.delete({
            where: { id: existing.id },
          });
          deleted++;
        }
        continue;
      }

      if (existing) {
        await tx.timesheetEntry.update({
          where: { id: existing.id },
          data: {
            hours: entry.hours ?? null,
            timeOffCode: entry.timeOffCode ?? null,
          },
        });
        updated++;
      } else {
        await tx.timesheetEntry.create({
          data: {
            teamMemberId: entry.teamMemberId,
            date: entry.date,
            hours: entry.hours ?? null,
            timeOffCode: entry.timeOffCode ?? null,
          },
        });
        created++;
      }
    }
  });

  return { created, updated, deleted };
}

/**
 * Delete a timesheet entry by ID
 */
export async function deleteTimesheetEntry(id: string): Promise<boolean> {
  try {
    await prisma.timesheetEntry.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get monthly summary for team members
 */
export async function getMonthlyTimesheetSummary(
  month: number,
  year: number,
  teamMemberIds?: string[]
): Promise<MonthlyTimesheetSummary[]> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  // Get team members (optionally filtered)
  const teamMembers = await prisma.teamMember.findMany({
    where: teamMemberIds?.length ? { id: { in: teamMemberIds } } : { status: 'active' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dailyRate: true,
      currency: true,
    },
  });

  // Get all entries for the month
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      teamMemberId: teamMemberIds?.length ? { in: teamMemberIds } : { in: teamMembers.map((t) => t.id) },
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  // Group entries by team member
  const entriesByMember = new Map<string, typeof entries>();
  for (const entry of entries) {
    const memberEntries = entriesByMember.get(entry.teamMemberId) || [];
    memberEntries.push(entry);
    entriesByMember.set(entry.teamMemberId, memberEntries);
  }

  // Calculate summaries
  const summaries: MonthlyTimesheetSummary[] = [];

  for (const member of teamMembers) {
    const memberEntries = entriesByMember.get(member.id) || [];
    const dailyRate = typeof member.dailyRate === 'object' && 'toNumber' in member.dailyRate
      ? (member.dailyRate as { toNumber: () => number }).toNumber()
      : member.dailyRate as number;

    // Calculate totals
    let totalHours = new Decimal(0);
    let totalWorkingDays = 0;
    const timeOffBreakdown: Record<string, number> = {
      VAC: 0,
      HALF: 0,
      SICK: 0,
      MAT: 0,
      CAS: 0,
      UNPAID: 0,
    };

    for (const entry of memberEntries) {
      if (entry.hours) {
        const hours = typeof entry.hours === 'object' && 'toNumber' in entry.hours
          ? entry.hours.toNumber()
          : entry.hours as number;
        totalHours = totalHours.plus(hours);
        // Assuming 8 hours = 1 working day
        totalWorkingDays += hours / 8;
      }
      if (entry.timeOffCode) {
        timeOffBreakdown[entry.timeOffCode]++;
        // HALF day counts as 0.5 working day, others as 1
        if (entry.timeOffCode === 'HALF') {
          totalWorkingDays += 0.5;
        } else {
          totalWorkingDays += 1;
        }
      }
    }

    // Calculate spend (hours / 8 * daily rate for worked hours)
    // Time-off codes don't contribute to billable spend
    const totalSpend = totalHours.dividedBy(8).times(dailyRate).toNumber();

    summaries.push({
      teamMemberId: member.id,
      teamMemberName: `${member.firstName} ${member.lastName}`,
      month,
      year,
      totalHours: totalHours.toNumber(),
      totalWorkingDays: Math.round(totalWorkingDays * 100) / 100,
      timeOffBreakdown: timeOffBreakdown as Record<TimeOffCode, number>,
      dailyRate,
      currency: member.currency,
      totalSpend: Math.round(totalSpend * 100) / 100,
    });
  }

  return summaries;
}

/**
 * Get calendar data for a team member for a specific month
 */
export async function getTeamMemberCalendar(
  teamMemberId: string,
  month: number,
  year: number
): Promise<CalendarDayEntry[]> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  const daysInMonth = endOfMonth.getDate();

  // Get all entries for the month
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      teamMemberId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  // Create a map for quick lookup
  const entryMap = new Map<string, (typeof entries)[0]>();
  for (const entry of entries) {
    const dateKey = entry.date.toISOString().split('T')[0];
    entryMap.set(dateKey, entry);
  }

  // Generate calendar days
  const calendarDays: CalendarDayEntry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const entry = entryMap.get(dateStr);

    calendarDays.push({
      date: dateStr,
      dayOfWeek,
      isWeekend,
      entry: entry
        ? {
            id: entry.id,
            hours: entry.hours
              ? (typeof entry.hours === 'object' && 'toNumber' in entry.hours
                ? entry.hours.toNumber()
                : entry.hours as number)
              : undefined,
            timeOffCode: entry.timeOffCode as TimeOffCode | undefined,
          }
        : undefined,
    });
  }

  return calendarDays;
}

/**
 * Get aggregated stats for the timesheet dashboard
 */
export async function getTimesheetStats(month: number, year: number): Promise<{
  totalTeamMembers: number;
  totalHoursLogged: number;
  totalSpend: number;
  averageHoursPerMember: number;
  timeOffDays: number;
}> {
  const summaries = await getMonthlyTimesheetSummary(month, year);

  const totalTeamMembers = summaries.length;
  const totalHoursLogged = summaries.reduce((sum, s) => sum + s.totalHours, 0);
  const totalSpend = summaries.reduce((sum, s) => sum + s.totalSpend, 0);
  const averageHoursPerMember = totalTeamMembers > 0 ? totalHoursLogged / totalTeamMembers : 0;
  const timeOffDays = summaries.reduce((sum, s) => {
    return sum + Object.values(s.timeOffBreakdown).reduce((a, b) => a + b, 0);
  }, 0);

  return {
    totalTeamMembers,
    totalHoursLogged: Math.round(totalHoursLogged * 100) / 100,
    totalSpend: Math.round(totalSpend * 100) / 100,
    averageHoursPerMember: Math.round(averageHoursPerMember * 100) / 100,
    timeOffDays,
  };
}

// ============================================================================
// VENDOR-FILTERED OPERATIONS
// ============================================================================

/**
 * Get timesheet entries filtered by vendor
 */
export async function getTimesheetEntriesByVendor(
  vendorId: string,
  month: number,
  year: number
): Promise<{ entries: TimesheetEntryWithMember[]; total: number }> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  // Get team members for this vendor
  const teamMembers = await prisma.teamMember.findMany({
    where: { vendorId, status: 'active' },
    select: { id: true },
  });

  const teamMemberIds = teamMembers.map((tm) => tm.id);

  if (teamMemberIds.length === 0) {
    return { entries: [], total: 0 };
  }

  return getTimesheetEntries({
    teamMemberIds,
    dateFrom: startOfMonth,
    dateTo: endOfMonth,
  });
}

/**
 * Get monthly summary by vendor
 */
export async function getMonthlyTimesheetSummaryByVendor(
  vendorId: string,
  month: number,
  year: number
): Promise<MonthlyTimesheetSummary[]> {
  // Get team members for this vendor
  const teamMembers = await prisma.teamMember.findMany({
    where: { vendorId, status: 'active' },
    select: { id: true },
  });

  const teamMemberIds = teamMembers.map((tm) => tm.id);

  if (teamMemberIds.length === 0) {
    return [];
  }

  return getMonthlyTimesheetSummary(month, year, teamMemberIds);
}

/**
 * Get aggregated vendor summary for a month
 */
export interface VendorTimesheetSummary {
  vendorId: string;
  vendorName: string;
  month: number;
  year: number;
  totalTeamMembers: number;
  totalHours: number;
  totalDays: number;
  totalSpend: number;
  timeOffBreakdown: Record<TimeOffCode, number>;
  teamMemberSummaries: MonthlyTimesheetSummary[];
}

export async function getVendorTimesheetSummary(
  vendorId: string,
  month: number,
  year: number
): Promise<VendorTimesheetSummary | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, name: true },
  });

  if (!vendor) {
    return null;
  }

  const summaries = await getMonthlyTimesheetSummaryByVendor(vendorId, month, year);

  // Aggregate totals
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

  for (const summary of summaries) {
    totalHours += summary.totalHours;
    totalDays += summary.totalWorkingDays;
    totalSpend += summary.totalSpend;

    for (const [code, count] of Object.entries(summary.timeOffBreakdown)) {
      timeOffBreakdown[code as TimeOffCode] += count;
    }
  }

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    month,
    year,
    totalTeamMembers: summaries.length,
    totalHours: Math.round(totalHours * 100) / 100,
    totalDays: Math.round(totalDays * 100) / 100,
    totalSpend: Math.round(totalSpend * 100) / 100,
    timeOffBreakdown,
    teamMemberSummaries: summaries,
  };
}

/**
 * Get all vendors' timesheet summaries for a month
 */
export async function getAllVendorsTimesheetSummary(
  month: number,
  year: number
): Promise<VendorTimesheetSummary[]> {
  const vendors = await prisma.vendor.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  const summaries: VendorTimesheetSummary[] = [];

  for (const vendor of vendors) {
    const summary = await getVendorTimesheetSummary(vendor.id, month, year);
    if (summary && summary.totalTeamMembers > 0) {
      summaries.push(summary);
    }
  }

  return summaries;
}

// ============================================================================
// CSV IMPORT VALIDATION
// ============================================================================

/**
 * Zod schema for CSV import row
 */
export const csvImportRowSchema = z.object({
  teamMemberName: z.string().min(1, 'Team member name is required'),
  date: z.string().min(1, 'Date is required'),
  hours: z.number().min(0).max(24).optional().nullable(),
  timeOffCode: timeOffCodeSchema.optional().nullable(),
}).refine(
  (data) => data.hours !== null || data.timeOffCode !== null,
  { message: 'Either hours or time-off code must be provided' }
);

/**
 * Zod schema for CSV import request
 */
export const csvImportSchema = z.object({
  vendorId: z.string().cuid('Invalid vendor ID format'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  entries: z.array(csvImportRowSchema),
});

export type CSVImportInput = z.infer<typeof csvImportSchema>;
export type CSVImportRowInput = z.infer<typeof csvImportRowSchema>;

/**
 * CSV Import validation result
 */
export interface CSVImportValidationResult {
  valid: boolean;
  validEntries: CreateTimesheetEntryInput[];
  errors: {
    rowNumber: number;
    field: string;
    message: string;
    value?: string;
  }[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  };
}

/**
 * Validate CSV import data
 */
export async function validateCSVImport(
  vendorId: string,
  month: number,
  year: number,
  rows: { teamMemberName: string; date: string; hours?: number | null; timeOffCode?: string | null }[]
): Promise<CSVImportValidationResult> {
  const errors: CSVImportValidationResult['errors'] = [];
  const validEntries: CreateTimesheetEntryInput[] = [];
  const seenEntries = new Map<string, number>();

  // Get team members for this vendor
  const teamMembers = await prisma.teamMember.findMany({
    where: { vendorId, status: 'active' },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  // Build lookup maps for team member matching
  const memberByName = new Map<string, typeof teamMembers[0]>();
  const memberByEmail = new Map<string, typeof teamMembers[0]>();

  for (const member of teamMembers) {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    memberByName.set(fullName, member);
    memberByEmail.set(member.email.toLowerCase(), member);
  }

  // Valid date range
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  let duplicateRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // 1-based, accounting for header
    let hasError = false;

    // Find team member
    const normalizedName = row.teamMemberName.toLowerCase().trim();
    let member = memberByName.get(normalizedName) || memberByEmail.get(normalizedName);

    // Try partial match if exact match not found
    if (!member) {
      for (const [name, m] of memberByName) {
        if (name.includes(normalizedName) || normalizedName.includes(name)) {
          member = m;
          break;
        }
      }
    }

    if (!member) {
      errors.push({
        rowNumber,
        field: 'teamMemberName',
        message: `Team member "${row.teamMemberName}" not found for this vendor`,
        value: row.teamMemberName,
      });
      hasError = true;
    }

    // Parse and validate date
    let parsedDate: Date | null = null;

    if (!row.date) {
      errors.push({
        rowNumber,
        field: 'date',
        message: 'Date is required',
      });
      hasError = true;
    } else {
      // Try parsing various date formats
      const dateStr = row.date.trim();

      // YYYY-MM-DD
      const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoMatch) {
        parsedDate = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      }

      // DD/MM/YYYY
      if (!parsedDate) {
        const ukMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ukMatch) {
          parsedDate = new Date(parseInt(ukMatch[3]), parseInt(ukMatch[2]) - 1, parseInt(ukMatch[1]));
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        errors.push({
          rowNumber,
          field: 'date',
          message: 'Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY',
          value: row.date,
        });
        hasError = true;
      } else if (parsedDate < startOfMonth || parsedDate > endOfMonth) {
        errors.push({
          rowNumber,
          field: 'date',
          message: `Date must be within the selected month (${month}/${year})`,
          value: row.date,
        });
        hasError = true;
      }
    }

    // Validate hours
    if (row.hours !== null && row.hours !== undefined) {
      if (row.hours < 0) {
        errors.push({
          rowNumber,
          field: 'hours',
          message: 'Hours cannot be negative',
          value: String(row.hours),
        });
        hasError = true;
      } else if (row.hours > 24) {
        errors.push({
          rowNumber,
          field: 'hours',
          message: 'Hours cannot exceed 24',
          value: String(row.hours),
        });
        hasError = true;
      }
    }

    // Validate time-off code
    let validTimeOffCode: TimeOffCode | null = null;
    if (row.timeOffCode) {
      const normalizedCode = row.timeOffCode.toUpperCase().trim();
      const validCodes: TimeOffCode[] = ['VAC', 'HALF', 'SICK', 'MAT', 'CAS', 'UNPAID'];

      if (!validCodes.includes(normalizedCode as TimeOffCode)) {
        errors.push({
          rowNumber,
          field: 'timeOffCode',
          message: `Invalid time-off code. Use: ${validCodes.join(', ')}`,
          value: row.timeOffCode,
        });
        hasError = true;
      } else {
        validTimeOffCode = normalizedCode as TimeOffCode;
      }
    }

    // Ensure either hours or time-off code is provided
    if ((row.hours === null || row.hours === undefined) && !row.timeOffCode) {
      errors.push({
        rowNumber,
        field: 'hours/timeOffCode',
        message: 'Either hours or time-off code must be provided',
      });
      hasError = true;
    }

    // Check for duplicates
    if (member && parsedDate && !hasError) {
      const key = `${member.id}-${parsedDate.toISOString().split('T')[0]}`;
      const existingRow = seenEntries.get(key);

      if (existingRow) {
        errors.push({
          rowNumber,
          field: 'duplicate',
          message: `Duplicate entry: same team member and date as row ${existingRow}`,
        });
        duplicateRows++;
        hasError = true;
      } else {
        seenEntries.set(key, rowNumber);
      }
    }

    // Add to valid entries if no errors
    if (!hasError && member && parsedDate) {
      validEntries.push({
        teamMemberId: member.id,
        date: parsedDate,
        hours: row.hours ?? null,
        timeOffCode: validTimeOffCode,
      });
    }
  }

  return {
    valid: errors.length === 0,
    validEntries,
    errors,
    stats: {
      totalRows: rows.length,
      validRows: validEntries.length,
      invalidRows: rows.length - validEntries.length,
      duplicateRows,
    },
  };
}

/**
 * Import validated CSV entries
 */
export async function importCSVEntries(
  entries: CreateTimesheetEntryInput[]
): Promise<{ created: number; updated: number; deleted: number }> {
  return bulkUpsertTimesheetEntries(entries);
}
