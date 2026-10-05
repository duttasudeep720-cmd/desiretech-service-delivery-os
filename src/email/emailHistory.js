// MVP 3E/3G - an email accepted by Email Automation ("Sent", never "delivered") or a failed attempt ("Failed") is stored in the EXISTING Communication History (same `communications` collection).
import { db, getState } from '../data/store.js';
import { by } from '../logic.js';
import { today } from '../data/util.js';
import { logLeadActivity } from '../leads/leadActions.js';

// meta: the context the generator already knows (client/lead/template/marketplace/service...). histId: an earlier
// "Save to History" record for the same unchanged message - it is upgraded to Sent instead of creating a duplicate.
export function recordSentEmail({ meta = {}, histId = '', to, subject, message, from = '', commId = '' }) {
  const row = {
    clientId: meta.clientId || '', leadId: meta.leadId || '', leadName: meta.leadName || '', date: today(), type: 'General',
    status: 'Sent', channel: 'Email', direction: 'Outbound', recipient: to, subject, message, sentAt: new Date().toISOString(), sentFrom: from, emailCommId: commId,
    template: meta.template || '', templateId: meta.templateId || '', category: meta.category || '', marketplace: meta.marketplace || '', service: meta.service || '', createdBy: meta.createdBy || '',
    relatedTaskId: meta.relatedTaskId || '', relatedIssueId: meta.relatedIssueId || '', relatedReportId: meta.relatedReportId || '',
  };
  const old = histId && by(getState().communications, histId);
  const failed = commId && getState().communications.find(c => c.emailCommId === commId && c.status === 'Failed'); // a retry that finally worked upgrades its own Failed row
  let id; if (old && old.status === 'Pending') { db.update('communications', histId, row); id = histId; } else if (failed) { db.update('communications', failed.id, { ...row, error: '' }); id = failed.id; } else id = db.insert('communications', row).id;
  if (meta.leadId) logLeadActivity(meta.leadId, `Email sent to ${to}: ${subject}`);
  return id;
}

// A real send attempt that failed is kept in the same history so it is visible and debuggable. error is a safe message (no secrets).
export function recordFailedEmail({ meta = {}, to, subject, message, error = '', commId = '' }) {
  const old = getState().communications.find(c => c.emailCommId === commId && c.status === 'Failed');
  const patch = { error, failedAt: new Date().toISOString() };
  if (old) { db.update('communications', old.id, { ...patch, recipient: to, subject, message, attempts: (old.attempts || 1) + 1 }); return old.id; }
  return db.insert('communications', {
    clientId: meta.clientId || '', leadId: meta.leadId || '', leadName: meta.leadName || '', date: today(), type: 'General',
    status: 'Failed', channel: 'Email', direction: 'Outbound', recipient: to, subject, message, ...patch, attempts: 1, emailCommId: commId,
    template: meta.template || '', templateId: meta.templateId || '', category: meta.category || '', marketplace: meta.marketplace || '', service: meta.service || '', createdBy: meta.createdBy || '',
    relatedTaskId: meta.relatedTaskId || '', relatedIssueId: meta.relatedIssueId || '', relatedReportId: meta.relatedReportId || '',
  }).id;
}
