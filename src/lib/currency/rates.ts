/**
 * Exchange Rate Service
 *
 * Manages exchange rates with timestamp tracking for currency conversion.
 * Provides CRUD operations for exchange rates stored in the database.
 */

import { prisma } from '@/lib/prisma';
import { isValidCurrencyCode } from './currencies';
import type { ExchangeRate } from '@/types';

/**
 * Exchange rate input for creating/updating rates
 */
export interface ExchangeRateInput {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

/**
 * Exchange rate with additional metadata
 */
export interface ExchangeRateWithMeta extends ExchangeRate {
  isStale: boolean;
  staleDurationHours: number;
}

/**
 * Configuration for exchange rate staleness detection
 */
export const EXCHANGE_RATE_CONFIG = {
  /** Number of hours after which an exchange rate is considered stale */
  staleThresholdHours: 24,
  /** Maximum decimal places for exchange rates */
  maxDecimalPlaces: 6,
};

/**
 * Validates exchange rate input
 */
export function validateExchangeRateInput(input: ExchangeRateInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.fromCurrency) {
    errors.push('From currency is required');
  } else if (!isValidCurrencyCode(input.fromCurrency)) {
    errors.push(`Invalid from currency code: ${input.fromCurrency}`);
  }

  if (!input.toCurrency) {
    errors.push('To currency is required');
  } else if (!isValidCurrencyCode(input.toCurrency)) {
    errors.push(`Invalid to currency code: ${input.toCurrency}`);
  }

  if (input.fromCurrency && input.toCurrency && input.fromCurrency === input.toCurrency) {
    errors.push('From and to currencies must be different');
  }

  if (typeof input.rate !== 'number' || isNaN(input.rate)) {
    errors.push('Rate must be a valid number');
  } else if (input.rate <= 0) {
    errors.push('Rate must be greater than zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the staleness of an exchange rate
 */
function calculateStaleness(lastUpdated: Date): { isStale: boolean; staleDurationHours: number } {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return {
    isStale: diffHours > EXCHANGE_RATE_CONFIG.staleThresholdHours,
    staleDurationHours: Math.round(diffHours * 100) / 100,
  };
}

/**
 * Transform database exchange rate to API type with metadata
 */
function transformExchangeRate(dbRate: {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: { toNumber(): number } | number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}): ExchangeRateWithMeta {
  const rateValue = typeof dbRate.rate === 'number' ? dbRate.rate : dbRate.rate.toNumber();
  const staleness = calculateStaleness(dbRate.lastUpdated);

  return {
    id: dbRate.id,
    fromCurrency: dbRate.fromCurrency,
    toCurrency: dbRate.toCurrency,
    rate: rateValue,
    lastUpdated: dbRate.lastUpdated,
    createdAt: dbRate.createdAt,
    updatedAt: dbRate.updatedAt,
    ...staleness,
  };
}

/**
 * Get all exchange rates from the database
 */
export async function getAllExchangeRates(): Promise<ExchangeRateWithMeta[]> {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }],
  });

  return rates.map(transformExchangeRate);
}

/**
 * Get exchange rate for a specific currency pair
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateWithMeta | null> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Same currency returns 1:1 rate
  if (from === to) {
    const now = new Date();
    return {
      id: `identity-${from}`,
      fromCurrency: from,
      toCurrency: to,
      rate: 1,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
      isStale: false,
      staleDurationHours: 0,
    };
  }

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
  });

  return rate ? transformExchangeRate(rate) : null;
}

/**
 * Get all exchange rates from a specific currency
 */
export async function getExchangeRatesFromCurrency(
  fromCurrency: string
): Promise<ExchangeRateWithMeta[]> {
  const rates = await prisma.exchangeRate.findMany({
    where: { fromCurrency: fromCurrency.toUpperCase() },
    orderBy: { toCurrency: 'asc' },
  });

  return rates.map(transformExchangeRate);
}

/**
 * Get all exchange rates to a specific currency
 */
export async function getExchangeRatesToCurrency(
  toCurrency: string
): Promise<ExchangeRateWithMeta[]> {
  const rates = await prisma.exchangeRate.findMany({
    where: { toCurrency: toCurrency.toUpperCase() },
    orderBy: { fromCurrency: 'asc' },
  });

  return rates.map(transformExchangeRate);
}

/**
 * Create or update an exchange rate
 */
export async function upsertExchangeRate(input: ExchangeRateInput): Promise<ExchangeRateWithMeta> {
  const validation = validateExchangeRateInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid exchange rate: ${validation.errors.join(', ')}`);
  }

  const from = input.fromCurrency.toUpperCase();
  const to = input.toCurrency.toUpperCase();
  const now = new Date();

  const rate = await prisma.exchangeRate.upsert({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
    create: {
      fromCurrency: from,
      toCurrency: to,
      rate: input.rate,
      lastUpdated: now,
    },
    update: {
      rate: input.rate,
      lastUpdated: now,
    },
  });

  return transformExchangeRate(rate);
}

/**
 * Create or update multiple exchange rates in a batch
 */
export async function upsertExchangeRates(
  inputs: ExchangeRateInput[]
): Promise<ExchangeRateWithMeta[]> {
  const results: ExchangeRateWithMeta[] = [];

  // Use transaction for atomic updates
  await prisma.$transaction(async tx => {
    for (const input of inputs) {
      const validation = validateExchangeRateInput(input);
      if (!validation.valid) {
        throw new Error(
          `Invalid exchange rate (${input.fromCurrency} -> ${input.toCurrency}): ${validation.errors.join(', ')}`
        );
      }

      const from = input.fromCurrency.toUpperCase();
      const to = input.toCurrency.toUpperCase();
      const now = new Date();

      const rate = await tx.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
        },
        create: {
          fromCurrency: from,
          toCurrency: to,
          rate: input.rate,
          lastUpdated: now,
        },
        update: {
          rate: input.rate,
          lastUpdated: now,
        },
      });

      results.push(transformExchangeRate(rate));
    }
  });

  return results;
}

/**
 * Delete an exchange rate
 */
export async function deleteExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  try {
    await prisma.exchangeRate.delete({
      where: {
        fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete an exchange rate by ID
 */
export async function deleteExchangeRateById(id: string): Promise<boolean> {
  try {
    await prisma.exchangeRate.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all stale exchange rates (rates that need updating)
 */
export async function getStaleExchangeRates(): Promise<ExchangeRateWithMeta[]> {
  const staleThreshold = new Date();
  staleThreshold.setHours(staleThreshold.getHours() - EXCHANGE_RATE_CONFIG.staleThresholdHours);

  const rates = await prisma.exchangeRate.findMany({
    where: {
      lastUpdated: { lt: staleThreshold },
    },
    orderBy: { lastUpdated: 'asc' },
  });

  return rates.map(transformExchangeRate);
}

/**
 * Get exchange rate statistics
 */
export async function getExchangeRateStats(): Promise<{
  totalRates: number;
  staleRates: number;
  lastUpdateTime: Date | null;
  uniqueBaseCurrencies: number;
  uniqueTargetCurrencies: number;
}> {
  const staleThreshold = new Date();
  staleThreshold.setHours(staleThreshold.getHours() - EXCHANGE_RATE_CONFIG.staleThresholdHours);

  const [totalRates, staleRates, latestRate, baseCurrencies, targetCurrencies] = await Promise.all([
    prisma.exchangeRate.count(),
    prisma.exchangeRate.count({
      where: { lastUpdated: { lt: staleThreshold } },
    }),
    prisma.exchangeRate.findFirst({
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true },
    }),
    prisma.exchangeRate.findMany({
      distinct: ['fromCurrency'],
      select: { fromCurrency: true },
    }),
    prisma.exchangeRate.findMany({
      distinct: ['toCurrency'],
      select: { toCurrency: true },
    }),
  ]);

  return {
    totalRates,
    staleRates,
    lastUpdateTime: latestRate?.lastUpdated ?? null,
    uniqueBaseCurrencies: baseCurrencies.length,
    uniqueTargetCurrencies: targetCurrencies.length,
  };
}
