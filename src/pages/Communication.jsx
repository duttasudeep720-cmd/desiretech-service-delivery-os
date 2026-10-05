import { useState } from 'react';
import { useStore, db } from '../data/store.js';
import { MessageGenerator } from '../modals.jsx';
import { useUI, Badge, Opts, Empty, copyText } from '../ui.jsx';
import { by } from '../logic.js';
import { fmtDate } from '../data/util.js';
import TemplatesTab from '../communication/TemplatesTab.jsx';
import TemplateMessageGenerator from '../communication/MessageGenerator2.jsx';
import ProposalsTab from '../proposals/ProposalsTab.jsx';

export default function Communication({ tab }) {
  const s = useStore(), ui = useUI(); const [cl, setCl] = useState('');
  const rows = s.communications.filter(c => !cl || c.clientId === cl).sort((a, b) => b.date.localeCompare(a.date));
  return <>
    <div className="head"><div><h1>Communication</h1><div className="muted">Generate, edit, copy and email client messages. Nothing is sent without your confirmation.</div></div></div>
    <div className="tabs"><a href="#/communication" className={'tab' + (['templates', 'generator', 'proposals'].includes(tab) ? '' : ' on')}>Messages</a><a href="#/communication/templates" className={'tab' + (tab === 'templates' ? ' on' : '')}>Templates</a><a href="#/communication/generator" className={'tab' + (tab === 'generator' ? ' on' : '')}>Message Generator</a><a href="#/communication/proposals" className={'tab' + (tab === 'proposals' ? ' on' : '')}>Proposals</a></div>
    {tab === 'templates' ? <TemplatesTab /> : tab === 'generator' ? <TemplateMessageGenerator /> : tab === 'proposals' ? <ProposalsTab /> : <>
    <div className="card"><h2>Generate client message</h2><MessageGenerator /></div>
    <div className="head sub"><h2>Message history</h2><select value={cl} onChange={e => setCl(e.target.value)}><Opts blank="All clients" list={s.clients.map(c => ({ v: c.id, l: c.company }))} /></select></div>
    {rows.length ? rows.map(m => <div className="card" key={m.id}><div className="between"><div><b>{by(s.clients, m.clientId)?.company || (m.leadId ? `${m.leadName || 'Lead'} (lead)` : '')}</b> · {m.template || m.type} <span className="muted sm">{fmtDate(m.date)}</span></div><Badge v={m.status} /></div>
      {(m.category || m.channel || m.direction || m.marketplace || m.service) && <div className="row tmeta">{[m.category, m.channel, m.direction, m.marketplace, m.service].filter(Boolean).map((x, i) => <span className="badge" key={i}>{x}</span>)}</div>}
      {m.recipient && <div className="sm"><span className="muted">To:</span> {m.recipient}</div>}
      {m.subject && <div className="sm"><span className="muted">Subject:</span> {m.subject}</div>}
      <div className="muted tprev">{m.message.replace(/\s+/g, ' ').trim().slice(0, 170)}{m.message.length > 170 ? '…' : ''}</div>
      <div className="row"><button className="btn sm" onClick={() => ui.open('viewMessage', { id: m.id })}>View</button><button className="btn sm" onClick={() => copyText(m.message).then(() => ui.toast('Copied to clipboard.'))}>Copy</button>
        {['Pending', 'WhatsApp Opened'].includes(m.status) && <button className="btn sm ok" onClick={() => db.update('communications', m.id, { status: 'Sent' })}>Mark as sent</button>}
        <button className="btn sm warn" onClick={() => confirm('Delete this message?') && db.remove('communications', m.id)}>Delete</button></div></div>) : <Empty>No messages yet.</Empty>}</>}</>;
}
