/**
 * Type definitions for Delivery Weekly Reporting System
 */

// RAG Status type
export type RAGStatus = 'green' | 'amber' | 'red';

// Report status type
export type ReportStatus = 'draft' | 'submitted';

// Achievement status type
export type AchievementStatus = 'done' | 'in_progress' | null;

// Timeline milestone status
export type TimelineStatus = 'completed' | 'in_progress' | 'upcoming' | 'tbc';

// RAID item type
export type RaidType = 'risk' | 'issue' | 'dependency';

// Impact level
export type ImpactLevel = 'high' | 'medium' | 'low';

// Resource type
export type ResourceType = 'confluence' | 'jira' | 'github' | 'docs';

// Platform names for timeline milestones
export const PLATFORM_OPTIONS = [
  'ATV/FTV',
  'tvOS',
  'Roku',
  'HTML',
  'iOS',
  'Android',
  'Web',
  'Web TV',
  'Backend',
  'Internal',
] as const;

export type Platform = (typeof PLATFORM_OPTIONS)[number];

// Assigned vendor (basic info)
export interface AssignedVendor {
  id: string;
  name: string;
  slug?: string;
}

// Achievement item in a weekly report
export interface Achievement {
  id?: string;
  clientId?: string; // Stable client-generated ID for React key (prevents focus loss on autosave)
  description: string;
  status: AchievementStatus;
  isFromFocus: boolean;
  sortOrder: number;
}

// Focus item for next week
export interface FocusItem {
  id?: string;
  clientId?: string; // Stable client-generated ID for React key (prevents focus loss on autosave)
  description: string;
  isCarriedOver: boolean;
  sortOrder: number;
}

// Timeline milestone (vendor-level persistent data)
export interface TimelineMilestone {
  id?: string;
  date: string;
  title: string;
  status: TimelineStatus;
  platforms: string[];
  features: string[];
  sortOrder: number;
}

// RAID log item (vendor-level persistent data)
export interface RaidItem {
  id?: string;
  type: RaidType;
  area: string;
  description: string;
  impact: ImpactLevel;
  owner?: string | null;
  ragStatus: RAGStatus;
  sortOrder: number;
}

// Vendor resource/link (vendor-level persistent data)
export interface VendorResourceItem {
  id?: string;
  type: ResourceType;
  name: string;
  description?: string | null;
  url: string;
  sortOrder: number;
}

// Full weekly report data
export interface WeeklyReportData {
  id?: string;
  vendorId: string;
  weekStart: string; // ISO date string YYYY-MM-DD
  ragStatus: RAGStatus | null;
  status: ReportStatus;
  submittedAt?: string;
  achievements: Achievement[];
  focusItems: FocusItem[];
  createdAt?: string;
  updatedAt?: string;
}

// Request payload for creating/updating a report
export interface WeeklyReportPayload {
  vendorId: string;
  weekStart: string;
  ragStatus?: RAGStatus | null;
  achievements?: Achievement[];
  focusItems?: FocusItem[];
}

// Response for fetching a report with pre-populated data
export interface WeeklyReportResponse {
  report: WeeklyReportData | null;
  previousWeekFocus?: FocusItem[];
  isNew: boolean;
}

// Full vendor report data including persistent vendor-level data
export interface FullVendorReportData {
  report: WeeklyReportData | null;
  timeline: TimelineMilestone[];
  raidItems: RaidItem[];
  resources: VendorResourceItem[];
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// Save status for autosave indicator
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Form state for the report form
export interface ReportFormState {
  currentVendorId: string | null;
  selectedWeek: string; // ISO date string for Monday of week
  report: WeeklyReportData | null;
  achievements: Achievement[];
  focusItems: FocusItem[];
  timeline: TimelineMilestone[];
  raidItems: RaidItem[];
  resources: VendorResourceItem[];
  saveStatus: SaveStatus;
  isDirty: boolean;
}
