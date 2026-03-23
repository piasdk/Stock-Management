/**
 * Currency Conversion Utilities
 */

// Exchange rates (as of a reference date - in production, use live API)
// Base currency: USD
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1500.0,
  FRW: 1300.0,
  RWF: 1300.0, // Rwandan Franc (same as FRW)
  // Add more currencies as needed
};

/**
 * Get exchange rate from one currency to another
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1.0;
  
  const fromRate = EXCHANGE_RATES[fromCurrency.toUpperCase()] || 1.0;
  const toRate = EXCHANGE_RATES[toCurrency.toUpperCase()] || 1.0;
  
  // Convert via USD as base
  // fromCurrency -> USD -> toCurrency
  return toRate / fromRate;
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (!amount || amount === 0) return 0;
  if (fromCurrency === toCurrency) return amount;
  
  const rate = getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Format currency amount
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ` ${currency}`;
}

/**
 * Format currency with symbol
 * Maps FRW to RWF for display
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  // Map FRW to RWF for display
  const displayCurrency = currency === "FRW" ? "RWF" : currency;
  
  try {
    // For RWF/FRW, use custom formatting
    if (displayCurrency === "RWF" || displayCurrency === "FRW") {
      return `RWF ${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    }
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: displayCurrency,
    }).format(amount);
  } catch {
    return `${formatCurrencyAmount(amount, displayCurrency)}`;
  }
}

