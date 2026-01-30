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

// Project status type
export type ProjectStatus = 'active' | 'inactive' | 'archived';

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
  'Evergent',
  'Promo',
  'Olympus',
  'Axis',
  'PCD',
  'Others',
] as const;

export type Platform = (typeof PLATFORM_OPTIONS)[number];

// Assigned vendor (basic info)
export interface AssignedVendor {
  id: string;
  name: string;
  slug?: string;
}

// Project (basic info)
export interface Project {
  id: string;
  vendorId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Project with vendor info
export interface ProjectWithVendor extends Project {
  vendorName: string;
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

// Timeline milestone (project-level persistent data)
export interface TimelineMilestone {
  id?: string;
  date: string;
  title: string;
  status: TimelineStatus;
  platforms: string[];
  features: string[];
  sortOrder: number;
}

// RAID log item (project-level persistent data)
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

// Project resource/link (project-level persistent data)
export interface ProjectResourceItem {
  id?: string;
  type: ResourceType;
  name: string;
  description?: string | null;
  url: string;
  sortOrder: number;
}

// Backward compatibility alias
export type VendorResourceItem = ProjectResourceItem;

// Full weekly report data
export interface WeeklyReportData {
  id?: string;
  projectId: string;
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
  projectId: string;
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

// Full project report data including persistent project-level data
export interface FullProjectReportData {
  report: WeeklyReportData | null;
  timeline: TimelineMilestone[];
  raidItems: RaidItem[];
  resources: ProjectResourceItem[];
}

// Backward compatibility alias
export type FullVendorReportData = FullProjectReportData;

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
  currentProjectId: string | null;
  selectedWeek: string; // ISO date string for Monday of week
  report: WeeklyReportData | null;
  achievements: Achievement[];
  focusItems: FocusItem[];
  timeline: TimelineMilestone[];
  raidItems: RaidItem[];
  resources: ProjectResourceItem[];
  saveStatus: SaveStatus;
  isDirty: boolean;
}
