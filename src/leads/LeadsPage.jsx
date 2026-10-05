import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Opts, Empty, Badge } from '../ui.jsx';
import { by } from '../logic.js';
import { SOURCES, STATUSES, PENDING, CLIENT, mpList, leadTitle, convertedClient, conversionPending, isConverted, shortDate, marketplaceOptions, serviceOptions } from './leadDefaults.js';
import LeadButtons from './LeadButtons.jsx';

const DEFAULT = { q: '', status: '', mp: '', service: '', source: '' };
// Dashboard links use #/leads/status-<Status> or #/leads/pending.
const fromArg = arg => { const a = decodeURIComponent(arg || ''); return a === 'pending' ? { status: PENDING } : a === 'client' ? { status: CLIENT } : a.startsWith('status-') ? { status: a.slice(7) } : {}; };

export default function LeadsPage({ arg }) {
  const s = useStore(), ui = useUI(), all = s.leads || [];
  const [f, setF] = useState(() => ({ ...DEFAULT, ...fromArg(arg) }));
  useEffect(() => setF({ ...DEFAULT, ...fromArg(arg) }), [arg]);
  const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const mpOpts = useMemo(() => [...new Set([...marketplaceOptions(s), ...all.flatMap(mpList)])], [s, all]);
  const svOpts = useMemo(() => [...new Set([...serviceOptions(s), ...all.map(l => l.service).filter(Boolean)])], [s, all]);
  const srcOpts = useMemo(() => [...new Set([...SOURCES, ...all.map(l => l.source).filter(Boolean)])], [all]);
  const q = f.q.trim().toLowerCase();
  const rows = all.filter(l => (!q || [l.leadName, l.companyName, l.contactName, l.email, l.phone, mpList(l).join(' '), l.service, l.source].some(x => (x || '').toLowerCase().includes(q)))
    && (!f.status || (f.status === PENDING ? conversionPending(s, l) : f.status === CLIENT ? isConverted(s, l) : l.status === f.status))
    && (!f.mp || mpList(l).includes(f.mp)) && (!f.service || l.service === f.service) && (!f.source || l.source === f.source))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const changed = JSON.stringify(f) !== JSON.stringify(DEFAULT), pending = all.filter(l => conversionPending(s, l)).length;
  const stages = [...STATUSES.slice(0, 6).map(k => [k, k, all.filter(l => l.status === k).length]), ['Client', CLIENT, all.filter(l => isConverted(s, l)).length]];
  const pick = v => setF(p => ({ ...p, status: p.status === v ? '' : v }));
  return <>
    <div className="head"><div><h1>Leads</h1><div className="muted">Track every lead from first contact to client. Nothing is sent automatically.</div></div><button className="btn pri" onClick={() => ui.open('lead')}>+ New Lead</button></div>
    <div className="pipe" aria-label="Sales pipeline">{stages.map(([label, v, n]) => <button key={label} className={'pstage' + (f.status === v ? ' on' : '')} onClick={() => pick(v)}><span className="muted sm">{label}</span><b>{n}</b></button>)}
      <button className={'pstage lost' + (f.status === 'Lost' ? ' on' : '')} onClick={() => pick('Lost')}><span className="muted sm">Lost</span><b>{all.filter(l => l.status === 'Lost').length}</b></button></div>
    {pending > 0 && <div className="warnbox mb"><b>⚠ Won — Client conversion pending</b><div className="row"><span>{pending} won lead{pending > 1 ? 's' : ''} still need{pending > 1 ? '' : 's'} to be converted into a client.</span><button className="btn sm" onClick={() => setF({ ...DEFAULT, status: PENDING })}>Show them</button></div></div>}
    <div className="card"><div className="tfilters">
      <input className="tq" placeholder="Search company, contact, email, phone, marketplace, service or source…" value={f.q} onChange={upd('q')} />
      <select aria-label="Status" value={f.status} onChange={upd('status')}><Opts blank="All statuses" list={[...STATUSES, { v: PENDING, l: 'Won — conversion pending' }, { v: CLIENT, l: 'Client created' }]} /></select>
      <select aria-label="Marketplace" value={f.mp} onChange={upd('mp')}><Opts blank="All marketplaces" list={mpOpts} /></select>
      <select aria-label="Service" value={f.service} onChange={upd('service')}><Opts blank="All services" list={svOpts} /></select>
      <select aria-label="Lead source" value={f.source} onChange={upd('source')}><Opts blank="All sources" list={srcOpts} /></select>
      <button className="btn" onClick={() => setF(DEFAULT)} disabled={!changed}>Clear filters</button></div>
      <div className="muted sm">{rows.length} of {all.length} leads</div></div>
    {rows.length ? rows.map(l => { const p = by(s.proposals || [], l.proposalId), client = convertedClient(s, l);
      return <div className={'card lead' + (l.status === 'Lost' ? ' off' : '')} key={l.id}>
        <div className="between"><div><b className="click" onClick={() => ui.open('leadView', { id: l.id })}>{leadTitle(l)}</b><div className="muted sm">{l.contactName || 'No contact person'}{l.email ? ' · ' + l.email : ''}</div></div>
          <Badge v={l.status} /></div>
        {conversionPending(s, l) && <div className="pendtag">Won — Client conversion pending</div>}
        <dl className="info mt"><div><dt>Marketplace</dt><dd>{mpList(l).join(', ') || '—'}</dd></div><div><dt>Service</dt><dd>{l.service || '—'}</dd></div><div><dt>Source</dt><dd>{l.source || '—'}</dd></div>
          <div><dt>Proposal</dt><dd>{l.proposalId ? (p ? p.name : `${l.proposalName || 'Proposal'} (no longer in library)`) : '—'}</dd></div><div><dt>Last updated</dt><dd>{shortDate(l.updatedAt)}</dd></div></dl>
        <div className="mt"><LeadButtons l={l} /></div></div>; })
      : <Empty>{all.length ? 'No leads match these filters.' : 'No leads yet. Click “+ New Lead” to add your first lead.'}</Empty>}
  </>;
}
