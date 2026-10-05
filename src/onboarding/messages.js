// Pure generator for onboarding messages. Output is editable text only - nothing is ever sent automatically.
import { by } from '../logic.js';
import { monthLabel, ym } from '../data/util.js';
import { progress, pendingReqs, recTasks } from './logic.js';

const SIGN = '\n\nRegards,\nDesireTech';
const NO_PW = 'Please do not share account passwords or OTPs — we will guide you on granting user access securely.';
const OPEN = ['Not Requested', 'Requested', 'Rejected'];

function scope(s, clientId, onboardingId) {
  if (onboardingId) { const r = by(s.onboardingRecords, onboardingId); return r ? [r] : []; }
  const all = s.onboardingRecords.filter(r => r.clientId === clientId);
  const open = all.filter(r => !['Active', 'On Hold'].includes(r.status));
  return open.length ? open : all;
}
const label = (s, rec) => { const cs = by(s.clientServices, rec.clientServiceId); return { mp: by(s.marketplaces, cs?.marketplaceId)?.name || '', sv: by(s.services, cs?.serviceId)?.name || '' }; };

// Bullet list of what we still need from the client, grouped by service when there is more than one record.
function needs(s, recs, { onlyUnrequested = false, details = '' } = {}) {
  const multi = recs.length > 1, blocks = [];
  recs.forEach(rec => {
    const l = label(s, rec);
    const reqs = onlyUnrequested ? pendingReqs(s, rec.id) : pendingReqs(s, rec.id).filter(r => OPEN.includes(r.status));
    const lines = reqs.map(r => `• ${r.name}${r.status === 'Rejected' ? ' (please resend — the earlier submission could not be accepted)' : ''}`);
    const confirm = recTasks(s, rec.id).filter(t => t.clientDependency && t.status === 'Waiting for Client').map(t => `• ${t.name}`);
    if (!lines.length && !confirm.length) return;
    const body = [...lines];
    if (confirm.length) body.push(...(lines.length ? ['', 'Please also confirm:'] : []), ...confirm);
    blocks.push((multi ? `${l.mp} · ${l.sv}:\n` : '') + body.join('\n'));
  });
  const extra = String(details || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => `• ${x}`);
  const all = [...blocks, ...(extra.length ? [extra.join('\n')] : [])];
  return all.length ? all.join('\n\n') : '• (none — all required information has been received)';
}

export function generateOnboardingMessage(s, { clientId, onboardingId, type, details }) {
  const client = by(s.clients, clientId), recs = scope(s, clientId, onboardingId), name = (client?.contact || client?.name || '').split(' ')[0] || '[Client Name]';
  const l0 = recs[0] ? label(s, recs[0]) : { mp: '[Marketplace]', sv: '[Service]' };
  const svc = recs.length > 1 ? 'your DesireTech services' : `your ${l0.sv} service on ${l0.mp}`;
  const hi = `Hi ${name},\n\n`;
  switch (type) {
    case 'Welcome':
      return hi + `Welcome to DesireTech! We are delighted to have you on board and look forward to managing ${svc}.\n\nHere is what happens next:\n• We have created your onboarding plan\n• We will share the information and access we need from you\n• Once everything is verified, we will start your monthly service activities` + SIGN;
    case 'Onboarding Started': {
      const n = recs.reduce((a, r) => a + recTasks(s, r.id).length, 0);
      return hi + `We have started setting up ${svc}. Our team has prepared an onboarding plan${n ? ` with ${n} setup steps` : ''}.\n\nWe will share the list of information and access we need from you shortly, so that we can complete the setup and begin the service activities.` + SIGN;
    }
    case 'Information Request':
      return hi + `To set up ${svc}, please share the following:\n\n${needs(s, recs, { details })}\n\n${NO_PW}\n\nOnce we receive these details, we can complete the setup and begin the service activities.` + SIGN;
    case 'Missing Information':
      return hi + `We have started setting up your DesireTech service.\n\nTo complete the onboarding, we still require:\n\n${needs(s, recs, { details })}\n\nOnce we receive these details, we can complete the setup and begin the service activities.` + SIGN;
    case 'Reminder':
      return hi + `This is a gentle reminder about the onboarding of ${svc}. We are still waiting for:\n\n${needs(s, recs, { details })}\n\nKindly share these at your earliest convenience so that we do not delay the start of the service.` + SIGN;
    case 'Onboarding Progress': {
      const lines = recs.map(r => { const p = progress(s, r.id), l = label(s, r); return `${recs.length > 1 ? `${l.mp} · ${l.sv}\n` : ''}• Overall progress: ${p.pct}%\n• Information received: ${p.reqGot} of ${p.reqTotal}\n• Setup tasks completed: ${p.tasksDone} of ${p.tasksTotal}`; });
      return hi + `Here is an update on the onboarding of ${svc}:\n\n${lines.join('\n\n')}${details ? '\n\n' + details : ''}` + SIGN;
    }
    case 'Ready to Start':
      return hi + `Great news — the onboarding for ${svc} is complete and everything is ready.\n\nWe will begin the ${monthLabel(ym(new Date()))} service activities now and keep you updated on progress.` + SIGN;
    default:
      return hi + (details || '[Message]') + SIGN;
  }
}
