/**
 * Real-Time Currency Conversion Service
 *
 * Uses Decimal.js for precise financial calculations to avoid
 * floating-point errors in currency conversion operations.
 */

import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { getCurrencySymbol, isValidCurrencyCode } from './currencies';

/**
 * Configure Decimal.js for financial calculations
 * - 20 significant digits for high precision
 * - ROUND_HALF_UP for standard financial rounding
 */
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Rounding modes for currency conversion
 */
export enum RoundingMode {
  /** Standard rounding (0.5 rounds up) */
  HALF_UP = 'HALF_UP',
  /** Round toward positive infinity */
  UP = 'UP',
  /** Round toward negative infinity (truncate) */
  DOWN = 'DOWN',
  /** Banker's rounding (round half to even) */
  HALF_EVEN = 'HALF_EVEN',
}

/**
 * Map our rounding modes to Decimal.js rounding modes
 */
const ROUNDING_MAP: Record<RoundingMode, Decimal.Rounding> = {
  [RoundingMode.HALF_UP]: Decimal.ROUND_HALF_UP,
  [RoundingMode.UP]: Decimal.ROUND_UP,
  [RoundingMode.DOWN]: Decimal.ROUND_DOWN,
  [RoundingMode.HALF_EVEN]: Decimal.ROUND_HALF_EVEN,
};

/**
 * Options for currency conversion
 */
export interface ConversionOptions {
  /** Number of decimal places in the result (default: 2) */
  decimalPlaces?: number;
  /** Rounding mode to use (default: HALF_UP) */
  roundingMode?: RoundingMode;
}

/**
 * Result of a currency conversion
 */
export interface ConversionResult {
  /** Original amount */
  originalAmount: string;
  /** Converted amount */
  convertedAmount: string;
  /** Source currency code */
  fromCurrency: string;
  /** Target currency code */
  toCurrency: string;
  /** Exchange rate used */
  exchangeRate: string;
  /** When the exchange rate was last updated */
  rateLastUpdated: Date;
  /** Formatted original amount with currency symbol */
  formattedOriginal: string;
  /** Formatted converted amount with currency symbol */
  formattedConverted: string;
}

/**
 * Error thrown when conversion cannot be performed
 */
export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_CURRENCY' | 'RATE_NOT_FOUND' | 'INVALID_AMOUNT'
  ) {
    super(message);
    this.name = 'ConversionError';
  }
}

/**
 * Validate that an amount is a valid number for conversion
 */
function validateAmount(amount: number | string): Decimal {
  try {
    const decimal = new Decimal(amount);
    if (!decimal.isFinite()) {
      throw new ConversionError('Amount must be a finite number', 'INVALID_AMOUNT');
    }
    return decimal;
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw new ConversionError('Invalid amount format', 'INVALID_AMOUNT');
  }
}

/**
 * Format an amount with currency symbol
 */
export function formatCurrency(
  amount: number | string | Decimal,
  currencyCode: string,
  decimalPlaces: number = 2
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const decimal = amount instanceof Decimal ? amount : new Decimal(amount);
  const formatted = decimal.toFixed(decimalPlaces);

  // Handle negative amounts
  if (decimal.isNegative()) {
    return `-${symbol}${formatted.slice(1)}`;
  }
  return `${symbol}${formatted}`;
}

/**
 * Convert an amount from one currency to another using Decimal.js
 * for precise calculations.
 *
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code (ISO 4217)
 * @param toCurrency - Target currency code (ISO 4217)
 * @param options - Conversion options (decimal places, rounding)
 * @returns ConversionResult with original and converted amounts
 * @throws ConversionError if conversion cannot be performed
 *
 * @example
 * ```typescript
 * const result = await convertCurrency(100, 'USD', 'EUR');
 * console.log(result.convertedAmount); // "92.50"
 * console.log(result.formattedConverted); // "€92.50"
 * ```
 */
export async function convertCurrency(
  amount: number | string,
  fromCurrency: string,
  toCurrency: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const { decimalPlaces = 2, roundingMode = RoundingMode.HALF_UP } = options;

  // Normalize currency codes
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // Validate currencies
  if (!isValidCurrencyCode(from)) {
    throw new ConversionError(`Invalid source currency: ${from}`, 'INVALID_CURRENCY');
  }
  if (!isValidCurrencyCode(to)) {
    throw new ConversionError(`Invalid target currency: ${to}`, 'INVALID_CURRENCY');
  }

  // Validate amount
  const decimalAmount = validateAmount(amount);

  // Same currency - no conversion needed
  if (from === to) {
    const now = new Date();
    const rounded = decimalAmount.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[roundingMode]);
    return {
      originalAmount: decimalAmount.toString(),
      convertedAmount: rounded.toString(),
      fromCurrency: from,
      toCurrency: to,
      exchangeRate: '1',
      rateLastUpdated: now,
      formattedOriginal: formatCurrency(decimalAmount, from, decimalPlaces),
      formattedConverted: formatCurrency(rounded, to, decimalPlaces),
    };
  }

  // Get exchange rate from database
  const rateRecord = await prisma.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
  });

  if (!rateRecord) {
    throw new ConversionError(
      `Exchange rate not found for ${from} to ${to}`,
      'RATE_NOT_FOUND'
    );
  }

  // Convert using Decimal.js for precision
  const rate = new Decimal(rateRecord.rate.toString());
  const converted = decimalAmount.times(rate);
  const rounded = converted.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[roundingMode]);

  return {
    originalAmount: decimalAmount.toString(),
    convertedAmount: rounded.toString(),
    fromCurrency: from,
    toCurrency: to,
    exchangeRate: rate.toString(),
    rateLastUpdated: rateRecord.lastUpdated,
    formattedOriginal: formatCurrency(decimalAmount, from, decimalPlaces),
    formattedConverted: formatCurrency(rounded, to, decimalPlaces),
  };
}

/**
 * Convert an amount using an inverse rate lookup.
 * If direct rate A->B is not found, tries to use B->A and invert it.
 *
 * @example
 * ```typescript
 * // If only EUR->USD exists but you need USD->EUR
 * const result = await convertCurrencyWithFallback(100, 'USD', 'EUR');
 * ```
 */
export async function convertCurrencyWithFallback(
  amount: number | string,
  fromCurrency: string,
  toCurrency: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const { decimalPlaces = 2, roundingMode = RoundingMode.HALF_UP } = options;

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  // First try direct conversion
  try {
    return await convertCurrency(amount, from, to, options);
  } catch (error) {
    if (!(error instanceof ConversionError) || error.code !== 'RATE_NOT_FOUND') {
      throw error;
    }
  }

  // Try inverse rate
  const inverseRecord = await prisma.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: to, toCurrency: from },
    },
  });

  if (!inverseRecord) {
    throw new ConversionError(
      `Exchange rate not found for ${from} to ${to} (also checked inverse)`,
      'RATE_NOT_FOUND'
    );
  }

  // Calculate inverse rate using Decimal.js for precision
  const inverseRate = new Decimal(inverseRecord.rate.toString());
  const rate = new Decimal(1).dividedBy(inverseRate);
  const decimalAmount = validateAmount(amount);
  const converted = decimalAmount.times(rate);
  const rounded = converted.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[roundingMode]);

  return {
    originalAmount: decimalAmount.toString(),
    convertedAmount: rounded.toString(),
    fromCurrency: from,
    toCurrency: to,
    exchangeRate: rate.toString(),
    rateLastUpdated: inverseRecord.lastUpdated,
    formattedOriginal: formatCurrency(decimalAmount, from, decimalPlaces),
    formattedConverted: formatCurrency(rounded, to, decimalPlaces),
  };
}

/**
 * Batch convert multiple amounts to a target currency
 *
 * @example
 * ```typescript
 * const results = await batchConvert(
 *   [
 *     { amount: 100, currency: 'USD' },
 *     { amount: 200, currency: 'EUR' },
 *   ],
 *   'GBP'
 * );
 * ```
 */
export async function batchConvert(
  items: Array<{ amount: number | string; currency: string }>,
  targetCurrency: string,
  options: ConversionOptions = {}
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];

  for (const item of items) {
    const result = await convertCurrencyWithFallback(
      item.amount,
      item.currency,
      targetCurrency,
      options
    );
    results.push(result);
  }

  return results;
}

/**
 * Calculate the total of amounts in different currencies,
 * converted to a target currency.
 *
 * @example
 * ```typescript
 * const total = await calculateTotal(
 *   [
 *     { amount: 100, currency: 'USD' },
 *     { amount: 200, currency: 'EUR' },
 *   ],
 *   'GBP'
 * );
 * console.log(total.totalAmount); // "280.50"
 * ```
 */
export async function calculateTotal(
  items: Array<{ amount: number | string; currency: string }>,
  targetCurrency: string,
  options: ConversionOptions = {}
): Promise<{
  totalAmount: string;
  formattedTotal: string;
  targetCurrency: string;
  conversions: ConversionResult[];
}> {
  const { decimalPlaces = 2, roundingMode = RoundingMode.HALF_UP } = options;
  const conversions = await batchConvert(items, targetCurrency, options);

  let total = new Decimal(0);
  for (const conversion of conversions) {
    total = total.plus(new Decimal(conversion.convertedAmount));
  }

  const rounded = total.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[roundingMode]);

  return {
    totalAmount: rounded.toString(),
    formattedTotal: formatCurrency(rounded, targetCurrency, decimalPlaces),
    targetCurrency,
    conversions,
  };
}

/**
 * Pure calculation functions using Decimal.js
 * These do not require database access and can be used for client-side calculations
 * when the rate is already known.
 */
export const DecimalCalculations = {
  /**
   * Convert using a known exchange rate
   */
  convert(
    amount: number | string,
    rate: number | string,
    decimalPlaces: number = 2,
    roundingMode: RoundingMode = RoundingMode.HALF_UP
  ): string {
    const decimalAmount = new Decimal(amount);
    const decimalRate = new Decimal(rate);
    const result = decimalAmount.times(decimalRate);
    return result.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[roundingMode]).toString();
  },

  /**
   * Calculate inverse rate
   */
  inverseRate(rate: number | string, decimalPlaces: number = 6): string {
    const decimalRate = new Decimal(rate);
    const inverse = new Decimal(1).dividedBy(decimalRate);
    return inverse.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[RoundingMode.HALF_UP]).toString();
  },

  /**
   * Add two monetary amounts precisely
   */
  add(a: number | string, b: number | string, decimalPlaces: number = 2): string {
    const result = new Decimal(a).plus(new Decimal(b));
    return result.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[RoundingMode.HALF_UP]).toString();
  },

  /**
   * Subtract two monetary amounts precisely
   */
  subtract(a: number | string, b: number | string, decimalPlaces: number = 2): string {
    const result = new Decimal(a).minus(new Decimal(b));
    return result.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[RoundingMode.HALF_UP]).toString();
  },

  /**
   * Multiply amount by factor precisely
   */
  multiply(amount: number | string, factor: number | string, decimalPlaces: number = 2): string {
    const result = new Decimal(amount).times(new Decimal(factor));
    return result.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[RoundingMode.HALF_UP]).toString();
  },

  /**
   * Divide amount by divisor precisely
   */
  divide(amount: number | string, divisor: number | string, decimalPlaces: number = 2): string {
    const result = new Decimal(amount).dividedBy(new Decimal(divisor));
    return result.toDecimalPlaces(decimalPlaces, ROUNDING_MAP[RoundingMode.HALF_UP]).toString();
  },

  /**
   * Compare two amounts
   * Returns: -1 if a < b, 0 if a === b, 1 if a > b
   */
  compare(a: number | string, b: number | string): -1 | 0 | 1 {
    const result = new Decimal(a).comparedTo(new Decimal(b));
    return result as -1 | 0 | 1;
  },

  /**
   * Check if two amounts are equal (within precision)
   */
  equals(a: number | string, b: number | string, decimalPlaces: number = 2): boolean {
    const decimalA = new Decimal(a).toDecimalPlaces(decimalPlaces);
    const decimalB = new Decimal(b).toDecimalPlaces(decimalPlaces);
    return decimalA.equals(decimalB);
  },

  /**
   * Round an amount to specified decimal places
   */
  round(
    amount: number | string,
    decimalPlaces: number = 2,
    roundingMode: RoundingMode = RoundingMode.HALF_UP
  ): string {
    return new Decimal(amount)
      .toDecimalPlaces(decimalPlaces, ROUNDING_MAP[roundingMode])
      .toString();
  },

  /**
   * Create a new Decimal instance
   */
  decimal(value: number | string): Decimal {
    return new Decimal(value);
  },
};
