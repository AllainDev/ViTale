/**
 * Property Test 1: Amplitude Normalization Produces Valid Range
 * Feature: system1-3d-chat-multimedia, Property 1: Amplitude Normalization Produces Valid Range
 *
 * Validates: Requirements 12.3
 * For any byte value in [0, 255], normalizeAmplitude(x) must be in [0.0, 1.0].
 */

import * as fc from 'fast-check';
import { normalizeAmplitude } from '@/lib/lipsSyncEngine';

// Feature: system1-3d-chat-multimedia, Property 1: Amplitude Normalization Produces Valid Range
describe('Property 1: Amplitude Normalization Produces Valid Range', () => {
  it('should normalize any byte amplitude (0-255) to [0, 1] range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 255 }), (rawAmplitude) => {
        const normalized = normalizeAmplitude(rawAmplitude);

        // Must be within [0, 1]
        expect(normalized).toBeGreaterThanOrEqual(0);
        expect(normalized).toBeLessThanOrEqual(1);

        // Must match the exact formula: rawByte / 255
        expect(normalized).toBeCloseTo(rawAmplitude / 255, 10);
      }),
      { numRuns: 100, seed: 42 }
    );
  });

  it('should normalize 0 to exactly 0.0', () => {
    expect(normalizeAmplitude(0)).toBe(0);
  });

  it('should normalize 255 to exactly 1.0', () => {
    expect(normalizeAmplitude(255)).toBeCloseTo(1.0, 10);
  });

  it('should normalize 128 to approximately 0.5', () => {
    expect(normalizeAmplitude(128)).toBeCloseTo(128 / 255, 10);
  });
});
