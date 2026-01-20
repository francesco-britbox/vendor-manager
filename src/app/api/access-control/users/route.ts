/**
 * Users Management API
 *
 * GET  - List all users with their groups
 * POST - Create a new user
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import bcryptjs from 'bcryptjs';
import type { ApiResponse, UserForManagement } from '@/types';

/**
 * GET /api/access-control/users
 * List all users with their group memberships
 */
export async function GET(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Get users with group memberships
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          groups: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // Transform to response format
    const usersForManagement: UserForManagement[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      permissionLevel: user.permissionLevel,
      isActive: user.isActive,
      isSuperUser: user.isSuperUser,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      groups: user.groups.map((ug) => ({
        id: ug.group.id,
        name: ug.group.name,
      })),
    }));

    return NextResponse.json<ApiResponse<{ users: UserForManagement[]; total: number }>>({
      success: true,
      data: {
        users: usersForManagement,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch users',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/access-control/users
 * Create a new user
 */
export async function POST(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { email, name, password, permissionLevel, isActive, isSuperUser, groupIds } = body;

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Email, name, and password are required',
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'A user with this email already exists',
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user with group memberships
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        permissionLevel: permissionLevel || 'view',
        isActive: isActive !== false,
        isSuperUser: isSuperUser || false,
        groups: groupIds?.length
          ? {
              create: groupIds.map((groupId: string) => ({
                group: { connect: { id: groupId } },
              })),
            }
          : undefined,
      },
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const userForManagement: UserForManagement = {
      id: user.id,
      email: user.email,
      name: user.name,
      permissionLevel: user.permissionLevel,
      isActive: user.isActive,
      isSuperUser: user.isSuperUser,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      groups: user.groups.map((ug) => ({
        id: ug.group.id,
        name: ug.group.name,
      })),
    };

    return NextResponse.json<ApiResponse<UserForManagement>>({
      success: true,
      data: userForManagement,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to create user',
      },
      { status: 500 }
    );
  }
}
