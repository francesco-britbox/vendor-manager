/**
 * AI Configuration Service
 *
 * Manages AI API keys with encryption and provides secure access to AI services.
 * Supports both Anthropic (Claude) and OpenAI (GPT) providers.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { AIProvider, AIApiConfig, AISettings, AIUsageLog } from '@/types';

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

/**
 * Get encryption key from environment or generate one
 * In production, AI_ENCRYPTION_KEY should be set as an environment variable
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.AI_ENCRYPTION_KEY;
  if (envKey) {
    // Use SHA-256 hash of the env key to ensure 32 bytes
    return createHash('sha256').update(envKey).digest();
  }
  // Fallback to a key derived from DATABASE_URL for development
  // WARNING: Not ideal for production!
  const fallbackKey = process.env.DATABASE_URL || 'default-insecure-key';
  return createHash('sha256').update(fallbackKey).digest();
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt an API key
 */
export function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an API key
 */
export function decryptApiKey(encryptedKey: string): string {
  const key = getEncryptionKey();
  const parts = encryptedKey.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format');
  }

  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask an API key for display (show only last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return '••••••••';
  }
  return '••••••••' + apiKey.slice(-4);
}

// ============================================================================
// AI CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Get the user's preferred default AI provider
 */
export async function getDefaultProvider(): Promise<AIProvider | null> {
  const defaultProviderRecord = await prisma.aIDefaultProvider.findFirst();
  if (defaultProviderRecord) {
    return defaultProviderRecord.provider as AIProvider;
  }
  return null;
}

/**
 * Set the user's preferred default AI provider
 */
export async function setDefaultProvider(provider: AIProvider): Promise<void> {
  // Validate that the provider has a configured API key
  const config = await prisma.aIApiConfig.findUnique({
    where: { provider },
  });

  if (!config || !config.encryptedApiKey) {
    throw new Error(`Cannot set ${provider} as default: No API key configured`);
  }

  if (!config.isEnabled) {
    throw new Error(`Cannot set ${provider} as default: Provider is disabled`);
  }

  // Upsert the default provider (there should only be one record)
  const existing = await prisma.aIDefaultProvider.findFirst();

  if (existing) {
    await prisma.aIDefaultProvider.update({
      where: { id: existing.id },
      data: { provider },
    });
  } else {
    await prisma.aIDefaultProvider.create({
      data: { provider },
    });
  }
}

/**
 * Get all AI configurations
 */
export async function getAIConfigs(): Promise<AISettings> {
  const configs = await prisma.aIApiConfig.findMany();

  const anthropic = configs.find(c => c.provider === 'anthropic');
  const openai = configs.find(c => c.provider === 'openai');

  // Get user's preferred default provider
  let defaultProvider = await getDefaultProvider();

  // Validate that the default provider is still valid (has key and is enabled)
  if (defaultProvider) {
    const defaultConfig = defaultProvider === 'anthropic' ? anthropic : openai;
    if (!defaultConfig?.encryptedApiKey || !defaultConfig?.isEnabled) {
      defaultProvider = null;
    }
  }

  // If no valid default is set, auto-select based on what's available
  if (!defaultProvider) {
    if (anthropic?.isEnabled && anthropic?.encryptedApiKey) {
      defaultProvider = 'anthropic';
    } else if (openai?.isEnabled && openai?.encryptedApiKey) {
      defaultProvider = 'openai';
    }
  }

  return {
    anthropic: anthropic ? transformConfig(anthropic) : null,
    openai: openai ? transformConfig(openai) : null,
    defaultProvider,
  };
}

/**
 * Get a single AI configuration by provider
 */
export async function getAIConfig(provider: AIProvider): Promise<AIApiConfig | null> {
  const config = await prisma.aIApiConfig.findUnique({
    where: { provider },
  });

  return config ? transformConfig(config) : null;
}

/**
 * Get decrypted API key for a provider (internal use only)
 */
export async function getDecryptedApiKey(provider: AIProvider): Promise<string | null> {
  const config = await prisma.aIApiConfig.findUnique({
    where: { provider },
  });

  if (!config || !config.isEnabled) {
    return null;
  }

  try {
    return decryptApiKey(config.encryptedApiKey);
  } catch (error) {
    console.error(`Failed to decrypt API key for ${provider}:`, error);
    return null;
  }
}

/**
 * Save or update an AI configuration
 */
export async function saveAIConfig(
  provider: AIProvider,
  apiKey: string,
  options: {
    defaultModel?: string;
    isEnabled?: boolean;
  } = {}
): Promise<AIApiConfig> {
  const encryptedApiKey = encryptApiKey(apiKey);

  const config = await prisma.aIApiConfig.upsert({
    where: { provider },
    create: {
      provider,
      encryptedApiKey,
      defaultModel: options.defaultModel,
      isEnabled: options.isEnabled ?? true,
    },
    update: {
      encryptedApiKey,
      defaultModel: options.defaultModel,
      isEnabled: options.isEnabled ?? true,
    },
  });

  return transformConfig(config);
}

/**
 * Update AI configuration settings (without changing the key)
 */
export async function updateAIConfigSettings(
  provider: AIProvider,
  settings: {
    defaultModel?: string;
    isEnabled?: boolean;
  }
): Promise<AIApiConfig | null> {
  const existing = await prisma.aIApiConfig.findUnique({
    where: { provider },
  });

  if (!existing) {
    return null;
  }

  const config = await prisma.aIApiConfig.update({
    where: { provider },
    data: {
      ...(settings.defaultModel !== undefined && { defaultModel: settings.defaultModel }),
      ...(settings.isEnabled !== undefined && { isEnabled: settings.isEnabled }),
    },
  });

  return transformConfig(config);
}

/**
 * Delete an AI configuration
 */
export async function deleteAIConfig(provider: AIProvider): Promise<boolean> {
  try {
    await prisma.aIApiConfig.delete({
      where: { provider },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate API key format before making API calls
 */
export function validateApiKeyFormat(
  provider: AIProvider,
  apiKey: string
): { valid: boolean; error?: string } {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  const trimmedKey = apiKey.trim();

  if (trimmedKey.length < 10) {
    return { valid: false, error: 'API key is too short' };
  }

  if (provider === 'anthropic') {
    // Anthropic keys typically start with 'sk-ant-' and are fairly long
    if (!trimmedKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'Anthropic API keys should start with "sk-ant-"' };
    }
    if (trimmedKey.length < 50) {
      return { valid: false, error: 'Anthropic API key appears to be incomplete' };
    }
  } else if (provider === 'openai') {
    // OpenAI keys typically start with 'sk-' (but not 'sk-ant-')
    if (!trimmedKey.startsWith('sk-')) {
      return { valid: false, error: 'OpenAI API keys should start with "sk-"' };
    }
    if (trimmedKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'This appears to be an Anthropic API key, not an OpenAI key' };
    }
    if (trimmedKey.length < 40) {
      return { valid: false, error: 'OpenAI API key appears to be incomplete' };
    }
  }

  return { valid: true };
}

/**
 * Test if an API key is valid by making a simple API call
 */
export async function testApiKey(
  provider: AIProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === 'anthropic') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });

      // Make a minimal API call to test the key
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return { valid: true };
    } else {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });

      // Make a minimal API call to test the key
      await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return { valid: true };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for common authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key') ||
        errorMessage.includes('Incorrect API key') || errorMessage.includes('authentication')) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Rate limiting is ok - the key is valid
    if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
      return { valid: true };
    }

    return { valid: false, error: errorMessage };
  }
}

/**
 * Test API key with timeout handling
 */
export async function testApiKeyWithTimeout(
  provider: AIProvider,
  apiKey: string,
  timeoutMs: number = 30000
): Promise<{ valid: boolean; error?: string; timeout?: boolean }> {
  return new Promise((resolve) => {
    let isResolved = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve({ valid: false, error: 'Connection test timed out', timeout: true });
      }
    }, timeoutMs);

    // Run the actual test
    testApiKey(provider, apiKey)
      .then((result) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          resolve({ ...result, timeout: false });
        }
      })
      .catch((error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          resolve({
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timeout: false,
          });
        }
      });
  });
}

/**
 * Increment usage count for a provider
 */
export async function incrementUsageCount(provider: AIProvider): Promise<void> {
  await prisma.aIApiConfig.update({
    where: { provider },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Save connection test result to database
 */
export async function saveTestResult(
  provider: AIProvider,
  status: 'success' | 'error' | 'timeout',
  message: string
): Promise<void> {
  await prisma.aIApiConfig.update({
    where: { provider },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: status,
      lastTestMessage: message,
    },
  });
}

// ============================================================================
// AI USAGE LOGGING
// ============================================================================

/**
 * Log an AI API usage
 */
export async function logAIUsage(data: {
  provider: AIProvider;
  model: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  processingTime?: number;
  status?: string;
  errorMessage?: string;
  documentId?: string;
  contractId?: string;
}): Promise<void> {
  const totalTokens = (data.inputTokens || 0) + (data.outputTokens || 0);

  await prisma.aIUsageLog.create({
    data: {
      provider: data.provider,
      model: data.model,
      operation: data.operation,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: totalTokens > 0 ? totalTokens : undefined,
      estimatedCost: data.estimatedCost,
      processingTime: data.processingTime,
      status: data.status || 'success',
      errorMessage: data.errorMessage,
      documentId: data.documentId,
      contractId: data.contractId,
    },
  });

  // Also increment the usage count on the config
  await incrementUsageCount(data.provider);
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(options?: {
  provider?: AIProvider;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<{
  logs: AIUsageLog[];
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
}> {
  const where: {
    provider?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (options?.provider) {
    where.provider = options.provider;
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const logs = await prisma.aIUsageLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });

  // Calculate aggregates
  let totalCalls = 0;
  let totalTokens = 0;
  let totalCost = 0;
  const byProvider: Record<string, { calls: number; tokens: number; cost: number }> = {};

  for (const log of logs) {
    totalCalls++;
    totalTokens += log.totalTokens || 0;
    totalCost += log.estimatedCost?.toNumber() || 0;

    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { calls: 0, tokens: 0, cost: 0 };
    }
    byProvider[log.provider].calls++;
    byProvider[log.provider].tokens += log.totalTokens || 0;
    byProvider[log.provider].cost += log.estimatedCost?.toNumber() || 0;
  }

  return {
    logs: logs.map(transformUsageLog),
    totalCalls,
    totalTokens,
    totalCost,
    byProvider,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database config to API type
 */
function transformConfig(dbConfig: {
  id: string;
  provider: string;
  encryptedApiKey: string;
  isEnabled: boolean;
  defaultModel: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AIApiConfig {
  // Get masked version of API key for display
  let maskedKey: string | undefined;
  if (dbConfig.encryptedApiKey) {
    try {
      const decryptedKey = decryptApiKey(dbConfig.encryptedApiKey);
      maskedKey = maskApiKey(decryptedKey);
    } catch {
      maskedKey = '••••••••';
    }
  }

  return {
    id: dbConfig.id,
    provider: dbConfig.provider as AIProvider,
    isEnabled: dbConfig.isEnabled,
    defaultModel: dbConfig.defaultModel || undefined,
    usageCount: dbConfig.usageCount,
    lastUsedAt: dbConfig.lastUsedAt || undefined,
    hasApiKey: !!dbConfig.encryptedApiKey,
    maskedApiKey: maskedKey,
    lastTestedAt: dbConfig.lastTestedAt || undefined,
    lastTestStatus: (dbConfig.lastTestStatus as 'success' | 'error' | 'timeout') || undefined,
    lastTestMessage: dbConfig.lastTestMessage || undefined,
    createdAt: dbConfig.createdAt,
    updatedAt: dbConfig.updatedAt,
  };
}

/**
 * Transform database usage log to API type
 */
function transformUsageLog(dbLog: {
  id: string;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: { toNumber: () => number } | null;
  processingTime: number | null;
  status: string;
  errorMessage: string | null;
  documentId: string | null;
  contractId: string | null;
  createdAt: Date;
}): AIUsageLog {
  return {
    id: dbLog.id,
    provider: dbLog.provider,
    model: dbLog.model,
    operation: dbLog.operation,
    inputTokens: dbLog.inputTokens || undefined,
    outputTokens: dbLog.outputTokens || undefined,
    totalTokens: dbLog.totalTokens || undefined,
    estimatedCost: dbLog.estimatedCost?.toNumber() || undefined,
    processingTime: dbLog.processingTime || undefined,
    status: dbLog.status,
    errorMessage: dbLog.errorMessage || undefined,
    documentId: dbLog.documentId || undefined,
    contractId: dbLog.contractId || undefined,
    createdAt: dbLog.createdAt,
  };
}

/**
 * Get the best available AI provider (respects user's default preference)
 */
export async function getAvailableProvider(): Promise<AIProvider | null> {
  const configs = await getAIConfigs();

  // First, respect the user's default provider choice if it's valid
  if (configs.defaultProvider) {
    const defaultConfig = configs.defaultProvider === 'anthropic' ? configs.anthropic : configs.openai;
    if (defaultConfig?.isEnabled && defaultConfig.hasApiKey) {
      return configs.defaultProvider;
    }
  }

  // Fall back to any available provider
  if (configs.anthropic?.isEnabled && configs.anthropic.hasApiKey) {
    return 'anthropic';
  }

  if (configs.openai?.isEnabled && configs.openai.hasApiKey) {
    return 'openai';
  }

  // Fall back to environment variables
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }

  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }

  return null;
}

/**
 * Check if AI is configured (either from database or environment)
 */
export async function isAIAvailable(): Promise<boolean> {
  return (await getAvailableProvider()) !== null;
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: AIProvider): string[] {
  if (provider === 'openai') {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }
  return ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
}

/**
 * Estimate cost for AI API call
 * Prices are approximate and should be updated periodically
 */
export function estimateCost(
  provider: AIProvider,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Prices per 1000 tokens (approximate, as of 2024)
  const prices: Record<string, { input: number; output: number }> = {
    // OpenAI
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    // Anthropic
    'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  };

  const modelPrices = prices[model];
  if (!modelPrices) {
    // Default prices if model not found
    return (inputTokens / 1000) * 0.01 + (outputTokens / 1000) * 0.03;
  }

  return (inputTokens / 1000) * modelPrices.input + (outputTokens / 1000) * modelPrices.output;
}
