/**
 * Team Members Import Preview API
 *
 * POST /api/import/team-members/preview - Preview CSV import with validation
 */

import { NextResponse } from 'next/server';
import { generateImportPreview } from '@/lib/csv-import';
import {
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';
import type { ImportPreview } from '@/types/csv-import';

export async function POST(request: Request) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const vendorId = formData.get('vendorId') as string | null;

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'File must be a CSV file',
        },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();

    if (!csvContent.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'CSV file is empty',
        },
        { status: 400 }
      );
    }

    // Generate preview
    const preview = await generateImportPreview(csvContent, {
      entityType: 'team-members',
      vendorId: vendorId || undefined,
      skipDuplicates: true,
      updateExisting: false,
    });

    // Update filename in preview
    preview.fileName = file.name;

    return NextResponse.json<ApiResponse<ImportPreview>>({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('Error generating import preview:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate import preview',
      },
      { status: 500 }
    );
  }
}
