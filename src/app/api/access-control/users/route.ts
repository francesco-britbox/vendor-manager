/**
 * Users Management API
 *
 * GET  - List all users with their groups
 * POST - Create a new user (with optional invitation email)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import bcryptjs from 'bcryptjs';
import { emailService } from '@/lib/email-service';
import { generateInvitationEmail } from '@/lib/email-templates';
import {
  encryptToken,
  generateRandomToken,
  getTokenExpirationDate,
  type TokenData,
} from '@/lib/token-encryption';
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
    const status = searchParams.get('status'); // 'active', 'inactive', 'invited', 'email_failed', or null for all
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

    // Status filtering
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'invited') {
      where.status = 'invited';
    } else if (status === 'email_failed') {
      where.lastEmailDeliveryStatus = 'failed';
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
      // Invitation status tracking
      status: user.status,
      invitationSentAt: user.invitationSentAt || undefined,
      invitationAcceptedAt: user.invitationAcceptedAt || undefined,
      passwordSetAt: user.passwordSetAt || undefined,
      // Email delivery tracking
      lastEmailSentAt: user.lastEmailSentAt || undefined,
      lastEmailDeliveryStatus: user.lastEmailDeliveryStatus || undefined,
      lastEmailError: user.lastEmailError || undefined,
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
 * Create a new user with optional invitation email
 */
export async function POST(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const {
      email,
      name,
      password,
      permissionLevel,
      isActive,
      isSuperUser,
      groupIds,
      sendInvitation = false, // New field for sending invitation
    } = body;

    // Validate required fields
    // Password is optional if sending invitation
    if (!email || !name) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Email and name are required',
        },
        { status: 400 }
      );
    }

    // If not sending invitation, password is required
    if (!sendInvitation && !password) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Password is required when not sending invitation',
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

    // If sending invitation, check email service availability
    if (sendInvitation) {
      const emailAvailable = await emailService.isAvailable();
      if (!emailAvailable) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Email service is not configured. Cannot send invitation.',
          },
          { status: 503 }
        );
      }
    }

    // Generate password hash
    // If sending invitation, generate a random temporary password
    const passwordToHash = sendInvitation
      ? generateRandomToken().substring(0, 32)
      : password;
    const hashedPassword = await bcryptjs.hash(passwordToHash, 10);

    // Create user with group memberships
    // Set status to 'invited' if sending invitation, otherwise 'active'
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        permissionLevel: permissionLevel || 'view',
        isActive: isActive !== false,
        isSuperUser: isSuperUser || false,
        status: sendInvitation ? 'invited' : 'active',
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

    // Create audit log entry for user creation
    await prisma.invitationAuditLog.create({
      data: {
        userId: user.id,
        action: 'invitation_created',
        newStatus: sendInvitation ? 'invited' : 'active',
        triggeredBy: authResult.user.id,
        metadata: {
          email: user.email,
          name: user.name,
          sendInvitation,
        },
      },
    });

    let invitationSent = false;
    let invitationError: string | undefined;

    // Send invitation email if requested
    if (sendInvitation) {
      try {
        // Generate encrypted token for URL
        const tokenData: TokenData = {
          email: user.email,
          userId: user.id,
          type: 'invitation',
          createdAt: Date.now(),
        };
        const encryptedToken = encryptToken(tokenData);

        // Generate random token for database storage
        const dbToken = generateRandomToken();
        const expiresAt = getTokenExpirationDate('invitation');

        // Store token in database
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: dbToken,
            type: 'invitation',
            expiresAt,
          },
        });

        // Generate invitation URL
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const setupUrl = `${baseUrl}/auth/setup-password?token=${encryptedToken}`;

        // Generate email content
        const emailContent = generateInvitationEmail({
          userName: user.name,
          userEmail: user.email,
          setupUrl,
          expirationHours: 48,
        });

        // Send invitation email
        const result = await emailService.send({
          to: user.email,
          subject: 'Welcome to Vendor Management System - Set Up Your Account',
          html: emailContent.html,
          text: emailContent.text,
          module: 'user-management',
          emailType: 'invitation',
          userId: authResult.user.id,
          metadata: {
            invitedUserId: user.id,
            invitedUserEmail: user.email,
            sentAt: new Date().toISOString(),
          },
        });

        const now = new Date();
        if (result.success) {
          invitationSent = true;
          // Update user's invitationSentAt timestamp and email delivery status
          await prisma.user.update({
            where: { id: user.id },
            data: {
              invitationSentAt: now,
              lastEmailSentAt: now,
              lastEmailDeliveryStatus: 'sent',
              lastEmailError: null,
            },
          });

          // Create audit log for successful invitation send
          await prisma.invitationAuditLog.create({
            data: {
              userId: user.id,
              action: 'invitation_sent',
              emailStatus: 'sent',
              emailMessageId: result.messageId || undefined,
              triggeredBy: authResult.user.id,
              metadata: {
                email: user.email,
                messageId: result.messageId,
              },
            },
          });
        } else {
          invitationError = result.error;
          // Update email delivery status to failed
          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastEmailSentAt: now,
              lastEmailDeliveryStatus: 'failed',
              lastEmailError: result.error || 'Email send failed',
            },
          });

          // Create audit log for failed invitation send
          await prisma.invitationAuditLog.create({
            data: {
              userId: user.id,
              action: 'invitation_failed',
              emailStatus: 'failed',
              errorMessage: result.error || 'Email send failed',
              triggeredBy: authResult.user.id,
              metadata: {
                email: user.email,
                error: result.error,
              },
            },
          });
        }
      } catch (error) {
        console.error('Error sending invitation email:', error);
        invitationError = error instanceof Error ? error.message : 'Failed to send invitation';

        // Update email delivery status to failed
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastEmailSentAt: new Date(),
            lastEmailDeliveryStatus: 'failed',
            lastEmailError: invitationError,
          },
        });

        // Create audit log for failed invitation send
        await prisma.invitationAuditLog.create({
          data: {
            userId: user.id,
            action: 'invitation_failed',
            emailStatus: 'failed',
            errorMessage: invitationError,
            triggeredBy: authResult.user.id,
            metadata: {
              email: user.email,
              error: invitationError,
            },
          },
        });
      }
    }

    // Re-fetch user to get updated email tracking fields
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
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
      // Invitation status tracking
      status: updatedUser?.status || user.status,
      invitationSentAt: updatedUser?.invitationSentAt || undefined,
      invitationAcceptedAt: updatedUser?.invitationAcceptedAt || undefined,
      passwordSetAt: updatedUser?.passwordSetAt || undefined,
      // Email delivery tracking
      lastEmailSentAt: updatedUser?.lastEmailSentAt || undefined,
      lastEmailDeliveryStatus: updatedUser?.lastEmailDeliveryStatus || undefined,
      lastEmailError: updatedUser?.lastEmailError || undefined,
    };

    // Build response message
    let message = 'User created successfully';
    if (sendInvitation) {
      if (invitationSent) {
        message += '. Invitation email sent.';
      } else {
        message += `. Warning: Failed to send invitation email${invitationError ? `: ${invitationError}` : ''}.`;
      }
    }

    return NextResponse.json<ApiResponse<UserForManagement & { invitationSent?: boolean }>>({
      success: true,
      data: {
        ...userForManagement,
        invitationSent,
      },
      message,
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
