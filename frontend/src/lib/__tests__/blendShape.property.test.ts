/**
 * Property Test 2: Amplitude-to-BlendShape Mapping is Monotonic
 * Feature: system1-3d-chat-multimedia, Property 2: Amplitude-to-BlendShape Mapping is Monotonic
 *
 * Validates: Requirements 12.5
 * For any a1 < a2, calculateBlendShape(a2) >= calculateBlendShape(a1)
 * This ensures higher volume always results in more mouth/jaw opening.
 */

import * as fc from 'fast-check';
import { calculateBlendShape } from '@/lib/lipsSyncEngine';

// Feature: system1-3d-chat-multimedia, Property 2: Amplitude-to-BlendShape Mapping is Monotonic
describe('Property 2: Amplitude-to-BlendShape Mapping is Monotonic', () => {
  it('should produce non-decreasing mouthOpen and jawOpen values for increasing amplitude', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true })
        ).filter(([a, b]) => a < b),
        ([a1, a2]) => {
          const blend1 = calculateBlendShape(a1);
          const blend2 = calculateBlendShape(a2);

          // mouthOpen must be monotonically non-decreasing
          expect(blend2.mouthOpen).toBeGreaterThanOrEqual(blend1.mouthOpen);

          // jawOpen must be monotonically non-decreasing
          expect(blend2.jawOpen).toBeGreaterThanOrEqual(blend1.jawOpen);
        }
      ),
      { numRuns: 100, seed: 42 }
    );
  });

  it('should produce 0 blendshape values at 0 amplitude', () => {
    const result = calculateBlendShape(0);
    expect(result.mouthOpen).toBe(0);
    expect(result.jawOpen).toBe(0);
  });

  it('should produce maximum values at amplitude 1', () => {
    const result = calculateBlendShape(1);
    expect(result.mouthOpen).toBeCloseTo(1, 5); // pow(1, 1.5) = 1
    expect(result.jawOpen).toBeCloseTo(0.7, 5);  // 1 * 0.7 = 0.7
  });

  it('should have mouthOpen use non-linear (power) scaling for peak emphasis', () => {
    const result = calculateBlendShape(0.5);
    // Math.pow(0.5, 1.5) ≈ 0.354
    expect(result.mouthOpen).toBeCloseTo(Math.pow(0.5, 1.5), 5);
    expect(result.jawOpen).toBeCloseTo(0.5 * 0.7, 5);
  });
});
