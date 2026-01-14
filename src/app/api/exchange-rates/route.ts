/**
 * Exchange Rates API
 *
 * GET /api/exchange-rates - List all exchange rates (public)
 * POST /api/exchange-rates - Create or update an exchange rate (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllExchangeRates,
  upsertExchangeRate,
  validateExchangeRateInput,
  getExchangeRateStats,
} from '@/lib/currency';
import {
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

export async function GET() {
  try {
    const [rates, stats] = await Promise.all([
      getAllExchangeRates(),
      getExchangeRateStats(),
    ]);

    return NextResponse.json<ApiResponse<{ rates: typeof rates; stats: typeof stats }>>({
      success: true,
      data: { rates, stats },
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rates',
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

    // Validate input
    const validation = validateExchangeRateInput(body);
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const rate = await upsertExchangeRate(body);

    return NextResponse.json<ApiResponse<typeof rate>>({
      success: true,
      data: rate,
      message: 'Exchange rate saved successfully',
    });
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save exchange rate',
      },
      { status: 500 }
    );
  }
}
