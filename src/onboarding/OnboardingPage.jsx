import { useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Badge, Bar, Empty } from '../ui.jsx';
import { today, fmtDate } from '../data/util.js';
import { recInfo, onboardingAlerts } from './logic.js';
import { addDemoOnboarding } from './actions.js';

// Rank used to sort "needs attention": lower = more urgent.
const RANK = { Blocked: 0, Overdue: 1, 'Waiting for Client': 2, 'Ready to Start': 3, 'Internal Review': 4, Onboarding: 5 };
export function attentionText(i, td = today()) {
  const open = i.tasks.filter(t => t.status !== 'Completed').length, toRequest = i.reqs.filter(r => r.required && r.status === 'Not Requested').length;
  if (i.status === 'Ready to Start') return 'All checks complete — ready to start the service';
  if (i.status === 'Waiting for Client') return `${i.pending.length} requirement${i.pending.length === 1 ? '' : 's'} pending from client`;
  if (i.status === 'Internal Review') return `${open} task${open === 1 ? '' : 's'} pending`;
  return `${toRequest ? `${toRequest} requirement${toRequest === 1 ? '' : 's'} to request · ` : ''}${open} task${open === 1 ? '' : 's'} pending`;
}
export const isLate = (i, td = today()) => i.rec.dueDate && i.rec.dueDate < td && !['Active', 'On Hold', 'Ready to Start'].includes(i.status);

export default function OnboardingPage() {
  const s = useStore(), ui = useUI(), td = today(); const [filter, setFilter] = useState(''), [q, setQ] = useState('');
  const all = s.onboardingRecords.map(r => recInfo(s, r)), live = all.filter(i => !['Active', 'On Hold'].includes(i.status));
  const leads = s.clients.filter(c => c.status === 'New Lead' && !s.onboardingRecords.some(r => r.clientId === c.id));
  const N = st => all.filter(i => i.status === st).length;
  const cards = [['New Clients', leads.length, 'New Lead'], ['Onboarding', N('Onboarding'), 'Onboarding'], ['Waiting for Client', N('Waiting for Client'), 'Waiting for Client'], ['Internal Review', N('Internal Review'), 'Internal Review'], ['Ready to Start', N('Ready to Start'), 'Ready to Start'], ['Active services', N('Active'), 'Active']];
  const rank = i => i.tasks.some(t => t.status === 'Blocked') ? 0 : isLate(i, td) ? 1 : RANK[i.status] ?? 9;
  const attention = [...live].sort((a, b) => rank(a) - rank(b));
  const rows = all.filter(i => (!filter || i.status === filter) && (!q || [i.client?.company, i.client?.name, i.mp?.name, i.sv?.name].some(v => (v || '').toLowerCase().includes(q.toLowerCase()))));
  const al = onboardingAlerts(s, td);
  const demoBtn = <button className="btn" onClick={() => { addDemoOnboarding(); ui.toast('Demo onboarding clients added.'); }}>Load demo onboarding clients</button>;
  return <>
    <div className="head"><div><h1>Onboarding</h1><div className="muted">New client → onboarding → ready to start → first monthly service</div></div><button className="btn pri" onClick={() => ui.open('newClient')}>+ New Client</button></div>
    <div className="stats">{cards.map(([l, n, f]) => <button key={l} className={'card stat statbtn' + (filter === f ? ' sel' : '')} onClick={() => f === 'New Lead' ? setFilter('') : setFilter(filter === f ? '' : f)}><div className="muted sm">{l}</div><div className="num">{n}</div></button>)}</div>

    {leads.length > 0 && <div className="card"><h2>New clients — setup not finished</h2>{leads.map(c => <div className="line" key={c.id}><div><b>{c.company}</b><div className="muted sm">{c.name} · created, no marketplace or service selected yet</div></div>
      <div className="r"><Badge v="New Lead" /><button className="btn sm pri" onClick={() => ui.open('newClient', { clientId: c.id })}>Continue setup</button><a className="btn sm" href={'#/clients/' + c.id}>Open</a></div></div>)}</div>}

    <div className="cols">
      <div className="card"><h2>Clients requiring attention</h2>{attention.length ? attention.map(i => <div className="line" key={i.rec.id}><div><b>{i.client?.company}</b><div className="muted sm">{i.mp?.name} · {i.sv?.name}</div>
        <div className="sm">{attentionText(i)}{isLate(i, td) && <span className="od"> · overdue (target {fmtDate(i.rec.dueDate)})</span>}</div></div>
        <div className="r"><Badge v={i.status} /><a className="btn sm" href={'#/onboarding/' + i.rec.id}>Open</a></div></div>) : <Empty>No clients are being onboarded.{!all.length && <div className="mt">{demoBtn}</div>}</Empty>}</div>
      <div className="card"><h2>Onboarding alerts</h2>{al.length ? al.map((a, k) => <a key={k} className="alert" href={a.href}><Badge v={a.kind} /> <span>{a.text}</span></a>) : <Empty>No onboarding alerts.</Empty>}</div></div>

    <div className="head sub"><h2>All onboarding {filter && <span className="muted sm">· filtered: {filter}</span>}</h2><div className="row"><input placeholder="Search client, marketplace, service" value={q} onChange={e => setQ(e.target.value)} style={{ width: 260 }} />{filter && <button className="btn sm" onClick={() => setFilter('')}>Clear filter</button>}</div></div>
    {rows.length ? <div className="tw"><table><thead><tr><th>Client</th><th>Marketplace · Service</th><th>Status</th><th>Progress</th><th>Client requirements</th><th>Target</th></tr></thead><tbody>
      {rows.map(i => <tr key={i.rec.id} className="click" onClick={() => (location.hash = '#/onboarding/' + i.rec.id)}><td><b>{i.client?.company}</b><div className="muted sm">{i.client?.name}</div></td><td>{i.mp?.name}<div className="muted sm">{i.sv?.name}</div></td><td><Badge v={i.status} /></td>
        <td style={{ minWidth: 130 }}><Bar pct={i.prog.pct} /><span className="sm">{i.prog.pct}% · {i.prog.done}/{i.prog.total}</span></td><td>{i.prog.reqGot} / {i.prog.reqTotal} received</td><td className={isLate(i, td) ? 'od' : ''}>{fmtDate(i.rec.dueDate)}</td></tr>)}</tbody></table></div> : <Empty>No onboarding records{filter ? ' with this status' : ' yet'}. Click <b>+ New Client</b> to start.</Empty>}
  </>;
}
