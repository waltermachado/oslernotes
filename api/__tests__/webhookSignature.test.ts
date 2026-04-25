import { describe, expect, it } from 'vitest';
import { computeHmacSha256, verifyMockpaySignature } from '../lib/webhookSignature.js';

describe('verifyMockpaySignature', () => {
  it('accepts valid signature and timestamp', () => {
    const secret = 'test_secret';
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    const ts = String(Date.now());
    const sig = computeHmacSha256(secret, `${ts}.${body.toString('utf8')}`);

    const result = verifyMockpaySignature({ secret, timestamp: ts, rawBody: body, signature: sig });
    expect(result.ok).toBe(true);
  });

  it('rejects invalid signature', () => {
    const secret = 'test_secret';
    const body = Buffer.from('{"a":1}');
    const ts = String(Date.now());

    const result = verifyMockpaySignature({
      secret,
      timestamp: ts,
      rawBody: body,
      signature: 'deadbeef',
    });

    expect(result.ok).toBe(false);
  });

  it('rejects old timestamp', () => {
    const secret = 'test_secret';
    const body = Buffer.from('{"a":1}');
    const ts = String(Date.now() - 10 * 60 * 1000);
    const sig = computeHmacSha256(secret, `${ts}.${body.toString('utf8')}`);

    const result = verifyMockpaySignature({
      secret,
      timestamp: ts,
      rawBody: body,
      signature: sig,
      toleranceMs: 1000,
    });

    expect(result.ok).toBe(false);
  });
});

