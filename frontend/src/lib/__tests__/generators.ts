import fc from 'fast-check';
import { Product } from '../types';

// Feature: system1-showcase-gateway, Properties 7, 8
export const priceArbitrary = () =>
  fc.oneof(
    fc.constant(0),
    fc.integer({ min: 1, max: 999 }),
    fc.integer({ min: 1000, max: 999999 }),
    fc.integer({ min: 1000000, max: 999999999 })
  );

export const urlArbitrary = () =>
  fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.constant('invalid-url'),
    fc.webUrl()
  );

export const dateStringArbitrary = () =>
  fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') })
    .map(d => d.toISOString());

export const productArbitrary = (): fc.Arbitrary<Product> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.string(),
    price: priceArbitrary(),
    imageUrl: urlArbitrary(),
    createdAt: dateStringArbitrary(),
    updatedAt: dateStringArbitrary()
  });

export const errorResponseArbitrary = () =>
  fc.record({
    error: fc.string(),
    statusCode: fc.oneof(
      fc.constant(0), // Network error
      fc.constant(400),
      fc.constant(404),
      fc.constant(408),
      fc.constant(429),
      fc.constant(500),
      fc.constant(503)
    ),
    timestamp: dateStringArbitrary()
  });
