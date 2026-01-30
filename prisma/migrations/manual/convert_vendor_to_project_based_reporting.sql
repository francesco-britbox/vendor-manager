-- Migration: Convert Delivery Reporting from Vendor-Based to Project-Based Association
-- This migration preserves all existing data by:
-- 1. Creating the new Project model and tables
-- 2. Creating a default project for each vendor with existing reports
-- 3. Migrating all existing data to the new project-based structure
-- 4. Removing old vendor-based columns and tables

-- IMPORTANT: Run this in a transaction and create a backup before running!
-- Recommended: pg_dump your database before running this migration

BEGIN;

-- ===========================================================================
-- STEP 1: Create the ProjectStatus enum and Project table
-- ===========================================================================

-- Create the ProjectStatus enum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'inactive', 'archived');

-- Create the projects table
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint (vendor cannot have duplicate project names)
CREATE UNIQUE INDEX "projects_vendorId_name_key" ON "projects"("vendorId", "name");

-- Create indexes
CREATE INDEX "projects_vendorId_idx" ON "projects"("vendorId");
CREATE INDEX "projects_status_idx" ON "projects"("status");
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- Add foreign key
ALTER TABLE "projects" ADD CONSTRAINT "projects_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- STEP 2: Create default projects for vendors that have existing reports
-- ===========================================================================

-- Insert a default project for each vendor that has at least one weekly report
INSERT INTO "projects" ("id", "vendorId", "name", "description", "status", "createdAt", "updatedAt")
SELECT
    'proj_' || gen_random_uuid()::text,
    v.id,
    v.name || ' - Default Project',
    'Auto-generated default project for migrated reports',
    'active'::"ProjectStatus",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "vendors" v
WHERE EXISTS (SELECT 1 FROM "weekly_reports" wr WHERE wr."vendorId" = v.id)
   OR EXISTS (SELECT 1 FROM "vendor_timelines" vt WHERE vt."vendorId" = v.id)
   OR EXISTS (SELECT 1 FROM "vendor_raid_items" vri WHERE vri."vendorId" = v.id)
   OR EXISTS (SELECT 1 FROM "vendor_resources" vr WHERE vr."vendorId" = v.id);

-- ===========================================================================
-- STEP 3: Create the new project-based tables (timeline, RAID, resources)
-- ===========================================================================

-- Create project_timelines table
CREATE TABLE "project_timelines" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" VARCHAR(50) NOT NULL,
    "title" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_timelines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_timelines_projectId_idx" ON "project_timelines"("projectId");
ALTER TABLE "project_timelines" ADD CONSTRAINT "project_timelines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create project_raid_items table
CREATE TABLE "project_raid_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" VARCHAR(10) NOT NULL,
    "owner" TEXT,
    "ragStatus" VARCHAR(10) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_raid_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_raid_items_projectId_idx" ON "project_raid_items"("projectId");
ALTER TABLE "project_raid_items" ADD CONSTRAINT "project_raid_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create project_resources table
CREATE TABLE "project_resources" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_resources_projectId_idx" ON "project_resources"("projectId");
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- STEP 4: Migrate existing data to project-based tables
-- ===========================================================================

-- Migrate vendor_timelines to project_timelines
INSERT INTO "project_timelines" ("id", "projectId", "date", "title", "status", "platforms", "features", "sortOrder", "createdAt", "updatedAt")
SELECT
    vt.id,
    p.id,
    vt."date",
    vt."title",
    vt."status",
    vt."platforms",
    vt."features",
    vt."sortOrder",
    vt."createdAt",
    vt."updatedAt"
FROM "vendor_timelines" vt
JOIN "projects" p ON p."vendorId" = vt."vendorId";

-- Migrate vendor_raid_items to project_raid_items
INSERT INTO "project_raid_items" ("id", "projectId", "type", "area", "description", "impact", "owner", "ragStatus", "sortOrder", "createdAt", "updatedAt")
SELECT
    vri.id,
    p.id,
    vri."type",
    vri."area",
    vri."description",
    vri."impact",
    vri."owner",
    vri."ragStatus",
    vri."sortOrder",
    vri."createdAt",
    vri."updatedAt"
FROM "vendor_raid_items" vri
JOIN "projects" p ON p."vendorId" = vri."vendorId";

-- Migrate vendor_resources to project_resources
INSERT INTO "project_resources" ("id", "projectId", "type", "name", "description", "url", "sortOrder", "createdAt", "updatedAt")
SELECT
    vr.id,
    p.id,
    vr."type",
    vr."name",
    vr."description",
    vr."url",
    vr."sortOrder",
    vr."createdAt",
    vr."updatedAt"
FROM "vendor_resources" vr
JOIN "projects" p ON p."vendorId" = vr."vendorId";

-- ===========================================================================
-- STEP 5: Add projectId column to weekly_reports and migrate data
-- ===========================================================================

-- Add projectId column (nullable initially)
ALTER TABLE "weekly_reports" ADD COLUMN "projectId" TEXT;

-- Update weekly_reports with projectId based on vendorId
UPDATE "weekly_reports" wr
SET "projectId" = p.id
FROM "projects" p
WHERE p."vendorId" = wr."vendorId";

-- Make projectId NOT NULL after migration
ALTER TABLE "weekly_reports" ALTER COLUMN "projectId" SET NOT NULL;

-- ===========================================================================
-- STEP 6: Drop old constraints and columns, add new ones
-- ===========================================================================

-- Drop the old unique constraint on weekly_reports
ALTER TABLE "weekly_reports" DROP CONSTRAINT IF EXISTS "weekly_reports_vendorId_weekStart_key";

-- Drop the old index
DROP INDEX IF EXISTS "weekly_reports_vendorId_weekStart_idx";

-- Drop the old foreign key
ALTER TABLE "weekly_reports" DROP CONSTRAINT IF EXISTS "weekly_reports_vendorId_fkey";

-- Drop the vendorId column from weekly_reports
ALTER TABLE "weekly_reports" DROP COLUMN "vendorId";

-- Add new unique constraint on projectId + weekStart
CREATE UNIQUE INDEX "weekly_reports_projectId_weekStart_key" ON "weekly_reports"("projectId", "weekStart");

-- Add new index
CREATE INDEX "weekly_reports_projectId_weekStart_idx" ON "weekly_reports"("projectId", "weekStart");

-- Add new foreign key
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- STEP 7: Drop old vendor-based tables
-- ===========================================================================

DROP TABLE IF EXISTS "vendor_timelines";
DROP TABLE IF EXISTS "vendor_raid_items";
DROP TABLE IF EXISTS "vendor_resources";

COMMIT;

-- ===========================================================================
-- VERIFICATION QUERIES (run after migration to verify data integrity)
-- ===========================================================================

-- Check project count matches vendors with data
-- SELECT COUNT(*) FROM projects;

-- Verify weekly reports have projectId
-- SELECT COUNT(*) FROM weekly_reports WHERE "projectId" IS NOT NULL;

-- Verify timeline items were migrated
-- SELECT COUNT(*) FROM project_timelines;

-- Verify RAID items were migrated
-- SELECT COUNT(*) FROM project_raid_items;

-- Verify resources were migrated
-- SELECT COUNT(*) FROM project_resources;
