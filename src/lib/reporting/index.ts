/**
 * Delivery Weekly Reporting Business Logic
 *
 * This module provides functions for managing weekly vendor reports,
 * including CRUD operations, pre-population logic, and validation.
 */

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type {
  Achievement,
  FocusItem,
  TimelineMilestone,
  RaidItem,
  VendorResourceItem,
  WeeklyReportData,
  RAGStatus,
  ValidationResult,
} from '@/types/delivery-reporting';
import type { PermissionLevel } from '@/types';

/**
 * Auth context for checking admin/superuser access bypass
 */
export interface ReportingAuthContext {
  permissionLevel?: PermissionLevel;
  isSuperUser?: boolean;
}

/**
 * Check if the auth context grants full access (admin or super user)
 */
function hasFullAccess(authContext?: ReportingAuthContext): boolean {
  if (!authContext) return false;
  return authContext.isSuperUser === true || authContext.permissionLevel === 'admin';
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const achievementSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(['done', 'in_progress']).nullable(),
  isFromFocus: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const focusItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  isCarriedOver: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const weeklyReportPayloadSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID is required'),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Week start must be in YYYY-MM-DD format'),
  ragStatus: z.enum(['green', 'amber', 'red']).nullable().optional(),
  achievements: z.array(achievementSchema).optional(),
  focusItems: z.array(focusItemSchema).optional(),
});

export const timelineMilestoneSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  title: z.string().min(1, 'Title is required'),
  status: z.enum(['completed', 'in_progress', 'upcoming', 'tbc']),
  platforms: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  sortOrder: z.number().default(0),
});

export const raidItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['risk', 'issue', 'dependency']),
  area: z.string().min(1, 'Area is required'),
  description: z.string().min(1, 'Description is required'),
  impact: z.enum(['high', 'medium', 'low']),
  owner: z.string().optional().nullable(),
  ragStatus: z.enum(['green', 'amber', 'red']),
  sortOrder: z.number().default(0),
});

export const vendorResourceSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['confluence', 'jira', 'github', 'docs']),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  url: z.string().url('Invalid URL format'),
  sortOrder: z.number().default(0),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateWeeklyReportPayload(data: unknown) {
  const result = weeklyReportPayloadSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.flatten().fieldErrors,
      data: null,
    };
  }
  return {
    valid: true,
    errors: {},
    data: result.data,
  };
}

export function validateTimelineMilestone(data: unknown) {
  const result = timelineMilestoneSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.flatten().fieldErrors,
      data: null,
    };
  }
  return {
    valid: true,
    errors: {},
    data: result.data,
  };
}

export function validateRaidItem(data: unknown) {
  const result = raidItemSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.flatten().fieldErrors,
      data: null,
    };
  }
  return {
    valid: true,
    errors: {},
    data: result.data,
  };
}

export function validateVendorResource(data: unknown) {
  const result = vendorResourceSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.flatten().fieldErrors,
      data: null,
    };
  }
  return {
    valid: true,
    errors: {},
    data: result.data,
  };
}

// ============================================================================
// ASSIGNED VENDORS
// ============================================================================

/**
 * Get vendors assigned to a user for delivery management
 * Admins and super users get access to all vendors
 */
export async function getAssignedVendors(userId: string, authContext?: ReportingAuthContext) {
  // Admins and super users can see all vendors
  if (hasFullAccess(authContext)) {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return vendors;
  }

  // Regular users only see their assigned vendors
  const assignments = await prisma.deliveryManagerVendor.findMany({
    where: { userId },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: {
      vendor: {
        name: 'asc',
      },
    },
  });

  return assignments.map((a) => ({
    id: a.vendor.id,
    name: a.vendor.name,
    status: a.vendor.status,
  }));
}

/**
 * Check if a user has access to a specific vendor
 * Admins and super users have access to all vendors
 */
export async function userHasVendorAccess(
  userId: string,
  vendorId: string,
  authContext?: ReportingAuthContext
): Promise<boolean> {
  // Admins and super users have access to all vendors
  if (hasFullAccess(authContext)) {
    return true;
  }

  // Regular users need an assignment
  const assignment = await prisma.deliveryManagerVendor.findUnique({
    where: {
      userId_vendorId: {
        userId,
        vendorId,
      },
    },
  });
  return !!assignment;
}

// ============================================================================
// WEEKLY REPORTS
// ============================================================================

/**
 * Get a weekly report for a vendor and week
 */
export async function getWeeklyReport(vendorId: string, weekStart: string) {
  const report = await prisma.weeklyReport.findUnique({
    where: {
      vendorId_weekStart: {
        vendorId,
        weekStart: new Date(weekStart),
      },
    },
    include: {
      achievements: {
        orderBy: { sortOrder: 'asc' },
      },
      focusItems: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!report) {
    return null;
  }

  return transformReportToData(report);
}

/**
 * Get the previous week's focus items for pre-population
 */
export async function getPreviousWeekFocus(vendorId: string, currentWeekStart: string) {
  const currentDate = new Date(currentWeekStart);
  const previousWeekStart = new Date(currentDate);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const previousReport = await prisma.weeklyReport.findUnique({
    where: {
      vendorId_weekStart: {
        vendorId,
        weekStart: previousWeekStart,
      },
    },
    include: {
      focusItems: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!previousReport) {
    return [];
  }

  return previousReport.focusItems.map((item) => ({
    id: undefined, // New items for the current week
    description: item.description,
    isCarriedOver: false,
    sortOrder: item.sortOrder,
  }));
}

/**
 * Create or update a weekly report
 */
export async function upsertWeeklyReport(data: {
  vendorId: string;
  weekStart: string;
  ragStatus?: RAGStatus | null;
  achievements?: Achievement[];
  focusItems?: FocusItem[];
}) {
  const { vendorId, weekStart, ragStatus, achievements, focusItems } = data;
  const weekStartDate = new Date(weekStart);

  // Use a transaction to ensure data consistency
  const result = await prisma.$transaction(async (tx) => {
    // Upsert the main report
    const report = await tx.weeklyReport.upsert({
      where: {
        vendorId_weekStart: {
          vendorId,
          weekStart: weekStartDate,
        },
      },
      create: {
        vendorId,
        weekStart: weekStartDate,
        ragStatus: ragStatus || null,
        status: 'draft',
      },
      update: {
        ragStatus: ragStatus || null,
        updatedAt: new Date(),
      },
    });

    // Handle achievements if provided
    if (achievements !== undefined) {
      // Get existing achievement IDs
      const existingAchievements = await tx.weeklyReportAchievement.findMany({
        where: { reportId: report.id },
        select: { id: true },
      });
      const existingIds = new Set(existingAchievements.map((a) => a.id));
      const newIds = new Set(achievements.filter((a) => a.id).map((a) => a.id!));

      // Delete removed achievements
      const toDelete = [...existingIds].filter((id) => !newIds.has(id));
      if (toDelete.length > 0) {
        await tx.weeklyReportAchievement.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Upsert achievements
      for (const achievement of achievements) {
        if (achievement.id && existingIds.has(achievement.id)) {
          // Update existing
          await tx.weeklyReportAchievement.update({
            where: { id: achievement.id },
            data: {
              description: achievement.description,
              status: achievement.status,
              isFromFocus: achievement.isFromFocus,
              sortOrder: achievement.sortOrder,
            },
          });
        } else {
          // Create new
          await tx.weeklyReportAchievement.create({
            data: {
              reportId: report.id,
              description: achievement.description,
              status: achievement.status,
              isFromFocus: achievement.isFromFocus,
              sortOrder: achievement.sortOrder,
            },
          });
        }
      }
    }

    // Handle focus items if provided
    if (focusItems !== undefined) {
      // Get existing focus IDs
      const existingFocus = await tx.weeklyReportFocus.findMany({
        where: { reportId: report.id },
        select: { id: true },
      });
      const existingIds = new Set(existingFocus.map((f) => f.id));
      const newIds = new Set(focusItems.filter((f) => f.id).map((f) => f.id!));

      // Delete removed focus items
      const toDelete = [...existingIds].filter((id) => !newIds.has(id));
      if (toDelete.length > 0) {
        await tx.weeklyReportFocus.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Upsert focus items
      for (const item of focusItems) {
        if (item.id && existingIds.has(item.id)) {
          // Update existing
          await tx.weeklyReportFocus.update({
            where: { id: item.id },
            data: {
              description: item.description,
              isCarriedOver: item.isCarriedOver,
              sortOrder: item.sortOrder,
            },
          });
        } else {
          // Create new
          await tx.weeklyReportFocus.create({
            data: {
              reportId: report.id,
              description: item.description,
              isCarriedOver: item.isCarriedOver,
              sortOrder: item.sortOrder,
            },
          });
        }
      }
    }

    // Fetch the updated report
    return tx.weeklyReport.findUnique({
      where: { id: report.id },
      include: {
        achievements: {
          orderBy: { sortOrder: 'asc' },
        },
        focusItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  });

  return result ? transformReportToData(result) : null;
}

/**
 * Submit a weekly report
 */
export async function submitWeeklyReport(vendorId: string, weekStart: string): Promise<{
  success: boolean;
  error?: string;
  report?: WeeklyReportData;
}> {
  const report = await prisma.weeklyReport.findUnique({
    where: {
      vendorId_weekStart: {
        vendorId,
        weekStart: new Date(weekStart),
      },
    },
    include: {
      achievements: true,
      focusItems: true,
    },
  });

  if (!report) {
    return { success: false, error: 'Report not found' };
  }

  if (report.status === 'submitted') {
    return { success: false, error: 'Report is already submitted' };
  }

  if (!report.ragStatus) {
    return { success: false, error: 'RAG status must be selected before submission' };
  }

  const updatedReport = await prisma.weeklyReport.update({
    where: { id: report.id },
    data: {
      status: 'submitted',
      submittedAt: new Date(),
    },
    include: {
      achievements: {
        orderBy: { sortOrder: 'asc' },
      },
      focusItems: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return {
    success: true,
    report: transformReportToData(updatedReport),
  };
}

/**
 * Validate a report before submission
 */
export function validateReportForSubmission(report: WeeklyReportData): ValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  if (!report.ragStatus) {
    errors.push({ field: 'ragStatus', message: 'Overall status (RAG) is required' });
  }

  if (report.achievements.length === 0) {
    warnings.push({ field: 'achievements', message: 'No achievements recorded this week' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// VENDOR TIMELINE
// ============================================================================

/**
 * Get all timeline milestones for a vendor
 */
export async function getVendorTimeline(vendorId: string) {
  const items = await prisma.vendorTimeline.findMany({
    where: { vendorId },
    orderBy: { sortOrder: 'asc' },
  });

  return items.map((item) => ({
    id: item.id,
    date: item.date,
    title: item.title,
    status: item.status as TimelineMilestone['status'],
    platforms: item.platforms,
    features: item.features,
    sortOrder: item.sortOrder,
  }));
}

/**
 * Create a timeline milestone
 */
export async function createTimelineMilestone(vendorId: string, data: Omit<TimelineMilestone, 'id'>) {
  const milestone = await prisma.vendorTimeline.create({
    data: {
      vendorId,
      date: data.date,
      title: data.title,
      status: data.status,
      platforms: data.platforms,
      features: data.features,
      sortOrder: data.sortOrder,
    },
  });

  return {
    id: milestone.id,
    date: milestone.date,
    title: milestone.title,
    status: milestone.status as TimelineMilestone['status'],
    platforms: milestone.platforms,
    features: milestone.features,
    sortOrder: milestone.sortOrder,
  };
}

/**
 * Update a timeline milestone
 */
export async function updateTimelineMilestone(id: string, data: Partial<TimelineMilestone>) {
  const milestone = await prisma.vendorTimeline.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: data.date }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.platforms !== undefined && { platforms: data.platforms }),
      ...(data.features !== undefined && { features: data.features }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return {
    id: milestone.id,
    date: milestone.date,
    title: milestone.title,
    status: milestone.status as TimelineMilestone['status'],
    platforms: milestone.platforms,
    features: milestone.features,
    sortOrder: milestone.sortOrder,
  };
}

/**
 * Delete a timeline milestone
 */
export async function deleteTimelineMilestone(id: string) {
  await prisma.vendorTimeline.delete({ where: { id } });
}

// ============================================================================
// RAID LOG
// ============================================================================

/**
 * Get all RAID items for a vendor
 */
export async function getVendorRaidItems(vendorId: string) {
  const items = await prisma.vendorRaidItem.findMany({
    where: { vendorId },
    orderBy: { sortOrder: 'asc' },
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type as RaidItem['type'],
    area: item.area,
    description: item.description,
    impact: item.impact as RaidItem['impact'],
    owner: item.owner,
    ragStatus: item.ragStatus as RaidItem['ragStatus'],
    sortOrder: item.sortOrder,
  }));
}

/**
 * Create a RAID item
 */
export async function createRaidItem(vendorId: string, data: Omit<RaidItem, 'id'>) {
  const item = await prisma.vendorRaidItem.create({
    data: {
      vendorId,
      type: data.type,
      area: data.area,
      description: data.description,
      impact: data.impact,
      owner: data.owner || null,
      ragStatus: data.ragStatus,
      sortOrder: data.sortOrder,
    },
  });

  return {
    id: item.id,
    type: item.type as RaidItem['type'],
    area: item.area,
    description: item.description,
    impact: item.impact as RaidItem['impact'],
    owner: item.owner,
    ragStatus: item.ragStatus as RaidItem['ragStatus'],
    sortOrder: item.sortOrder,
  };
}

/**
 * Update a RAID item
 */
export async function updateRaidItem(id: string, data: Partial<RaidItem>) {
  const item = await prisma.vendorRaidItem.update({
    where: { id },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.area !== undefined && { area: data.area }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.impact !== undefined && { impact: data.impact }),
      ...(data.owner !== undefined && { owner: data.owner || null }),
      ...(data.ragStatus !== undefined && { ragStatus: data.ragStatus }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return {
    id: item.id,
    type: item.type as RaidItem['type'],
    area: item.area,
    description: item.description,
    impact: item.impact as RaidItem['impact'],
    owner: item.owner,
    ragStatus: item.ragStatus as RaidItem['ragStatus'],
    sortOrder: item.sortOrder,
  };
}

/**
 * Delete a RAID item
 */
export async function deleteRaidItem(id: string) {
  await prisma.vendorRaidItem.delete({ where: { id } });
}

// ============================================================================
// VENDOR RESOURCES
// ============================================================================

/**
 * Get all resources for a vendor
 */
export async function getVendorResources(vendorId: string) {
  const items = await prisma.vendorResource.findMany({
    where: { vendorId },
    orderBy: { sortOrder: 'asc' },
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type as VendorResourceItem['type'],
    name: item.name,
    description: item.description,
    url: item.url,
    sortOrder: item.sortOrder,
  }));
}

/**
 * Create a vendor resource
 */
export async function createVendorResource(vendorId: string, data: Omit<VendorResourceItem, 'id'>) {
  const item = await prisma.vendorResource.create({
    data: {
      vendorId,
      type: data.type,
      name: data.name,
      description: data.description || null,
      url: data.url,
      sortOrder: data.sortOrder,
    },
  });

  return {
    id: item.id,
    type: item.type as VendorResourceItem['type'],
    name: item.name,
    description: item.description,
    url: item.url,
    sortOrder: item.sortOrder,
  };
}

/**
 * Update a vendor resource
 */
export async function updateVendorResource(id: string, data: Partial<VendorResourceItem>) {
  const item = await prisma.vendorResource.update({
    where: { id },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return {
    id: item.id,
    type: item.type as VendorResourceItem['type'],
    name: item.name,
    description: item.description,
    url: item.url,
    sortOrder: item.sortOrder,
  };
}

/**
 * Delete a vendor resource
 */
export async function deleteVendorResource(id: string) {
  await prisma.vendorResource.delete({ where: { id } });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform a Prisma report model to the WeeklyReportData type
 */
function transformReportToData(report: {
  id: string;
  vendorId: string;
  weekStart: Date;
  ragStatus: string | null;
  status: string;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  achievements: Array<{
    id: string;
    description: string;
    status: string | null;
    isFromFocus: boolean;
    sortOrder: number;
  }>;
  focusItems: Array<{
    id: string;
    description: string;
    isCarriedOver: boolean;
    sortOrder: number;
  }>;
}): WeeklyReportData {
  return {
    id: report.id,
    vendorId: report.vendorId,
    weekStart: report.weekStart.toISOString().split('T')[0],
    ragStatus: report.ragStatus as RAGStatus | null,
    status: report.status as 'draft' | 'submitted',
    submittedAt: report.submittedAt?.toISOString(),
    achievements: report.achievements.map((a) => ({
      id: a.id,
      description: a.description,
      status: a.status as Achievement['status'],
      isFromFocus: a.isFromFocus,
      sortOrder: a.sortOrder,
    })),
    focusItems: report.focusItems.map((f) => ({
      id: f.id,
      description: f.description,
      isCarriedOver: f.isCarriedOver,
      sortOrder: f.sortOrder,
    })),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

/**
 * Get the Monday of the week containing the given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
