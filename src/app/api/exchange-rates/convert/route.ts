/**
 * Currency Conversion API
 *
 * POST /api/exchange-rates/convert - Convert an amount between currencies
 */

import { NextResponse } from 'next/server';
import {
  convertCurrencyWithFallback,
  ConversionError,
  RoundingMode,
} from '@/lib/currency';
import type { ApiResponse } from '@/types';

interface ConvertRequest {
  amount: number | string;
  fromCurrency: string;
  toCurrency: string;
  decimalPlaces?: number;
  roundingMode?: RoundingMode;
}

export async function POST(request: Request) {
  try {
    const body: ConvertRequest = await request.json();

    // Validate required fields
    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Amount is required',
        },
        { status: 400 }
      );
    }

    if (!body.fromCurrency) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'From currency is required',
        },
        { status: 400 }
      );
    }

    if (!body.toCurrency) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'To currency is required',
        },
        { status: 400 }
      );
    }

    const result = await convertCurrencyWithFallback(
      body.amount,
      body.fromCurrency,
      body.toCurrency,
      {
        decimalPlaces: body.decimalPlaces,
        roundingMode: body.roundingMode,
      }
    );

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error converting currency:', error);

    if (error instanceof ConversionError) {
      const statusCode = error.code === 'RATE_NOT_FOUND' ? 404 : 400;
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error.message,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert currency',
      },
      { status: 500 }
    );
  }
}
