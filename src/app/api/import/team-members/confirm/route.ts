/**
 * Team Members Import Confirm API
 *
 * POST /api/import/team-members/confirm - Execute bulk import
 */

import { NextResponse } from 'next/server';
import { executeTeamMemberImport } from '@/lib/csv-import';
import {
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';
import type { ImportRow, ImportResult } from '@/types/csv-import';

interface ConfirmImportBody {
  rows: ImportRow[];
  vendorId: string;
  skipDuplicates: boolean;
  updateExisting: boolean;
}

export async function POST(request: Request) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body: ConfirmImportBody = await request.json();

    // Validate required fields
    if (!body.rows || !Array.isArray(body.rows)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid rows data',
        },
        { status: 400 }
      );
    }

    if (!body.vendorId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor ID is required',
        },
        { status: 400 }
      );
    }

    // Execute import
    const result = await executeTeamMemberImport(body.rows, {
      entityType: 'team-members',
      vendorId: body.vendorId,
      skipDuplicates: body.skipDuplicates ?? true,
      updateExisting: body.updateExisting ?? false,
    });

    return NextResponse.json<ApiResponse<ImportResult>>({
      success: result.success,
      data: result,
      message: result.success
        ? `Successfully imported ${result.created} team members`
        : `Import completed with ${result.failed} failures`,
    });
  } catch (error) {
    console.error('Error executing import:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute import',
      },
      { status: 500 }
    );
  }
}
