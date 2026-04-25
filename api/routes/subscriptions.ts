import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import crypto from 'crypto';
import { NexanoClient } from '../lib/nexanoClient.js';
import { isPlan, priceCents } from '../services/pricing.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const {
    customer,
    clinic,
    plan,
    interval,
  }: {
    customer: { email: string; nome?: string };
    clinic: {
      nome: string;
      cnpj: string;
      telefone?: string;
      email: string;
      endereco?: unknown;
      nome_responsavel: string;
      especialidade_principal?: string;
      horario_funcionamento?: string;
    };
    plan?: string;
    interval?: 'monthly' | 'quarterly' | 'yearly';
  } = req.body ?? {};

  if (!customer?.email || !clinic?.nome || !clinic?.cnpj || !clinic?.email || !clinic?.nome_responsavel) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const normalizedCnpj = String(clinic.cnpj).replace(/\D/g, '');
    const { data: customerRow, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(
        {
          email: customer.email,
          nome: customer.nome ?? null,
        },
        { onConflict: 'email' },
      )
      .select('*')
      .single();

    if (customerError) throw customerError;

    const normalizedPlan = isPlan(plan) ? plan : 'bronze';
    const normalizedInterval = interval ?? 'monthly';

    const { data: order, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .insert({
        customer_id: customerRow.id,
        plano_assinatura: normalizedPlan,
        interval: normalizedInterval,
        status: 'pending',
        provider: 'nexano',
        provider_payment_id: null,
        clinic_payload: {
          ...clinic,
          cnpj: normalizedCnpj,
        },
      })
      .select('*')
      .single();

    if (orderError) throw orderError;

    const nexanoBaseUrl = process.env.NEXANO_API_BASE_URL ?? 'https://app.nexano.com.br/api/v1';
    const nexanoApiKey = process.env.NEXANO_API_KEY;

    let providerPaymentId: string | null = null;
    let checkoutUrl: string | null = null;

    if (nexanoApiKey) {
      const client = new NexanoClient({ baseUrl: nexanoBaseUrl, apiKey: nexanoApiKey });
      const amountCents = priceCents(normalizedPlan, normalizedInterval);
      const created = await client.createPayment({
        amount_cents: amountCents,
        customer: { email: customer.email, name: customer.nome },
        description: `OslerNotes - Assinatura ${normalizedPlan} (${normalizedInterval})`,
        metadata: { order_id: order.id },
      });
      providerPaymentId = created.id;
      checkoutUrl = created.checkout_url ?? null;
    } else {
      providerPaymentId = `mock_${crypto.randomBytes(8).toString('hex')}`;
      checkoutUrl = null;
    }

    await supabaseAdmin
      .from('subscription_orders')
      .update({ provider_payment_id: providerPaymentId })
      .eq('id', order.id);

    res.status(201).json({
      order_id: order.id,
      status: order.status,
      provider: order.provider,
      provider_payment_id: providerPaymentId,
      checkout_url: checkoutUrl,
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('subscription_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { data: job } = await supabaseAdmin
      .from('provisioning_jobs')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    res.status(200).json({
      order: {
        id: order.id,
        status: order.status,
        plano_assinatura: order.plano_assinatura,
        provider: order.provider,
        provider_payment_id: order.provider_payment_id,
        error_message: order.error_message,
      },
      provisioning: job
        ? {
            status: job.status,
            clinica_id: job.clinica_id,
            retry_count: job.retry_count,
            next_retry_at: job.next_retry_at,
            last_error: job.last_error,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/renewals/run', async (req, res) => {
  const secret = process.env.NEXANO_RENEWAL_SECRET;
  const provided = String(req.header('x-renewal-secret') ?? '');

  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const nexanoBaseUrl = process.env.NEXANO_API_BASE_URL ?? 'https://app.nexano.com.br/api/v1';
  const nexanoApiKey = process.env.NEXANO_API_KEY;

  const nowIso = new Date().toISOString();

  try {
    const { data: dueSubs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('current_period_end', nowIso)
      .limit(25);

    if (error) throw error;

    const processed: Array<{ subscription_id: string; invoice_id?: string; ok: boolean; error?: string }> = [];

    for (const s of dueSubs ?? []) {
      try {
        const planForPricing = isPlan(s.plano_assinatura) ? s.plano_assinatura : 'bronze';
        const amountCents = priceCents(planForPricing, s.interval);

        const { data: customerRow } = await supabaseAdmin
          .from('customers')
          .select('email,nome')
          .eq('id', s.customer_id)
          .maybeSingle();

        const { data: invoice, error: invError } = await supabaseAdmin
          .from('subscription_invoices')
          .insert({
            subscription_id: s.id,
            status: 'pending',
            provider: 'nexano',
            amount_cents: amountCents,
            currency: 'BRL',
            due_at: nowIso,
          })
          .select('*')
          .single();

        if (invError) throw invError;

        let providerPaymentId: string | null = null;
        let providerInvoiceId: string | null = null;

        if (nexanoApiKey) {
          const client = new NexanoClient({ baseUrl: nexanoBaseUrl, apiKey: nexanoApiKey });
          const created = await client.createPayment({
            amount_cents: amountCents,
            customer: { email: customerRow?.email ?? 'billing@oslernotes.local', name: customerRow?.nome ?? undefined },
            description: `OslerNotes - Renovação (${s.plano_assinatura}/${s.interval})`,
            metadata: { subscription_invoice_id: invoice.id, subscription_id: s.id },
          });
          providerPaymentId = created.id;
          providerInvoiceId = created.id;
        } else {
          providerPaymentId = `mock_${crypto.randomBytes(8).toString('hex')}`;
          providerInvoiceId = providerPaymentId;
        }

        await supabaseAdmin
          .from('subscription_invoices')
          .update({ provider_payment_id: providerPaymentId, provider_invoice_id: providerInvoiceId })
          .eq('id', invoice.id);

        processed.push({ subscription_id: s.id, invoice_id: invoice.id, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'renewal_failed';
        await supabaseAdmin.from('subscriptions').update({ status: 'past_due' }).eq('id', s.id);
        processed.push({ subscription_id: s.id, ok: false, error: msg });
      }
    }

    return res.status(200).json({ ok: true, processed });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
