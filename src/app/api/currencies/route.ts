/**
 * Currencies API
 *
 * GET /api/currencies - List all supported currencies
 * GET /api/currencies?search=query - Search currencies by code or name
 */

import { NextResponse } from 'next/server';
import {
  CURRENCIES,
  searchCurrencies,
  getCurrenciesByRegion,
} from '@/lib/currency';
import type { ApiResponse, Currency } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const grouped = searchParams.get('grouped') === 'true';

    if (grouped) {
      const groupedCurrencies = getCurrenciesByRegion();
      return NextResponse.json<ApiResponse<Record<string, Currency[]>>>({
        success: true,
        data: groupedCurrencies,
      });
    }

    const currencies = search ? searchCurrencies(search) : CURRENCIES;

    return NextResponse.json<ApiResponse<Currency[]>>({
      success: true,
      data: currencies,
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch currencies',
      },
      { status: 500 }
    );
  }
}
