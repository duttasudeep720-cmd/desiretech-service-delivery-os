import { useMemo, useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Opts, Empty, Badge } from '../ui.jsx';
import { fmtDate } from '../data/util.js';
import { CLIENT_TYPES, STATUSES, categoryOptions, proposalServiceOptions } from './proposalDefaults.js';
import { patchProposal, removeProposal } from './proposalActions.js';
import { copyProposal, createMessageFrom, duplicateAndEdit } from './proposalUi.js';

const DEFAULT = { q: '', mp: '', service: '', type: '', status: 'live', fav: false };
const ORDER = { Active: 0, Draft: 1, Archived: 2 };

export default function ProposalsTab() {
  const s = useStore(), ui = useUI(), all = s.proposals || []; const [f, setF] = useState(DEFAULT);
  const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const mpOpts = useMemo(() => [...new Set([...categoryOptions(s), 'Any', ...all.flatMap(p => [p.category, p.marketplace])])], [s, all]);
  const svOpts = useMemo(() => [...new Set([...proposalServiceOptions(s), ...all.map(p => p.service)])], [s, all]);
  const tyOpts = useMemo(() => [...new Set([...CLIENT_TYPES, ...all.map(p => p.targetClientType)])], [all]);
  const q = f.q.trim().toLowerCase();
  const rows = all.filter(p => (!q || [p.name, p.description, p.service, p.marketplace, p.category, p.targetClientType, p.content].some(x => (x || '').toLowerCase().includes(q)))
    && (!f.mp || p.category === f.mp || p.marketplace === f.mp) && (!f.service || p.service === f.service) && (!f.type || p.targetClientType === f.type)
    && (f.status === 'live' ? p.status !== 'Archived' : !f.status || p.status === f.status) && (!f.fav || p.favorite))
    .sort((a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3));
  const changed = JSON.stringify(f) !== JSON.stringify(DEFAULT);
  const del = p => confirm(`Delete proposal "${p.name}"? This cannot be undone.`) && (removeProposal(p.id), ui.toast('Proposal deleted.'));
  return <>
    <div className="head sub"><div><h2>Proposal library</h2><div className="muted sm">Reusable master proposals. Copy the content to use it - nothing is sent automatically.</div></div>
      <button className="btn pri" onClick={() => ui.open('proposal')}>+ New Proposal</button></div>
    <div className="card"><div className="tfilters">
      <input className="tq" placeholder="Search name, description, service, marketplace, client type or content…" value={f.q} onChange={upd('q')} />
      <select value={f.mp} onChange={upd('mp')}><Opts blank="All marketplaces / categories" list={mpOpts} /></select>
      <select value={f.service} onChange={upd('service')}><Opts blank="All services" list={svOpts} /></select>
      <select value={f.type} onChange={upd('type')}><Opts blank="All client types" list={tyOpts} /></select>
      <select value={f.status} onChange={upd('status')}><Opts blank="All statuses" list={[{ v: 'live', l: 'Active & Draft (default)' }, ...STATUSES]} /></select>
      <label className="chk"><input type="checkbox" checked={f.fav} onChange={e => setF(p => ({ ...p, fav: e.target.checked }))} /> Favorites only</label>
      <button className="btn" onClick={() => setF(DEFAULT)} disabled={!changed}>Clear filters</button></div>
      <div className="muted sm">{rows.length} of {all.length} proposals{f.status === 'live' && all.some(p => p.status === 'Archived') ? ' · archived proposals are hidden (change the status filter to see them)' : ''}</div></div>
    {rows.length ? rows.map(p => <div className={'card tcard' + (p.status === 'Archived' ? ' off' : '')} key={p.id}>
      <div className="between"><div><button className={'star' + (p.favorite ? ' on' : '')} title={p.favorite ? 'Remove from favorites' : 'Mark as favorite'} aria-label="Toggle favorite" onClick={() => patchProposal(p.id, { favorite: !p.favorite })}>{p.favorite ? '★' : '☆'}</button> <b>{p.name}</b></div>
        <Badge v={p.status} /></div>
      <div className="row tmeta"><span className="badge">{p.marketplace}</span><span className="badge">{p.service}</span><span className="badge">{p.targetClientType}</span><span className="badge">v{p.version}</span><span className="muted sm">Updated {fmtDate((p.updatedAt || '').slice(0, 10))}</span></div>
      <div className="muted tprev">{p.description || 'No description.'}</div>
      <div className="row"><button className="btn sm" onClick={() => ui.open('proposalView', { id: p.id })}>View</button>
        <button className="btn sm" onClick={() => ui.open('proposal', { id: p.id })}>Edit</button>
        <button className="btn sm" onClick={() => duplicateAndEdit(ui, p.id)}>Duplicate</button>
        <button className="btn sm" onClick={() => copyProposal(ui, p)}>Copy Proposal Content</button>
        <button className="btn sm" onClick={() => createMessageFrom(ui, s)}>Create Message</button>
        <select className="stsel" aria-label="Status" value={p.status} onChange={e => patchProposal(p.id, { status: e.target.value })}><Opts list={STATUSES} /></select>
        <button className="btn sm warn" onClick={() => del(p)}>Delete</button></div></div>)
      : <Empty>{all.length ? 'No proposals match these filters.' : 'No proposals yet. Click “New Proposal” to add your first one.'}</Empty>}
  </>;
}
