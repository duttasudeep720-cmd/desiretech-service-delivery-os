// Called by Supabase Cron (pg_cron + pg_net) every few minutes. Deploy with --no-verify-jwt; protected by a shared CRON_SECRET header instead.
import { getConfig, processQueue } from '../_shared/core.js';
import { makeDb } from '../_shared/db.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') || '', sent = req.headers.get('x-cron-secret') || '';
  if (req.method !== 'POST' || secret.length < 16 || !same(sent, secret)) return json({ ok: false }, 401);
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ ok: false, code: 'not_configured' }, 503);
  try { return json({ ok: true, ...(await processQueue({ db: makeDb(url, key), cfg: getConfig(Deno.env.toObject()) })) }); }
  catch { console.log(JSON.stringify({ event: 'email_send_failed', ts: new Date().toISOString(), status: 'queue_error' })); return json({ ok: false, code: 'db' }, 500); }
});
