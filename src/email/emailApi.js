// MVP 3G - browser side of Email Automation (Supabase Edge Function -> Google Apps Script -> Gmail/MailApp).
// Only PUBLIC values live here (project URL + anon key, both meant for browsers). The Apps Script URL, its shared secret and the
// service-role key exist only as Edge Function secrets and are never sent to or read by the browser.
import { useCallback, useEffect, useState } from 'react';

export const NOT_CONFIGURED_MSG = 'Email automation is not configured. Administrator setup required.';
export const UNAVAILABLE_MSG = 'The email service is not reachable. Please check your connection and try again.';
export const SEND_FAILED_MSG = 'Email could not be sent. Please try again.';
const EMAIL_RE = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/;
export const validRecipient = v => EMAIL_RE.test(String(v || '').trim());

const BASE = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''), KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const ENDPOINT = BASE ? `${BASE}/functions/v1/email-send` : '';
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };
export const newCommunicationId = () => crypto.randomUUID(); // idempotency key: one per email, reused if the user retries

async function call(init) { // null => the function is not reachable / not JSON
  try {
    const res = await fetch(ENDPOINT, { cache: 'no-store', ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
    if (!/application\/json/i.test(res.headers.get('content-type') || '')) return null;
    return { status: res.status, data: await res.json() };
  } catch { return null; }
}

// state: 'unavailable' | 'not_configured' | 'configured'
export async function getEmailStatus() {
  if (!ENDPOINT || !KEY) return { state: 'not_configured' };
  const r = await call({ method: 'GET' });
  if (!r || r.status !== 200 || typeof r.data?.configured !== 'boolean') return { state: 'unavailable' };
  return { state: r.data.configured ? 'configured' : 'not_configured' };
}
export function useEmailStatus() {
  const [st, setSt] = useState({ state: 'loading' });
  const refresh = useCallback(() => getEmailStatus().then(setSt), []);
  useEffect(() => { let on = true; getEmailStatus().then(r => { if (on) setSt(r); }); return () => { on = false; }; }, []);
  return [st, refresh];
}

// -> { ok: true, status: 'sent', sentAt, from }   ("sent" = accepted by Google Apps Script/MailApp, NOT confirmed delivered)
//  | { ok: false, message, attempted }            attempted=true when a real send was tried and failed (record it as Failed)
export async function sendEmail({
  to,
  subject,
  message,
  communicationId,
  clientId = '',
  leadId = '',
  attachments = []
}) {
  if (!ENDPOINT || !KEY) {
    return {
      ok: false,
      message: NOT_CONFIGURED_MSG,
      attempted: false
    };
  }

  const r = await call({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject,
      message,
      communicationId,
      clientId,
      leadId,
      attachments
    })
  });

  if (!r) {
    return {
      ok: false,
      message: UNAVAILABLE_MSG,
      attempted: false
    };
  }

  const d = r.data || {};

  if (
    r.status === 200 &&
    d.ok === true &&
    (d.status === 'sent' || d.duplicate === true)
  ) {
    return {
      ok: true,
      status: 'sent',
      sentAt: d.sentAt || '',
      from: d.from || '',
      attachmentCount: d.attachmentCount || 0
    };
  }

  return {
    ok: false,
    message:
      typeof d.message === 'string' && d.message
        ? d.message
        : SEND_FAILED_MSG,
    attempted: d.attempted === true
  };
}