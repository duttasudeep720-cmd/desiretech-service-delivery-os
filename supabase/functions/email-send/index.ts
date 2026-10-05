// POST /functions/v1/email-send  { to, subject, message, communicationId, clientId?, leadId?, scheduledAt? }
// GET  /functions/v1/email-send  -> { configured: boolean }   (Settings / composer status; reveals nothing else)
// Secrets (APPS_SCRIPT_URL, APPS_SCRIPT_SECRET, service-role key) exist ONLY as Edge Function secrets.
import { getConfig, handleSend } from '../_shared/core.js';
import { makeDb } from '../_shared/db.ts';

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const MAX_BODY = 15000000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const cfg = getConfig(Deno.env.toObject());
  if (req.method === 'GET') return json({ configured: cfg.configured });
  if (req.method !== 'POST') return json({ ok: false, code: 'invalid', message: 'Method not allowed.' }, 405);
  let input: unknown;
  try { const text = await req.text(); if (text.length > MAX_BODY) return json({ ok: false, code: 'invalid', message: 'The message is too long.' }, 413); input = JSON.parse(text); }
  catch { return json({ ok: false, code: 'invalid', message: 'The request was not understood.' }, 400); }
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ ok: false, code: 'not_configured', message: 'Email automation is not configured. Administrator setup required.' }, 503);
  const r = await handleSend(input, { db: makeDb(url, key), cfg });
  return json(r.body, r.status);
});
