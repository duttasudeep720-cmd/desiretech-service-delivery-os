import { useState } from 'react';
import { useStore } from '../data/store.js';
import { Modal, F, Opts, Badge, Empty, useUI } from '../ui.jsx';
import { by } from '../logic.js';
import { CLIENT_TYPES, categoryOptions, proposalServiceOptions } from '../proposals/proposalDefaults.js';
import { mpList, leadTitle } from './leadDefaults.js';
import { assignProposal, clearProposal } from './leadActions.js';

// Picks a proposal from the EXISTING Proposal Library. Only the proposal id (+ name for display) is stored on the lead.
// "Any" proposals are suitable for every marketplace / service.
const fits = (p, f, keepId) => (p.status !== 'Archived' || p.id === keepId) && (!f.mp || p.category === f.mp || p.marketplace === f.mp || p.marketplace === 'Any')
  && (!f.service || p.service === f.service || p.service === 'Any') && (!f.type || p.targetClientType === f.type)
  && (!f.q.trim() || [p.name, p.description, p.service, p.marketplace].some(x => (x || '').toLowerCase().includes(f.q.trim().toLowerCase())));

export default function AssignProposalModal({ id }) {
  const s = useStore(), ui = useUI(), l = by(s.leads || [], id), all = s.proposals || [];
  const mpOpts = [...new Set([...categoryOptions(s), ...all.flatMap(p => [p.category, p.marketplace]).filter(x => x && x !== 'Any')])];
  const svOpts = [...new Set([...proposalServiceOptions(s).filter(x => x !== 'Any'), ...all.map(p => p.service).filter(x => x && x !== 'Any')])];
  // Start from the lead's marketplace + service, relaxing the filters until at least one proposal is listed.
  const [f, setF] = useState(() => {
    const mp = mpList(l || {}).find(m => mpOpts.includes(m)) || '', service = l && svOpts.includes(l.service) && l.service !== 'Other' ? l.service : '';
    const tries = [{ mp, service }, { mp, service: '' }, { mp: '', service }, { mp: '', service: '' }].map(x => ({ q: '', type: '', ...x }));
    return tries.find(x => all.some(p => fits(p, x, l?.proposalId))) || tries[3];
  });
  if (!l) return <Modal title="Assign proposal" onClose={ui.close}><div className="err">This lead no longer exists.</div></Modal>;
  const upd = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const rows = all.filter(p => fits(p, f, l.proposalId))
    .sort((a, b) => (b.id === l.proposalId) - (a.id === l.proposalId) || (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || a.name.localeCompare(b.name));
  const choose = p => { assignProposal(l.id, p.id); ui.toast('Proposal assigned.'); ui.close(); };
  const changed = f.q || f.mp || f.service || f.type;
  return <Modal wide title={`Assign proposal — ${leadTitle(l)}`} onClose={ui.close}>
    <p className="muted sm">Choose a proposal from the Proposal Library. The lead keeps a link to it, not a copy. Filters start from the lead’s marketplace and service where proposals exist for them.</p>
    <div className="tfilters"><input className="tq" placeholder="Search proposals…" value={f.q} onChange={upd('q')} />
      <select aria-label="Marketplace" value={f.mp} onChange={upd('mp')}><Opts blank="All marketplaces / categories" list={mpOpts} /></select>
      <select aria-label="Service" value={f.service} onChange={upd('service')}><Opts blank="All services" list={svOpts} /></select>
      <select aria-label="Target client type" value={f.type} onChange={upd('type')}><Opts blank="All client types" list={CLIENT_TYPES} /></select>
      <button className="btn" disabled={!changed} onClick={() => setF({ q: '', mp: '', service: '', type: '' })}>Clear filters</button></div>
    <div className="muted sm mb">{rows.length} proposal{rows.length === 1 ? '' : 's'}</div>
    {rows.length ? rows.map(p => <div className="line" key={p.id}><div><b>{p.name}</b>{p.id === l.proposalId && <span className="badge b-active"> Assigned</span>}
      <div className="row tmeta"><Badge v={p.status} />{[p.marketplace, p.service, p.targetClientType].map((x, i) => <span className="badge" key={i}>{x}</span>)}</div></div>
      <button className={'btn sm' + (p.id === l.proposalId ? '' : ' pri')} disabled={p.id === l.proposalId} onClick={() => choose(p)}>{p.id === l.proposalId ? 'Assigned' : 'Select'}</button></div>)
      : <Empty>{all.length ? 'No proposals match. Clear the filters to see all proposals.' : 'The Proposal Library is empty. Add proposals under Communication → Proposals.'}</Empty>}
    <div className="row mt">{l.proposalId && <button className="btn warn" onClick={() => { clearProposal(l.id); ui.toast('Proposal removed from the lead.'); ui.close(); }}>Remove proposal</button>}<span className="grow" /><button className="btn" onClick={ui.close}>Close</button></div>
  </Modal>;
}
