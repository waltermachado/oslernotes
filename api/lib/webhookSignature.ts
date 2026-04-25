import crypto from 'crypto';

export function computeHmacSha256(secret: string, message: string) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

export function timingSafeEqualHex(a: string, b: string) {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyMockpaySignature(params: {
  secret: string;
  timestamp: string;
  rawBody: Buffer;
  signature: string;
  toleranceMs?: number;
}) {
  const { secret, timestamp, rawBody, signature, toleranceMs = 5 * 60 * 1000 } = params;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false as const, error: 'invalid_timestamp' };
  }

  const now = Date.now();
  if (Math.abs(now - ts) > toleranceMs) {
    return { ok: false as const, error: 'timestamp_out_of_tolerance' };
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = computeHmacSha256(secret, signedPayload);
  const ok = timingSafeEqualHex(expected, signature);
  return ok ? { ok: true as const } : { ok: false as const, error: 'invalid_signature' };
}

