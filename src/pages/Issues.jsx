import { useState } from 'react';
import { useStore, db } from '../data/store.js';
import { useUI, Badge, Opts, Empty } from '../ui.jsx';
import { by, ISSUE_STATUS } from '../logic.js';
import { fmtDate, today } from '../data/util.js';

export default function Issues() {
  const s = useStore(), ui = useUI(); const [st, setSt] = useState(''), [cl, setCl] = useState('');
  const rows = s.issues.filter(i => (!st || i.status === st) && (!cl || i.clientId === cl)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <>
    <div className="head"><h1>Issues</h1><button className="btn pri" onClick={() => ui.open('issue')}>+ Add Issue</button></div>
    <div className="filters"><select value={st} onChange={e => setSt(e.target.value)}><Opts blank="All statuses" list={ISSUE_STATUS} /></select><select value={cl} onChange={e => setCl(e.target.value)}><Opts blank="All clients" list={s.clients.map(c => ({ v: c.id, l: c.company }))} /></select></div>
    {rows.length ? <div className="tw"><table><thead><tr><th>Issue</th><th>Client</th><th>Service</th><th>Related task</th><th>Priority</th><th>Created</th><th>Status</th></tr></thead><tbody>
      {rows.map(i => <tr key={i.id} className="click" onClick={() => ui.open('issue', { id: i.id })}><td><b>{i.title}</b></td><td>{by(s.clients, i.clientId)?.company}</td><td>{by(s.services, i.serviceId)?.name || '—'}</td><td>{by(s.tasks, i.taskId)?.name || '—'}</td><td>{i.priority}</td><td>{fmtDate(i.createdAt)}</td>
        <td onClick={e => e.stopPropagation()}><select value={i.status} onChange={e => db.update('issues', i.id, { status: e.target.value, resolvedAt: e.target.value === 'Resolved' ? today() : '' })}><Opts list={ISSUE_STATUS} /></select> <Badge v={i.status} /></td></tr>)}</tbody></table></div> : <Empty>No issues recorded.</Empty>}</>;
}
