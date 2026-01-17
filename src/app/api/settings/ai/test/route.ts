/**
 * AI Connection Test API
 *
 * POST /api/settings/ai/test - Test an API key connection
 */

import { NextResponse } from 'next/server';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { testApiKeyWithTimeout, validateApiKeyFormat, saveTestResult, getDecryptedApiKey } from '@/lib/ai-config';
import type { ApiResponse, AIProvider } from '@/types';

// Connection test result type
export interface ConnectionTestResult {
  status: 'success' | 'error' | 'timeout' | 'invalid_format';
  message: string;
  provider: AIProvider;
  testedAt: string;
  responseTime?: number;
}

/**
 * POST - Test an API key connection
 */
export async function POST(request: Request) {
  try {
    // Admin permission required to test API keys
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const { provider, apiKey, useStored = false, timeout = 30000 } = body;

    // Validate provider
    if (!provider || !['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json<ApiResponse<ConnectionTestResult>>(
        {
          success: false,
          error: 'Invalid provider. Must be "anthropic" or "openai".',
          data: {
            status: 'error',
            message: 'Invalid provider specified',
            provider: provider || 'unknown',
            testedAt: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Get the API key to test - either provided or from stored config
    let keyToTest = apiKey;

    if (useStored && !apiKey) {
      // Test the stored key
      const storedKey = await getDecryptedApiKey(provider as AIProvider);
      if (!storedKey) {
        return NextResponse.json<ApiResponse<ConnectionTestResult>>(
          {
            success: false,
            error: 'No stored API key found',
            data: {
              status: 'error',
              message: 'No API key is configured for this provider',
              provider,
              testedAt: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      keyToTest = storedKey;
    }

    // Validate API key is provided
    if (!keyToTest || typeof keyToTest !== 'string') {
      return NextResponse.json<ApiResponse<ConnectionTestResult>>(
        {
          success: false,
          error: 'API key is required',
          data: {
            status: 'error',
            message: 'No API key provided',
            provider,
            testedAt: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate API key format before testing
    const formatValidation = validateApiKeyFormat(provider as AIProvider, keyToTest);
    if (!formatValidation.valid) {
      return NextResponse.json<ApiResponse<ConnectionTestResult>>({
        success: false,
        error: formatValidation.error,
        data: {
          status: 'invalid_format',
          message: formatValidation.error || 'Invalid API key format',
          provider,
          testedAt: new Date().toISOString(),
        },
      });
    }

    // Test the API key with timeout
    const startTime = Date.now();
    const testResult = await testApiKeyWithTimeout(
      provider as AIProvider,
      keyToTest,
      Math.min(timeout, 60000) // Max 60 seconds
    );
    const responseTime = Date.now() - startTime;

    if (testResult.timeout) {
      const timeoutMessage = `Connection test timed out after ${Math.round(timeout / 1000)} seconds. Please check your network connection and try again.`;
      // Save test result to database
      try {
        await saveTestResult(provider as AIProvider, 'timeout', timeoutMessage);
      } catch (e) {
        console.error('Failed to save test result:', e);
      }
      return NextResponse.json<ApiResponse<ConnectionTestResult>>({
        success: false,
        error: 'Connection test timed out',
        data: {
          status: 'timeout',
          message: timeoutMessage,
          provider,
          testedAt: new Date().toISOString(),
          responseTime,
        },
      });
    }

    if (!testResult.valid) {
      const errorMessage = getDetailedErrorMessage(testResult.error || 'Unknown error', provider as AIProvider);
      // Save test result to database
      try {
        await saveTestResult(provider as AIProvider, 'error', errorMessage);
      } catch (e) {
        console.error('Failed to save test result:', e);
      }
      return NextResponse.json<ApiResponse<ConnectionTestResult>>({
        success: false,
        error: testResult.error || 'Connection test failed',
        data: {
          status: 'error',
          message: errorMessage,
          provider,
          testedAt: new Date().toISOString(),
          responseTime,
        },
      });
    }

    const successMessage = `Successfully connected to ${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'} API`;
    // Save test result to database
    try {
      await saveTestResult(provider as AIProvider, 'success', successMessage);
    } catch (e) {
      console.error('Failed to save test result:', e);
    }
    return NextResponse.json<ApiResponse<ConnectionTestResult>>({
      success: true,
      data: {
        status: 'success',
        message: successMessage,
        provider,
        testedAt: new Date().toISOString(),
        responseTime,
      },
    });
  } catch (error) {
    console.error('Error testing AI connection:', error);
    return NextResponse.json<ApiResponse<ConnectionTestResult>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test connection',
        data: {
          status: 'error',
          message: 'An unexpected error occurred while testing the connection',
          provider: 'unknown' as AIProvider,
          testedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Get a detailed, user-friendly error message based on the error
 */
function getDetailedErrorMessage(error: string, provider: AIProvider): string {
  const providerName = provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
  const lowerError = error.toLowerCase();

  // Authentication errors
  if (lowerError.includes('401') || lowerError.includes('invalid_api_key') ||
      lowerError.includes('incorrect api key') || lowerError.includes('authentication')) {
    return `Invalid API key. Please check that you've entered the correct ${providerName} API key.`;
  }

  // Permission errors
  if (lowerError.includes('403') || lowerError.includes('permission') || lowerError.includes('forbidden')) {
    return `Permission denied. Your ${providerName} API key may not have the required permissions.`;
  }

  // Rate limiting
  if (lowerError.includes('429') || lowerError.includes('rate_limit') || lowerError.includes('too many requests')) {
    return `Rate limit reached. Your ${providerName} API key is valid but has exceeded its rate limit. Please try again later.`;
  }

  // Network errors
  if (lowerError.includes('network') || lowerError.includes('enotfound') ||
      lowerError.includes('econnrefused') || lowerError.includes('fetch failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Quota/billing errors
  if (lowerError.includes('quota') || lowerError.includes('billing') || lowerError.includes('insufficient')) {
    return `Account issue. Your ${providerName} account may have billing or quota issues. Please check your account status.`;
  }

  // Expired key
  if (lowerError.includes('expired') || lowerError.includes('revoked')) {
    return `Your ${providerName} API key appears to be expired or revoked. Please generate a new key.`;
  }

  // Default message with the original error
  return `Connection failed: ${error}`;
}
