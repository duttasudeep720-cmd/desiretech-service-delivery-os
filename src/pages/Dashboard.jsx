import { useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Badge, Bar, TaskLine, Empty } from '../ui.jsx';
import { alerts, cycleInfo, cycleLabel } from '../logic.js';
import { today, ym } from '../data/util.js';
import { onboardingAlerts, recInfo } from '../onboarding/logic.js';
import { conversionPending } from '../leads/leadDefaults.js';

// One list for the whole operation: onboarding + monthly service + issues. Lower rank = more urgent.
const ORDER = ['Blocked', 'Overdue', 'Waiting for Client', 'Missing Work', 'Ready to Start', 'Report Pending', 'Open Issue'];
const rank = k => { const i = ORDER.indexOf(k); return i < 0 ? 99 : i; };

export default function Dashboard() {
  const s = useStore(), ui = useUI(), td = today(), cm = ym(new Date());
  const [showAll, setShowAll] = useState(false);
  const infos = s.cycles.map(cy => cycleInfo(s, cy)), al = alerts(s), T = k => s.tasks.filter(t => t.status === k).length;
  const due = s.clientServices.filter(cs => s.clients.find(c => c.id === cs.clientId)?.status === 'Active' && infos.find(i => i.cs?.id === cs.id && i.cy.month === cm)?.status !== 'Completed').length;
  const open = s.tasks.filter(t => t.status !== 'Completed'), cmp = (a, b) => (a.dueDate || '').localeCompare(b.dueDate || '');
  const todays = open.filter(t => t.dueDate <= td || t.status === 'In Progress').sort(cmp).slice(0, 8), upcoming = open.filter(t => t.dueDate > td).sort(cmp).slice(0, 8);
  const blocked = s.tasks.filter(t => t.status === 'Blocked');
  const onb = s.onboardingRecords.map(r => recInfo(s, r)), O = k => onb.filter(i => i.status === k).length, newClients = s.clients.filter(c => c.status === 'New Lead' && !s.onboardingRecords.some(r => r.clientId === c.id)).length;
  const issueAl = s.issues.filter(x => x.status === 'Open').map(x => ({ kind: 'Open Issue', text: `Open issue: ${x.title} (${x.priority} priority)`, clientId: x.clientId }));
  const attention = [...onboardingAlerts(s, td), ...al, ...issueAl].map((a, n) => ({ ...a, n })).sort((a, b) => rank(a.kind) - rank(b.kind) || a.n - b.n);
  const onbCards = [['New Clients', newClients], ['Onboarding', O('Onboarding')], ['Waiting for Client', O('Waiting for Client')], ['Internal Review', O('Internal Review')], ['Ready to Start', O('Ready to Start')]];
  const L = s.leads || [], LS = k => L.filter(l => l.status === k).length, leadHref = k => '#/leads/status-' + encodeURIComponent(k);
  const leadCards = [['New Leads', LS('New'), leadHref('New')], ['Interested', LS('Interested'), leadHref('Interested')], ['Proposals Sent', LS('Proposal Sent'), leadHref('Proposal Sent')], ['Won', LS('Won'), leadHref('Won')], ['Conversion Pending', L.filter(l => conversionPending(s, l)).length, '#/leads/pending']];
  const cards = [['Active clients', s.clients.filter(c => c.status === 'Active').length, '#/clients'], ['Services due this month', due, '#/clients'], ['Pending tasks', T('Pending'), '#/tasks'], ['In progress', T('In Progress'), '#/tasks'], ['Completed', T('Completed'), '#/tasks'], ['Blocked', T('Blocked'), '#/tasks'], ['Reports pending', al.filter(a => a.kind === 'Report Pending').length, '#/reports'], ['Communications pending', s.communications.filter(c => c.status === 'Pending').length, '#/communication']];
  return <>
    <div className="head"><div><h1>Dashboard</h1><div className="muted">Monthly service delivery at a glance</div></div><button className="btn pri" onClick={() => ui.open('newClient')}>+ New Client</button></div>
    <div className="stats">{cards.map(([l, n, h]) => <a key={l} href={h} className="card stat"><div className="muted sm">{l}</div><div className="num">{n}</div></a>)}</div>
    <div className="between"><h2>Onboarding overview</h2><a className="muted sm" href="#/onboarding">Open onboarding →</a></div>
    <div className="stats">{onbCards.map(([l, n]) => <a key={l} href="#/onboarding" className="card stat"><div className="muted sm">{l}</div><div className="num">{n}</div></a>)}</div>
    <div className="between"><h2>Lead overview</h2><a className="muted sm" href="#/leads">Open leads →</a></div>
    <div className="stats">{leadCards.map(([l, n, h]) => <a key={l} href={h} className="card stat"><div className="muted sm">{l}</div><div className="num">{n}</div></a>)}</div>
    <div className="card"><div className="between"><h2>Attention required</h2><span className="muted sm">{attention.length} item{attention.length === 1 ? '' : 's'}</span></div>
      {attention.length ? (showAll ? attention : attention.slice(0, 12)).map(a => <a key={a.n} className="alert" href={a.href || '#/clients/' + a.clientId}><Badge v={a.kind} /> <span>{a.text}</span></a>) : <Empty>Nothing needs attention right now.</Empty>}
      {attention.length > 12 && <button className="btn sm mt" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${attention.length}`}</button>}</div>
    <div className="cols">
      <div className="card"><h2>Today's work</h2>{todays.length ? todays.map(t => <TaskLine key={t.id} t={t} s={s} />) : <Empty>No tasks need attention today.</Empty>}</div>
      <div className="card"><h2>Upcoming tasks</h2>{upcoming.length ? upcoming.map(t => <TaskLine key={t.id} t={t} s={s} />) : <Empty>No upcoming tasks.</Empty>}</div>
      <div className="card"><h2>Blocked items</h2>{blocked.length || s.issues.some(i => i.status === 'Waiting for Client') ? <>{blocked.map(t => <TaskLine key={t.id} t={t} s={s} />)}
        {s.issues.filter(i => i.status === 'Waiting for Client').map(i => <div className="line click" key={i.id} onClick={() => ui.open('issue', { id: i.id })}><div><b>{i.title}</b><div className="muted sm">{s.clients.find(c => c.id === i.clientId)?.company}</div></div><Badge v={i.status} /></div>)}</> : <Empty>Nothing blocked.</Empty>}</div>
      <div className="card"><h2>Monthly progress</h2>{infos.filter(i => i.cy.month === cm).length ? infos.filter(i => i.cy.month === cm).map(i => <a key={i.cy.id} className="prog" href={'#/clients/' + i.client?.id}>
        <div className="between"><b>{i.client?.company}</b><Badge v={i.status} /></div><div className="muted sm">{i.sv?.name}</div><Bar pct={i.st.pct} /><div className="sm">{i.st.done} / {i.st.total} tasks completed · {i.st.pct}%</div></a>) : <Empty>No monthly services started this month.</Empty>}</div>
    </div></>;
}
