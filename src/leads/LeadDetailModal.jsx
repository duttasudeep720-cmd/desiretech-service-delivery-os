import { useStore } from '../data/store.js';
import { Modal, Badge, useUI } from '../ui.jsx';
import { by } from '../logic.js';
import { mpList, leadTitle, convertedClient, conversionPending, shortDate, stamp } from './leadDefaults.js';
import LeadButtons from './LeadButtons.jsx';

export default function LeadDetailModal({ id }) {
  const s = useStore(), ui = useUI(), l = by(s.leads || [], id);
  if (!l) return <Modal title="Lead" onClose={ui.close}><div className="err">This lead no longer exists.</div></Modal>;
  const p = by(s.proposals || [], l.proposalId), client = convertedClient(s, l), acts = [...(l.activity || [])].sort((a, b) => b.at.localeCompare(a.at));
  const D = ([t, v]) => <div key={t}><dt>{t}</dt><dd>{v || '—'}</dd></div>;
  return <Modal wide title={leadTitle(l)} onClose={ui.close}>
    <div className="row mb"><Badge v={l.status} /><span className="muted sm">Created {shortDate(l.createdAt)} · Updated {shortDate(l.updatedAt)}</span></div>
    {conversionPending(s, l) && <div className="pendtag mb">Won — Client conversion pending</div>}
    <h2 className="sec">Contact</h2>
    <dl className="info mb">{[['Company', l.companyName || l.leadName], ['Contact person', l.contactName], ['Email', l.email], ['Phone', l.phone], ['Website', l.website], ['Business type', l.businessType]].map(D)}</dl>
    <h2 className="sec">Sales</h2>
    <dl className="info mb">{[['Source', l.source], ['Status', l.status], ['Marketplace', mpList(l).join(', ')], ['Service', l.service],
      ['Assigned proposal', l.proposalId ? (p ? `${p.name} (v${p.version})` : `${l.proposalName || 'Proposal'} (no longer in library)`) : ''], ['Proposal sent', l.proposalSentAt ? shortDate(l.proposalSentAt) : '']].map(D)}</dl>
    {l.notes && <><h2 className="sec">Internal notes</h2><pre className="notes">{l.notes}</pre></>}
    <h2 className="sec">Timeline</h2>
    <div className="mb">{acts.length ? acts.map(a => <div className="evt" key={a.id}><span className="muted sm">{stamp(a.at)}</span> {a.text}</div>) : <div className="muted sm">No activity recorded.</div>}</div>
    <LeadButtons l={l} detail /><div className="row mt"><span className="grow" /><button className="btn pri" onClick={ui.close}>Close</button></div>
  </Modal>;
}
