import { useStore } from '../data/store.js';
import { Modal, Badge, useUI } from '../ui.jsx';
import { by } from '../logic.js';
import { fmtDate } from '../data/util.js';
import { copyProposal, createMessageFrom, duplicateAndEdit } from './proposalUi.js';

export default function ProposalPreviewModal({ id }) {
  const s = useStore(), ui = useUI(), p = by(s.proposals || [], id);
  if (!p) return <Modal title="Proposal" onClose={ui.close}><div className="err">This proposal no longer exists.</div></Modal>;
  return <Modal wide title={p.name} onClose={ui.close}>
    <div className="row tmeta"><Badge v={p.status} />{[p.category, p.marketplace, p.service, p.targetClientType, 'v' + p.version].filter(Boolean).map((x, i) => <span className="badge" key={i}>{x}</span>)}</div>
    <div className="muted sm">Updated {fmtDate((p.updatedAt || '').slice(0, 10))}{p.description ? ' · ' + p.description : ''}</div>
    {p.content.trim() ? <pre className="msg proposal">{p.content}</pre> : <div className="empty">This proposal has no content yet. Use Edit to add it.</div>}
    {p.notes && <div className="muted sm"><b>Internal notes:</b> {p.notes}</div>}
    <div className="row mt"><button className="btn" onClick={() => copyProposal(ui, p)}>Copy Proposal Content</button><button className="btn" onClick={() => createMessageFrom(ui, s)}>Create Message</button>
      <button className="btn" onClick={() => ui.open('proposal', { id: p.id })}>Edit</button><button className="btn" onClick={() => duplicateAndEdit(ui, p.id)}>Duplicate</button><span className="grow" /><button className="btn pri" onClick={ui.close}>Close</button></div>
  </Modal>;
}
