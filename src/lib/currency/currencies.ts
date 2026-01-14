/**
 * Currency Registry
 *
 * Multi-currency storage with ISO 4217 currency codes and symbols.
 * This registry provides comprehensive currency information for the application.
 */

import type { Currency } from '@/types';

/**
 * Comprehensive list of supported currencies with their ISO 4217 codes,
 * symbols, and display names.
 */
export const CURRENCIES: Currency[] = [
  // Major World Currencies
  { code: 'GBP', symbol: '£', name: 'British Pound Sterling' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },

  // European Currencies
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },

  // Asian Currencies
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },

  // Middle Eastern Currencies
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },

  // Americas Currencies
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'CO$', name: 'Colombian Peso' },

  // African Currencies
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },

  // Oceania Currencies
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar' },
];

/**
 * Map for O(1) currency lookup by code
 */
export const CURRENCY_MAP: Map<string, Currency> = new Map(
  CURRENCIES.map(currency => [currency.code, currency])
);

/**
 * Default currency code for the application
 */
export const DEFAULT_CURRENCY_CODE = 'GBP';

/**
 * Get a currency by its ISO 4217 code
 */
export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCY_MAP.get(code.toUpperCase());
}

/**
 * Check if a currency code is valid/supported
 */
export function isValidCurrencyCode(code: string): boolean {
  return CURRENCY_MAP.has(code.toUpperCase());
}

/**
 * Get the symbol for a currency code
 */
export function getCurrencySymbol(code: string): string {
  const currency = getCurrencyByCode(code);
  return currency?.symbol ?? code;
}

/**
 * Get the display name for a currency code
 */
export function getCurrencyName(code: string): string {
  const currency = getCurrencyByCode(code);
  return currency?.name ?? code;
}

/**
 * Format a currency code with its symbol for display
 * e.g., "GBP (£)" or "USD ($)"
 */
export function formatCurrencyLabel(code: string): string {
  const currency = getCurrencyByCode(code);
  if (!currency) return code;
  return `${currency.code} (${currency.symbol})`;
}

/**
 * Get all currency codes as a simple string array
 */
export function getAllCurrencyCodes(): string[] {
  return CURRENCIES.map(c => c.code);
}

/**
 * Search currencies by code or name (case-insensitive)
 */
export function searchCurrencies(query: string): Currency[] {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return CURRENCIES;

  return CURRENCIES.filter(
    currency =>
      currency.code.toLowerCase().includes(searchTerm) ||
      currency.name.toLowerCase().includes(searchTerm) ||
      currency.symbol.toLowerCase().includes(searchTerm)
  );
}

/**
 * Get currencies grouped by region
 */
export function getCurrenciesByRegion(): Record<string, Currency[]> {
  return {
    'Major Currencies': CURRENCIES.slice(0, 8),
    'European': CURRENCIES.slice(8, 16),
    'Asian': CURRENCIES.slice(16, 26),
    'Middle Eastern': CURRENCIES.slice(26, 30),
    'Americas': CURRENCIES.slice(30, 35),
    'African': CURRENCIES.slice(35, 39),
    'Oceania': CURRENCIES.slice(39),
  };
}
