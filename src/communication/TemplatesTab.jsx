import { useMemo, useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Opts, Empty, copyText } from '../ui.jsx';
import { CATEGORIES, CHANNELS } from './templateDefaults.js';
import { marketplaceOptions, serviceOptions } from './templateOptions.js';
import { patchCommTemplate, removeCommTemplate, duplicateCommTemplate } from './templateActions.js';

const NONE = { q: '', category: '', marketplace: '', service: '', channel: '', status: '', fav: false };
const preview = t => { const x = t.body.replace(/\s+/g, ' ').trim(); return x.length > 170 ? x.slice(0, 170) + '…' : x; };

export default function TemplatesTab() {
  const s = useStore(), ui = useUI(), all = s.communicationTemplates || []; const [f, setF] = useState(NONE);
  const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const mpOpts = useMemo(() => [...new Set([...marketplaceOptions(s), ...all.map(t => t.marketplace)])], [s, all]);
  const svOpts = useMemo(() => [...new Set([...serviceOptions(s), ...all.map(t => t.service)])], [s, all]);
  const q = f.q.trim().toLowerCase();
  const rows = all.filter(t => (!q || [t.name, t.body, t.notes].some(x => (x || '').toLowerCase().includes(q)))
    && (!f.category || t.category === f.category) && (!f.marketplace || t.marketplace === f.marketplace) && (!f.service || t.service === f.service)
    && (!f.channel || t.channel === f.channel) && (!f.status || (f.status === 'active') === t.active) && (!f.fav || t.favorite));
  const filtered = JSON.stringify(f) !== JSON.stringify(NONE);
  const del = t => confirm(`Delete template "${t.name}"? This cannot be undone.`) && (removeCommTemplate(t.id), ui.toast('Template deleted.'));
  return <>
    <div className="head sub"><div><h2>Message templates</h2><div className="muted sm">Reusable client messages. Copy and edit them - nothing is sent automatically.</div></div>
      <button className="btn pri" onClick={() => ui.open('commTemplate')}>+ New template</button></div>
    <div className="card"><div className="tfilters">
      <input className="tq" placeholder="Search name, message or notes…" value={f.q} onChange={upd('q')} />
      <select value={f.category} onChange={upd('category')}><Opts blank="All categories" list={CATEGORIES} /></select>
      <select value={f.marketplace} onChange={upd('marketplace')}><Opts blank="All marketplaces" list={mpOpts} /></select>
      <select value={f.service} onChange={upd('service')}><Opts blank="All services" list={svOpts} /></select>
      <select value={f.channel} onChange={upd('channel')}><Opts blank="All channels" list={CHANNELS} /></select>
      <select value={f.status} onChange={upd('status')}><Opts blank="Active & inactive" list={[{ v: 'active', l: 'Active only' }, { v: 'inactive', l: 'Inactive only' }]} /></select>
      <label className="chk"><input type="checkbox" checked={f.fav} onChange={e => setF(p => ({ ...p, fav: e.target.checked }))} /> Favorites only</label>
      <button className="btn" onClick={() => setF(NONE)} disabled={!filtered}>Clear filters</button></div>
      <div className="muted sm">{rows.length} of {all.length} templates</div></div>
    {rows.length ? rows.map(t => <div className={'card tcard' + (t.active ? '' : ' off')} key={t.id}>
      <div className="between"><div><button className={'star' + (t.favorite ? ' on' : '')} title={t.favorite ? 'Remove from favorites' : 'Mark as favorite'} aria-label="Toggle favorite" onClick={() => patchCommTemplate(t.id, { favorite: !t.favorite })}>{t.favorite ? '★' : '☆'}</button> <b>{t.name}</b></div>
        <span className={'badge ' + (t.active ? 'b-active' : 'b-inactive')}>{t.active ? 'Active' : 'Inactive'}</span></div>
      <div className="row tmeta"><span className="badge">{t.category}</span><span className="badge">{t.marketplace}</span><span className="badge">{t.service}</span><span className="badge">{t.channel}</span></div>
      {t.subject && <div className="sm"><span className="muted">Subject:</span> {t.subject}</div>}
      <div className="muted tprev">{preview(t)}</div>
      <div className="row"><button className="btn sm" onClick={() => ui.open('commTemplate', { id: t.id })}>Edit</button>
        <button className="btn sm" onClick={() => { duplicateCommTemplate(t.id); ui.toast('Template duplicated.'); }}>Duplicate</button>
        <button className="btn sm" onClick={() => copyText(t.body).then(() => ui.toast('Message copied to clipboard.'))}>Copy</button>
        <button className="btn sm" onClick={() => patchCommTemplate(t.id, { active: !t.active })}>{t.active ? 'Deactivate' : 'Activate'}</button>
        <button className="btn sm warn" onClick={() => del(t)}>Delete</button></div></div>)
      : <Empty>{all.length ? 'No templates match these filters.' : 'No templates yet. Click “New template” to add your first one.'}</Empty>}
  </>;
}
