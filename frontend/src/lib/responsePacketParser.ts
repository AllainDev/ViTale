/**
 * Response Packet parser and formatter for 3D Chat system.
 * Validates and round-trips ResponsePacket JSON safely.
 *
 * Requirements: 25 (Parser and Pretty Printer for Response Packet)
 * Property 3: Response Packet Serialization Round-Trip Preserves Equivalence
 */

import { ResponsePacket } from './chat-types';

export class ResponsePacketParser {
  /**
   * Parses a JSON string into a typed ResponsePacket.
   * Validates required fields.
   *
   * // Feature: system1-3d-chat-multimedia, Property 3: Response Packet Serialization Round-Trip Preserves Equivalence
   */
  static parse(json: string): ResponsePacket {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch (e) {
      throw new Error(`[ResponsePacketParser] Invalid JSON: ${(e as Error).message}`);
    }

    if (typeof raw !== 'object' || raw === null) {
      throw new Error('[ResponsePacketParser] Expected JSON object, got: ' + typeof raw);
    }

    const obj = raw as Record<string, unknown>;

    // Validate text_chunk
    if (typeof obj['text_chunk'] !== 'string') {
      throw new Error('[ResponsePacketParser] Missing or invalid field: text_chunk (expected string)');
    }

    // Validate animation_tag
    if (typeof obj['animation_tag'] !== 'string') {
      throw new Error('[ResponsePacketParser] Missing or invalid field: animation_tag (expected string)');
    }

    // Validate audio_base64 (can be string or null)
    const audioBase64 = obj['audio_base64'];
    if (audioBase64 !== null && audioBase64 !== undefined && typeof audioBase64 !== 'string') {
      throw new Error('[ResponsePacketParser] Invalid field: audio_base64 (expected string or null)');
    }

    return {
      text_chunk: obj['text_chunk'] as string,
      animation_tag: obj['animation_tag'] as 'talking' | 'idle',
      audio_base64: (audioBase64 as string | null) ?? null,
    };
  }

  /**
   * Formats a ResponsePacket to a pretty-printed JSON string.
   * Used for debugging and round-trip testing.
   */
  static format(packet: ResponsePacket): string {
    return JSON.stringify(
      {
        text_chunk: packet.text_chunk,
        animation_tag: packet.animation_tag,
        audio_base64: packet.audio_base64,
      },
      null,
      2
    );
  }

  /**
   * Validates the structure of a ResponsePacket object.
   * Returns true if valid, false otherwise.
   */
  static validate(packet: unknown): packet is ResponsePacket {
    if (typeof packet !== 'object' || packet === null) return false;
    const p = packet as Record<string, unknown>;
    return (
      typeof p['text_chunk'] === 'string' &&
      typeof p['animation_tag'] === 'string' &&
      (p['audio_base64'] === null || typeof p['audio_base64'] === 'string')
    );
  }
}
