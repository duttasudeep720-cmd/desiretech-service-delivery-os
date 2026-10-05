import { useState } from 'react';
import { useStore, db } from '../data/store.js';
import { deleteClient, startCycle, startNextMonth, createReport } from '../data/actions.js';
import { useUI, Badge, Bar, Opts, Empty, TaskLine } from '../ui.jsx';
import { by, cycleInfo } from '../logic.js';
import { ONB_STATUS, recInfo } from '../onboarding/logic.js';
import { ym, addMonth, monthLabel, fmtDate } from '../data/util.js';
import { copyText } from '../ui.jsx';

const svcs = (s, id) => s.clientServices.filter(c => c.clientId === id);
export default function Clients() {
  const s = useStore(), ui = useUI(); const [q, setQ] = useState(''), [st, setSt] = useState('');
  const rows = s.clients.filter(c => (!st || c.status === st) && (!q || [c.name, c.company, c.contact, c.email].some(v => (v || '').toLowerCase().includes(q.toLowerCase()))));
  return <>
    <div className="head"><h1>Clients</h1><div className="row"><button className="btn" onClick={() => ui.open('client')} title="Quick add for an existing client (skips onboarding)">+ Add Client</button><button className="btn pri" onClick={() => ui.open('newClient')}>+ New Client</button></div></div>
    <div className="filters"><input placeholder="Search name, company, contact, email" value={q} onChange={e => setQ(e.target.value)} /><select value={st} onChange={e => setSt(e.target.value)}><Opts blank="All statuses" list={[...ONB_STATUS, 'Completed']} /></select></div>
    {rows.length ? <div className="tw"><table><thead><tr><th>Client</th><th>Marketplaces</th><th>Services</th><th>Contact</th><th>Start</th><th>Status</th></tr></thead><tbody>
      {rows.map(c => <tr key={c.id} className="click" onClick={() => (location.hash = '#/clients/' + c.id)}><td><b>{c.company}</b><div className="muted sm">{c.name}</div></td>
        <td>{[...new Set(svcs(s, c.id).map(x => by(s.marketplaces, x.marketplaceId)?.name))].join(', ') || '—'}</td><td>{svcs(s, c.id).map(x => by(s.services, x.serviceId)?.name).join(', ') || '—'}</td>
        <td>{c.contact}<div className="muted sm">{c.email}</div></td><td>{fmtDate(c.startDate)}</td><td><Badge v={c.status} /></td></tr>)}</tbody></table></div> : <Empty>No clients found. Add your first client.</Empty>}</>;
}

export function ClientDetail({ id }) {
  const s = useStore(), ui = useUI(), c = by(s.clients, id); const cm = ym(new Date());
  const [month, setMonth] = useState(cm);
  if (!c) return <Empty>Client not found. <a href="#/clients">Back to clients</a></Empty>;
  const css = svcs(s, id), months = [...new Set([cm, ...s.cycles.filter(y => y.clientId === id).map(y => y.month)])].sort().reverse();
  const run = fn => { try { const r = fn(); ui.toast('Done.'); return r; } catch (e) { ui.toast(e.message); } };
  const tasks = s.tasks.filter(t => t.clientId === id && t.month === month), cycles = s.cycles.filter(y => y.clientId === id && y.month === month).map(y => cycleInfo(s, y));
  const tot = tasks.length ? Math.round(tasks.filter(t => t.status === 'Completed').length / tasks.length * 100) : 0;
  const onb = s.onboardingRecords.filter(r => r.clientId === id).map(r => recInfo(s, r)), hist = s.onboardingEvents.filter(e => e.clientId === id).sort((a, b) => b.at.localeCompare(a.at));
  const issues = s.issues.filter(i => i.clientId === id && i.status !== 'Resolved'), comms = s.communications.filter(m => m.clientId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const quickReport = () => cycles.length === 1 ? (location.hash = '#/reports/' + createReport(cycles[0].cy.id)) : ui.toast(cycles.length ? 'Use "Generate report" on the service card you need.' : 'Generate a monthly service first.');
  return <>
    <a href="#/clients" className="muted sm">← Clients</a>
    <div className="head"><div><h1>{c.company}</h1><div className="muted">{c.name} · <Badge v={c.status} /></div></div>
      <div className="row"><button className="btn" onClick={() => ui.open('client', { id })}>Edit</button><button className="btn warn" onClick={() => confirm('Delete this client and ALL its tasks, issues, messages and reports?') && (deleteClient(id), (location.hash = '#/clients'))}>Delete</button></div></div>
    <div className="row mb"><button className="btn" onClick={() => ui.open('addTask', { clientId: id, month })}>Add Task</button><button className="btn" onClick={() => ui.open('issue', { pre: { clientId: id } })}>Add Issue</button><button className="btn" onClick={() => ui.open('note', { clientId: id })}>Add Note</button>
      <button className="btn" onClick={() => ui.open('message', { pre: { clientId: id } })}>Generate Client Message</button><button className="btn" onClick={() => ui.open('genFromTemplate', { pre: { clientId: id } })}>Message from Template</button><button className="btn wa" onClick={() => { const t = (s.communicationTemplates || []).find(x => x.active && x.channel === 'WhatsApp'); ui.open('genFromTemplate', { pre: { clientId: id, ...(t ? { templateId: t.id } : {}) } }); }}>WhatsApp</button><button className="btn pri" onClick={quickReport}>Generate Monthly Report</button></div>
    <div className="card"><h2>Client information</h2><dl className="info">{[['Contact', c.contact], ['Email', c.email], ['Phone', c.phone], ['Start date', fmtDate(c.startDate)], ['Marketplaces', [...new Set(css.map(x => by(s.marketplaces, x.marketplaceId)?.name))].join(', ')], ['Services', css.map(x => by(s.services, x.serviceId)?.name).join(', ')]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}</dl>
      {c.notes && <pre className="notes">{c.notes}</pre>}</div>
    {onb.length > 0 && <div className="card"><div className="between"><h2>Onboarding</h2><a className="btn sm" href="#/onboarding">All onboarding</a></div>
      {[...new Set(onb.map(i => i.mp?.name))].map(mpn => <div key={mpn} className="mb"><b>{mpn}</b>{onb.filter(i => i.mp?.name === mpn).map(i => <div className="line" key={i.rec.id}><div>└ {i.sv?.name}<div className="muted sm">{i.prog.pct}% · {i.prog.reqGot}/{i.prog.reqTotal} client items · {i.prog.tasksDone}/{i.prog.tasksTotal} tasks{i.rec.startedAt ? ` · started ${fmtDate(i.rec.startedAt)}` : ''}</div></div>
        <div className="r"><Badge v={i.status} /><a className="btn sm" href={'#/onboarding/' + i.rec.id}>Open</a></div></div>)}</div>)}
      <details><summary className="sm click">Onboarding history ({hist.length})</summary>{hist.slice(0, 40).map(e => <div className="evt" key={e.id}><span className="muted sm">{fmtDate(e.date)}</span> {e.text}</div>)}</details></div>}
    <div className="head sub"><div><h2>Current month: {monthLabel(month)}</h2><div className="muted sm">Service completion {tot}%</div></div><select value={month} onChange={e => setMonth(e.target.value)}><Opts list={months.map(m => ({ v: m, l: monthLabel(m) }))} /></select></div>
    <Bar pct={tot} />
    <div className="cols mt">{css.length ? css.map(cs => {
      const i = cycles.find(x => x.cs.id === cs.id), rep = i && s.reports.find(r => r.cycleId === i.cy.id), hasNext = s.cycles.some(y => y.clientServiceId === cs.id && y.month === addMonth(month, 1));
      return <div className="card" key={cs.id}><div className="between"><b>{by(s.services, cs.serviceId)?.name}</b>{i && <Badge v={i.status} />}</div><div className="muted sm">{by(s.marketplaces, cs.marketplaceId)?.name}</div>
        {i ? <><Bar pct={i.st.pct} /><div className="sm">{i.st.done} / {i.st.total} completed · {i.st.pct}%</div>
          <div className="row mt"><button className="btn sm" onClick={() => { const r = run(() => createReport(i.cy.id)); r && (location.hash = '#/reports/' + r); }}>{rep ? `View report (${rep.status})` : 'Generate report'}</button>
            {!hasNext && <button className={'btn sm ' + (i.status === 'Completed' ? 'pri' : '')} onClick={() => { const r = run(() => startNextMonth(cs.id)); r && setMonth(addMonth(month, 1)); }}>Create {monthLabel(addMonth(month, 1))} service</button>}</div></>
          : (() => { const o = onb.find(x => x.rec.clientServiceId === cs.id); return o && o.status !== 'Active' ? <div className="mt"><div className="sm muted">Onboarding: <Badge v={o.status} /> {o.prog.pct}% — complete onboarding and use <b>Start Service</b> to create the first month.</div><a className="btn pri sm mt" href={'#/onboarding/' + o.rec.id}>Open onboarding</a></div>
            : <button className="btn pri mt" onClick={() => run(() => startCycle(cs.id, month))}>Generate {monthLabel(month)} monthly service</button>; })()}</div>; }) : <Empty>No services assigned. Edit the client to add marketplace + service.</Empty>}</div>
    <h2>Tasks · {monthLabel(month)}</h2>
    {tasks.length ? <div className="cols4">{['Pending', 'In Progress', 'Blocked', 'Completed'].map(k => <div className="card" key={k}><div className="between"><b>{k}</b><span className="muted">{tasks.filter(t => t.status === k).length}</span></div>
      {tasks.filter(t => t.status === k).map(t => <TaskLine key={t.id} t={t} s={s} />)}</div>)}</div> : <Empty>No tasks for this month yet.</Empty>}
    <div className="cols mt"><div className="card"><div className="between"><h2>Open issues</h2><button className="btn sm" onClick={() => ui.open('issue', { pre: { clientId: id } })}>+ Issue</button></div>
      {issues.length ? issues.map(i => <div className="line click" key={i.id} onClick={() => ui.open('issue', { id: i.id })}><div><b>{i.title}</b><div className="muted sm">{i.priority} priority</div></div><Badge v={i.status} /></div>) : <Empty>No open issues.</Empty>}</div>
      <div className="card"><h2>Recent communication</h2>{comms.length ? comms.map(m => <div className="line" key={m.id}><div><b>{m.type}</b> <span className="muted sm">{fmtDate(m.date)}</span><div className="sm clip">{m.message}</div></div><div className="r"><Badge v={m.status} /><button className="btn sm" onClick={() => copyText(m.message).then(() => ui.toast('Copied.'))}>Copy</button></div></div>) : <Empty>No communication yet.</Empty>}</div></div></>;
}
