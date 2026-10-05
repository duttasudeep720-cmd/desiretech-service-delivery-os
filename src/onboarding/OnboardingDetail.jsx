import { useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Badge, Bar, Opts, Empty, copyText } from '../ui.jsx';
import { by, planCycle } from '../logic.js';
import { today, ym, monthLabel, fmtDate } from '../data/util.js';
import { recInfo, gate, ONB_TASK_STATUS, REQ_STATUS, ONB_COMM_TYPES } from './logic.js';
import { updateTask, updateReq, requestAll, markReady, forceReady, reopen, setHold, startService, deleteOnboarding } from './actions.js';

const NEXT = { 'Not Requested': ['Requested', 'Mark requested'], Requested: ['Received', 'Mark received'], Received: ['Verified', 'Verify'], Rejected: ['Requested', 'Re-request'] };
const ICON = st => st === 'Completed' ? '✓' : st === 'Blocked' ? '⛔' : st === 'Pending' ? '○' : '⏳';
const reqIcon = st => ['Verified', 'Received'].includes(st) ? '✓' : st === 'Not Required' ? '–' : st === 'Rejected' ? '✗' : st === 'Requested' ? '⏳' : '○';

function Prog({ label, a, b, hint }) {
  const pct = b ? Math.round(a / b * 100) : 0;
  return <div className="pbox"><div className="muted sm">{label}</div><div className="pnum">{a} / {b} <span className="muted sm">{hint}</span></div><Bar pct={pct} /></div>;
}

export default function OnboardingDetail({ id }) {
  const s = useStore(), ui = useUI(), td = today(), rec = by(s.onboardingRecords, id);
  const [showGate, setShowGate] = useState(false), [reason, setReason] = useState(''), [err, setErr] = useState('');
  if (!rec) return <Empty>Onboarding record not found. <a href="#/onboarding">Back to onboarding</a></Empty>;
  const i = recInfo(s, rec), g = gate(s, rec), p = i.prog, st = rec.status, active = st === 'Active', ready = st === 'Ready to Start';
  const sibs = s.onboardingRecords.filter(r => r.clientId === rec.clientId);
  const tasks = [...i.tasks].sort((a, b) => a.order - b.order), reqs = [...i.reqs].sort((a, b) => a.order - b.order);
  const internal = tasks.filter(t => !t.clientDependency), clientTasks = tasks.filter(t => t.clientDependency);
  const comms = s.communications.filter(m => m.clientId === rec.clientId && (m.onboardingId === rec.id || (!m.onboardingId && ONB_COMM_TYPES.includes(m.type)))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const events = s.onboardingEvents.filter(e => e.onboardingId === rec.id || (e.clientId === rec.clientId && !e.onboardingId)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);
  const month = ym(new Date()), cycle = s.cycles.find(c => c.clientServiceId === rec.clientServiceId && c.month === month), plan = ready ? planCycle(s, rec.clientServiceId, month, new Date().getDate()) : null;
  const sysLabel = `${i.mp?.name} · ${i.sv?.name}`, late = rec.dueDate && rec.dueDate < td && !active && !ready && st !== 'On Hold';
  const msg = type => ui.open('message', { pre: { clientId: rec.clientId, onboardingId: rec.id, type } });

  const tryReady = () => { const r = markReady(id); if (r.ok) { setShowGate(false); setErr(''); ui.toast('Marked Ready to Start.'); } else { setShowGate(true); ui.toast('Cannot mark Ready to Start — see the missing items.'); } };
  const force = () => { try { forceReady(id, reason); setShowGate(false); setReason(''); setErr(''); ui.toast('Forced to Ready to Start (reason recorded).'); } catch (e) { setErr(e.message); } };
  const start = () => {
    if (!confirm(`Start service now?\n\nThis marks ${sysLabel} as Active and creates the ${monthLabel(month)} service cycle${plan?.hasTemplate && !cycle ? ` with ${plan.tasks.length} monthly tasks` : ''}.`)) return;
    try { const r = startService(id); setErr(''); ui.toast(`${monthLabel(r.month)} service cycle ready with ${r.tasks} monthly tasks.`); location.hash = '#/clients/' + r.clientId; } catch (e) { setErr(e.message); }
  };
  const taskRow = t => { const od = t.status !== 'Completed' && t.dueDate && t.dueDate < td;
    return <div className="line" key={t.id}><div><span className={'ic ' + t.status.replace(/\W+/g, '').toLowerCase()}>{ICON(t.status)}</span> <b className="click" onClick={() => ui.open('onbTask', { id: t.id })}>{t.name}</b>
      <div className="muted sm">{t.code}{t.category ? ' · ' + t.category : ''}{t.assignee ? ' · ' + t.assignee : ''} · <span className={od ? 'od' : ''}>{od ? 'Overdue · ' : 'Due '}{fmtDate(t.dueDate)}</span>{t.notes ? ' · 📝 ' + t.notes : ''}</div></div>
      <div className="r"><select value={t.status} onChange={e => updateTask(t.id, { status: e.target.value })}><Opts list={ONB_TASK_STATUS} /></select><button className="btn sm" onClick={() => ui.open('onbTask', { id: t.id })}>Edit</button></div></div>; };

  return <>
    <a href="#/onboarding" className="muted sm">← Onboarding</a>
    <div className="head"><div><h1>{i.client?.company}</h1><div className="muted">{sysLabel} · <Badge v={st} /> {rec.forced && <span className="badge b-blocked" title={rec.forceReason}>Forced start</span>}</div>
      {late && <div className="od sm">Overdue — target completion was {fmtDate(rec.dueDate)}</div>}</div>
      <div className="row"><a className="btn" href={'#/clients/' + rec.clientId}>Open client</a>
        {!active && <button className="btn" onClick={() => setHold(id, st !== 'On Hold')}>{st === 'On Hold' ? 'Resume' : 'Put on hold'}</button>}
        {!active && <button className="btn warn" onClick={() => confirm('Delete this onboarding plan (tasks, requirements and history)? The client is kept.') && (deleteOnboarding(id), (location.hash = '#/onboarding'))}>Delete</button>}</div></div>
    {sibs.length > 1 && <div className="tabs">{sibs.map(r => { const x = recInfo(s, r); return <a key={r.id} href={'#/onboarding/' + r.id} className={'tab' + (r.id === id ? ' on' : '')}>{x.mp?.name} · {x.sv?.name} <Badge v={r.status} /></a>; })}</div>}

    <div className="row mb">
      <button className="btn" onClick={() => ui.open('onbReq', { onboardingId: id })}>Add Requirement</button><button className="btn" onClick={() => ui.open('onbTask', { onboardingId: id })}>Add Task</button>
      <button className="btn" onClick={() => msg('Information Request')}>Generate Message</button><button className="btn" onClick={() => msg('Missing Information')}>Generate Follow-up</button>
      <button className="btn" onClick={() => { const n = requestAll(id); ui.toast(n ? `${n} requirement(s) marked as Requested.` : 'Nothing left to request.'); }}>Mark all as Requested</button>
      {!active && !ready && <button className="btn pri" onClick={tryReady}>Mark Ready to Start</button>}
      <button className="btn ok" disabled={!ready} title={ready ? '' : 'Mark Ready to Start first'} onClick={start}>Start Service</button></div>
    {err && <div className="err">{err} {/template/i.test(err) && <a href="#/templates"><b>Open Service Templates</b></a>}</div>}

    {ready && <div className="card okbox"><div className="between"><div><h2>Ready to Start</h2><div className="sm">{rec.forced ? <>Forced by the owner. Reason: <b>{rec.forceReason}</b></> : 'All onboarding checks passed.'}</div>
      <div className="sm muted mt">{cycle ? `The ${monthLabel(month)} service cycle already exists for this service.` : plan?.hasTemplate ? `Start Service creates the ${monthLabel(month)} service cycle with ${plan.tasks.length} monthly tasks (from the Service Template).` : <span className="od">No monthly task template exists for {sysLabel}. Create one in Service Templates, then start the service.</span>}</div></div>
      <div className="row"><button className="btn" onClick={() => reopen(id)}>Reopen onboarding</button><button className="btn ok" onClick={start}>Start Service</button></div></div></div>}
    {active && <div className="card okbox"><div className="between"><div><h2>Service active</h2><div className="sm">Started {fmtDate(rec.startedAt)}{rec.cycleId && by(s.cycles, rec.cycleId) ? ` · first cycle: ${monthLabel(by(s.cycles, rec.cycleId).month)}` : ''}. Continue delivery from the client dashboard.</div></div>
      <a className="btn pri" href={'#/clients/' + rec.clientId}>Open client service dashboard</a></div></div>}

    <div className="card"><h2>Onboarding progress</h2><div className="bigp"><span className="num">{p.pct}%</span><div style={{ flex: 1 }}><Bar pct={p.pct} /></div></div>
      <div className="pgrid"><Prog label="Client requirements" a={p.reqGot} b={p.reqTotal} hint="received" /><Prog label="Internal setup" a={p.tasksDone} b={p.tasksTotal} hint="tasks completed" /><Prog label="Overall onboarding" a={p.done} b={p.total} hint="completed" /></div></div>

    <div className="cols">
      <div className="card"><h2>Onboarding checklist</h2><div className="muted sm mb">{i.client?.company} · {sysLabel}</div>
        {tasks.map(t => <div key={t.id} className={'chkline ' + t.status.replace(/\W+/g, '').toLowerCase()}><span className="ic">{ICON(t.status)}</span> {t.name}</div>)}
        <div className={'chkline' + (g.ok ? ' completed' : '')}><span className="ic">{g.ok ? '✓' : '○'}</span> Final verification</div>
        <div className={'chkline' + (ready || active ? ' completed' : '')}><span className="ic">{ready || active ? '✓' : '○'}</span> Ready to Start</div></div>
      <div><div className="card"><h2>Waiting for client {i.waiting.length > 0 && <span className="badge b-waiting-for-client">{i.waiting.length}</span>}</h2>
        {i.waiting.length ? <><div className="sm mb"><b>{i.client?.company}</b> — {i.waiting.length} item{i.waiting.length > 1 ? 's' : ''} waiting for client:</div>{i.waiting.map(w => <div key={w.kind + w.id} className="sm">• {w.name} <span className="muted">({w.status})</span></div>)}
          <div className="row mt"><button className="btn sm pri" onClick={() => msg('Missing Information')}>Generate follow-up</button></div></> : <Empty>Nothing is waiting on the client.</Empty>}</div>
        {!active && <div className="card"><h2>Ready to Start checklist</h2>{g.items.map(x => <div key={x.label}><div className="sm"><span className={x.ok ? 'okc' : 'od'}>{x.ok ? '✓' : '✗'}</span> {x.label}</div></div>)}
          {!ready && <div className="row mt"><button className="btn sm pri" onClick={tryReady}>Mark Ready to Start</button></div>}
          {showGate && !g.ok && !ready && <div className="err mt"><b>Cannot mark Ready to Start.</b><div className="mt">Missing:</div>{g.missing.map(m => <div key={m}>• {m}</div>)}
            <div className="mt"><b>Force Ready to Start</b> <span className="sm">(owner override — a reason is required and is recorded in the history)</span>
              <textarea rows="2" placeholder="Reason for forcing Ready to Start" value={reason} onChange={e => setReason(e.target.value)} style={{ marginTop: 6 }} />
              <button className="btn sm warn mt" onClick={force}>Force Ready to Start</button></div></div>}</div>}</div></div>

    <div className="card"><div className="between"><h2>Client information required <span className="muted sm">· {p.reqGot} / {p.reqTotal} received</span></h2><button className="btn sm" onClick={() => ui.open('onbReq', { onboardingId: id })}>+ Requirement</button></div>
      {reqs.length ? <div className="tw"><table><thead><tr><th>Requirement</th><th>Marketplace</th><th>Required</th><th>Status</th><th>Requested</th><th>Received</th><th></th></tr></thead><tbody>
        {reqs.map(r => <tr key={r.id}><td><span className="ic">{reqIcon(r.status)}</span> <b className="click" onClick={() => ui.open('onbReq', { id: r.id })}>{r.name}</b>{r.description && <div className="muted sm">{r.description}</div>}{r.notes && <div className="sm">📝 {r.notes}</div>}</td><td>{i.mp?.name}</td><td>{r.required ? 'Required' : 'Optional'}</td>
          <td><select value={r.status} onChange={e => updateReq(r.id, { status: e.target.value })}><Opts list={REQ_STATUS} /></select></td><td className="sm">{fmtDate(r.requestedAt)}</td><td className="sm">{fmtDate(r.receivedAt)}</td>
          <td><div className="row">{NEXT[r.status] && <button className="btn sm" onClick={() => updateReq(r.id, { status: NEXT[r.status][0] })}>{NEXT[r.status][1]}</button>}<button className="btn sm" onClick={() => ui.open('onbReq', { id: r.id })}>Edit</button></div></td></tr>)}</tbody></table></div> : <Empty>No client requirements. Add one.</Empty>}
      <div className="muted sm mt">Never store passwords or OTPs — ask the client to invite DesireTech as a user.</div></div>

    <div className="card"><div className="between"><h2>Internal tasks <span className="muted sm">· DesireTech</span></h2><button className="btn sm" onClick={() => ui.open('onbTask', { onboardingId: id })}>+ Task</button></div>
      {internal.length ? internal.map(taskRow) : <Empty>No internal tasks.</Empty>}
      {clientTasks.length > 0 && <><h2 className="mt">Tasks that need the client</h2>{clientTasks.map(taskRow)}</>}</div>

    <div className="cols"><div className="card"><div className="between"><h2>Communication</h2><button className="btn sm" onClick={() => msg('Information Request')}>Generate message</button></div>
      {comms.length ? comms.map(m => <div className="line" key={m.id}><div><b>{m.type}</b> <span className="muted sm">{fmtDate(m.date)}</span><div className="sm clip">{m.message}</div></div><div className="r"><Badge v={m.status} /><button className="btn sm" onClick={() => copyText(m.message).then(() => ui.toast('Copied.'))}>Copy</button></div></div>) : <Empty>No onboarding messages yet.</Empty>}</div>
      <div className="card"><h2>Onboarding history</h2>{events.length ? events.map(e => <div className="evt" key={e.id}><span className="muted sm">{fmtDate(e.date)}</span> {e.text}</div>) : <Empty>No history yet.</Empty>}</div></div>
  </>;
}
