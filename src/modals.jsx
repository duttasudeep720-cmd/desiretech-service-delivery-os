import { useEffect, useState } from 'react';
import { useStore, db } from './data/store.js';
import { saveClient, addTask } from './data/actions.js';
import { today, monthLabel } from './data/util.js';
import { by, cycleLabel, generateMessage, COMM_TYPES, TASK_STATUS, PRIORITY, CLIENT_STATUS, ISSUE_STATUS } from './logic.js';
import { useUI, Modal, F, Opts, useForm, Badge, copyText } from './ui.jsx';
import { ONB_COMM_TYPES, ONB_STATUS } from './onboarding/logic.js';
import { generateOnboardingMessage } from './onboarding/messages.js';

export function TaskModal({ id }) {
  const s = useStore(), ui = useUI(), t = by(s.tasks, id); const [f, b] = useForm(t || {}); const [err, setErr] = useState('');
  if (!t) return null;
  const persist = status => {
    const st = status || f.status;
    if (st === 'Blocked' && !(f.issue || '').trim()) { setErr('Describe what is blocking this task in the "Issue / blocker" field.'); return false; }
    db.update('tasks', t.id, { name: f.name, description: f.description, dueDate: f.dueDate, priority: f.priority, status: st, assignee: f.assignee, notes: f.notes, result: f.result, issue: f.issue, followUp: f.followUp, evidence: f.evidence, completedAt: st === 'Completed' ? (t.completedAt || today()) : '' });
    return true;
  };
  const go = status => persist(status) && ui.close();
  return <Modal title={`${t.code} · ${t.name}`} onClose={ui.close} wide>
    <div className="muted sm mb">{by(s.clients, t.clientId)?.company} · {by(s.marketplaces, t.marketplaceId)?.name} · {by(s.services, t.serviceId)?.name} · {monthLabel(t.month)} <Badge v={t.status} /></div>
    <div className="grid2">
      <F label="Task name"><input {...b('name')} /></F><F label="Due date"><input type="date" {...b('dueDate')} /></F>
      <F label="Priority"><select {...b('priority')}><Opts list={PRIORITY} /></select></F><F label="Status"><select {...b('status')}><Opts list={TASK_STATUS} /></select></F>
      <F label="Assigned to"><input {...b('assignee')} /></F><F label="Evidence / attachment reference"><input placeholder="Link, file name or screenshot ref" {...b('evidence')} /></F>
      <F label="Description" full><textarea rows="2" {...b('description')} /></F><F label="Notes" full><textarea rows="2" {...b('notes')} /></F>
      <F label="Result" full><textarea rows="2" placeholder="e.g. ACOS improved from 24% to 19%." {...b('result')} /></F>
      <F label="Issue / blocker" full><textarea rows="2" {...b('issue')} /></F><F label="Follow-up" full><textarea rows="2" {...b('followUp')} /></F></div>
    {err && <div className="err">{err}</div>}
    <div className="row mt">
      <button className="btn" onClick={() => go('In Progress')}>Start</button><button className="btn ok" onClick={() => go('Completed')}>Complete</button><button className="btn warn" onClick={() => go('Blocked')}>Block</button>
      <button className="btn" onClick={() => persist() && ui.open('issue', { pre: { clientId: t.clientId, taskId: t.id, title: t.issue ? t.issue.slice(0, 80) : `Issue: ${t.name}`, description: t.issue || '' } })}>Raise issue</button>
      <button className="btn" onClick={() => persist() && ui.open('message', { pre: { clientId: t.clientId, taskId: t.id, type: t.status === 'Blocked' || f.status === 'Blocked' ? 'Missing Information' : 'Task Update' } })}>Client message</button>
      <button className="btn" onClick={() => persist() && ui.open('genFromTemplate', { pre: { clientId: t.clientId, taskId: t.id } })}>Message from template</button>
      <span className="grow" /><button className="btn pri" onClick={() => go()}>Save</button></div>
  </Modal>;
}

export function IssueModal({ id, pre = {} }) {
  const s = useStore(), ui = useUI(), ex = by(s.issues, id);
  const cs0 = ex && s.clientServices.find(c => c.clientId === ex.clientId && c.marketplaceId === ex.marketplaceId && c.serviceId === ex.serviceId);
  const [f, b, set] = useForm(ex ? { ...ex, csId: cs0?.id || '' } : { title: '', clientId: '', csId: '', taskId: '', description: '', priority: 'Medium', status: 'Open', resolution: '', notes: '', ...pre });
  const [err, setErr] = useState('');
  const css = s.clientServices.filter(c => c.clientId === f.clientId), tasks = s.tasks.filter(t => t.clientId === f.clientId);
  const save = () => {
    if (!f.title.trim() || !f.clientId) return setErr('Title and client are required.');
    const task = by(s.tasks, f.taskId), cs = by(s.clientServices, f.csId);
    const row = { title: f.title.trim(), clientId: f.clientId, taskId: f.taskId, marketplaceId: task?.marketplaceId || cs?.marketplaceId || '', serviceId: task?.serviceId || cs?.serviceId || '', description: f.description, priority: f.priority, status: f.status, resolution: f.resolution, notes: f.notes, resolvedAt: f.status === 'Resolved' ? (ex?.resolvedAt || today()) : '' };
    if (ex) db.update('issues', ex.id, row); else db.insert('issues', { ...row, createdAt: today() });
    ui.close();
  };
  return <Modal title={ex ? 'Edit Issue' : 'Add Issue'} onClose={ui.close} wide>
    <div className="grid2">
      <F label="Issue title *" full><input {...b('title')} /></F>
      <F label="Client *"><select value={f.clientId} onChange={e => set({ ...f, clientId: e.target.value, csId: '', taskId: '' })}><Opts blank="Select client" list={s.clients.map(c => ({ v: c.id, l: c.company }))} /></select></F>
      <F label="Marketplace / service"><select {...b('csId')}><Opts blank="—" list={css.map(c => ({ v: c.id, l: `${by(s.marketplaces, c.marketplaceId)?.name} · ${by(s.services, c.serviceId)?.name}` }))} /></select></F>
      <F label="Related task" full><select {...b('taskId')}><Opts blank="None" list={tasks.map(t => ({ v: t.id, l: `${t.code} · ${t.name} (${monthLabel(t.month)})` }))} /></select></F>
      <F label="Description" full><textarea rows="2" {...b('description')} /></F>
      <F label="Priority"><select {...b('priority')}><Opts list={PRIORITY} /></select></F><F label="Status"><select {...b('status')}><Opts list={ISSUE_STATUS} /></select></F>
      <F label="Resolution" full><textarea rows="2" {...b('resolution')} /></F><F label="Notes" full><textarea rows="2" {...b('notes')} /></F></div>
    {err && <div className="err">{err}</div>}
    <div className="row mt">{ex && <button className="btn" onClick={() => ui.open('genFromTemplate', { pre: { clientId: ex.clientId, issueId: ex.id, taskId: ex.taskId } })}>Message from template</button>}<span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>Save issue</button></div>
  </Modal>;
}

export function MessageGenerator({ pre = {}, onSaved }) {
  const s = useStore(), ui = useUI();
  const [f, b, set] = useForm({ clientId: pre.clientId || '', type: pre.type || 'Information Request', taskId: pre.taskId || '', issueId: pre.issueId || '', onboardingId: pre.onboardingId || '', details: '' });
  const [text, setText] = useState('');
  const isOnb = ONB_COMM_TYPES.includes(f.type), build = x => ONB_COMM_TYPES.includes(x.type) ? generateOnboardingMessage(s, x) : generateMessage(s, x);
  const recs = s.onboardingRecords.filter(r => r.clientId === f.clientId);
  useEffect(() => { if (pre.clientId) setText(build(f)); }, []); // eslint-disable-line
  const tasks = s.tasks.filter(t => t.clientId === f.clientId && t.status !== 'Completed'), issues = s.issues.filter(i => i.clientId === f.clientId && i.status !== 'Resolved');
  const gen = () => f.clientId ? setText(build(f)) : ui.toast('Select a client first.');
  const save = () => { if (!text.trim()) return; db.insert('communications', { clientId: f.clientId, date: today(), type: f.type, message: text, status: 'Pending', ...(isOnb ? { onboardingId: f.onboardingId || '' } : {}) }); ui.toast('Message saved to Communication.'); onSaved?.(); };
  return <div>
    <div className="grid2">
      <F label="Client"><select value={f.clientId} onChange={e => set({ ...f, clientId: e.target.value, taskId: '', issueId: '', onboardingId: '' })}><Opts blank="Select client" list={s.clients.map(c => ({ v: c.id, l: c.company }))} /></select></F>
      <F label="Message type"><select {...b('type')}><optgroup label="Service delivery"><Opts list={COMM_TYPES} /></optgroup><optgroup label="Client onboarding"><Opts list={ONB_COMM_TYPES} /></optgroup></select></F>
      {isOnb ? <F label="Onboarding (marketplace · service)" full><select {...b('onboardingId')}><Opts blank="All open onboarding for this client" list={recs.map(r => { const cs = by(s.clientServices, r.clientServiceId); return { v: r.id, l: `${by(s.marketplaces, cs?.marketplaceId)?.name} · ${by(s.services, cs?.serviceId)?.name} (${r.status})` }; })} /></select></F> : <>
      <F label="Relevant task"><select {...b('taskId')}><Opts blank="None" list={tasks.map(t => ({ v: t.id, l: `${t.code} · ${t.name}` }))} /></select></F>
      <F label="Relevant issue"><select {...b('issueId')}><Opts blank="None" list={issues.map(i => ({ v: i.id, l: i.title }))} /></select></F></>}
      <F label={isOnb ? 'Extra items / note (optional, one per line)' : 'Details (required info / recommendation / message)'} full><textarea rows="2" {...b('details')} /></F></div>
    <div className="row mt"><button className="btn pri" onClick={gen}>Generate message</button></div>
    <F label="Message (editable)" full><textarea rows="10" value={text} onChange={e => setText(e.target.value)} placeholder="Generated message appears here. Remaining [placeholders] need your input." /></F>
    <div className="row"><button className="btn" disabled={!text} onClick={() => copyText(text).then(() => ui.toast('Copied to clipboard.'))}>Copy</button><button className="btn" disabled={!text || !f.clientId} onClick={save}>Save message</button><span className="muted sm">Messages are not sent automatically.</span></div>
  </div>;
}
export const MessageModal = ({ pre }) => { const ui = useUI(); return <Modal title="Generate Client Message" onClose={ui.close} wide><MessageGenerator pre={pre} onSaved={ui.close} /></Modal>; };

export function ClientModal({ id }) {
  const s = useStore(), ui = useUI(), ex = by(s.clients, id);
  const [f, b] = useForm(ex || { name: '', company: '', contact: '', email: '', phone: '', status: 'Active', startDate: today(), notes: '' });
  const key = c => c.marketplaceId + '|' + c.serviceId;
  const [sel, setSel] = useState(() => new Set(ex ? s.clientServices.filter(c => c.clientId === id).map(key) : []));
  const [err, setErr] = useState('');
  const used = k => ex && s.clientServices.some(c => c.clientId === id && key(c) === k && s.cycles.some(y => y.clientServiceId === c.id));
  const save = () => {
    if (!f.name.trim()) return setErr('Client name is required.');
    const cid = saveClient({ name: f.name.trim(), company: f.company.trim() || f.name.trim(), contact: f.contact, email: f.email, phone: f.phone, status: f.status, startDate: f.startDate, notes: f.notes, ...(ex?.demo ? { demo: true } : {}) }, [...sel], id);
    ui.close(); if (!id) location.hash = '#/clients/' + cid;
  };
  return <Modal title={ex ? 'Edit Client' : 'Add Client'} onClose={ui.close} wide>
    <div className="grid2">
      <F label="Client name *"><input {...b('name')} /></F><F label="Company / brand"><input {...b('company')} /></F>
      <F label="Contact person"><input {...b('contact')} /></F><F label="Email"><input type="email" {...b('email')} /></F>
      <F label="Phone"><input {...b('phone')} /></F><F label="Status"><select {...b('status')}><Opts list={[...ONB_STATUS, 'Completed']} /></select></F>
      <F label="Start date"><input type="date" {...b('startDate')} /></F><span />
      <F label="Marketplace + service" full><div className="checks">{s.serviceTemplates.map(t => { const k = t.marketplaceId + '|' + t.serviceId; return <label key={t.id} className="chk"><input type="checkbox" checked={sel.has(k)} disabled={used(k)} onChange={e => setSel(p => { const n = new Set(p); e.target.checked ? n.add(k) : n.delete(k); return n; })} /> {by(s.marketplaces, t.marketplaceId)?.name} — {by(s.services, t.serviceId)?.name}</label>; })}</div></F>
      <F label="Notes" full><textarea rows="3" {...b('notes')} /></F></div>
    {err && <div className="err">{err}</div>}
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>{ex ? 'Save client' : 'Create client'}</button></div>
  </Modal>;
}

export function AddTaskModal({ clientId, month }) {
  const s = useStore(), ui = useUI(), cys = s.cycles.filter(c => c.clientId === clientId && c.month === month);
  const [f, b] = useForm({ cycleId: cys[0]?.id || '', name: '', description: '', dueDate: today(), priority: 'Medium', assignee: '' }); const [err, setErr] = useState('');
  const save = () => { if (!f.cycleId || !f.name.trim()) return setErr('Select a monthly service and enter a task name.'); addTask({ ...f, name: f.name.trim() }); ui.close(); };
  return <Modal title="Add Task" onClose={ui.close}>
    {!cys.length && <div className="err">Generate a monthly service for {monthLabel(month)} first.</div>}
    <div className="grid2"><F label="Monthly service" full><select {...b('cycleId')}><Opts list={cys.map(c => ({ v: c.id, l: cycleLabel(s, c) }))} /></select></F>
      <F label="Task name" full><input {...b('name')} /></F><F label="Due date"><input type="date" {...b('dueDate')} /></F><F label="Priority"><select {...b('priority')}><Opts list={PRIORITY} /></select></F>
      <F label="Assigned to"><input {...b('assignee')} /></F><F label="Description" full><textarea rows="2" {...b('description')} /></F></div>
    {err && <div className="err">{err}</div>}
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>Add task</button></div></Modal>;
}
export function NoteModal({ clientId }) {
  const s = useStore(), ui = useUI(), c = by(s.clients, clientId); const [t, setT] = useState('');
  const save = () => { if (!t.trim()) return; db.update('clients', clientId, { notes: ((c.notes || '') + `\n[${today()}] ${t.trim()}`).trim() }); ui.close(); };
  return <Modal title={`Add Note · ${c?.company}`} onClose={ui.close}><F label="Note" full><textarea rows="4" value={t} onChange={e => setT(e.target.value)} /></F>
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>Save note</button></div></Modal>;
}
