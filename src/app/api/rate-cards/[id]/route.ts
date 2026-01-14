/**
 * Rate Card API - Single Resource
 *
 * GET /api/rate-cards/[id] - Get a rate card by ID (requires view permission)
 * PUT /api/rate-cards/[id] - Update a rate card by ID (requires write permission)
 * DELETE /api/rate-cards/[id] - Delete a rate card by ID (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getRateCardById,
  updateRateCard,
  deleteRateCard,
  validateUpdateRateCardInput,
  validateRateCardId,
} from '@/lib/rate-cards';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, RateCard } from '@/types';

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
    const idValidation = validateRateCardId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const rateCard = await getRateCardById(id);

    if (!rateCard) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Rate card not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<RateCard>>({
      success: true,
      data: rateCard,
    });
  } catch (error) {
    console.error('Error fetching rate card:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rate card',
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
    const idValidation = validateRateCardId(id);
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

    // Validate input using Zod schema
    const validation = validateUpdateRateCardInput(body);
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

    const rateCard = await updateRateCard(id, validation.data);

    if (!rateCard) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Rate card not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<RateCard>>({
      success: true,
      data: rateCard,
      message: 'Rate card updated successfully',
    });
  } catch (error) {
    console.error('Error updating rate card:', error);

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

      if (error.message.includes('must be after')) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update rate card',
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
    const idValidation = validateRateCardId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const deleted = await deleteRateCard(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Rate card not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Rate card deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rate card:', error);

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete rate card',
      },
      { status: 500 }
    );
  }
}
