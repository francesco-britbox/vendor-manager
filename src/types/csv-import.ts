/**
 * CSV Import Types
 *
 * Types and interfaces for the bulk CSV import feature.
 */

export type ImportEntityType = 'team-members';

export type ImportRowStatus = 'valid' | 'invalid' | 'warning' | 'duplicate';

/**
 * Structure for field-level errors and warnings
 */
export interface ImportFieldIssue {
  field: string;
  message: string;
  value?: string;
}

/**
 * A single row from CSV import with validation results
 */
export interface ImportRow {
  rowNumber: number;
  originalData: Record<string, string>;
  parsedData: Record<string, unknown>;
  status: ImportRowStatus;
  errors: ImportFieldIssue[];
  warnings: ImportFieldIssue[];
  isDuplicate: boolean;
  duplicateInfo?: {
    type: 'csv' | 'database';
    matchedRowNumber?: number;
    matchedId?: string;
    matchedEmail?: string;
  };
}

/**
 * Statistics about the import preview
 */
export interface ImportPreviewStats {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  duplicates: number;
}

/**
 * Complete import preview result
 */
export interface ImportPreview {
  entityType: ImportEntityType;
  fileName: string;
  rows: ImportRow[];
  stats: ImportPreviewStats;
  headers: string[];
  expectedHeaders: string[];
  headerMappings: Record<string, string>;
  missingRequiredHeaders: string[];
}

/**
 * Configuration for CSV import
 */
export interface ImportConfig {
  entityType: ImportEntityType;
  vendorId?: string;
  skipDuplicates: boolean;
  updateExisting: boolean;
}

/**
 * Result of a bulk import operation
 */
export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    rowNumber: number;
    error: string;
  }>;
  createdIds: string[];
}

/**
 * Team member CSV row structure (parsed from CSV)
 */
export interface TeamMemberCSVRow {
  firstName: string;
  lastName: string;
  email: string;
  roleName?: string;
  dailyRate: string;
  currency?: string;
  startDate: string;
  endDate?: string;
  status?: string;
  plannedUtilization?: string;
}

/**
 * Expected headers for team member CSV import
 */
export const TEAM_MEMBER_EXPECTED_HEADERS = [
  'firstName',
  'lastName',
  'email',
  'roleName',
  'dailyRate',
  'currency',
  'startDate',
  'endDate',
  'status',
  'plannedUtilization',
] as const;

/**
 * Required headers for team member CSV import
 */
export const TEAM_MEMBER_REQUIRED_HEADERS = [
  'firstName',
  'lastName',
  'email',
  'dailyRate',
  'startDate',
] as const;

/**
 * Header aliases for flexible CSV import
 */
export const TEAM_MEMBER_HEADER_ALIASES: Record<string, string> = {
  // firstName aliases
  'first_name': 'firstName',
  'first name': 'firstName',
  'firstname': 'firstName',
  'given name': 'firstName',
  'given_name': 'firstName',
  // lastName aliases
  'last_name': 'lastName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'surname': 'lastName',
  'family name': 'lastName',
  'family_name': 'lastName',
  // email aliases
  'e-mail': 'email',
  'email address': 'email',
  'email_address': 'email',
  // roleName aliases
  'role_name': 'roleName',
  'role name': 'roleName',
  'role': 'roleName',
  'position': 'roleName',
  'title': 'roleName',
  // dailyRate aliases
  'daily_rate': 'dailyRate',
  'daily rate': 'dailyRate',
  'rate': 'dailyRate',
  'day rate': 'dailyRate',
  'day_rate': 'dailyRate',
  // currency aliases
  'currency code': 'currency',
  'currency_code': 'currency',
  // startDate aliases
  'start_date': 'startDate',
  'start date': 'startDate',
  'start': 'startDate',
  'join date': 'startDate',
  'join_date': 'startDate',
  // endDate aliases
  'end_date': 'endDate',
  'end date': 'endDate',
  'end': 'endDate',
  'leave date': 'endDate',
  'leave_date': 'endDate',
  // status aliases
  'member status': 'status',
  'member_status': 'status',
  // plannedUtilization aliases
  'planned_utilization': 'plannedUtilization',
  'planned utilization': 'plannedUtilization',
  'utilization': 'plannedUtilization',
  'target utilization': 'plannedUtilization',
  'target_utilization': 'plannedUtilization',
};
