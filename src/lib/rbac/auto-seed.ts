/**
 * RBAC Auto-Seed Module
 *
 * Automatically syncs protectable resources from code to database on app startup.
 * Uses INSERT-ONLY mode: only adds new resources, never modifies existing ones.
 *
 * This ensures:
 * - New resources defined in code are automatically available
 * - Existing resources and their customizations (requiredLevel, etc.) are untouched
 * - Safe to run on every startup without side effects
 */

import { PrismaClient } from '@prisma/client';
import { ALL_PROTECTABLE_RESOURCES } from '@/types/rbac';

// Track if seeding has already run in this process
let hasSeeded = false;

/**
 * Auto-seeds protectable resources using INSERT-ONLY mode.
 *
 * Uses Prisma's createMany with skipDuplicates which translates to
 * PostgreSQL's `ON CONFLICT DO NOTHING` - only inserts new records,
 * completely ignores existing ones based on resourceKey unique constraint.
 *
 * @returns Promise with count of newly added resources
 */
export async function autoSeedProtectableResources(): Promise<{
  added: number;
  skipped: number;
  total: number;
}> {
  // Prevent multiple runs in the same process
  if (hasSeeded) {
    return { added: 0, skipped: 0, total: ALL_PROTECTABLE_RESOURCES.length };
  }

  // Create a new PrismaClient instance for seeding
  // This avoids issues with the global instance during startup
  const prisma = new PrismaClient();

  try {
    // Get current count before insert
    const beforeCount = await prisma.protectableResource.count();

    // Prepare resources for insertion
    const resourcesToInsert = ALL_PROTECTABLE_RESOURCES.map((resource) => ({
      resourceKey: resource.resourceKey,
      type: resource.type,
      name: resource.name,
      description: resource.description || null,
      parentKey: resource.parentKey || null,
      path: resource.path || null,
      sortOrder: resource.sortOrder,
      isActive: true,
      requiredLevel: resource.requiredLevel || 'view',
    }));

    // Insert with skipDuplicates - this uses ON CONFLICT DO NOTHING
    // Only new resources are added, existing ones are completely untouched
    await prisma.protectableResource.createMany({
      data: resourcesToInsert,
      skipDuplicates: true, // This is the key: INSERT ... ON CONFLICT DO NOTHING
    });

    // Get count after insert
    const afterCount = await prisma.protectableResource.count();
    const added = afterCount - beforeCount;
    const skipped = ALL_PROTECTABLE_RESOURCES.length - added;

    hasSeeded = true;

    if (added > 0) {
      console.log(
        `[RBAC Auto-Seed] Added ${added} new protectable resource(s), ${skipped} already existed`
      );
    }

    return {
      added,
      skipped,
      total: ALL_PROTECTABLE_RESOURCES.length,
    };
  } catch (error) {
    console.error('[RBAC Auto-Seed] Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Safe wrapper that catches errors and logs them without crashing the app.
 * Use this in production startup to avoid blocking the app if seeding fails.
 */
export async function autoSeedProtectableResourcesSafe(): Promise<void> {
  try {
    await autoSeedProtectableResources();
  } catch (error) {
    console.error(
      '[RBAC Auto-Seed] Failed to seed resources, app will continue:',
      error
    );
    // Don't rethrow - allow app to continue even if seeding fails
  }
}
