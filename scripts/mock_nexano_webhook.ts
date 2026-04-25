import crypto from 'crypto';

type EventType = 'payment.paid' | 'payment.failed' | 'invoice.paid' | 'invoice.failed';

function computeSignature(secret: string, timestamp: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

async function main() {
  const port = process.env.PORT ?? '3005';
  const baseUrl = process.env.NEXANO_BASE_URL ?? `http://localhost:${port}`;
  const secret = process.env.NEXANO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing NEXANO_WEBHOOK_SECRET env var');
  }

  const args = process.argv.slice(2);
  const type = args[0] as EventType;
  const refId = args[1];

  if (!type || !refId) {
    throw new Error('Usage: tsx scripts/mock_nexano_webhook.ts <payment.paid|payment.failed|invoice.paid|invoice.failed> <orderId|invoiceId>');
  }

  const payload: {
    id: string;
    type: EventType;
    data: {
      payment_id: string;
      order_id?: string;
      id?: string;
      metadata: {
        subscription_invoice_id?: string;
        order_id?: string;
      };
    };
  } = {
    id: `evt_${crypto.randomBytes(8).toString('hex')}`,
    type,
    data: {
      payment_id: `pay_${crypto.randomBytes(8).toString('hex')}`,
      metadata: {},
    },
  };

  if (type.startsWith('payment.')) {
    payload.data.order_id = refId;
  } else {
    payload.data.metadata.subscription_invoice_id = refId;
  }

  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = computeSignature(secret, timestamp, body);

  const res = await fetch(`${baseUrl}/api/webhooks/nexano`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-nexano-timestamp': timestamp,
      'x-nexano-signature': signature,
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
