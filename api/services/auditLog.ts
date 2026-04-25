import { supabaseAdmin } from '../supabaseClient.js'

export type AuditLogParams = {
  clinica_id: string
  actor_user_id: string
  entity_type: string
  entity_id?: string | null
  action: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: AuditLogParams) {
  const { clinica_id, actor_user_id, entity_type, entity_id, action, metadata } = params

  await supabaseAdmin.from('audit_logs').insert({
    clinica_id,
    actor_user_id,
    entity_type,
    entity_id: entity_id ?? null,
    action,
    metadata: metadata ?? {},
  })
}

