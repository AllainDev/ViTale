/**
 * Property Test 3: Response Packet Serialization Round-Trip Preserves Equivalence
 * Feature: system1-3d-chat-multimedia, Property 3: Response Packet Serialization Round-Trip Preserves Equivalence
 *
 * Validates: Requirements 25.5
 * parse(format(parse(json))) ≡ parse(json) (deep equality)
 */

import * as fc from 'fast-check';
import { ResponsePacketParser } from '@/lib/responsePacketParser';

// Feature: system1-3d-chat-multimedia, Property 3: Response Packet Serialization Round-Trip Preserves Equivalence
describe('Property 3: Response Packet Serialization Round-Trip Preserves Equivalence', () => {
  it('should preserve equivalence through parse → format → parse cycle', () => {
    fc.assert(
      fc.property(
        fc.record({
          text_chunk: fc.string({ minLength: 0, maxLength: 1000 }),
          animation_tag: fc.constantFrom('talking', 'idle') as fc.Arbitrary<'talking' | 'idle'>,
          audio_base64: fc.option(
            fc.base64String({ minLength: 100, maxLength: 2000 }),
            { nil: null }
          ),
        }),
        (generatedPacket) => {
          // Start with a valid JSON representation
          const originalJson = JSON.stringify(generatedPacket);

          // First parse
          const parsed1 = ResponsePacketParser.parse(originalJson);

          // Format back to JSON string
          const json2 = ResponsePacketParser.format(parsed1);

          // Parse again (the round-trip)
          const parsed2 = ResponsePacketParser.parse(json2);

          // Deep equality: parse(format(parse(json))) === parse(json)
          expect(parsed2.text_chunk).toBe(parsed1.text_chunk);
          expect(parsed2.animation_tag).toBe(parsed1.animation_tag);
          expect(parsed2.audio_base64).toBe(parsed1.audio_base64);
        }
      ),
      { numRuns: 100, seed: 42 }
    );
  });

  it('should handle empty text_chunk in round-trip', () => {
    const packet = { text_chunk: '', animation_tag: 'idle', audio_base64: null };
    const json = JSON.stringify(packet);
    const parsed1 = ResponsePacketParser.parse(json);
    const parsed2 = ResponsePacketParser.parse(ResponsePacketParser.format(parsed1));
    expect(parsed2).toEqual(parsed1);
  });

  it('should handle Vietnamese diacritics in text_chunk', () => {
    const packet = {
      text_chunk: 'Xin chào! Tôi là trợ lý AI của ViTale. Tôi có thể giúp gì cho bạn?',
      animation_tag: 'talking',
      audio_base64: null,
    };
    const json = JSON.stringify(packet);
    const parsed1 = ResponsePacketParser.parse(json);
    const parsed2 = ResponsePacketParser.parse(ResponsePacketParser.format(parsed1));
    expect(parsed2.text_chunk).toBe(parsed1.text_chunk);
  });

  it('should throw on invalid JSON', () => {
    expect(() => ResponsePacketParser.parse('{invalid json')).toThrow();
  });

  it('should throw on missing required fields', () => {
    expect(() =>
      ResponsePacketParser.parse(JSON.stringify({ animation_tag: 'idle' }))
    ).toThrow(/text_chunk/);
  });

  it('should handle null audio_base64', () => {
    const packet = { text_chunk: 'Hello', animation_tag: 'talking', audio_base64: null };
    const parsed = ResponsePacketParser.parse(JSON.stringify(packet));
    expect(parsed.audio_base64).toBeNull();
  });
});
