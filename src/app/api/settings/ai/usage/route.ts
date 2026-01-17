/**
 * AI Usage API
 *
 * GET /api/settings/ai/usage - Get AI usage statistics
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { getAIUsageStats } from '@/lib/ai-config';
import type { ApiResponse, AIProvider } from '@/types';

/**
 * GET - Get AI usage statistics
 */
export async function GET(request: Request) {
  try {
    // View permission required to see usage stats
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as AIProvider | null;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const limitStr = searchParams.get('limit');

    // Parse dates
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid start date',
        },
        { status: 400 }
      );
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid end date',
        },
        { status: 400 }
      );
    }

    // Validate provider
    if (provider && !['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid provider. Must be "anthropic" or "openai".',
        },
        { status: 400 }
      );
    }

    const stats = await getAIUsageStats({
      provider: provider || undefined,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json<ApiResponse<typeof stats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting AI usage stats:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI usage statistics',
      },
      { status: 500 }
    );
  }
}
