// Onboarding domain actions. UI calls these; they all commit through mutate() + recalc() so statuses stay consistent.
import { getState, mutate, db } from '../data/store.js';
import { startCycle } from '../data/actions.js';
import { demoOnboarding } from './demo.js';
import { addOnboarding, recalc, syncClient, addEvent, gate } from './logic.js';
import { uid, today, ym, monthLabel } from '../data/util.js';

const by = (arr, id) => arr.find(x => x.id === id);
const run = (id, fn) => mutate(st => recalc(fn(st), [id]));
const patchRec = (st, id, patch) => ({ ...st, onboardingRecords: st.onboardingRecords.map(r => r.id === id ? { ...r, ...patch } : r) });

/* ----- New Client wizard ----- */
export function createLead(form) {
  const c = db.insert('clients', { ...form, status: 'New Lead', startDate: '' });
  mutate(st => addEvent(st, '', 'Client created (New Lead)', c.id)); return c.id;
}
export const updateLead = (id, form) => db.update('clients', id, form);

// marketplaces: [{ key, marketplaceId, otherName, storeName, sellerId, storeUrl, accountStatus, notes }]; services: [{ mpKey, serviceId }]
export function submitOnboarding({ clientId, marketplaces, services, dueDate }) {
  const idOf = {};
  marketplaces.forEach(m => {
    let id = m.marketplaceId;
    if (!id) { const name = (m.otherName || '').trim(), ex = getState().marketplaces.find(x => x.name.toLowerCase() === name.toLowerCase()); id = ex ? ex.id : db.insert('marketplaces', { name }).id; }
    idOf[m.key] = id;
    const acc = { storeName: m.storeName || '', sellerId: m.sellerId || '', storeUrl: m.storeUrl || '', accountStatus: m.accountStatus || 'Unknown', notes: m.notes || '' };
    const ex = getState().clientAccounts.find(a => a.clientId === clientId && a.marketplaceId === id);
    if (ex) db.update('clientAccounts', ex.id, acc); else db.insert('clientAccounts', { clientId, marketplaceId: id, ...acc });
  });
  const selections = services.map(x => ({ marketplaceId: idOf[x.mpKey], serviceId: x.serviceId })).filter(x => x.marketplaceId);
  let ids = [];
  mutate(st => { const r = addOnboarding(st, { clientId, selections, dueDate }); ids = r.ids; return r.state; });
  return ids;
}
export const saveAccount = (clientId, marketplaceId, patch) => {
  const ex = getState().clientAccounts.find(a => a.clientId === clientId && a.marketplaceId === marketplaceId);
  if (ex) db.update('clientAccounts', ex.id, patch); else db.insert('clientAccounts', { clientId, marketplaceId, storeName: '', sellerId: '', storeUrl: '', accountStatus: 'Unknown', notes: '', ...patch });
};
export const addDemoOnboarding = () => mutate(st => demoOnboarding(st));

/* ----- Tasks ----- */
export function updateTask(id, patch) {
  const t = by(getState().onboardingTasks, id); if (!t) return;
  const p = { ...patch }; if (p.status) p.completedAt = p.status === 'Completed' ? (t.completedAt || today()) : '';
  run(t.onboardingId, st => { let n = { ...st, onboardingTasks: st.onboardingTasks.map(x => x.id === id ? { ...x, ...p } : x) };
    if (p.status && p.status !== t.status) n = addEvent(n, t.onboardingId, `Task "${t.name}": ${t.status} → ${p.status}`); return n; });
}
export function addTask(onboardingId, row) {
  const s = getState(), rec = by(s.onboardingRecords, onboardingId), cs = by(s.clientServices, rec.clientServiceId), seq = (s.meta.onbSeq || 0) + 1;
  const mine = s.onboardingTasks.filter(t => t.onboardingId === onboardingId);
  const t = { id: uid('ot'), code: 'OT-' + String(seq).padStart(4, '0'), onboardingId, clientId: rec.clientId, clientServiceId: cs.id, marketplaceId: cs.marketplaceId, serviceId: cs.serviceId,
    name: '', description: '', category: '', status: 'Pending', priority: 'Medium', dueDate: rec.dueDate || today(), assignee: '', notes: '', clientDependency: false, completedAt: '', key: '', order: mine.length, ...row };
  if (t.clientDependency && t.status === 'Pending') t.status = 'Waiting for Client';
  if (t.status === 'Completed') t.completedAt = today();
  run(onboardingId, st => addEvent({ ...st, meta: { ...st.meta, onbSeq: seq }, onboardingTasks: [...st.onboardingTasks, t] }, onboardingId, `Task added: ${t.name}`));
}
export function deleteTask(id) {
  const t = by(getState().onboardingTasks, id); if (!t) return;
  run(t.onboardingId, st => addEvent({ ...st, onboardingTasks: st.onboardingTasks.filter(x => x.id !== id) }, t.onboardingId, `Task removed: ${t.name}`));
}

/* ----- Client requirements ----- */
const stamp = (r, patch) => {
  const p = { ...patch }, st = p.status ?? r.status, d = today();
  if (p.status && p.status !== r.status) {
    if (['Requested', 'Received', 'Verified', 'Rejected'].includes(st) && !(p.requestedAt ?? r.requestedAt)) p.requestedAt = d;
    if (['Received', 'Verified'].includes(st) && !(p.receivedAt ?? r.receivedAt)) p.receivedAt = d;
    if (st === 'Verified') p.verifiedAt = p.verifiedAt || d;
  }
  return p;
};
export function updateReq(id, patch) {
  const r = by(getState().onboardingRequirements, id); if (!r) return; const p = stamp(r, patch);
  run(r.onboardingId, st => { let n = { ...st, onboardingRequirements: st.onboardingRequirements.map(x => x.id === id ? { ...x, ...p } : x) };
    if (p.status && p.status !== r.status) n = addEvent(n, r.onboardingId, `Requirement "${r.name}": ${r.status} → ${p.status}`); return n; });
}
export function addReq(onboardingId, row) {
  const s = getState(), rec = by(s.onboardingRecords, onboardingId), cs = by(s.clientServices, rec.clientServiceId);
  const r = { id: uid('orq'), onboardingId, clientId: rec.clientId, clientServiceId: cs.id, marketplaceId: cs.marketplaceId, serviceId: cs.serviceId, name: '', description: '', category: '', required: true,
    status: 'Not Requested', requestedAt: '', receivedAt: '', verifiedAt: '', notes: '', order: s.onboardingRequirements.filter(x => x.onboardingId === onboardingId).length, ...row };
  Object.assign(r, stamp({ status: 'Not Requested', requestedAt: r.requestedAt, receivedAt: r.receivedAt }, { status: r.status }));
  run(onboardingId, st => addEvent({ ...st, onboardingRequirements: [...st.onboardingRequirements, r] }, onboardingId, `Requirement added: ${r.name}`));
}
export function deleteReq(id) {
  const r = by(getState().onboardingRequirements, id); if (!r) return;
  run(r.onboardingId, st => addEvent({ ...st, onboardingRequirements: st.onboardingRequirements.filter(x => x.id !== id) }, r.onboardingId, `Requirement removed: ${r.name}`));
}
export function requestAll(onboardingId) {
  const todo = getState().onboardingRequirements.filter(r => r.onboardingId === onboardingId && r.status === 'Not Requested'); if (!todo.length) return 0;
  run(onboardingId, st => addEvent({ ...st, onboardingRequirements: st.onboardingRequirements.map(r => r.onboardingId === onboardingId && r.status === 'Not Requested' ? { ...r, status: 'Requested', requestedAt: today() } : r) },
    onboardingId, `Requested from client: ${todo.map(r => r.name).join(', ')}`));
  return todo.length;
}

/* ----- Ready to Start gate, hold, start service ----- */
export function markReady(id) {
  const s = getState(), rec = by(s.onboardingRecords, id), g = gate(s, rec);
  if (!g.ok) return { ok: false, gate: g };
  run(id, st => addEvent(patchRec(st, id, { status: 'Ready to Start', readyAt: today(), forced: false, forceReason: '' }), id, 'Marked Ready to Start — all checks passed'));
  return { ok: true };
}
export function forceReady(id, reason) {
  if (!String(reason || '').trim()) throw new Error('A reason is required to force Ready to Start.');
  const s = getState(), rec = by(s.onboardingRecords, id), g = gate(s, rec);
  run(id, st => addEvent(patchRec(st, id, { status: 'Ready to Start', readyAt: today(), forced: true, forceReason: reason.trim() }), id,
    `Forced Ready to Start. Reason: ${reason.trim()}${g.missing.length ? ` · Missing at the time: ${g.missing.join('; ')}` : ''}`));
}
export const reopen = id => run(id, st => addEvent(patchRec(st, id, { status: 'Onboarding', readyAt: '', forced: false, forceReason: '' }), id, 'Onboarding reopened'));
export const setHold = (id, on) => run(id, st => addEvent(patchRec(st, id, { status: on ? 'On Hold' : 'Onboarding' }), id, on ? 'Put on hold' : 'Resumed from hold'));

// Ready to Start -> Active + first monthly service cycle. Reuses MVP 1's startCycle/planCycle (no duplicated task generation).
export function startService(id) {
  const s = getState(), rec = by(s.onboardingRecords, id); if (!rec) throw new Error('Onboarding record not found.');
  if (rec.status !== 'Ready to Start') throw new Error('Mark this onboarding as Ready to Start before starting the service.');
  const month = ym(new Date()), now = new Date(), existing = s.cycles.find(c => c.clientServiceId === rec.clientServiceId && c.month === month);
  const cycleId = existing ? existing.id : startCycle(rec.clientServiceId, month, now.getDate()); // throws (nothing changed) if no service template exists
  const tasks = getState().tasks.filter(t => t.cycleId === cycleId).length;
  run(id, st => { let n = patchRec(st, id, { status: 'Active', startedAt: today(), cycleId });
    n = { ...n, clients: n.clients.map(c => c.id === rec.clientId ? { ...c, startDate: c.startDate || today() } : c) };
    return addEvent(n, id, `Service started — ${monthLabel(month)} service cycle ${existing ? 'already existed' : 'created'} with ${tasks} monthly tasks`); });
  return { cycleId, month, tasks, clientId: rec.clientId };
}
export function deleteOnboarding(id) {
  const rec = by(getState().onboardingRecords, id); if (!rec) return;
  mutate(st => {
    const out = r => r.onboardingId !== id, hasCycle = st.cycles.some(c => c.clientServiceId === rec.clientServiceId);
    const n = { ...st, onboardingRecords: st.onboardingRecords.filter(r => r.id !== id), onboardingTasks: st.onboardingTasks.filter(out), onboardingRequirements: st.onboardingRequirements.filter(out),
      onboardingEvents: st.onboardingEvents.filter(out), clientServices: hasCycle ? st.clientServices : st.clientServices.filter(c => c.id !== rec.clientServiceId) };
    return syncClient(recalc(n, n.onboardingRecords.filter(r => r.clientId === rec.clientId).map(r => r.id)), rec.clientId);
  });
}
