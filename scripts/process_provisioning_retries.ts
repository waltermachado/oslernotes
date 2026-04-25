import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { provisionClinicFromOrder, markProvisioningFailed } from '../api/services/provisionClinic.js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await supabaseAdmin
    .from('provisioning_jobs')
    .select('order_id')
    .eq('status', 'failed')
    .lte('next_retry_at', nowIso)
    .limit(25);

  if (error) throw error;

  for (const j of jobs ?? []) {
    try {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('subscription_orders')
        .select('*')
        .eq('id', j.order_id)
        .single();

      if (orderError || !order) throw orderError ?? new Error('order_not_found');

      await provisionClinicFromOrder({
        orderId: j.order_id,
        plan: order.plano_assinatura,
        clinicPayload: order.clinic_payload,
      });

      console.log('Provisioned:', j.order_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'retry_failed';
      await markProvisioningFailed(j.order_id, msg);
      console.log('Failed:', j.order_id, msg);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

