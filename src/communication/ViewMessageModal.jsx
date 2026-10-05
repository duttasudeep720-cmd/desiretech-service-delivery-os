import { useStore } from '../data/store.js';
import { Modal, Badge, useUI, copyText } from '../ui.jsx';
import { by } from '../logic.js';
import { fmtDate } from '../data/util.js';

export default function ViewMessageModal({ id }) {
  const s = useStore(), ui = useUI(), m = by(s.communications, id);
  if (!m) return <Modal title="Message" onClose={ui.close}><div className="err">This message no longer exists.</div></Modal>;
  const full = (m.subject ? `Subject: ${m.subject}\n\n` : '') + m.message;
  return <Modal wide title={`${by(s.clients, m.clientId)?.company || m.leadName || 'Message'} · ${fmtDate(m.date)}`} onClose={ui.close}>
    <div className="row tmeta"><Badge v={m.status} />{[m.template || m.type, m.category, m.channel, m.direction, m.marketplace, m.service].filter(Boolean).map((x, i) => <span className="badge" key={i}>{x}</span>)}</div>
    {m.recipient && <div className="mb"><span className="muted sm">To:</span> <b>{m.recipient}</b>{m.sentAt && <span className="muted sm"> · sent {new Date(m.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>}</div>}
    {m.subject && <div className="mb"><span className="muted sm">Subject:</span> <b>{m.subject}</b></div>}
    <pre className="msg">{m.message}</pre>
    <div className="row mt"><span className="grow" /><button className="btn" onClick={() => copyText(m.message).then(() => ui.toast('Message copied'))}>Copy Message</button>
      {m.subject && <button className="btn" onClick={() => copyText(full).then(() => ui.toast('Subject + message copied'))}>Copy Subject + Message</button>}<button className="btn pri" onClick={ui.close}>Close</button></div>
  </Modal>;
}
