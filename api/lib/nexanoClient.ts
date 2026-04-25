export type NexanoConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
};

export type NexanoCreatePaymentInput = {
  amount_cents: number;
  currency?: string;
  customer: {
    email: string;
    name?: string;
  };
  description?: string;
  metadata?: Record<string, string>;
};

export type NexanoCreatePaymentOutput = {
  id: string;
  status: 'pending' | 'paid' | 'failed';
  checkout_url?: string;
};

function isPaymentStatus(value: unknown): value is NexanoCreatePaymentOutput['status'] {
  return value === 'pending' || value === 'paid' || value === 'failed';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class NexanoError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, opts?: { status?: number; body?: unknown }) {
    super(message);
    this.name = 'NexanoError';
    this.status = opts?.status;
    this.body = opts?.body;
  }
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class NexanoClient {
  private config: NexanoConfig;

  constructor(config: NexanoConfig) {
    this.config = config;
  }

  async createPayment(input: NexanoCreatePaymentInput): Promise<NexanoCreatePaymentOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 15000);

    try {
      const res = await fetch(`${this.config.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          amount_cents: input.amount_cents,
          currency: input.currency ?? 'BRL',
          customer: input.customer,
          description: input.description,
          metadata: input.metadata,
        }),
        signal: controller.signal,
      });

      const body = await readJsonSafe(res);
      if (!res.ok) {
        throw new NexanoError('Nexano API error', { status: res.status, body });
      }

      const obj = isRecord(body) ? body : null;
      const id = obj?.id;
      const status = obj?.status;
      if (typeof id !== 'string' || !isPaymentStatus(status)) {
        throw new NexanoError('Unexpected Nexano response shape', { status: res.status, body });
      }

      return {
        id,
        status,
        checkout_url: typeof obj?.checkout_url === 'string' ? obj.checkout_url : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
