import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

vi.mock('../supabaseClient.js', () => {
  type Row = Record<string, unknown>;
  type Store = {
    events: Map<string, Row>;
    orders: Map<string, Row>;
    jobs: Map<string, Row>;
    notifications: Row[];
  };

  type Filter = { k: string; v: unknown };
  type TableState = {
    table: string;
    filters: Filter[];
    updates: Row | null;
    insertRow: Row | null;
    upsertRow: Row | null;
  };

  type SupabaseResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

  type MockQuery = {
    select: () => MockQuery;
    eq: (k: string, v: unknown) => MockQuery;
    lte: () => MockQuery;
    limit: () => MockQuery;
    order: () => MockQuery;
    single: () => Promise<SupabaseResult<Row>>;
    maybeSingle: () => Promise<{ data: Row | null; error: null }>;
    upsert: (row: Row) => MockQuery;
    insert: (row: Row) => MockQuery;
    update: (row: Row) => MockQuery;
    then: (resolve: (value: unknown) => void) => Promise<void>;
    _execute: () => Promise<{ data: unknown; error: null }>;
  };

  const store: Store = {
    events: new Map<string, Row>(),
    orders: new Map<string, Row>(),
    jobs: new Map<string, Row>(),
    notifications: [],
  };

  const mk = (table: string) => {
    const state: TableState = { table, filters: [], updates: null, insertRow: null, upsertRow: null };
    const api: MockQuery = {
      select: () => api,
      eq: (k: string, v: unknown) => {
        state.filters.push({ k, v });
        return api;
      },
      lte: () => api,
      limit: () => api,
      order: () => api,
      single: async () => {
        const row = await api.maybeSingle();
        if (!row.data) return { data: null, error: { message: 'not_found' } };
        return { data: row.data, error: null };
      },
      maybeSingle: async () => {
        if (table === 'webhook_events') {
          const provider = state.filters.find((f) => f.k === 'provider')?.v;
          const eventId = state.filters.find((f) => f.k === 'event_id')?.v;
          const key = `${provider}:${eventId}`;
          return { data: store.events.get(key) ?? null, error: null };
        }
        if (table === 'subscription_orders') {
          const id = state.filters.find((f) => f.k === 'id')?.v;
          const key = typeof id === 'string' ? id : '';
          return { data: store.orders.get(key) ?? null, error: null };
        }
        if (table === 'provisioning_jobs') {
          const orderId = state.filters.find((f) => f.k === 'order_id')?.v;
          const key = typeof orderId === 'string' ? orderId : '';
          return { data: store.jobs.get(key) ?? null, error: null };
        }
        return { data: null, error: null };
      },
      upsert: (row: Row) => {
        state.upsertRow = row;
        return api;
      },
      insert: (row: Row) => {
        state.insertRow = row;
        return api;
      },
      update: (row: Row) => {
        state.updates = row;
        return api;
      },
      async then(resolve: (value: unknown) => void) {
        resolve(await api._execute());
      },
      async _execute() {
        if (table === 'webhook_events' && state.upsertRow) {
          const provider = String(state.upsertRow.provider ?? '');
          const eventId = String(state.upsertRow.event_id ?? '');
          const key = `${provider}:${eventId}`;
          const prev = store.events.get(key);
          store.events.set(key, { ...(prev ?? {}), ...state.upsertRow });
          return { data: store.events.get(key), error: null };
        }
        if (table === 'subscription_orders' && state.updates) {
          const id = state.filters.find((f) => f.k === 'id')?.v;
          const key = typeof id === 'string' ? id : '';
          const prev = store.orders.get(key);
          store.orders.set(key, { ...(prev ?? {}), ...state.updates, id: key });
          return { data: store.orders.get(key), error: null };
        }
        if (table === 'provisioning_jobs' && state.upsertRow) {
          const orderId = String(state.upsertRow.order_id ?? '');
          const prev = store.jobs.get(orderId);
          store.jobs.set(orderId, { ...(prev ?? {}), ...state.upsertRow });
          return { data: store.jobs.get(orderId), error: null };
        }
        if (table === 'customer_notifications' && state.insertRow) {
          store.notifications.push(state.insertRow);
          return { data: state.insertRow, error: null };
        }
        if (table === 'webhook_events' && state.updates) {
          const provider = state.filters.find((f) => f.k === 'provider')?.v;
          const eventId = state.filters.find((f) => f.k === 'event_id')?.v;
          const key = `${provider}:${eventId}`;
          const prev = store.events.get(key);
          store.events.set(key, { ...(prev ?? {}), ...state.updates });
          return { data: store.events.get(key), error: null };
        }
        return { data: null, error: null };
      },
    };
    return api;
  };

  const supabaseAdmin: {
    from: (table: string) => MockQuery;
    auth: { admin: { createUser: () => Promise<{ data: { user: { id: string } }; error: null }> } };
    __store: Store;
  } = {
    from: (table: string) => mk(table),
    auth: {
      admin: {
        createUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      },
    },
    __store: store,
  };

  return { supabaseAdmin };
});

vi.mock('../services/provisionClinic.js', async () => {
  return {
    ensureProvisioningJob: async () => ({ ok: true }),
    provisionClinicFromOrder: async () => ({ status: 'succeeded', clinica_id: 'c1', admin_email: 'a@a.com', admin_password: 'p' }),
    markProvisioningFailed: async () => ({ ok: true }),
  };
});

import webhookRoutes from '../routes/webhooks.js';
import { supabaseAdmin } from '../supabaseClient.js';

function sign(secret: string, ts: string, body: string) {
  return crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
}

describe('webhook idempotency', () => {
  it('dedupes duplicate event_id', async () => {
    process.env.MOCKPAY_WEBHOOK_SECRET = 'secret';
    const app = express();
    app.use('/api/webhooks', webhookRoutes);

    const orderId = 'order1';
    const s = (supabaseAdmin as unknown as { __store: { orders: Map<string, Record<string, unknown>> } }).__store;
    s.orders.set(orderId, {
      id: orderId,
      customer_id: 'cust1',
      plano_assinatura: 'bronze',
      clinic_payload: { nome: 'X', cnpj: '1', email: 'x@x.com', nome_responsavel: 'R' },
    });

    const event = {
      id: 'evt_1',
      type: 'payment.succeeded',
      data: { order_id: orderId, payment_id: 'pay_1' },
    };

    const body = JSON.stringify(event);
    const ts = String(Date.now());
    const signature = sign(process.env.MOCKPAY_WEBHOOK_SECRET, ts, body);

    const r1 = await request(app)
      .post('/api/webhooks/payments')
      .set('x-mockpay-timestamp', ts)
      .set('x-mockpay-signature', signature)
      .set('content-type', 'application/json')
      .send(body);

    expect(r1.status).toBe(200);

    const r2 = await request(app)
      .post('/api/webhooks/payments')
      .set('x-mockpay-timestamp', ts)
      .set('x-mockpay-signature', signature)
      .set('content-type', 'application/json')
      .send(body);

    expect(r2.status).toBe(200);
    expect(r2.body.deduped).toBe(true);
  });
});
