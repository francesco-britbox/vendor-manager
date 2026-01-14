/**
 * Settings Service
 *
 * Provides functions for managing system settings in the database.
 * Settings are organized by category and stored as key-value pairs.
 */

import { prisma } from '@/lib/prisma';
import type {
  SettingsCategory,
  CurrencySettings,
  FormatSettings,
  DashboardSettings,
  IntegrationSettings,
  SystemSettings,
  RoundingMode,
  DateFormat,
  NumberFormat,
} from '@/types';

/**
 * Get all settings for a specific category
 */
export async function getSettingsByCategory<T>(
  category: SettingsCategory,
  defaults: T
): Promise<T> {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: { category },
    });

    if (settings.length === 0) {
      return defaults;
    }

    // Build the settings object from stored key-value pairs
    const result = { ...defaults } as T;
    for (const setting of settings) {
      try {
        (result as Record<string, unknown>)[setting.key] = JSON.parse(setting.value);
      } catch {
        // If JSON parsing fails, use the raw string value
        (result as Record<string, unknown>)[setting.key] = setting.value;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error fetching ${category} settings:`, error);
    return defaults;
  }
}

/**
 * Get currency settings
 */
export async function getCurrencySettings(): Promise<CurrencySettings> {
  const { DEFAULT_CURRENCY_SETTINGS } = await import('@/types');
  return getSettingsByCategory<CurrencySettings>('currency', DEFAULT_CURRENCY_SETTINGS);
}

/**
 * Get format settings
 */
export async function getFormatSettings(): Promise<FormatSettings> {
  const { DEFAULT_FORMAT_SETTINGS } = await import('@/types');
  return getSettingsByCategory<FormatSettings>('formats', DEFAULT_FORMAT_SETTINGS);
}

/**
 * Get dashboard settings
 */
export async function getDashboardSettings(): Promise<DashboardSettings> {
  const { DEFAULT_DASHBOARD_SETTINGS } = await import('@/types');
  return getSettingsByCategory<DashboardSettings>('dashboard', DEFAULT_DASHBOARD_SETTINGS);
}

/**
 * Get integration settings
 */
export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  const { DEFAULT_INTEGRATION_SETTINGS } = await import('@/types');
  return getSettingsByCategory<IntegrationSettings>('integrations', DEFAULT_INTEGRATION_SETTINGS);
}

/**
 * Get all system settings
 */
export async function getAllSettings(): Promise<SystemSettings> {
  const [currency, formats, dashboard, integrations] = await Promise.all([
    getCurrencySettings(),
    getFormatSettings(),
    getDashboardSettings(),
    getIntegrationSettings(),
  ]);

  return {
    currency,
    formats,
    dashboard,
    integrations,
  };
}

/**
 * Update a single setting
 */
export async function updateSetting(
  category: SettingsCategory,
  key: string,
  value: unknown,
  userId?: string,
  description?: string
): Promise<void> {
  await prisma.systemSettings.upsert({
    where: {
      category_key: { category, key },
    },
    update: {
      value: JSON.stringify(value),
      updatedBy: userId,
      description: description || undefined,
    },
    create: {
      category,
      key,
      value: JSON.stringify(value),
      updatedBy: userId,
      description,
    },
  });
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(
  category: SettingsCategory,
  settings: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const updates = Object.entries(settings).map(([key, value]) =>
    prisma.systemSettings.upsert({
      where: {
        category_key: { category, key },
      },
      update: {
        value: JSON.stringify(value),
        updatedBy: userId,
      },
      create: {
        category,
        key,
        value: JSON.stringify(value),
        updatedBy: userId,
      },
    })
  );

  await prisma.$transaction(updates);
}

/**
 * Update currency settings
 */
export async function updateCurrencySettings(
  settings: Partial<CurrencySettings>,
  userId?: string
): Promise<CurrencySettings> {
  await updateSettings('currency', settings, userId);
  return getCurrencySettings();
}

/**
 * Update format settings
 */
export async function updateFormatSettings(
  settings: Partial<FormatSettings>,
  userId?: string
): Promise<FormatSettings> {
  await updateSettings('formats', settings, userId);
  return getFormatSettings();
}

/**
 * Update dashboard settings
 */
export async function updateDashboardSettings(
  settings: Partial<DashboardSettings>,
  userId?: string
): Promise<DashboardSettings> {
  await updateSettings('dashboard', settings, userId);
  return getDashboardSettings();
}

/**
 * Update integration settings
 */
export async function updateIntegrationSettings(
  settings: Partial<IntegrationSettings>,
  userId?: string
): Promise<IntegrationSettings> {
  await updateSettings('integrations', settings, userId);
  return getIntegrationSettings();
}

/**
 * Reset settings to defaults for a category
 */
export async function resetCategorySettings(
  category: SettingsCategory
): Promise<void> {
  await prisma.systemSettings.deleteMany({
    where: { category },
  });
}

/**
 * Reset all settings to defaults
 */
export async function resetAllSettings(): Promise<void> {
  await prisma.systemSettings.deleteMany({});
}

// Validation helpers

const VALID_ROUNDING_MODES: RoundingMode[] = ['HALF_UP', 'HALF_DOWN', 'UP', 'DOWN', 'HALF_EVEN'];
const VALID_DATE_FORMATS: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const VALID_NUMBER_FORMATS: NumberFormat[] = ['en-US', 'en-GB', 'de-DE', 'fr-FR'];

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate currency settings
 */
export function validateCurrencySettings(settings: Partial<CurrencySettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (settings.defaultCurrency !== undefined) {
    if (typeof settings.defaultCurrency !== 'string' || settings.defaultCurrency.length !== 3) {
      errors.push({ field: 'defaultCurrency', message: 'Currency code must be a 3-letter code' });
    }
  }

  if (settings.displayDecimals !== undefined) {
    if (typeof settings.displayDecimals !== 'number' || settings.displayDecimals < 0 || settings.displayDecimals > 6) {
      errors.push({ field: 'displayDecimals', message: 'Display decimals must be between 0 and 6' });
    }
  }

  if (settings.roundingMode !== undefined) {
    if (!VALID_ROUNDING_MODES.includes(settings.roundingMode)) {
      errors.push({ field: 'roundingMode', message: `Rounding mode must be one of: ${VALID_ROUNDING_MODES.join(', ')}` });
    }
  }

  if (settings.symbolPosition !== undefined) {
    if (!['before', 'after'].includes(settings.symbolPosition)) {
      errors.push({ field: 'symbolPosition', message: 'Symbol position must be "before" or "after"' });
    }
  }

  return errors;
}

/**
 * Validate format settings
 */
export function validateFormatSettings(settings: Partial<FormatSettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (settings.dateFormat !== undefined) {
    if (!VALID_DATE_FORMATS.includes(settings.dateFormat)) {
      errors.push({ field: 'dateFormat', message: `Date format must be one of: ${VALID_DATE_FORMATS.join(', ')}` });
    }
  }

  if (settings.numberFormat !== undefined) {
    if (!VALID_NUMBER_FORMATS.includes(settings.numberFormat)) {
      errors.push({ field: 'numberFormat', message: `Number format must be one of: ${VALID_NUMBER_FORMATS.join(', ')}` });
    }
  }

  if (settings.weekStartsOn !== undefined) {
    if (![0, 1, 6].includes(settings.weekStartsOn)) {
      errors.push({ field: 'weekStartsOn', message: 'Week start must be 0 (Sunday), 1 (Monday), or 6 (Saturday)' });
    }
  }

  return errors;
}

/**
 * Validate dashboard settings
 */
export function validateDashboardSettings(settings: Partial<DashboardSettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (settings.defaultView !== undefined) {
    if (!['overview', 'detailed', 'compact'].includes(settings.defaultView)) {
      errors.push({ field: 'defaultView', message: 'Default view must be "overview", "detailed", or "compact"' });
    }
  }

  if (settings.activityItemsCount !== undefined) {
    if (typeof settings.activityItemsCount !== 'number' || settings.activityItemsCount < 1 || settings.activityItemsCount > 50) {
      errors.push({ field: 'activityItemsCount', message: 'Activity items count must be between 1 and 50' });
    }
  }

  if (settings.refreshInterval !== undefined) {
    if (typeof settings.refreshInterval !== 'number' || settings.refreshInterval < 0 || settings.refreshInterval > 3600) {
      errors.push({ field: 'refreshInterval', message: 'Refresh interval must be between 0 and 3600 seconds' });
    }
  }

  if (settings.expiringContractsDays !== undefined) {
    if (typeof settings.expiringContractsDays !== 'number' || settings.expiringContractsDays < 1 || settings.expiringContractsDays > 365) {
      errors.push({ field: 'expiringContractsDays', message: 'Expiring contracts days must be between 1 and 365' });
    }
  }

  return errors;
}

/**
 * Validate integration settings
 */
export function validateIntegrationSettings(settings: Partial<IntegrationSettings>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (settings.exchangeRateApi) {
    const api = settings.exchangeRateApi;

    if (api.provider !== undefined) {
      if (!['manual', 'openexchangerates', 'exchangerateapi'].includes(api.provider)) {
        errors.push({ field: 'exchangeRateApi.provider', message: 'Invalid exchange rate provider' });
      }
    }

    if (api.updateInterval !== undefined) {
      if (typeof api.updateInterval !== 'number' || api.updateInterval < 1 || api.updateInterval > 168) {
        errors.push({ field: 'exchangeRateApi.updateInterval', message: 'Update interval must be between 1 and 168 hours' });
      }
    }

    // Require API key if using external provider
    if (api.enabled && api.provider && api.provider !== 'manual' && !api.apiKey) {
      errors.push({ field: 'exchangeRateApi.apiKey', message: 'API key is required for external providers' });
    }
  }

  if (settings.notifications) {
    const notifications = settings.notifications;

    // Require Slack webhook URL if Slack is enabled
    if (notifications.slackEnabled && !notifications.slackWebhookUrl) {
      errors.push({ field: 'notifications.slackWebhookUrl', message: 'Slack webhook URL is required when Slack is enabled' });
    }

    // Validate Slack webhook URL format
    if (notifications.slackWebhookUrl) {
      try {
        const url = new URL(notifications.slackWebhookUrl);
        if (!url.hostname.includes('slack.com')) {
          errors.push({ field: 'notifications.slackWebhookUrl', message: 'Invalid Slack webhook URL' });
        }
      } catch {
        errors.push({ field: 'notifications.slackWebhookUrl', message: 'Invalid URL format' });
      }
    }
  }

  return errors;
}
