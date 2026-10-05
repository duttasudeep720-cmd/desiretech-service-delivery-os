import { useState } from 'react';
import { useStore, db, mutate } from '../data/store.js';
import { useUI, Opts, Empty, F } from '../ui.jsx';
import { by, PRIORITY } from '../logic.js';
import { uid } from '../data/util.js';
import { ONB_CATEGORIES } from './logic.js';
import { BASIC_ITEMS } from './defaults.js';

export default function OnboardingTemplates() {
  const s = useStore(), ui = useUI(); const [sel, setSel] = useState(s.onboardingTemplates[0]?.id || ''), [nw, setNw] = useState({ marketplaceId: '', serviceId: '' });
  const tpl = by(s.onboardingTemplates, sel), items = s.onboardingTemplateItems.filter(i => i.templateId === sel).sort((a, b) => a.order - b.order);
  const label = t => `${t.marketplaceId ? by(s.marketplaces, t.marketplaceId)?.name : 'Any marketplace'} — ${by(s.services, t.serviceId)?.name}`;
  const count = (t, k) => s.onboardingTemplateItems.filter(x => x.templateId === t.id && x.kind === k).length;
  const sorted = [...s.onboardingTemplates].sort((a, b) => label(a).localeCompare(label(b)));

  const create = () => {
    if (!nw.serviceId) return ui.toast('Choose a service.');
    if (s.onboardingTemplates.some(t => t.marketplaceId === nw.marketplaceId && t.serviceId === nw.serviceId)) return ui.toast('That onboarding template already exists.');
    const id = uid('otp');
    mutate(st => ({ ...st, onboardingTemplates: [...st.onboardingTemplates, { id, marketplaceId: nw.marketplaceId, serviceId: nw.serviceId }],
      onboardingTemplateItems: [...st.onboardingTemplateItems, ...BASIC_ITEMS.map((it, order) => ({ id: uid('oti'), templateId: id, ...it, order }))] }));
    setSel(id); setNw({ marketplaceId: '', serviceId: '' }); ui.toast('Template created from the basic checklist — edit it below.');
  };
  const move = (it, d) => { const o = items[items.indexOf(it) + d]; if (!o) return; mutate(st => ({ ...st, onboardingTemplateItems: st.onboardingTemplateItems.map(x => x.id === it.id ? { ...x, order: o.order } : x.id === o.id ? { ...x, order: it.order } : x) })); };
  const add = kind => db.insert('onboardingTemplateItems', { templateId: sel, kind, name: kind === 'task' ? 'New task' : 'New requirement', description: '', category: '', priority: 'Medium', clientDependency: kind === 'requirement', required: true, key: '', auto: '', order: (items.at(-1)?.order ?? -1) + 1 });
  const drop = () => { if (!confirm('Delete this onboarding template? Existing onboarding plans are not affected.')) return; mutate(st => ({ ...st, onboardingTemplates: st.onboardingTemplates.filter(t => t.id !== sel), onboardingTemplateItems: st.onboardingTemplateItems.filter(i => i.templateId !== sel) })); setSel(''); };
  const up = (id, patch) => db.update('onboardingTemplateItems', id, patch);

  const row = (it, n) => <div className="trow otrow" key={it.id}><span className="muted sm">{n + 1}</span>
    <div className="tf"><div className="row"><span className={'badge ' + (it.kind === 'task' ? 'b-in-progress' : 'b-pending')}>{it.kind === 'task' ? 'Task' : 'Requirement'}</span>{it.key === 'scope' && <span className="muted sm" title="Checked by the Ready to Start gate">🔒 scope confirmation</span>}</div>
      <input value={it.name} onChange={e => up(it.id, { name: e.target.value })} /><input placeholder="Description (optional)" value={it.description || ''} onChange={e => up(it.id, { description: e.target.value })} /></div>
    <div className="tf"><select value={it.category || ''} onChange={e => up(it.id, { category: e.target.value })}><Opts blank="Category" list={[...new Set([...ONB_CATEGORIES, it.category].filter(Boolean))]} /></select>
      {it.kind === 'task' ? <select value={it.priority} onChange={e => up(it.id, { priority: e.target.value })}><Opts list={PRIORITY} /></select> : <span className="sm muted">Always from client</span>}
      {it.kind === 'task' ? <label className="chk sm"><input type="checkbox" checked={!!it.clientDependency} onChange={e => up(it.id, { clientDependency: e.target.checked })} /> Client dependency</label>
        : <label className="chk sm"><input type="checkbox" checked={it.required !== false} onChange={e => up(it.id, { required: e.target.checked })} /> Required</label>}</div>
    <div className="row"><button className="btn sm" onClick={() => move(it, -1)} disabled={n === 0}>↑</button><button className="btn sm" onClick={() => move(it, 1)} disabled={n === items.length - 1}>↓</button>
      <button className="btn sm warn" disabled={it.key === 'scope'} title={it.key === 'scope' ? 'Required by the Ready to Start gate' : ''} onClick={() => db.remove('onboardingTemplateItems', it.id)}>✕</button></div></div>;

  return <>
    <div className="head"><div><h1>Onboarding Templates</h1><div className="muted">Checklist generated for each marketplace + service when a client is onboarded. Edits apply to future onboarding plans only.</div></div></div>
    <div className="cols2"><div>
      <div className="card"><h2>Templates</h2>{sorted.map(t => <div key={t.id} className={'line click' + (t.id === sel ? ' sel' : '')} onClick={() => setSel(t.id)}><b>{label(t)}</b><span className="muted sm">{count(t, 'task')} tasks · {count(t, 'requirement')} req.</span></div>)}</div>
      <div className="card"><h2>New template</h2><F label="Marketplace"><select value={nw.marketplaceId} onChange={e => setNw({ ...nw, marketplaceId: e.target.value })}><Opts blank="Any marketplace" list={s.marketplaces.map(m => ({ v: m.id, l: m.name }))} /></select></F>
        <F label="Service"><select value={nw.serviceId} onChange={e => setNw({ ...nw, serviceId: e.target.value })}><Opts blank="Select service" list={s.services.map(m => ({ v: m.id, l: m.name }))} /></select></F><button className="btn pri" onClick={create}>Create template</button>
        <div className="muted sm mt">A marketplace-specific template wins over an "Any marketplace" one. Services without any template use a basic checklist.</div></div></div>
    <div className="card">{tpl ? <><div className="between"><h2>{label(tpl)}</h2><button className="btn sm warn" onClick={drop}>Delete template</button></div>
      {items.map(row)}
      <div className="row mt"><button className="btn" onClick={() => add('task')}>+ Add task</button><button className="btn" onClick={() => add('requirement')}>+ Add client requirement</button></div></> : <Empty>Select or create a template.</Empty>}</div></div></>;
}
