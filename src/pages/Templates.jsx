import { useState } from 'react';
import { useStore, db, mutate } from '../data/store.js';
import { useUI, Opts, Empty, F } from '../ui.jsx';
import { by, PRIORITY } from '../logic.js';

export default function Templates() {
  const s = useStore(), ui = useUI(); const [sel, setSel] = useState(s.serviceTemplates[0]?.id || ''); const [nw, setNw] = useState({ marketplaceId: '', serviceId: '', newService: '' });
  const tpl = by(s.serviceTemplates, sel), tasks = s.templateTasks.filter(t => t.templateId === sel).sort((a, b) => a.order - b.order);
  const label = t => `${by(s.marketplaces, t.marketplaceId)?.name} — ${by(s.services, t.serviceId)?.name}`;
  const create = () => {
    if (!nw.marketplaceId || (!nw.serviceId && !nw.newService.trim())) return ui.toast('Choose a marketplace and a service (or type a new service name).');
    let serviceId = nw.serviceId; if (!serviceId) serviceId = db.insert('services', { name: nw.newService.trim() }).id;
    if (s.serviceTemplates.some(t => t.marketplaceId === nw.marketplaceId && t.serviceId === serviceId)) return ui.toast('That template already exists.');
    const t = db.insert('serviceTemplates', { marketplaceId: nw.marketplaceId, serviceId }); setSel(t.id); setNw({ marketplaceId: '', serviceId: '', newService: '' });
  };
  const move = (t, d) => { const o = tasks[tasks.indexOf(t) + d]; if (!o) return; mutate(st => ({ ...st, templateTasks: st.templateTasks.map(x => x.id === t.id ? { ...x, order: o.order } : x.id === o.id ? { ...x, order: t.order } : x) })); };
  const drop = () => { if (!confirm('Delete this template? Existing monthly tasks are not affected.')) return; mutate(st => ({ ...st, serviceTemplates: st.serviceTemplates.filter(t => t.id !== sel), templateTasks: st.templateTasks.filter(t => t.templateId !== sel) })); setSel(''); };
  return <>
    <div className="head"><div><h1>Service Templates</h1><div className="muted">Edits apply to future monthly services only.</div></div></div>
    <div className="cols2"><div>
      <div className="card"><h2>Templates</h2>{s.serviceTemplates.map(t => <div key={t.id} className={'line click' + (t.id === sel ? ' sel' : '')} onClick={() => setSel(t.id)}><b>{label(t)}</b><span className="muted sm">{s.templateTasks.filter(x => x.templateId === t.id).length} tasks</span></div>)}</div>
      <div className="card"><h2>New template</h2><F label="Marketplace"><select value={nw.marketplaceId} onChange={e => setNw({ ...nw, marketplaceId: e.target.value })}><Opts blank="Select" list={s.marketplaces.map(m => ({ v: m.id, l: m.name }))} /></select></F>
        <F label="Service"><select value={nw.serviceId} onChange={e => setNw({ ...nw, serviceId: e.target.value })}><Opts blank="New service…" list={s.services.map(m => ({ v: m.id, l: m.name }))} /></select></F>
        {!nw.serviceId && <F label="New service name"><input value={nw.newService} onChange={e => setNw({ ...nw, newService: e.target.value })} /></F>}<button className="btn pri" onClick={create}>Create template</button></div></div>
    <div className="card">{tpl ? <><div className="between"><h2>{label(tpl)}</h2><button className="btn sm warn" onClick={drop}>Delete template</button></div>
      {tasks.map((t, n) => <div className="trow" key={t.id}><span className="muted sm">{n + 1}</span><div className="tf"><input value={t.name} onChange={e => db.update('templateTasks', t.id, { name: e.target.value })} /><input placeholder="Description (optional)" value={t.description || ''} onChange={e => db.update('templateTasks', t.id, { description: e.target.value })} /></div>
        <select value={t.priority} onChange={e => db.update('templateTasks', t.id, { priority: e.target.value })}><Opts list={PRIORITY} /></select>
        <div className="row"><button className="btn sm" onClick={() => move(t, -1)} disabled={n === 0}>↑</button><button className="btn sm" onClick={() => move(t, 1)} disabled={n === tasks.length - 1}>↓</button><button className="btn sm warn" onClick={() => db.remove('templateTasks', t.id)}>✕</button></div></div>)}
      <button className="btn mt" onClick={() => db.insert('templateTasks', { templateId: sel, name: 'New task', description: '', priority: 'Medium', order: (tasks.at(-1)?.order ?? -1) + 1 })}>+ Add task</button></> : <Empty>Select or create a template.</Empty>}</div></div></>;
}
