/**
 * Team Members Import Template API
 *
 * GET /api/import/team-members/template - Download CSV template
 */

import { NextResponse } from 'next/server';
import { generateTeamMemberCSVTemplate } from '@/lib/csv-import';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';

export async function GET() {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const template = generateTeamMemberCSVTemplate();

    return new NextResponse(template, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="team-members-import-template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate template',
      },
      { status: 500 }
    );
  }
}
