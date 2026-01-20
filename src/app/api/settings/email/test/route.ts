/**
 * Email Test API
 *
 * POST /api/settings/email/test - Test SMTP connection and optionally send a test email
 */

import { NextResponse } from 'next/server';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  testSmtpConnectionWithTimeout,
  sendTestEmail,
  saveTestResult,
  getEmailConfig,
  validateSmtpHost,
  validateSmtpPort,
  validateEmail,
  checkRateLimit,
  incrementRateLimit,
  decryptCredential,
} from '@/lib/email-config';
import type { ApiResponse } from '@/types';

/**
 * POST - Test SMTP connection and/or send test email
 */
export async function POST(request: Request) {
  try {
    // Admin permission required to test email settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const {
      // For testing new configuration (before saving)
      host,
      port,
      secure,
      username,
      password,
      fromAddress,
      fromName,
      // For sending test email
      testRecipient,
      sendTestEmail: shouldSendTestEmail,
      // Test timeout (optional)
      timeout,
    } = body;

    // Rate limiting
    const userId = authResult.user.id;
    const rateLimitCheck = await checkRateLimit(`email_test:${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Rate limit exceeded. Try again after ${rateLimitCheck.resetAt.toLocaleTimeString()}.`,
        },
        { status: 429 }
      );
    }

    // Determine if we're testing new config or saved config
    const isNewConfig = host && username && password;

    let testConfig: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromAddress: string;
      fromName?: string;
    };

    if (isNewConfig) {
      // Validate new configuration
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

      if (!username || typeof username !== 'string') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Username is required for testing' },
          { status: 400 }
        );
      }

      if (!password || typeof password !== 'string') {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Password is required for testing' },
          { status: 400 }
        );
      }

      if (!fromAddress) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'From address is required for testing' },
          { status: 400 }
        );
      }

      const fromValidation = validateEmail(fromAddress);
      if (!fromValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `From address: ${fromValidation.error}` },
          { status: 400 }
        );
      }

      testConfig = {
        host,
        port,
        secure: secure ?? true,
        username,
        password,
        fromAddress,
        fromName,
      };
    } else {
      // Use saved configuration
      const savedConfig = await getEmailConfig();
      if (!savedConfig) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Email service is not configured' },
          { status: 400 }
        );
      }

      // Get decrypted credentials from database
      const { prisma } = await import('@/lib/prisma');
      const dbConfig = await prisma.emailConfig.findFirst();
      if (!dbConfig) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Email configuration not found' },
          { status: 400 }
        );
      }

      testConfig = {
        host: savedConfig.host,
        port: savedConfig.port,
        secure: savedConfig.secure,
        username: decryptCredential(dbConfig.encryptedUsername),
        password: decryptCredential(dbConfig.encryptedPassword),
        fromAddress: savedConfig.fromAddress,
        fromName: savedConfig.fromName,
      };
    }

    // Increment rate limit
    await incrementRateLimit(`email_test:${userId}`);

    const startTime = Date.now();

    // Test SMTP connection
    const connectionResult = await testSmtpConnectionWithTimeout(
      testConfig,
      timeout || 30000
    );

    const responseTime = Date.now() - startTime;

    if (!connectionResult.success) {
      // Save failed test result for saved config
      if (!isNewConfig) {
        await saveTestResult(
          connectionResult.timeout ? 'timeout' : 'error',
          connectionResult.error || 'Connection failed'
        );
      }

      return NextResponse.json<ApiResponse<{
        connectionTest: { success: boolean; error?: string; timeout?: boolean };
        responseTime: number;
      }>>({
        success: false,
        data: {
          connectionTest: connectionResult,
          responseTime,
        },
        error: connectionResult.error || 'SMTP connection test failed',
      });
    }

    // Send test email if requested
    let testEmailResult: { success: boolean; messageId?: string; error?: string } | null = null;

    if (shouldSendTestEmail && testRecipient) {
      const recipientValidation = validateEmail(testRecipient);
      if (!recipientValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Test recipient: ${recipientValidation.error}` },
          { status: 400 }
        );
      }

      testEmailResult = await sendTestEmail(testRecipient, testConfig);
    }

    // Save successful test result for saved config
    if (!isNewConfig) {
      await saveTestResult('success', `Connection successful (${responseTime}ms)`);
    }

    return NextResponse.json<ApiResponse<{
      connectionTest: { success: boolean; error?: string; timeout?: boolean };
      testEmail?: { success: boolean; messageId?: string; error?: string };
      responseTime: number;
    }>>({
      success: true,
      data: {
        connectionTest: connectionResult,
        ...(testEmailResult && { testEmail: testEmailResult }),
        responseTime,
      },
      message: testEmailResult?.success
        ? 'Connection successful and test email sent!'
        : 'SMTP connection test successful!',
    });
  } catch (error) {
    console.error('Error testing email connection:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test email connection',
      },
      { status: 500 }
    );
  }
}
