/**
 * Email Settings API
 *
 * GET /api/settings/email - Get email configuration (without exposing credentials)
 * POST /api/settings/email - Save a new email configuration
 * PATCH /api/settings/email - Update email configuration settings
 * DELETE /api/settings/email - Delete email configuration
 */

import { NextResponse } from 'next/server';
import {
  requireAdminPermission,
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  getEmailConfig,
  saveEmailConfig,
  updateEmailConfigSettings,
  deleteEmailConfig,
  testSmtpConnectionWithTimeout,
  saveTestResult,
  validateSmtpHost,
  validateSmtpPort,
  validateEmail,
} from '@/lib/email-config';
import type { ApiResponse, EmailConfig } from '@/types';

/**
 * GET - Get email configuration
 */
export async function GET() {
  try {
    // View permission is enough to see if email is configured
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const config = await getEmailConfig();

    return NextResponse.json<ApiResponse<EmailConfig | null>>({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error getting email settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get email settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Save or update email configuration
 */
export async function POST(request: Request) {
  try {
    // Admin permission required to modify email settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const {
      host,
      port,
      secure,
      username,
      password,
      fromAddress,
      fromName,
      replyTo,
      isEnabled,
      testConnection,
    } = body;

    // Validate required fields
    const hostValidation = validateSmtpHost(host);
    if (!hostValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: hostValidation.error },
        { status: 400 }
      );
    }

    const portValidation = validateSmtpPort(port);
    if (!portValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: portValidation.error },
        { status: 400 }
      );
    }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const fromValidation = validateEmail(fromAddress);
    if (!fromValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Sender email: ${fromValidation.error}` },
        { status: 400 }
      );
    }

    if (replyTo) {
      const replyToValidation = validateEmail(replyTo);
      if (!replyToValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Reply-to email: ${replyToValidation.error}` },
          { status: 400 }
        );
      }
    }

    // Test connection if requested
    if (testConnection !== false) {
      const testResult = await testSmtpConnectionWithTimeout({
        host,
        port,
        secure: secure ?? true,
        username,
        password,
      });

      if (!testResult.success) {
        // Save failed test result
        await saveTestResult('error', testResult.error || 'Connection failed');

        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: testResult.error || 'SMTP connection test failed',
          },
          { status: 400 }
        );
      }
    }

    // Save the configuration
    const config = await saveEmailConfig({
      host,
      port,
      secure: secure ?? true,
      username,
      password,
      fromAddress,
      fromName,
      replyTo,
      isEnabled: isEnabled ?? true,
    });

    // Save successful test result if connection was tested
    if (testConnection !== false) {
      await saveTestResult('success', 'Connection successful');
    }

    return NextResponse.json<ApiResponse<EmailConfig>>({
      success: true,
      data: config,
      message: 'Email configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving email config:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save email configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update email configuration settings (without changing credentials)
 */
export async function PATCH(request: Request) {
  try {
    // Admin permission required to modify email settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const { host, port, secure, fromAddress, fromName, replyTo, isEnabled } = body;

    // Validate provided fields
    if (host !== undefined) {
      const hostValidation = validateSmtpHost(host);
      if (!hostValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: hostValidation.error },
          { status: 400 }
        );
      }
    }

    if (port !== undefined) {
      const portValidation = validateSmtpPort(port);
      if (!portValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: portValidation.error },
          { status: 400 }
        );
      }
    }

    if (fromAddress !== undefined) {
      const fromValidation = validateEmail(fromAddress);
      if (!fromValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Sender email: ${fromValidation.error}` },
          { status: 400 }
        );
      }
    }

    if (replyTo !== undefined && replyTo !== '') {
      const replyToValidation = validateEmail(replyTo);
      if (!replyToValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Reply-to email: ${replyToValidation.error}` },
          { status: 400 }
        );
      }
    }

    const config = await updateEmailConfigSettings({
      host,
      port,
      secure,
      fromAddress,
      fromName,
      replyTo,
      isEnabled,
    });

    if (!config) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Email configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<EmailConfig>>({
      success: true,
      data: config,
      message: 'Email configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update email configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete email configuration
 */
export async function DELETE() {
  try {
    // Admin permission required to delete email settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const deleted = await deleteEmailConfig();

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Email configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Email configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting email config:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete email configuration',
      },
      { status: 500 }
    );
  }
}
