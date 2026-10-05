import { useState } from 'react';
import { useStore } from '../data/store.js';
import { today } from '../data/util.js';
import { by, PRIORITY } from '../logic.js';
import { useUI, Modal, F, Opts, useForm, Badge } from '../ui.jsx';
import { ONB_TASK_STATUS, REQ_STATUS, ONB_CATEGORIES, looksSecret, SECRET_MSG } from './logic.js';
import { updateTask, addTask, deleteTask, updateReq, addReq, deleteReq } from './actions.js';

const ctx = (s, rec) => { const cs = by(s.clientServices, rec?.clientServiceId); return `${by(s.clients, rec?.clientId)?.company} · ${by(s.marketplaces, cs?.marketplaceId)?.name} · ${by(s.services, cs?.serviceId)?.name}`; };

export function OnbTaskModal({ id, onboardingId }) {
  const s = useStore(), ui = useUI(), t = by(s.onboardingTasks, id), rec = by(s.onboardingRecords, t?.onboardingId || onboardingId);
  const [f, b, set] = useForm(t || { name: '', description: '', category: '', status: 'Pending', priority: 'Medium', dueDate: rec?.dueDate || today(), assignee: '', notes: '', clientDependency: false });
  const [err, setErr] = useState('');
  if (!rec) return null;
  const save = () => {
    if (!f.name.trim()) return setErr('Task name is required.');
    if (looksSecret(f.notes, f.description)) return setErr(SECRET_MSG);
    let status = f.status; if (f.clientDependency && status === 'Pending') status = 'Waiting for Client'; // client dependency => waiting on client
    const row = { name: f.name.trim(), description: f.description, category: f.category, status, priority: f.priority, dueDate: f.dueDate, assignee: f.assignee, notes: f.notes, clientDependency: !!f.clientDependency };
    if (t) updateTask(t.id, row); else addTask(rec.id, row);
    ui.close();
  };
  return <Modal title={t ? `${t.code} · ${t.name}` : 'Add onboarding task'} onClose={ui.close} wide>
    <div className="muted sm mb">{ctx(s, rec)} {t && <Badge v={t.status} />}</div>
    <div className="grid2">
      <F label="Task name *" full><input {...b('name')} /></F>
      <F label="Status"><select {...b('status')}><Opts list={ONB_TASK_STATUS} /></select></F><F label="Priority"><select {...b('priority')}><Opts list={PRIORITY} /></select></F>
      <F label="Due date"><input type="date" {...b('dueDate')} /></F><F label="Assigned to"><input {...b('assignee')} /></F>
      <F label="Category"><select {...b('category')}><Opts blank="—" list={[...new Set([...ONB_CATEGORIES, f.category].filter(Boolean))]} /></select></F>
      <label className="chk" style={{ alignSelf: 'center' }}><input type="checkbox" checked={!!f.clientDependency} onChange={e => set({ ...f, clientDependency: e.target.checked })} /> Needs something from the client</label>
      <F label="Description" full><textarea rows="2" {...b('description')} /></F><F label="Notes" full><textarea rows="2" {...b('notes')} /></F></div>
    <div className="muted sm">Never record passwords or OTPs here.</div>
    {err && <div className="err">{err}</div>}
    <div className="row mt">{t && <button className="btn warn" onClick={() => confirm('Delete this onboarding task?') && (deleteTask(t.id), ui.close())}>Delete</button>}
      <span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>{t ? 'Save task' : 'Add task'}</button></div>
  </Modal>;
}

export function OnbReqModal({ id, onboardingId }) {
  const s = useStore(), ui = useUI(), r = by(s.onboardingRequirements, id), rec = by(s.onboardingRecords, r?.onboardingId || onboardingId);
  const [f, b, set] = useForm(r || { name: '', description: '', category: '', required: true, status: 'Not Requested', requestedAt: '', receivedAt: '', notes: '' });
  const [err, setErr] = useState('');
  if (!rec) return null;
  const save = () => {
    if (!f.name.trim()) return setErr('Requirement name is required.');
    if (looksSecret(f.notes, f.description)) return setErr(SECRET_MSG);
    const row = { name: f.name.trim(), description: f.description, category: f.category, required: !!f.required, status: f.status, notes: f.notes, requestedAt: f.requestedAt, receivedAt: f.receivedAt };
    if (r) updateReq(r.id, row); else addReq(rec.id, row);
    ui.close();
  };
  return <Modal title={r ? r.name : 'Add client requirement'} onClose={ui.close} wide>
    <div className="muted sm mb">{ctx(s, rec)} {r && <Badge v={r.status} />}</div>
    <div className="grid2">
      <F label="Requirement *" full><input {...b('name')} placeholder="e.g. Brand authorization letter" /></F>
      <F label="Status"><select {...b('status')}><Opts list={REQ_STATUS} /></select></F>
      <label className="chk" style={{ alignSelf: 'center' }}><input type="checkbox" checked={!!f.required} onChange={e => set({ ...f, required: e.target.checked })} /> Required for Ready to Start</label>
      <F label="Requested on"><input type="date" {...b('requestedAt')} /></F><F label="Received on"><input type="date" {...b('receivedAt')} /></F>
      <F label="Category"><select {...b('category')}><Opts blank="—" list={[...new Set([...ONB_CATEGORIES, f.category].filter(Boolean))]} /></select></F><span />
      <F label="Description / what exactly we need" full><textarea rows="2" {...b('description')} /></F><F label="Notes" full><textarea rows="2" {...b('notes')} /></F></div>
    <div className="muted sm">Never record passwords, OTPs or login secrets here — ask the client to grant user access instead.</div>
    {err && <div className="err">{err}</div>}
    <div className="row mt">{r && <button className="btn warn" onClick={() => confirm('Delete this requirement?') && (deleteReq(r.id), ui.close())}>Delete</button>}
      <span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>{r ? 'Save requirement' : 'Add requirement'}</button></div>
  </Modal>;
}
