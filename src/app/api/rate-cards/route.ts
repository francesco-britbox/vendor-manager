/**
 * Rate Cards API
 *
 * GET /api/rate-cards - List all rate cards (requires view permission)
 * POST /api/rate-cards - Create a new rate card (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllRateCards,
  getRateCards,
  createRateCard,
  validateCreateRateCardInput,
  getRateCardStats,
} from '@/lib/rate-cards';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, RateCard } from '@/types';
import type { RateCardWithDetails } from '@/lib/rate-cards';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const roleId = searchParams.get('roleId');
    const currency = searchParams.get('currency');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    // If no filters provided, return all rate cards
    if (!vendorId && !roleId && !currency && !activeOnly && !search && !limit && !offset) {
      const [rateCards, stats] = await Promise.all([
        getAllRateCards(),
        includeStats ? getRateCardStats() : null,
      ]);

      return NextResponse.json<ApiResponse<{ rateCards: RateCardWithDetails[]; stats?: Awaited<ReturnType<typeof getRateCardStats>> }>>({
        success: true,
        data: {
          rateCards,
          ...(stats && { stats }),
        },
      });
    }

    // Apply filters
    const { rateCards, total } = await getRateCards({
      vendorId: vendorId ?? undefined,
      roleId: roleId ?? undefined,
      currency: currency ?? undefined,
      activeOnly: activeOnly || undefined,
      search: search ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getRateCardStats() : null;

    return NextResponse.json<
      ApiResponse<{
        rateCards: RateCardWithDetails[];
        total: number;
        stats?: Awaited<ReturnType<typeof getRateCardStats>>;
      }>
    >({
      success: true,
      data: {
        rateCards,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching rate cards:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rate cards',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateCreateRateCardInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const rateCard = await createRateCard(validation.data);

    return NextResponse.json<ApiResponse<RateCard>>(
      {
        success: true,
        data: rateCard,
        message: 'Rate card created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating rate card:', error);

    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: error.message,
          },
          { status: 404 }
        );
      }

      if (error.message.includes('already exists')) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: error.message,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create rate card',
      },
      { status: 500 }
    );
  }
}
