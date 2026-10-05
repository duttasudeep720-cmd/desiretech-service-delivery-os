import { mutate } from '../data/store.js';
import { uid } from '../data/util.js';

const nowISO = () => new Date().toISOString();
const list = s => s.proposals || [];
const FIELDS = ['name', 'category', 'marketplace', 'service', 'targetClientType', 'description', 'problem', 'servicesIncluded', 'deliverables', 'process', 'benefits', 'requirements', 'pricing', 'terms', 'callToAction', 'content', 'version', 'status', 'notes'];

export function saveProposal(id, f) {
  const row = Object.fromEntries(FIELDS.map(k => [k, typeof f[k] === 'string' && ['name', 'version'].includes(k) ? f[k].trim() : (f[k] ?? '')]));
  row.favorite = !!f.favorite;
  if (id) mutate(s => ({ ...s, proposals: list(s).map(p => p.id === id ? { ...p, ...row, updatedAt: nowISO() } : p) }));
  else mutate(s => ({ ...s, proposals: [...list(s), { id: uid('prp'), ...row, createdAt: nowISO(), updatedAt: nowISO() }] }));
}
export const patchProposal = (id, patch) => mutate(s => ({ ...s, proposals: list(s).map(p => p.id === id ? { ...p, ...patch, updatedAt: nowISO() } : p) }));
export const removeProposal = id => mutate(s => ({ ...s, proposals: list(s).filter(p => p.id !== id) }));
// Copy keeps the original untouched: new id, "Copy of ..." name, same version, Draft, not favorite.
export function duplicateProposal(id) {
  let newId = '';
  mutate(s => {
    const p = list(s).find(x => x.id === id); if (!p) return s;
    newId = uid('prp'); const c = { ...p, id: newId, name: 'Copy of ' + p.name, status: 'Draft', favorite: false, createdAt: nowISO(), updatedAt: nowISO() };
    const next = [...list(s)]; next.splice(list(s).indexOf(p) + 1, 0, c); return { ...s, proposals: next };
  });
  return newId;
}
