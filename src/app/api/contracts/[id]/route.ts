/**
 * Contract API - Single Resource
 *
 * GET /api/contracts/[id] - Get a contract by ID (requires view permission)
 * PUT /api/contracts/[id] - Update a contract by ID (requires write permission)
 * DELETE /api/contracts/[id] - Delete a contract by ID (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getContractById,
  updateContract,
  deleteContract,
  validateUpdateContractInput,
  validateContractId,
  activateContract,
  terminateContract,
} from '@/lib/contracts';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';
import type { ContractWithVendor } from '@/lib/contracts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateContractId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const contract = await getContractById(id);

    if (!contract) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Contract not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<ContractWithVendor>>({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contract',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateContractId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check for special status actions
    if (body.action === 'activate') {
      try {
        const contract = await activateContract(id);
        if (!contract) {
          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              error: 'Contract not found',
            },
            { status: 404 }
          );
        }
        return NextResponse.json<ApiResponse<ContractWithVendor>>({
          success: true,
          data: contract,
          message: 'Contract activated successfully',
        });
      } catch (error) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to activate contract',
          },
          { status: 400 }
        );
      }
    }

    if (body.action === 'terminate') {
      try {
        const contract = await terminateContract(id);
        if (!contract) {
          return NextResponse.json<ApiResponse<null>>(
            {
              success: false,
              error: 'Contract not found',
            },
            { status: 404 }
          );
        }
        return NextResponse.json<ApiResponse<ContractWithVendor>>({
          success: true,
          data: contract,
          message: 'Contract terminated successfully',
        });
      } catch (error) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to terminate contract',
          },
          { status: 400 }
        );
      }
    }

    // Validate input using Zod schema
    const validation = validateUpdateContractInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if there's anything to update
    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No valid fields provided for update',
        },
        { status: 400 }
      );
    }

    const contract = await updateContract(id, validation.data);

    if (!contract) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Contract not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<ContractWithVendor>>({
      success: true,
      data: contract,
      message: 'Contract updated successfully',
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update contract',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateContractId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const deleted = await deleteContract(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Contract not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Contract deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete contract',
      },
      { status: 500 }
    );
  }
}
