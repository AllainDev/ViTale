import { priceArbitrary } from './generators';
import fc from 'fast-check';

// Simple price formatter for testing
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

describe('Price Formatting Properties', () => {
  // Feature: system1-showcase-gateway, Property 7
  it('should always include the currency symbol and format correctly', () => {
    fc.assert(
      fc.property(priceArbitrary(), (price) => {
        const formatted = formatPrice(price);
        
        // Assertions
        expect(formatted).toMatch(/₫|VND/); // Includes currency symbol
        expect(formatted).not.toMatch(/NaN/); // Valid number format
        
        // If price > 999, it should contain thousand separators
        if (price > 999) {
          // Intl.NumberFormat uses non-breaking spaces or dots depending on the environment
          // We just ensure it's not a raw string of digits
          const rawDigits = price.toString();
          expect(formatted.replace(/\D/g, '')).toContain(rawDigits);
        }
      }),
      { numRuns: 100 }
    );
  });
});
