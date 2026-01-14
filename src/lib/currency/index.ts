/**
 * Currency System
 *
 * Multi-currency storage with exchange rate management and real-time conversion.
 *
 * @example
 * ```typescript
 * import {
 *   // Currency Registry
 *   CURRENCIES,
 *   getCurrencyByCode,
 *   getCurrencySymbol,
 *   isValidCurrencyCode,
 *
 *   // Exchange Rate Management
 *   getExchangeRate,
 *   upsertExchangeRate,
 *   getAllExchangeRates,
 *
 *   // Conversion Service
 *   convertCurrency,
 *   convertCurrencyWithFallback,
 *   formatCurrency,
 *   DecimalCalculations,
 *   RoundingMode,
 * } from '@/lib/currency';
 * ```
 */

// Currency Registry
export {
  CURRENCIES,
  CURRENCY_MAP,
  DEFAULT_CURRENCY_CODE,
  getCurrencyByCode,
  getCurrencyName,
  getCurrencySymbol,
  isValidCurrencyCode,
  formatCurrencyLabel,
  getAllCurrencyCodes,
  searchCurrencies,
  getCurrenciesByRegion,
} from './currencies';

// Exchange Rate Management
export {
  EXCHANGE_RATE_CONFIG,
  validateExchangeRateInput,
  getAllExchangeRates,
  getExchangeRate,
  getExchangeRatesFromCurrency,
  getExchangeRatesToCurrency,
  upsertExchangeRate,
  upsertExchangeRates,
  deleteExchangeRate,
  deleteExchangeRateById,
  getStaleExchangeRates,
  getExchangeRateStats,
  type ExchangeRateInput,
  type ExchangeRateWithMeta,
} from './rates';

// Currency Conversion Service
export {
  RoundingMode,
  formatCurrency,
  convertCurrency,
  convertCurrencyWithFallback,
  batchConvert,
  calculateTotal,
  DecimalCalculations,
  ConversionError,
  type ConversionOptions,
  type ConversionResult,
} from './conversion';
