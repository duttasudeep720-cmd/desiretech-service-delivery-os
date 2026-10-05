// MVP 3F - WhatsApp click-to-chat helpers. Pure functions + one history recorder. No network, no credentials.
import { db } from '../data/store.js';
import { today } from '../data/util.js';
import { logLeadActivity } from '../leads/leadActions.js';

export const MSG_NO_PHONE = 'Please add a valid phone number before opening WhatsApp.';
export const MSG_BAD_PHONE = 'Please enter a valid international phone number.';
export const MSG_NO_MESSAGE = 'Please enter a message before opening WhatsApp.';
export const WA_STATUS = 'WhatsApp Opened';

// -> digits only (country code included, no "+"), or '' when empty/invalid.
// 8310747603 -> 918310747603 | +91 83107 47603 -> 918310747603 | 08310747603 -> 918310747603 | +1 415 555 2671 -> 14155552671
export function normalizePhone(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  const intl = s.startsWith('+') || s.startsWith('00');
  let d = s.replace(/\D/g, '');
  if (s.startsWith('00')) d = d.slice(2);
  if (!d) return '';
  if (!intl) {
    if (d.length === 10 && /^[6-9]/.test(d)) d = '91' + d;          // Indian mobile without country code
    else if (d.length === 11 && d[0] === '0' && /^[6-9]/.test(d[1])) d = '91' + d.slice(1); // 0 + Indian mobile
  } else if (d.startsWith('91') && d.length === 13 && d[2] === '0') d = '91' + d.slice(3);   // +91 0xxxxxxxxxx
  else if (d.length === 10 && /^[6-9]/.test(d) && s.replace(/\D/g, '').length === 10) d = '91' + d;
  return /^[1-9]\d{7,14}$/.test(d) && !(d.startsWith('91') && d.length !== 12) ? d : '';
}
// -> '' when fine, otherwise the exact message to show.
export function phoneProblem(raw) { return !String(raw ?? '').trim() ? MSG_NO_PHONE : normalizePhone(raw) ? '' : MSG_BAD_PHONE; }
export const waLink = (phone, message) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

// Reuses the EXISTING communications collection. Opening WhatsApp is NOT "Sent".
export function recordWhatsAppOpened({ meta = {}, phone, message }) {
  const row = db.insert('communications', {
    clientId: meta.clientId || '', leadId: meta.leadId || '', leadName: meta.leadName || '', date: today(), type: 'General',
    status: WA_STATUS, channel: 'WhatsApp', direction: 'Outbound', recipient: phone, subject: '', message,
    openedAt: new Date().toISOString(),
    template: meta.template || '', templateId: meta.templateId || '', category: meta.category || '', marketplace: meta.marketplace || '', service: meta.service || '', createdBy: meta.createdBy || '',
    relatedTaskId: meta.relatedTaskId || '', relatedIssueId: meta.relatedIssueId || '', relatedReportId: meta.relatedReportId || '',
  });
  if (meta.leadId) logLeadActivity(meta.leadId, `WhatsApp opened for ${phone}${meta.template ? ': ' + meta.template : ''} (not confirmed as sent)`);
  return row.id;
}
