// Data layer: swap this file's persistence (localStorage) for Supabase later; UI only uses useStore/db/mutate.
import { useSyncExternalStore } from 'react';
import { demoState, addExtraServiceTemplates } from './seed.js';
import { seedOnboardingTemplates } from '../onboarding/defaults.js';
import { uid } from './util.js';
import { seedCommTemplates } from '../communication/templateDefaults.js';
import { seedProposals } from '../proposals/proposalDefaults.js';
import { demoLeads } from '../leads/leadDefaults.js';
const KEY = 'desiretech-sdos-v1';
// MVP 1 -> MVP 2: adds the onboarding collections to data saved by MVP 1 (idempotent, never deletes anything).
const NEW = ['clientAccounts', 'onboardingRecords', 'onboardingTasks', 'onboardingRequirements', 'onboardingTemplates', 'onboardingTemplateItems', 'onboardingEvents'];
function migrateMvp2(s) {
  if (s.meta?.mvp2 && NEW.every(k => Array.isArray(s[k]))) return s;
  const n = { ...s, meta: { ...s.meta, onbSeq: s.meta?.onbSeq || 0 } };
  NEW.forEach(k => { if (!Array.isArray(n[k])) n[k] = []; });
  if (!n.meta.mvp2) { // one-time: default onboarding templates + monthly templates for services MVP 1 had none for
    n.meta.mvp2 = true;
    if (!n.onboardingTemplates.length) Object.assign(n, seedOnboardingTemplates());
    n.serviceTemplates = [...n.serviceTemplates]; n.templateTasks = [...n.templateTasks]; addExtraServiceTemplates(n.serviceTemplates, n.templateTasks);
  }
  return n;
}
// MVP 2 -> MVP 3A: adds communicationTemplates. Starter templates are seeded ONCE (meta.mvp3a), never re-created after the user deletes them.
function migrateMvp3a(s) {
  const n = migrateMvp2(s);
  if (n.meta?.mvp3a && Array.isArray(n.communicationTemplates)) return n;
  const list = Array.isArray(n.communicationTemplates) ? n.communicationTemplates : n.meta?.mvp3a ? [] : seedCommTemplates(n);
  return { ...n, meta: { ...n.meta, mvp3a: true }, communicationTemplates: list };
}
// MVP 3A -> MVP 3C: adds proposals. Starter proposals are seeded ONCE (meta.mvp3c), never re-created after the user deletes them.
function migrateMvp3c(s) {
  const n = migrateMvp3a(s);
  if (n.meta?.mvp3c && Array.isArray(n.proposals)) return n;
  const list = Array.isArray(n.proposals) ? n.proposals : n.meta?.mvp3c ? [] : seedProposals();
  return { ...n, meta: { ...n.meta, mvp3c: true }, proposals: list };
}
// MVP 3C -> MVP 3D: adds leads. Demo leads are added ONCE (meta.mvp3d), and only when the data already contains demo clients.
export function migrate(s) {
  const n = migrateMvp3c(s);
  if (n.meta?.mvp3d && Array.isArray(n.leads)) return n;
  const list = Array.isArray(n.leads) ? n.leads : n.meta?.mvp3d ? [] : n.clients.some(c => c.demo) ? demoLeads(n) : [];
  return { ...n, meta: { ...n.meta, mvp3d: true }, leads: list };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) { const m = migrate(s); if (m !== s) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ } } return m; } }
  catch (e) { console.error('Could not read saved data', e); }
  const d = demoState(); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ }
  return d;
}
let state = load(); const subs = new Set();
export const getState = () => state;
export function commit(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { console.error('Save failed (storage full?)', e); }
  subs.forEach(f => f());
}
export const mutate = fn => commit(fn(state));
export const useStore = () => useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, getState);
export const db = {
  insert(t, row) { const r = { id: uid(t.slice(0, 3)), ...row }; mutate(s => ({ ...s, [t]: [...s[t], r] })); return r; },
  update(t, id, patch) { mutate(s => ({ ...s, [t]: s[t].map(r => r.id === id ? { ...r, ...patch } : r) })); },
  remove(t, id) { mutate(s => ({ ...s, [t]: s[t].filter(r => r.id !== id) })); },
};
