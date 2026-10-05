// Pure onboarding rules (no storage, no React). Same style as src/logic.js.
import { uid, today, addDays, diffDays } from '../data/util.js';
import { BASIC_ITEMS } from './defaults.js';

export const ONB_STATUS = ['New Lead', 'Onboarding', 'Waiting for Client', 'Internal Review', 'Ready to Start', 'Active', 'On Hold'];
export const ONB_TASK_STATUS = ['Pending', 'In Progress', 'Waiting for Client', 'Completed', 'Blocked'];
export const REQ_STATUS = ['Not Requested', 'Requested', 'Received', 'Verified', 'Rejected', 'Not Required'];
export const ACCOUNT_STATUS = ['Active', 'Not Created Yet', 'Under Review', 'Suspended', 'Unknown'];
export const ONB_CATEGORIES = ['Client Info', 'Account Access', 'Account Info', 'Business', 'Brand', 'Catalog', 'Listings', 'Advertising', 'Inventory', 'Pricing', 'Account Health', 'Operations', 'Performance', 'Planning', 'Reporting', 'Scope & Planning', 'Communication', 'Review', 'Information'];
export const ONB_COMM_TYPES = ['Welcome', 'Onboarding Started', 'Information Request', 'Missing Information', 'Reminder', 'Onboarding Progress', 'Ready to Start'];
const ONBOARDING_ONLY_STATUS = ['New Lead', 'Onboarding', 'Waiting for Client', 'Internal Review', 'Ready to Start'];
const GOT = ['Received', 'Verified', 'Not Required'];
const by = (arr, id) => arr.find(x => x.id === id);

// Never keep passwords / OTPs in notes (localStorage is not a secret store).
export const looksSecret = (...vals) => vals.some(v => /\b(password|passwd|pwd|passcode|otp|pin)\b\s*(is|:|=|-)/i.test(String(v || '')));
export const SECRET_MSG = 'Please remove passwords / OTPs — never store login secrets here. Ask the client to grant user access instead.';

export const recTasks = (s, id) => s.onboardingTasks.filter(t => t.onboardingId === id);
export const recReqs = (s, id) => s.onboardingRequirements.filter(r => r.onboardingId === id);
// Required client information that has not been received yet.
export const pendingReqs = (s, id) => recReqs(s, id).filter(r => r.required && !GOT.includes(r.status));
// Everything we are waiting on the client for: pending required info + client-dependent tasks waiting.
export const waitingItems = (s, id) => [
  ...pendingReqs(s, id).map(r => ({ kind: 'requirement', id: r.id, name: r.name, status: r.status })),
  ...recTasks(s, id).filter(t => t.status === 'Waiting for Client').map(t => ({ kind: 'task', id: t.id, name: t.name, status: t.status })),
];

export function progress(s, id) {
  const tasks = recTasks(s, id), reqs = recReqs(s, id).filter(r => r.status !== 'Not Required');
  const tasksDone = tasks.filter(t => t.status === 'Completed').length, reqGot = reqs.filter(r => r.status === 'Received' || r.status === 'Verified').length;
  const total = tasks.length + reqs.length, done = tasksDone + reqGot, pct = total ? Math.round(done / total * 100) : 0;
  const p = (a, b) => (b ? Math.round(a / b * 100) : 0);
  return { tasksDone, tasksTotal: tasks.length, reqGot, reqTotal: reqs.length, done, total, pct, tasksPct: p(tasksDone, tasks.length), reqPct: p(reqGot, reqs.length) };
}

export function recInfo(s, rec) {
  const cs = by(s.clientServices, rec.clientServiceId);
  return { rec, cs, client: by(s.clients, rec.clientId), mp: by(s.marketplaces, cs?.marketplaceId), sv: by(s.services, cs?.serviceId),
    tasks: recTasks(s, rec.id), reqs: recReqs(s, rec.id), prog: progress(s, rec.id), waiting: waitingItems(s, rec.id), pending: pendingReqs(s, rec.id), status: rec.status };
}

/* ---------- Ready-to-Start gate ---------- */
export function gate(s, rec) {
  const client = by(s.clients, rec.clientId), cs = by(s.clientServices, rec.clientServiceId), tasks = recTasks(s, rec.id), scope = tasks.filter(t => t.key === 'scope');
  const items = [
    { label: 'Client basic information complete', miss: client?.name?.trim() && (client.email?.trim() || client.phone?.trim()) ? [] : ['Client basic information (name and email or phone)'] },
    { label: 'Marketplace selected', miss: cs?.marketplaceId ? [] : ['Marketplace'] },
    { label: 'Service selected', miss: cs?.serviceId ? [] : ['Service'] },
    { label: 'Required client information received', miss: pendingReqs(s, rec.id).map(r => `Client information: ${r.name} (${r.status})`) },
    { label: 'Required onboarding tasks completed', miss: tasks.filter(t => t.key !== 'scope' && t.status !== 'Completed').map(t => `Task: ${t.name} (${t.status})`) },
    { label: 'Service scope confirmed', miss: scope.every(t => t.status === 'Completed') ? [] : ['Service scope confirmation'] },
  ].map(i => ({ ...i, ok: !i.miss.length }));
  return { ok: items.every(i => i.ok), items, missing: items.flatMap(i => i.miss) };
}

/* ---------- Status ---------- */
// Manual statuses stay as set; otherwise derived from the work: DesireTech still has to request info -> Onboarding,
// waiting on the client -> Waiting for Client, everything in from the client -> Internal Review.
export function deriveStatus(s, rec) {
  if (['Active', 'On Hold', 'Ready to Start'].includes(rec.status)) return rec.status;
  const reqs = recReqs(s, rec.id), tasks = recTasks(s, rec.id);
  if (reqs.some(r => r.required && r.status === 'Not Requested')) return 'Onboarding';
  if (waitingItems(s, rec.id).length) return 'Waiting for Client';
  if (!reqs.length && tasks.some(t => t.status !== 'Completed')) return 'Onboarding';
  return 'Internal Review';
}

export function syncClient(st, clientId) {
  const c = by(st.clients, clientId); if (!c) return st;
  const recs = st.onboardingRecords.filter(r => r.clientId === clientId), serving = st.cycles.some(y => y.clientId === clientId);
  let status;
  if (!recs.length) status = ONBOARDING_ONLY_STATUS.includes(c.status) && !serving ? 'New Lead' : c.status;
  else if (recs.some(r => r.status === 'Active') || serving) status = ['On Hold', 'Completed'].includes(c.status) && !recs.some(r => r.status === 'Active') ? c.status : 'Active';
  else if (recs.every(r => r.status === 'On Hold')) status = 'On Hold';
  else { const rank = ['Onboarding', 'Waiting for Client', 'Internal Review', 'Ready to Start']; status = recs.map(r => r.status).filter(x => x !== 'On Hold').sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0]; }
  return status === c.status ? st : { ...st, clients: st.clients.map(x => x.id === clientId ? { ...x, status } : x) };
}
// Re-derive record status(es) and the client roll-up after any onboarding change. Pure.
export function recalc(st, ids) {
  let n = st; const clients = new Set();
  ids.forEach(id => { const r = by(n.onboardingRecords, id); if (!r) return; clients.add(r.clientId);
    const status = deriveStatus(n, r); if (status !== r.status) n = { ...n, onboardingRecords: n.onboardingRecords.map(x => x.id === id ? { ...x, status } : x) }; });
  clients.forEach(c => { n = syncClient(n, c); });
  return n;
}
export const addEvent = (st, onboardingId, text, clientId) => {
  const rec = by(st.onboardingRecords, onboardingId);
  return { ...st, onboardingEvents: [...st.onboardingEvents, { id: uid('evt'), onboardingId: onboardingId || '', clientId: rec?.clientId || clientId || '', date: today(), at: new Date().toISOString(), text }] };
};

/* ---------- Plan generation ---------- */
export function resolveTemplate(s, mpId, svId) {
  return s.onboardingTemplates.find(t => t.marketplaceId === mpId && t.serviceId === svId) || s.onboardingTemplates.find(t => !t.marketplaceId && t.serviceId === svId) || null;
}
export function buildPlan(s, { rec, client, cs, account, createdDate, dueDate }) {
  const tpl = resolveTemplate(s, cs.marketplaceId, cs.serviceId);
  const items = tpl ? s.onboardingTemplateItems.filter(i => i.templateId === tpl.id).sort((a, b) => a.order - b.order) : BASIC_ITEMS;
  const tItems = items.filter(i => i.kind === 'task'), rItems = items.filter(i => i.kind === 'requirement');
  // Business rule: every plan needs a scope-confirmation task, even if a template was edited to remove it.
  if (!tItems.some(i => i.key === 'scope')) tItems.push({ kind: 'task', name: 'Service scope confirmed', category: 'Scope & Planning', priority: 'High', clientDependency: true, key: 'scope', auto: '', description: 'Client confirms what is and is not included in the service.' });
  const n = tItems.length, span = Math.max(1, diffDays(createdDate, dueDate)); let seq = s.meta.onbSeq || 0;
  const infoOk = !!(client?.name && (client.email || client.phone)), storeOk = !!(account && (account.storeName || account.sellerId || account.storeUrl));
  const base = { onboardingId: rec.id, clientId: rec.clientId, clientServiceId: cs.id, marketplaceId: cs.marketplaceId, serviceId: cs.serviceId };
  const tasks = tItems.map((it, i) => {
    const auto = (it.auto === 'client_info' && infoOk) || (it.auto === 'store_info' && storeOk);
    return { id: uid('ot'), code: 'OT-' + String(++seq).padStart(4, '0'), ...base, name: it.name, description: it.description || '', category: it.category || '',
      status: auto ? 'Completed' : it.clientDependency ? 'Waiting for Client' : 'Pending', priority: it.priority || 'Medium', dueDate: addDays(createdDate, Math.round((i + 1) / n * span)),
      assignee: '', notes: '', clientDependency: !!it.clientDependency, completedAt: auto ? createdDate : '', key: it.key || '', order: i };
  });
  const reqs = rItems.map((it, i) => ({ id: uid('orq'), ...base, name: it.name, description: it.description || '', category: it.category || '', required: it.required !== false,
    status: 'Not Requested', requestedAt: '', receivedAt: '', verifiedAt: '', notes: '', order: i }));
  return { tasks, reqs, seq, usedTemplate: !!tpl };
}

// Adds client services (if missing) + one onboarding record with a generated plan for each selection. Pure; returns new state.
export function addOnboarding(s, { clientId, selections, dueDate, createdDate = today() }) {
  const st = { ...s, meta: { ...s.meta }, clientServices: [...s.clientServices], onboardingRecords: [...s.onboardingRecords], onboardingTasks: [...s.onboardingTasks], onboardingRequirements: [...s.onboardingRequirements], onboardingEvents: [...s.onboardingEvents] };
  const client = by(st.clients, clientId), ids = [];
  selections.forEach(({ marketplaceId, serviceId }) => {
    let cs = st.clientServices.find(c => c.clientId === clientId && c.marketplaceId === marketplaceId && c.serviceId === serviceId);
    if (!cs) { cs = { id: uid('cs'), clientId, marketplaceId, serviceId }; st.clientServices.push(cs); }
    if (st.onboardingRecords.some(r => r.clientServiceId === cs.id)) return;
    const rec = { id: uid('onb'), clientId, clientServiceId: cs.id, status: 'Onboarding', createdAt: createdDate, dueDate, readyAt: '', forced: false, forceReason: '', startedAt: '', cycleId: '' };
    const account = (st.clientAccounts || []).find(a => a.clientId === clientId && a.marketplaceId === marketplaceId);
    const plan = buildPlan(st, { rec, client, cs, account, createdDate, dueDate });
    st.meta.onbSeq = plan.seq; st.onboardingRecords.push(rec); st.onboardingTasks.push(...plan.tasks); st.onboardingRequirements.push(...plan.reqs);
    const mp = by(st.marketplaces, marketplaceId)?.name, sv = by(st.services, serviceId)?.name;
    st.onboardingEvents.push({ id: uid('evt'), onboardingId: rec.id, clientId, date: createdDate, at: new Date().toISOString(),
      text: `Onboarding plan created for ${mp} · ${sv}: ${plan.tasks.length} tasks, ${plan.reqs.length} client requirements${plan.usedTemplate ? '' : ' (basic checklist — no onboarding template for this service yet)'}` });
    ids.push(rec.id);
  });
  return { state: recalc(st, ids), ids };
}

/* ---------- Alerts ---------- */
export function onboardingAlerts(s, td = today()) {
  const out = [];
  s.onboardingRecords.forEach(rec => {
    if (rec.status === 'Active' || rec.status === 'On Hold') return;
    const { client: c, mp, sv, tasks, pending } = recInfo(s, rec); if (!c) return;
    const href = '#/onboarding/' + rec.id, clientId = c.id, lab = `${mp?.name} · ${sv?.name}`, k = (kind, text) => out.push({ kind, text, clientId, href });
    if (rec.status === 'Ready to Start') return k('Ready to Start', `${c.company} is ready to start service — ${lab}`);
    const od = tasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < td).length;
    if (od || (rec.dueDate && rec.dueDate < td)) k('Overdue', `${mp?.name} onboarding for ${c.company} is overdue${od ? ` (${od} task${od > 1 ? 's' : ''} past due)` : ''}`);
    const bl = tasks.filter(t => t.status === 'Blocked').length; if (bl) k('Blocked', `${mp?.name} account setup is blocked for ${c.company} (${bl} task${bl > 1 ? 's' : ''})`);
    if (pending.length) k('Waiting for Client', `${c.company} has ${pending.length} pending client requirement${pending.length > 1 ? 's' : ''} — ${lab}`);
  });
  return out;
}
