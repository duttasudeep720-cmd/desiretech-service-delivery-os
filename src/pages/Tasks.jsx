import { useState } from 'react';
import { useStore } from '../data/store.js';
import { useUI, Badge, Opts, Empty } from '../ui.jsx';
import { by, isOverdue, TASK_STATUS } from '../logic.js';
import { monthLabel, fmtDate } from '../data/util.js';

export default function Tasks() {
  const s = useStore(), ui = useUI(); const [f, setF] = useState({ q: '', status: '', client: '', month: '', overdue: false }); const up = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const months = [...new Set(s.tasks.map(t => t.month))].sort().reverse();
  const rows = s.tasks.filter(t => (!f.status || t.status === f.status) && (!f.client || t.clientId === f.client) && (!f.month || t.month === f.month) && (!f.overdue || isOverdue(t)) && (!f.q || (t.name + t.code).toLowerCase().includes(f.q.toLowerCase()))).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  return <>
    <div className="head"><div><h1>Tasks</h1><div className="muted">{rows.length} task(s)</div></div></div>
    <div className="filters f4"><input placeholder="Search task or ID" value={f.q} onChange={up('q')} /><select value={f.status} onChange={up('status')}><Opts blank="All statuses" list={TASK_STATUS} /></select>
      <select value={f.client} onChange={up('client')}><Opts blank="All clients" list={s.clients.map(c => ({ v: c.id, l: c.company }))} /></select>
      <select value={f.month} onChange={up('month')}><Opts blank="All months" list={months.map(m => ({ v: m, l: monthLabel(m) }))} /></select>
      <label className="chk"><input type="checkbox" checked={f.overdue} onChange={up('overdue')} /> Overdue only</label></div>
    {rows.length ? <div className="tw"><table><thead><tr><th>ID</th><th>Task</th><th>Client</th><th>Service</th><th>Due</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead><tbody>
      {rows.map(t => <tr key={t.id} className="click" onClick={() => ui.open('task', { id: t.id })}><td>{t.code}</td><td><b>{t.name}</b><div className="muted sm">{monthLabel(t.month)}</div></td><td>{by(s.clients, t.clientId)?.company}</td><td>{by(s.services, t.serviceId)?.name}</td>
        <td className={isOverdue(t) ? 'od' : ''}>{fmtDate(t.dueDate)}{isOverdue(t) && ' · Overdue'}</td><td>{t.priority}</td><td><Badge v={t.status} /></td><td>{t.assignee || '—'}</td></tr>)}</tbody></table></div> : <Empty>No tasks match. Generate a monthly service from a client page.</Empty>}</>;
}
