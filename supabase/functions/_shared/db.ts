// Supabase (service role) implementation of the db interface used by core.js. Server-side only.
import { createClient } from 'npm:@supabase/supabase-js@2';

export function makeDb(url: string, serviceKey: string) {
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const T = 'email_queue';
  const ok = (r: { error: unknown }) => { if (r.error) throw new Error('db'); };
  return {
    async getByCommId(cid: string) { const r = await sb.from(T).select('*').eq('communication_id', cid).maybeSingle(); ok(r); return r.data; },
    async insert(row: Record<string, unknown>) {
      const r = await sb.from(T).insert(row).select().single();
      if (r.error) { if ((r.error as { code?: string }).code === '23505') return { duplicate: true }; throw new Error('db'); }
      return { row: r.data };
    },
    async claimFailed(cid: string, patch: Record<string, unknown>) { const r = await sb.from(T).update(patch).eq('communication_id', cid).eq('status', 'failed').select(); ok(r); return r.data?.[0] ?? null; },
    async update(id: string, patch: Record<string, unknown>) { ok(await sb.from(T).update(patch).eq('id', id)); },
    async countRecent(sinceIso: string) { const r = await sb.from(T).select('id', { count: 'exact', head: true }).in('status', ['processing', 'sent']).gt('processing_started_at', sinceIso); ok(r); return r.count ?? 0; },
    async claimDue(limit: number) { const r = await sb.rpc('claim_due_emails', { p_limit: limit }); ok(r); return (r.data ?? []) as Record<string, unknown>[]; },
    async recoverStale(beforeIso: string, message: string) { const r = await sb.from(T).update({ status: 'failed', error: message, error_code: 'interrupted', updated_at: new Date().toISOString() }).eq('status', 'processing').lt('processing_started_at', beforeIso).select('id'); ok(r); return r.data?.length ?? 0; },
    async release(ids: string[]) { const rows = await sb.from(T).select('id,attempts').in('id', ids); ok(rows); for (const x of rows.data ?? []) ok(await sb.from(T).update({ status: 'pending', attempts: Math.max(0, x.attempts - 1), updated_at: new Date().toISOString() }).eq('id', x.id)); },
  };
}
