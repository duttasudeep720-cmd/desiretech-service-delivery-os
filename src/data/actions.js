import { getState, mutate, commit, db } from './store.js';
import { planCycle, reportSections } from '../logic.js';
import { baseState, demoState } from './seed.js';
import { uid, addMonth } from './util.js';

export function saveClient(form, csKeys, id) {
  const cid = id || db.insert('clients', { ...form }).id;
  if (id) db.update('clients', id, form);
  const s = getState(), have = s.clientServices.filter(x => x.clientId === cid), want = new Set(csKeys);
  const add = csKeys.filter(k => !have.some(h => h.marketplaceId + '|' + h.serviceId === k)).map(k => { const [marketplaceId, serviceId] = k.split('|'); return { id: uid('cs'), clientId: cid, marketplaceId, serviceId }; });
  const rm = have.filter(h => !want.has(h.marketplaceId + '|' + h.serviceId) && !s.cycles.some(c => c.clientServiceId === h.id)).map(h => h.id);
  mutate(st => ({ ...st, clientServices: [...st.clientServices.filter(x => !rm.includes(x.id)), ...add] }));
  return cid;
}
const dropClients = (st, ids) => { const out = r => !ids.includes(r.clientId); return { ...st, clients: st.clients.filter(c => !ids.includes(c.id)), clientServices: st.clientServices.filter(out), cycles: st.cycles.filter(out), tasks: st.tasks.filter(out), issues: st.issues.filter(out), communications: st.communications.filter(out), reports: st.reports.filter(out),
  clientAccounts: (st.clientAccounts || []).filter(out), onboardingRecords: (st.onboardingRecords || []).filter(out), onboardingTasks: (st.onboardingTasks || []).filter(out), onboardingRequirements: (st.onboardingRequirements || []).filter(out), onboardingEvents: (st.onboardingEvents || []).filter(out) }; };
export const deleteClient = id => mutate(st => dropClients(st, [id]));
export const clearDemo = () => mutate(st => { const n = dropClients(st, st.clients.filter(c => c.demo).map(c => c.id)); return { ...n, leads: (n.leads || []).filter(l => !l.demo) }; });
export const resetDemo = () => commit(demoState());
export const wipeAll = () => commit(baseState());

export function startCycle(csId, month, startDay) {
  const s = getState();
  if (s.cycles.some(c => c.clientServiceId === csId && c.month === month)) throw new Error('That month already exists for this service.');
  const p = planCycle(s, csId, month, startDay);
  if (!p.hasTemplate || !p.tasks.length) throw new Error('No task template found for this marketplace + service. Create one in Service Templates first.');
  mutate(st => ({ ...st, meta: { ...st.meta, taskSeq: p.seq }, cycles: [...st.cycles, p.cycle], tasks: [...st.tasks, ...p.tasks] }));
  return p.cycle.id;
}
export function startNextMonth(csId) {
  const ms = getState().cycles.filter(c => c.clientServiceId === csId).map(c => c.month).sort();
  if (!ms.length) throw new Error('No previous month found.');
  return startCycle(csId, addMonth(ms[ms.length - 1], 1));
}
export function addTask(row) {
  const s = getState(), seq = s.meta.taskSeq + 1, cy = s.cycles.find(c => c.id === row.cycleId), cs = s.clientServices.find(c => c.id === cy.clientServiceId);
  const t = { id: uid('tsk'), code: 'T-' + String(seq).padStart(4, '0'), clientId: cy.clientId, marketplaceId: cs.marketplaceId, serviceId: cs.serviceId, month: cy.month, status: 'Pending', description: '', assignee: '', notes: '', result: '', issue: '', followUp: '', evidence: '', completedAt: '', order: 999, ...row };
  mutate(st => ({ ...st, meta: { ...st.meta, taskSeq: seq }, tasks: [...st.tasks, t] }));
}
export function createReport(cycleId) {
  const s = getState(), ex = s.reports.find(r => r.cycleId === cycleId); if (ex) return ex.id;
  const cy = s.cycles.find(c => c.id === cycleId);
  return db.insert('reports', { cycleId, clientId: cy.clientId, status: 'Draft', sections: reportSections(s, cy), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).id;
}
