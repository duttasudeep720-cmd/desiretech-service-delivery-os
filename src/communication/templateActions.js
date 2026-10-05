import { mutate } from '../data/store.js';
import { uid } from '../data/util.js';

const nowISO = () => new Date().toISOString();
const list = s => s.communicationTemplates || [];

export function saveCommTemplate(id, f) {
  const row = { name: f.name.trim(), category: f.category, marketplace: f.marketplace, service: f.service, channel: f.channel, subject: (f.subject || '').trim(), body: f.body, notes: (f.notes || '').trim(), favorite: !!f.favorite, active: !!f.active };
  if (id) mutate(s => ({ ...s, communicationTemplates: list(s).map(t => t.id === id ? { ...t, ...row, updatedAt: nowISO() } : t) }));
  else mutate(s => ({ ...s, communicationTemplates: [...list(s), { id: uid('ctp'), ...row, createdAt: nowISO(), updatedAt: nowISO() }] }));
}
export const patchCommTemplate = (id, patch) => mutate(s => ({ ...s, communicationTemplates: list(s).map(t => t.id === id ? { ...t, ...patch, updatedAt: nowISO() } : t) }));
export const removeCommTemplate = id => mutate(s => ({ ...s, communicationTemplates: list(s).filter(t => t.id !== id) }));
export function duplicateCommTemplate(id) {
  mutate(s => {
    const t = list(s).find(x => x.id === id); if (!t) return s;
    const i = list(s).indexOf(t), c = { ...t, id: uid('ctp'), name: t.name + ' (Copy)', favorite: false, createdAt: nowISO(), updatedAt: nowISO() };
    const next = [...list(s)]; next.splice(i + 1, 0, c); return { ...s, communicationTemplates: next };
  });
}
