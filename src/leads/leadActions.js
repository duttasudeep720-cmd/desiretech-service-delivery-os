// MVP 3D lead actions. Every change goes through mutate() and appends to the lead's simple activity array.
import { mutate, getState } from '../data/store.js';
import { uid } from '../data/util.js';
import { blankLead, leadTitle, convertedClient } from './leadDefaults.js';

const nowISO = () => new Date().toISOString();
const list = s => s.leads || [];
const ev = text => ({ id: uid('lev'), at: nowISO(), text });
const edit = (id, fn) => mutate(s => ({ ...s, leads: list(s).map(l => l.id === id ? { ...fn(l), updatedAt: nowISO() } : l) }));
const add = (l, ...texts) => ({ ...l, activity: [...(l.activity || []), ...texts.map(ev)] });
const FIELDS = ['leadName', 'contactName', 'email', 'phone', 'website', 'businessType', 'source', 'service', 'status', 'notes'];

export function saveLead(id, f) {
  const row = Object.fromEntries(FIELDS.map(k => [k, typeof f[k] === 'string' && k !== 'notes' ? f[k].trim() : (f[k] ?? '')]));
  row.companyName = row.leadName; row.marketplace = [...(f.marketplace || [])];
  if (id) {
    edit(id, l => add({ ...l, ...row }, ...(l.status !== row.status ? [`Status changed: ${l.status} → ${row.status}`] : [])));
    return id;
  }
  const n = nowISO(), nid = uid('led');
  mutate(s => ({ ...s, leads: [...list(s), { ...blankLead(), ...row, id: nid, createdAt: n, updatedAt: n, activity: [{ id: uid('lev'), at: n, text: 'Lead created' }] }] }));
  return nid;
}
export const setLeadStatus = (id, status) => edit(id, l => l.status === status ? l : add({ ...l, status }, `Status changed: ${l.status} → ${status}`));
export function assignProposal(id, proposalId) {
  const p = (getState().proposals || []).find(x => x.id === proposalId); if (!p) return false;
  edit(id, l => add({ ...l, proposalId: p.id, proposalName: p.name, proposalSentAt: l.proposalId === p.id ? l.proposalSentAt : '' }, `Proposal assigned: ${p.name}`)); return true;
}
export const clearProposal = id => edit(id, l => add({ ...l, proposalId: '', proposalName: '', proposalSentAt: '' }, `Proposal removed: ${l.proposalName || 'proposal'}`));
// Internal bookkeeping only - nothing is sent anywhere.
export function markProposalSent(id) {
  const l = list(getState()).find(x => x.id === id); if (!l || !l.proposalId) return false;
  edit(id, x => add({ ...x, status: 'Proposal Sent', proposalSentAt: nowISO() }, `Proposal marked sent: ${x.proposalName}${x.status !== 'Proposal Sent' ? ` — status changed ${x.status} → Proposal Sent` : ''}`)); return true;
}
// Called by the New Client wizard as soon as the client record exists. Never links twice and never creates a client itself.
export function linkLeadClient(id, clientId) {
  const s = getState(), l = list(s).find(x => x.id === id), c = s.clients.find(x => x.id === clientId); if (!l || !c || convertedClient(s, l)) return false;
  edit(id, x => add({ ...x, convertedClientId: clientId, status: 'Won' }, ...(x.status !== 'Won' ? [`Status changed: ${x.status} → Won`] : []), `Converted to client: ${c.company || c.name}`)); return true;
}
export const logLeadActivity = (id, text) => edit(id, l => add(l, text));
export const removeLead = id => mutate(s => ({ ...s, leads: list(s).filter(l => l.id !== id) }));
export { leadTitle };
