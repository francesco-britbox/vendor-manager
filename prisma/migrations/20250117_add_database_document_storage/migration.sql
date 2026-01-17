-- AlterTable: Add document binary storage fields to VendorDocument
-- This migration adds support for storing documents directly in the database
-- instead of AWS S3 while maintaining backward compatibility

-- Make documentKey nullable (was required before) for VendorDocument
ALTER TABLE "vendor_documents" ALTER COLUMN "documentKey" DROP NOT NULL;

-- Add binary data column for storing document content
ALTER TABLE "vendor_documents" ADD COLUMN "documentData" BYTEA;

-- Add storage type tracking column (database or s3)
ALTER TABLE "vendor_documents" ADD COLUMN "storageType" TEXT NOT NULL DEFAULT 'database';

-- Create index for storage type to help with migration queries
CREATE INDEX "vendor_documents_storageType_idx" ON "vendor_documents"("storageType");

-- AlterTable: Add document binary storage fields to Contract
-- Add binary data column for storing contract document content
ALTER TABLE "contracts" ADD COLUMN "documentData" BYTEA;

-- Add storage type tracking column (database or s3)
ALTER TABLE "contracts" ADD COLUMN "storageType" TEXT;

-- Update existing records to mark them as 's3' storage type if they have a documentKey
UPDATE "vendor_documents" SET "storageType" = 's3' WHERE "documentKey" IS NOT NULL;
UPDATE "contracts" SET "storageType" = 's3' WHERE "documentKey" IS NOT NULL;
