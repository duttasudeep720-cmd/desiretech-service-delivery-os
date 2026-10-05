import { useStore } from '../data/store.js';
import { useUI, Opts } from '../ui.jsx';
import { by } from '../logic.js';
import { copyProposal } from '../proposals/proposalUi.js';
import { STATUSES, convertedClient, leadTitle } from './leadDefaults.js';
import { setLeadStatus, markProposalSent, removeLead } from './leadActions.js';
import { generateForLead, whatsAppForLead } from './leadUi.js';

// The action row for one lead - used by the lead list and the lead details modal so both behave identically.
export default function LeadButtons({ l, detail }) {
  const s = useStore(), ui = useUI(), p = by(s.proposals || [], l.proposalId), client = convertedClient(s, l);
  const hasOnb = client && s.onboardingRecords.some(r => r.clientId === client.id);
  const canSend = l.proposalId && !['Proposal Sent', 'Won', 'Lost'].includes(l.status);
  const status = e => { setLeadStatus(l.id, e.target.value); if (e.target.value === 'Won' && !client) ui.toast('Won — use “Convert to Client” to start onboarding.'); };
  const del = () => { if (!confirm(`Delete lead "${leadTitle(l)}"? This cannot be undone.${client ? ' The client created from it is kept.' : ''}`)) return; removeLead(l.id); ui.toast('Lead deleted.'); if (detail) ui.close(); };
  return <div className="row">
    {!detail && <button className="btn sm" onClick={() => ui.open('leadView', { id: l.id })}>View</button>}
    <button className="btn sm" onClick={() => ui.open('lead', { id: l.id })}>Edit</button>
    <select className="stsel" aria-label="Change status" value={l.status} onChange={status}><Opts list={STATUSES} /></select>
    <button className="btn sm" onClick={() => generateForLead(ui, s, l)}>Generate Message</button>
    <button className="btn sm wa" onClick={() => whatsAppForLead(ui, s, l)}>WhatsApp</button>
    <button className="btn sm" onClick={() => ui.open('assignProposal', { id: l.id })}>{l.proposalId ? 'Change Proposal' : 'Assign Proposal'}</button>
    {p && <><button className="btn sm" onClick={() => ui.open('proposalView', { id: p.id })}>View Proposal</button><button className="btn sm" onClick={() => copyProposal(ui, p)}>Copy Proposal</button></>}
    {canSend && <button className="btn sm ok" onClick={() => { markProposalSent(l.id); ui.toast('Marked as Proposal Sent. Nothing was sent externally.'); }}>Mark Proposal Sent</button>}
    {client ? <><span className="badge b-won">Client Created</span><a className="btn sm" href={'#/clients/' + client.id} onClick={() => ui.close()}>View Client</a>
      {!hasOnb && <button className="btn sm" onClick={() => ui.open('newClient', { clientId: client.id })}>Complete onboarding</button>}</>
      : l.status === 'Won' && <button className="btn sm pri" onClick={() => ui.open('convertLead', { id: l.id })}>Convert to Client</button>}
    <button className="btn sm warn" onClick={del}>Delete</button>
  </div>;
}
