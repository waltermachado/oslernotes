import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { verifyMockpaySignature } from '../lib/webhookSignature.js';
import {
  ensureProvisioningJob,
  markProvisioningFailed,
  provisionClinicFromOrder,
} from '../services/provisionClinic.js';
import { addInterval } from '../services/subscriptionPeriods.js';

const router = express.Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readPath(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const key of path) {
    if (!isRecord(cur)) return null;
    if (!(key in cur)) return null;
    cur = cur[key];
  }
  return cur;
}

function readString(root: unknown, path: string[]) {
  const value = readPath(root, path);
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

router.post('/payments', express.raw({ type: '*/*' }), async (req, res) => {
  const secret = process.env.MOCKPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = String(req.header('x-mockpay-signature') ?? '');
  const timestamp = String(req.header('x-mockpay-timestamp') ?? '');

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  const verification = verifyMockpaySignature({
    secret,
    timestamp,
    rawBody,
    signature,
  });

  if (!verification.ok) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const provider = 'mockpay';
  const eventId = readString(payload, ['id']);
  const eventType = readString(payload, ['type']);
  const orderId = readString(payload, ['data', 'order_id']);
  const paymentId = readString(payload, ['data', 'payment_id']);

  if (!eventId || !eventType || !orderId) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { data: existingEvent } = await supabaseAdmin
    .from('webhook_events')
    .select('id,status')
    .eq('provider', provider)
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingEvent?.status === 'processed') {
    return res.status(200).json({ ok: true, deduped: true });
  }

  const { error: upsertEventError } = await supabaseAdmin.from('webhook_events').upsert(
    {
      provider,
      event_id: eventId,
      status: 'received',
      signature,
      payload,
    },
    { onConflict: 'provider,event_id' },
  );

  if (upsertEventError) {
    return res.status(500).json({ error: 'Failed to persist webhook event' });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('subscription_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    await supabaseAdmin
      .from('webhook_events')
      .update({ status: 'failed', error_message: 'order_not_found' })
      .eq('provider', provider)
      .eq('event_id', eventId);
    return res.status(404).json({ error: 'Order not found' });
  }

  if (eventType === 'payment.succeeded') {
    await supabaseAdmin
      .from('subscription_orders')
      .update({ status: 'paid', provider_payment_id: paymentId, error_message: null })
      .eq('id', orderId);

    await ensureProvisioningJob(orderId);

    try {
      const result = await provisionClinicFromOrder({
        orderId,
        plan: order.plano_assinatura,
        clinicPayload: order.clinic_payload,
      });

      if (result.status === 'succeeded') {
        await supabaseAdmin.from('customer_notifications').insert({
          customer_id: order.customer_id,
          order_id: orderId,
          type: 'clinic_provisioned',
          status: 'sent',
          message: `Clínica criada com sucesso. Admin: ${result.admin_email} Senha: ${result.admin_password}`,
        });
      }

      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider', provider)
        .eq('event_id', eventId);

      return res.status(200).json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'provisioning_failed';
      await markProvisioningFailed(orderId, msg);
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'failed', error_message: msg })
        .eq('provider', provider)
        .eq('event_id', eventId);
      return res.status(202).json({ ok: true, provisioning: 'scheduled_retry' });
    }
  }

  if (eventType === 'payment.failed') {
    await supabaseAdmin
      .from('subscription_orders')
      .update({ status: 'failed', provider_payment_id: paymentId, error_message: 'payment_failed' })
      .eq('id', orderId);

    await supabaseAdmin.from('customer_notifications').insert({
      customer_id: order.customer_id,
      order_id: orderId,
      type: 'payment_failed',
      status: 'created',
      message: 'Pagamento falhou. Tente novamente.',
    });

    await supabaseAdmin
      .from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', provider)
      .eq('event_id', eventId);

    return res.status(200).json({ ok: true });
  }

  if (eventType === 'payment.pending') {
    await supabaseAdmin
      .from('subscription_orders')
      .update({ status: 'pending', provider_payment_id: paymentId, error_message: null })
      .eq('id', orderId);

    await supabaseAdmin
      .from('webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', provider)
      .eq('event_id', eventId);

    return res.status(200).json({ ok: true });
  }

  await supabaseAdmin
    .from('webhook_events')
    .update({ status: 'failed', error_message: 'unknown_event_type' })
    .eq('provider', provider)
    .eq('event_id', eventId);

  return res.status(400).json({ error: 'Unknown event type' });
});

router.post('/nexano', express.raw({ type: '*/*' }), async (req, res) => {
  const secret = process.env.NEXANO_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = String(req.header('x-nexano-signature') ?? '');
  const timestamp = String(req.header('x-nexano-timestamp') ?? '');
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  const verification = verifyMockpaySignature({
    secret,
    timestamp,
    rawBody,
    signature,
  });

  if (!verification.ok) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const provider = 'nexano';
  const eventId = readString(payload, ['id']);
  const eventType = readString(payload, ['type']);

  if (!eventId || !eventType) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { data: existingEvent } = await supabaseAdmin
    .from('webhook_events')
    .select('id,status')
    .eq('provider', provider)
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingEvent?.status === 'processed') {
    return res.status(200).json({ ok: true, deduped: true });
  }

  const { error: upsertEventError } = await supabaseAdmin.from('webhook_events').upsert(
    {
      provider,
      event_id: eventId,
      status: 'received',
      signature,
      payload,
    },
    { onConflict: 'provider,event_id' },
  );

  if (upsertEventError) {
    return res.status(500).json({ error: 'Failed to persist webhook event' });
  }

  const orderId =
    readString(payload, ['data', 'order_id']) ??
    readString(payload, ['data', 'metadata', 'order_id']);
  const subscriptionInvoiceId = readString(payload, ['data', 'metadata', 'subscription_invoice_id']);
  const paymentId = readString(payload, ['data', 'payment_id']) ?? readString(payload, ['data', 'id']);

  if (eventType === 'payment.paid' && orderId) {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'failed', error_message: 'order_not_found' })
        .eq('provider', provider)
        .eq('event_id', eventId);
      return res.status(404).json({ error: 'Order not found' });
    }

    await supabaseAdmin
      .from('subscription_orders')
      .update({ status: 'paid', provider_payment_id: paymentId, error_message: null })
      .eq('id', orderId);

    await ensureProvisioningJob(orderId);

    try {
      const result = await provisionClinicFromOrder({
        orderId,
        plan: order.plano_assinatura,
        clinicPayload: order.clinic_payload,
      });

      const now = new Date();
      const periodEnd = addInterval(now, order.interval);

      const { data: subscriptionRow, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          customer_id: order.customer_id,
          clinica_id: result.clinica_id ?? null,
          plano_assinatura: order.plano_assinatura,
          interval: order.interval,
          status: 'active',
          provider: 'nexano',
          provider_subscription_id: null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select('*')
        .single();

      if (subError) throw subError;

      await supabaseAdmin.from('subscription_invoices').insert({
        subscription_id: subscriptionRow.id,
        order_id: orderId,
        status: 'paid',
        provider: 'nexano',
        provider_payment_id: paymentId,
        paid_at: now.toISOString(),
      });

      await supabaseAdmin.from('customer_notifications').insert({
        customer_id: order.customer_id,
        order_id: orderId,
        type: 'clinic_provisioned',
        status: 'created',
        message: 'Pagamento confirmado e clínica provisionada.',
      });

      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider', provider)
        .eq('event_id', eventId);

      return res.status(200).json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'provisioning_failed';
      await markProvisioningFailed(orderId, msg);
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'failed', error_message: msg })
        .eq('provider', provider)
        .eq('event_id', eventId);
      return res.status(202).json({ ok: true, provisioning: 'scheduled_retry' });
    }
  }

  if (eventType === 'invoice.paid' && subscriptionInvoiceId) {
    const now = new Date();

    const { data: invoice, error: invError } = await supabaseAdmin
      .from('subscription_invoices')
      .select('*')
      .eq('id', subscriptionInvoiceId)
      .single();

    if (invError || !invoice) {
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'failed', error_message: 'invoice_not_found' })
        .eq('provider', provider)
        .eq('event_id', eventId);
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await supabaseAdmin
      .from('subscription_invoices')
      .update({ status: 'paid', provider_payment_id: paymentId, paid_at: now.toISOString(), error_message: null })
      .eq('id', subscriptionInvoiceId);

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', invoice.subscription_id)
      .single();

    if (subError || !subscription) {
      await supabaseAdmin
        .from('webhook_events')
        .update({ status: 'failed', error_message: 'subscription_not_found' })
        .eq('provider', provider)
        .eq('event_id', eventId);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const currentEnd = new Date(subscription.current_period_end);
    const newEnd = addInterval(currentEnd, subscription.interval);

    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: currentEnd.toISOString(),
        current_period_end: newEnd.toISOString(),
      })
      .eq('id', subscription.id);

    await supabaseAdmin
      .from('webhook_events')
      .update({ status: 'processed', processed_at: now.toISOString() })
      .eq('provider', provider)
      .eq('event_id', eventId);

    return res.status(200).json({ ok: true });
  }

  await supabaseAdmin
    .from('webhook_events')
    .update({ status: 'failed', error_message: 'unsupported_event' })
    .eq('provider', provider)
    .eq('event_id', eventId);

  return res.status(400).json({ error: 'Unsupported event' });
});

router.post('/retries/process', async (req, res) => {
  const secret = process.env.MOCKPAY_WEBHOOK_SECRET;
  const adminSecret = process.env.MOCKPAY_RETRY_SECRET;

  if (!secret || !adminSecret) {
    return res.status(500).json({ error: 'Retry secret not configured' });
  }

  const provided = String(req.header('x-retry-secret') ?? '');
  if (provided !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: failedJobs, error } = await supabaseAdmin
    .from('provisioning_jobs')
    .select('order_id')
    .eq('status', 'failed')
    .lte('next_retry_at', new Date().toISOString())
    .limit(25);

  if (error) return res.status(500).json({ error: error.message });

  const processed: Array<{ order_id: string; ok: boolean; error?: string }> = [];
  for (const j of failedJobs ?? []) {
    try {
      const { data: order } = await supabaseAdmin
        .from('subscription_orders')
        .select('*')
        .eq('id', j.order_id)
        .single();
      if (!order) throw new Error('order_not_found');
      await provisionClinicFromOrder({
        orderId: j.order_id,
        plan: order.plano_assinatura,
        clinicPayload: order.clinic_payload,
      });
      processed.push({ order_id: j.order_id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'retry_failed';
      await markProvisioningFailed(j.order_id, msg);
      processed.push({ order_id: j.order_id, ok: false, error: msg });
    }
  }

  res.status(200).json({ ok: true, processed });
});

export default router;
