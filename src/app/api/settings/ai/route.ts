/**
 * AI Settings API
 *
 * GET /api/settings/ai - Get AI configurations (without exposing keys)
 * POST /api/settings/ai - Save a new AI configuration
 * PATCH /api/settings/ai - Set default provider
 * DELETE /api/settings/ai - Delete an AI configuration
 */

import { NextResponse } from 'next/server';
import {
  requireAdminPermission,
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  getAIConfigs,
  saveAIConfig,
  deleteAIConfig,
  testApiKey,
  getAvailableModels,
  setDefaultProvider,
} from '@/lib/ai-config';
import type { ApiResponse, AISettings, AIApiConfig, AIProvider } from '@/types';

/**
 * GET - Get all AI configurations
 */
export async function GET() {
  try {
    // View permission is enough to see if AI is configured
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const settings = await getAIConfigs();

    // Add available models for each provider
    const response = {
      ...settings,
      availableModels: {
        anthropic: getAvailableModels('anthropic'),
        openai: getAvailableModels('openai'),
      },
    };

    return NextResponse.json<ApiResponse<typeof response>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error getting AI settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI settings',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Save or update an AI configuration
 */
export async function POST(request: Request) {
  try {
    // Admin permission required to modify AI settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const { provider, apiKey, defaultModel, isEnabled, testKey } = body;

    // Validate provider
    if (!provider || !['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid provider. Must be "anthropic" or "openai".',
        },
        { status: 400 }
      );
    }

    // Validate API key
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid API key. Key must be at least 10 characters.',
        },
        { status: 400 }
      );
    }

    // Test the API key if requested
    if (testKey !== false) {
      const testResult = await testApiKey(provider as AIProvider, apiKey);
      if (!testResult.valid) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: testResult.error || 'API key validation failed',
          },
          { status: 400 }
        );
      }
    }

    // Save the configuration
    const config = await saveAIConfig(provider as AIProvider, apiKey, {
      defaultModel,
      isEnabled: isEnabled ?? true,
    });

    return NextResponse.json<ApiResponse<AIApiConfig>>({
      success: true,
      data: config,
      message: `${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'} API key saved successfully`,
    });
  } catch (error) {
    console.error('Error saving AI config:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save AI configuration',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Set default AI provider
 */
export async function PATCH(request: Request) {
  try {
    // Admin permission required to modify AI settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const { provider } = body;

    // Validate provider
    if (!provider || !['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid provider. Must be "anthropic" or "openai".',
        },
        { status: 400 }
      );
    }

    // Set the default provider (this validates that the provider has a key)
    await setDefaultProvider(provider as AIProvider);

    // Return updated settings
    const settings = await getAIConfigs();

    return NextResponse.json<ApiResponse<AISettings>>({
      success: true,
      data: settings,
      message: `${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'} set as default AI provider`,
    });
  } catch (error) {
    console.error('Error setting default AI provider:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default AI provider',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete an AI configuration
 */
export async function DELETE(request: Request) {
  try {
    // Admin permission required to delete AI settings
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    // Validate provider
    if (!provider || !['anthropic', 'openai'].includes(provider)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid provider. Must be "anthropic" or "openai".',
        },
        { status: 400 }
      );
    }

    const deleted = await deleteAIConfig(provider as AIProvider);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Configuration not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: `${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT)'} configuration deleted`,
    });
  } catch (error) {
    console.error('Error deleting AI config:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete AI configuration',
      },
      { status: 500 }
    );
  }
}
