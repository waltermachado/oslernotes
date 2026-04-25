import crypto from 'crypto';

type EventType = 'payment.succeeded' | 'payment.failed' | 'payment.pending';

function computeSignature(secret: string, timestamp: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

async function main() {
  const port = process.env.PORT ?? '3005';
  const baseUrl = process.env.MOCKPAY_BASE_URL ?? `http://localhost:${port}`;
  const secret = process.env.MOCKPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing MOCKPAY_WEBHOOK_SECRET env var');
  }

  const args = process.argv.slice(2);
  const orderId = args[0];
  const type = args[1] as EventType;

  if (!orderId || !type) {
    throw new Error('Usage: tsx scripts/mock_webhook_event.ts <orderId> <payment.succeeded|payment.failed|payment.pending>');
  }

  const payload = {
    id: `evt_${crypto.randomBytes(8).toString('hex')}`,
    type,
    data: {
      order_id: orderId,
      payment_id: `pay_${crypto.randomBytes(8).toString('hex')}`,
    },
  };

  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = computeSignature(secret, timestamp, body);

  const res = await fetch(`${baseUrl}/api/webhooks/payments`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-mockpay-timestamp': timestamp,
      'x-mockpay-signature': signature,
    },
    body,
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
