#!/usr/bin/env npx ts-node

/**
 * S3 to Database Migration Script
 *
 * This script migrates existing documents from AWS S3 storage to database storage.
 * It downloads each document from S3 and stores the binary data directly in the database.
 *
 * Usage:
 *   npx ts-node scripts/migrate-s3-to-database.ts
 *
 * Options:
 *   --dry-run     Show what would be migrated without making changes
 *   --batch-size  Number of documents to process at once (default: 10)
 *   --verbose     Show detailed progress information
 *
 * Prerequisites:
 * - S3 credentials must be configured in .env
 * - Database must be accessible
 * - Schema must have been updated with new fields (documentData, storageType)
 *
 * IMPORTANT: Run database migrations first!
 *   npx prisma migrate deploy
 */

import { PrismaClient } from '@prisma/client';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const batchSizeIndex = args.indexOf('--batch-size');
const BATCH_SIZE = batchSizeIndex !== -1 ? parseInt(args[batchSizeIndex + 1], 10) : 10;

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize S3 client
function getS3Client(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.AWS_S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    ...(endpoint && {
      endpoint,
      forcePathStyle: true,
    }),
  });
}

async function downloadFromS3(s3Client: S3Client, bucket: string, key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error('Empty response body from S3');
  }

  // Convert stream to Buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  // Combine chunks into single Buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = Buffer.alloc(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  return buffer;
}

interface MigrationStats {
  vendorDocuments: {
    total: number;
    migrated: number;
    failed: number;
    skipped: number;
  };
  contracts: {
    total: number;
    migrated: number;
    failed: number;
    skipped: number;
  };
  totalBytesTransferred: number;
  errors: Array<{ type: string; id: string; error: string }>;
}

async function migrateDocuments(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    vendorDocuments: { total: 0, migrated: 0, failed: 0, skipped: 0 },
    contracts: { total: 0, migrated: 0, failed: 0, skipped: 0 },
    totalBytesTransferred: 0,
    errors: [],
  };

  // Check S3 configuration
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!s3Client || !bucket) {
    console.error('ERROR: S3 is not configured. Please set AWS credentials in .env');
    console.error('Required environment variables:');
    console.error('  - AWS_ACCESS_KEY_ID');
    console.error('  - AWS_SECRET_ACCESS_KEY');
    console.error('  - AWS_S3_BUCKET');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('S3 to Database Migration Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`S3 Bucket: ${bucket}`);
  console.log('');

  // Get vendor documents to migrate
  const vendorDocuments = await prisma.vendorDocument.findMany({
    where: {
      OR: [
        { storageType: 's3' },
        { storageType: 'database', documentData: null, documentKey: { not: null } },
      ],
      documentData: null,
    },
    select: {
      id: true,
      documentKey: true,
      documentName: true,
      documentSize: true,
      vendorId: true,
    },
  });

  stats.vendorDocuments.total = vendorDocuments.length;
  console.log(`Found ${vendorDocuments.length} vendor documents to migrate`);

  // Get contracts to migrate
  const contracts = await prisma.contract.findMany({
    where: {
      OR: [
        { storageType: 's3' },
        { storageType: 'database', documentData: null, documentKey: { not: null } },
      ],
      documentData: null,
    },
    select: {
      id: true,
      documentKey: true,
      documentName: true,
      documentSize: true,
      vendorId: true,
    },
  });

  stats.contracts.total = contracts.length;
  console.log(`Found ${contracts.length} contracts with documents to migrate`);
  console.log('');

  if (stats.vendorDocuments.total === 0 && stats.contracts.total === 0) {
    console.log('No documents to migrate!');
    return stats;
  }

  // Migrate vendor documents
  if (vendorDocuments.length > 0) {
    console.log('-'.repeat(60));
    console.log('Migrating Vendor Documents');
    console.log('-'.repeat(60));

    for (let i = 0; i < vendorDocuments.length; i += BATCH_SIZE) {
      const batch = vendorDocuments.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vendorDocuments.length / BATCH_SIZE)}`);

      for (const doc of batch) {
        if (!doc.documentKey) {
          stats.vendorDocuments.skipped++;
          if (VERBOSE) {
            console.log(`  SKIP: ${doc.id} - No document key`);
          }
          continue;
        }

        try {
          if (VERBOSE) {
            console.log(`  Processing: ${doc.documentName} (${doc.id})`);
          }

          if (!DRY_RUN) {
            // Download from S3
            const documentData = await downloadFromS3(s3Client, bucket, doc.documentKey);

            // Update database with binary data
            await prisma.vendorDocument.update({
              where: { id: doc.id },
              data: {
                documentData,
                storageType: 'database',
              },
            });

            stats.totalBytesTransferred += documentData.length;
          }

          stats.vendorDocuments.migrated++;
          if (VERBOSE) {
            console.log(`    OK: ${doc.documentSize || 'unknown'} bytes`);
          }
        } catch (error) {
          stats.vendorDocuments.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          stats.errors.push({
            type: 'VendorDocument',
            id: doc.id,
            error: errorMessage,
          });
          console.error(`    FAILED: ${doc.id} - ${errorMessage}`);
        }
      }
    }

    console.log('');
  }

  // Migrate contracts
  if (contracts.length > 0) {
    console.log('-'.repeat(60));
    console.log('Migrating Contract Documents');
    console.log('-'.repeat(60));

    for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
      const batch = contracts.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contracts.length / BATCH_SIZE)}`);

      for (const contract of batch) {
        if (!contract.documentKey) {
          stats.contracts.skipped++;
          if (VERBOSE) {
            console.log(`  SKIP: ${contract.id} - No document key`);
          }
          continue;
        }

        try {
          if (VERBOSE) {
            console.log(`  Processing: ${contract.documentName || 'unknown'} (${contract.id})`);
          }

          if (!DRY_RUN) {
            // Download from S3
            const documentData = await downloadFromS3(s3Client, bucket, contract.documentKey);

            // Update database with binary data
            await prisma.contract.update({
              where: { id: contract.id },
              data: {
                documentData,
                storageType: 'database',
              },
            });

            stats.totalBytesTransferred += documentData.length;
          }

          stats.contracts.migrated++;
          if (VERBOSE) {
            console.log(`    OK: ${contract.documentSize || 'unknown'} bytes`);
          }
        } catch (error) {
          stats.contracts.failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          stats.errors.push({
            type: 'Contract',
            id: contract.id,
            error: errorMessage,
          });
          console.error(`    FAILED: ${contract.id} - ${errorMessage}`);
        }
      }
    }
  }

  return stats;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main(): Promise<void> {
  try {
    console.log('');
    const stats = await migrateDocuments();

    // Print summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log('');
    console.log('Vendor Documents:');
    console.log(`  Total:    ${stats.vendorDocuments.total}`);
    console.log(`  Migrated: ${stats.vendorDocuments.migrated}`);
    console.log(`  Failed:   ${stats.vendorDocuments.failed}`);
    console.log(`  Skipped:  ${stats.vendorDocuments.skipped}`);
    console.log('');
    console.log('Contracts:');
    console.log(`  Total:    ${stats.contracts.total}`);
    console.log(`  Migrated: ${stats.contracts.migrated}`);
    console.log(`  Failed:   ${stats.contracts.failed}`);
    console.log(`  Skipped:  ${stats.contracts.skipped}`);
    console.log('');
    console.log(`Total data transferred: ${formatBytes(stats.totalBytesTransferred)}`);

    if (stats.errors.length > 0) {
      console.log('');
      console.log('Errors:');
      for (const error of stats.errors) {
        console.log(`  - ${error.type} ${error.id}: ${error.error}`);
      }
    }

    if (DRY_RUN) {
      console.log('');
      console.log('NOTE: This was a dry run. No changes were made.');
      console.log('Run without --dry-run to perform the actual migration.');
    }

    console.log('');

    // Exit with error code if there were failures
    if (stats.vendorDocuments.failed > 0 || stats.contracts.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
