/**
 * Contracts API
 *
 * GET /api/contracts - List all contracts (requires view permission)
 * POST /api/contracts - Create a new contract (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllContracts,
  getContracts,
  createContract,
  validateCreateContractInput,
  getContractStats,
} from '@/lib/contracts';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, ContractStatus } from '@/types';
import type { ContractWithVendor } from '@/lib/contracts';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ContractStatus | null;
    const vendorId = searchParams.get('vendorId');
    const search = searchParams.get('search');
    const expiringWithinDays = searchParams.get('expiringWithinDays');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    // If no filters provided, return all contracts
    if (!status && !vendorId && !search && !limit && !offset && !expiringWithinDays) {
      const [contracts, stats] = await Promise.all([
        getAllContracts(),
        includeStats ? getContractStats() : null,
      ]);

      return NextResponse.json<ApiResponse<{ contracts: ContractWithVendor[]; stats?: Awaited<ReturnType<typeof getContractStats>> }>>({
        success: true,
        data: {
          contracts,
          ...(stats && { stats }),
        },
      });
    }

    // Apply filters
    const { contracts, total } = await getContracts({
      status: status ?? undefined,
      vendorId: vendorId ?? undefined,
      search: search ?? undefined,
      expiringWithinDays: expiringWithinDays ? parseInt(expiringWithinDays, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getContractStats() : null;

    return NextResponse.json<
      ApiResponse<{
        contracts: ContractWithVendor[];
        total: number;
        stats?: Awaited<ReturnType<typeof getContractStats>>;
      }>
    >({
      success: true,
      data: {
        contracts,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contracts',
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
    const validation = validateCreateContractInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const contract = await createContract(validation.data);

    return NextResponse.json<ApiResponse<ContractWithVendor>>(
      {
        success: true,
        data: contract,
        message: 'Contract created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create contract',
      },
      { status: 500 }
    );
  }
}
