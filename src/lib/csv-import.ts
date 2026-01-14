/**
 * CSV Import Library
 *
 * Handles CSV parsing, validation, duplicate detection, and bulk import operations
 * with Papa Parse integration.
 */

import Papa from 'papaparse';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  type ImportRow,
  type ImportPreview,
  type ImportPreviewStats,
  type ImportConfig,
  type ImportResult,
  type ImportFieldIssue,
  type ImportRowStatus,
  TEAM_MEMBER_EXPECTED_HEADERS,
  TEAM_MEMBER_REQUIRED_HEADERS,
  TEAM_MEMBER_HEADER_ALIASES,
} from '@/types/csv-import';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for validating team member CSV row data
 */
const teamMemberCSVSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(255, 'First name must be at most 255 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(255, 'Last name must be at most 255 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters'),
  roleName: z
    .string()
    .max(255, 'Role name must be at most 255 characters')
    .optional()
    .nullable(),
  dailyRate: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Daily rate must be a positive number',
    }),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .optional()
    .default('GBP'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date format',
    }),
  endDate: z
    .string()
    .refine((val) => val === '' || !isNaN(Date.parse(val)), {
      message: 'Invalid end date format',
    })
    .optional()
    .nullable(),
  status: z
    .enum(['active', 'inactive', 'onboarding', 'offboarded'])
    .optional()
    .default('active'),
  plannedUtilization: z
    .string()
    .refine(
      (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100),
      { message: 'Utilization must be between 0 and 100' }
    )
    .optional()
    .nullable(),
});

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV content using Papa Parse
 */
export function parseCSV(
  csvContent: string
): { data: Record<string, string>[]; headers: string[]; errors: string[] } {
  const errors: string[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  if (result.errors.length > 0) {
    result.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  return {
    data: result.data,
    headers: result.meta.fields || [],
    errors,
  };
}

/**
 * Map CSV headers to expected field names using aliases
 */
export function mapHeaders(
  csvHeaders: string[],
  aliases: Record<string, string>
): Record<string, string> {
  const mappings: Record<string, string> = {};

  csvHeaders.forEach((header) => {
    const normalizedHeader = header.toLowerCase().trim();

    // Check if header is already a valid field name
    if (TEAM_MEMBER_EXPECTED_HEADERS.includes(normalizedHeader as (typeof TEAM_MEMBER_EXPECTED_HEADERS)[number])) {
      mappings[header] = normalizedHeader;
    }
    // Check aliases
    else if (aliases[normalizedHeader]) {
      mappings[header] = aliases[normalizedHeader];
    }
    // Keep original if no mapping found
    else {
      mappings[header] = header;
    }
  });

  return mappings;
}

/**
 * Transform a CSV row using header mappings
 */
function transformRowWithMappings(
  row: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const transformed: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    const mappedKey = mappings[key] || key;
    transformed[mappedKey] = value;
  });

  return transformed;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate a single team member row
 */
function validateTeamMemberRow(
  rowData: Record<string, string>,
  rowNumber: number
): { errors: ImportFieldIssue[]; warnings: ImportFieldIssue[]; parsedData: Record<string, unknown> } {
  const errors: ImportFieldIssue[] = [];
  const warnings: ImportFieldIssue[] = [];
  const parsedData: Record<string, unknown> = {};

  // Run Zod validation
  const result = teamMemberCSVSchema.safeParse(rowData);

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.');
      errors.push({
        field,
        message: issue.message,
        value: rowData[field],
      });
    });
  } else {
    // Store parsed data with proper types
    parsedData.firstName = result.data.firstName;
    parsedData.lastName = result.data.lastName;
    parsedData.email = result.data.email.toLowerCase();
    parsedData.roleName = result.data.roleName || null;
    parsedData.dailyRate = parseFloat(result.data.dailyRate);
    parsedData.currency = result.data.currency || 'GBP';
    parsedData.startDate = new Date(result.data.startDate);
    parsedData.endDate = result.data.endDate && result.data.endDate !== ''
      ? new Date(result.data.endDate)
      : null;
    parsedData.status = result.data.status || 'active';
    parsedData.plannedUtilization = result.data.plannedUtilization && result.data.plannedUtilization !== ''
      ? parseFloat(result.data.plannedUtilization)
      : null;
  }

  // Add warnings for optional missing fields
  if (!rowData.currency) {
    warnings.push({
      field: 'currency',
      message: 'Currency not specified, defaulting to GBP',
    });
  }

  if (!rowData.status) {
    warnings.push({
      field: 'status',
      message: 'Status not specified, defaulting to active',
    });
  }

  return { errors, warnings, parsedData };
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

/**
 * Check for duplicates within CSV rows
 */
function findCSVDuplicates(
  rows: { email: string; rowNumber: number }[]
): Map<string, number[]> {
  const emailMap = new Map<string, number[]>();

  rows.forEach(({ email, rowNumber }) => {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = emailMap.get(normalizedEmail) || [];
    existing.push(rowNumber);
    emailMap.set(normalizedEmail, existing);
  });

  return emailMap;
}

/**
 * Check for existing team members in database
 */
async function findDatabaseDuplicates(
  emails: string[]
): Promise<Map<string, { id: string; email: string }>> {
  const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

  const existing = await prisma.teamMember.findMany({
    where: {
      email: {
        in: normalizedEmails,
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const map = new Map<string, { id: string; email: string }>();
  existing.forEach((member) => {
    map.set(member.email.toLowerCase(), member);
  });

  return map;
}

// ============================================================================
// PREVIEW GENERATION
// ============================================================================

/**
 * Generate import preview with validation and duplicate detection
 */
export async function generateImportPreview(
  csvContent: string,
  config: ImportConfig
): Promise<ImportPreview> {
  // Parse CSV
  const { data, headers, errors: parseErrors } = parseCSV(csvContent);

  // Map headers
  const headerMappings = mapHeaders(headers, TEAM_MEMBER_HEADER_ALIASES);

  // Check for missing required headers
  const mappedHeaders = Object.values(headerMappings);
  const missingRequiredHeaders = TEAM_MEMBER_REQUIRED_HEADERS.filter(
    (required) => !mappedHeaders.includes(required)
  );

  // If we're missing required headers, return early with error
  if (missingRequiredHeaders.length > 0) {
    return {
      entityType: config.entityType,
      fileName: 'import.csv',
      rows: [],
      stats: {
        total: 0,
        valid: 0,
        invalid: 0,
        warnings: 0,
        duplicates: 0,
      },
      headers,
      expectedHeaders: [...TEAM_MEMBER_EXPECTED_HEADERS],
      headerMappings,
      missingRequiredHeaders,
    };
  }

  // Transform and validate each row
  const transformedRows = data.map((row, index) => {
    const transformedRow = transformRowWithMappings(row, headerMappings);
    return {
      rowNumber: index + 2, // +2 because row 1 is header, index is 0-based
      originalData: row,
      transformedData: transformedRow,
    };
  });

  // Extract emails for duplicate detection
  const emailsWithRows = transformedRows
    .filter((r) => r.transformedData.email)
    .map((r) => ({
      email: r.transformedData.email,
      rowNumber: r.rowNumber,
    }));

  // Find duplicates
  const csvDuplicates = findCSVDuplicates(emailsWithRows);
  const dbDuplicates = await findDatabaseDuplicates(
    emailsWithRows.map((e) => e.email)
  );

  // Validate and build import rows
  const importRows: ImportRow[] = transformedRows.map(
    ({ rowNumber, originalData, transformedData }) => {
      const { errors, warnings, parsedData } = validateTeamMemberRow(
        transformedData,
        rowNumber
      );

      // Check for CSV duplicates (same email in multiple rows)
      const email = transformedData.email?.toLowerCase().trim();
      const csvDupeRows = csvDuplicates.get(email || '') || [];
      const isCSVDuplicate = csvDupeRows.length > 1 && csvDupeRows[0] !== rowNumber;

      // Check for database duplicates
      const dbDupe = email ? dbDuplicates.get(email) : undefined;
      const isDBDuplicate = !!dbDupe;

      const isDuplicate = isCSVDuplicate || isDBDuplicate;

      // Determine status
      let status: ImportRowStatus = 'valid';
      if (errors.length > 0) {
        status = 'invalid';
      } else if (isDuplicate) {
        status = 'duplicate';
      } else if (warnings.length > 0) {
        status = 'warning';
      }

      // Build duplicate info
      let duplicateInfo: ImportRow['duplicateInfo'] = undefined;
      if (isDBDuplicate && dbDupe) {
        duplicateInfo = {
          type: 'database',
          matchedId: dbDupe.id,
          matchedEmail: dbDupe.email,
        };
      } else if (isCSVDuplicate) {
        duplicateInfo = {
          type: 'csv',
          matchedRowNumber: csvDupeRows[0],
          matchedEmail: email,
        };
      }

      return {
        rowNumber,
        originalData,
        parsedData: errors.length === 0 ? parsedData : {},
        status,
        errors,
        warnings,
        isDuplicate,
        duplicateInfo,
      };
    }
  );

  // Calculate stats
  const stats: ImportPreviewStats = {
    total: importRows.length,
    valid: importRows.filter((r) => r.status === 'valid').length,
    invalid: importRows.filter((r) => r.status === 'invalid').length,
    warnings: importRows.filter((r) => r.status === 'warning').length,
    duplicates: importRows.filter((r) => r.status === 'duplicate').length,
  };

  return {
    entityType: config.entityType,
    fileName: 'import.csv',
    rows: importRows,
    stats,
    headers,
    expectedHeaders: [...TEAM_MEMBER_EXPECTED_HEADERS],
    headerMappings,
    missingRequiredHeaders: [],
  };
}

// ============================================================================
// BULK IMPORT
// ============================================================================

/**
 * Execute bulk import of team members
 */
export async function executeTeamMemberImport(
  rows: ImportRow[],
  config: ImportConfig
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    createdIds: [],
  };

  // Filter to valid and optionally duplicate rows
  const rowsToProcess = rows.filter((row) => {
    if (row.status === 'invalid') {
      result.skipped++;
      return false;
    }
    if (row.status === 'duplicate' && config.skipDuplicates) {
      result.skipped++;
      return false;
    }
    return true;
  });

  if (rowsToProcess.length === 0) {
    result.success = true;
    return result;
  }

  // Get vendor and role mappings
  const vendor = config.vendorId
    ? await prisma.vendor.findUnique({ where: { id: config.vendorId } })
    : null;

  if (config.vendorId && !vendor) {
    result.errors.push({ rowNumber: 0, error: 'Selected vendor not found' });
    return result;
  }

  // Get all roles for matching by name
  const roles = await prisma.role.findMany();
  const roleByName = new Map(roles.map((r) => [r.name.toLowerCase(), r]));

  // Get default role if exists
  const defaultRole = roles[0];

  // Process in transaction for rollback capability
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rowsToProcess) {
        try {
          const data = row.parsedData;

          // Find role by name
          const roleName = (data.roleName as string)?.toLowerCase();
          const role = roleName ? roleByName.get(roleName) : defaultRole;

          if (!role) {
            result.errors.push({
              rowNumber: row.rowNumber,
              error: `Role "${data.roleName}" not found`,
            });
            result.failed++;
            continue;
          }

          // Check if we should update existing
          if (row.isDuplicate && row.duplicateInfo?.type === 'database' && config.updateExisting) {
            await tx.teamMember.update({
              where: { id: row.duplicateInfo.matchedId },
              data: {
                firstName: data.firstName as string,
                lastName: data.lastName as string,
                vendorId: config.vendorId!,
                roleId: role.id,
                dailyRate: data.dailyRate as number,
                currency: (data.currency as string) || 'GBP',
                startDate: data.startDate as Date,
                endDate: data.endDate as Date | null,
                status: data.status as 'active' | 'inactive' | 'onboarding' | 'offboarded',
                plannedUtilization: data.plannedUtilization as number | null,
              },
            });
            result.updated++;
          } else {
            // Create new team member
            const created = await tx.teamMember.create({
              data: {
                firstName: data.firstName as string,
                lastName: data.lastName as string,
                email: data.email as string,
                vendorId: config.vendorId!,
                roleId: role.id,
                dailyRate: data.dailyRate as number,
                currency: (data.currency as string) || 'GBP',
                startDate: data.startDate as Date,
                endDate: data.endDate as Date | null,
                status: data.status as 'active' | 'inactive' | 'onboarding' | 'offboarded',
                plannedUtilization: data.plannedUtilization as number | null,
              },
            });
            result.created++;
            result.createdIds.push(created.id);
          }
        } catch (err) {
          result.errors.push({
            rowNumber: row.rowNumber,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          result.failed++;
        }
      }
    });

    result.success = result.failed === 0;
  } catch (err) {
    result.errors.push({
      rowNumber: 0,
      error: `Transaction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * Generate a sample CSV template for team member imports
 */
export function generateTeamMemberCSVTemplate(): string {
  const headers = [...TEAM_MEMBER_EXPECTED_HEADERS];
  const sampleRow = [
    'John',
    'Doe',
    'john.doe@example.com',
    'Developer',
    '500',
    'GBP',
    '2024-01-15',
    '',
    'active',
    '80',
  ];

  return Papa.unparse({
    fields: headers,
    data: [sampleRow],
  });
}
