import { useRef, useState } from 'react';
import { useStore } from '../data/store.js';
import { Modal, F, Opts, useUI } from '../ui.jsx';
import { withCurrent } from '../communication/templateOptions.js';
import { CLIENT_TYPES, STATUSES, PROPOSAL_VARIABLES, categoryOptions, proposalMarketplaceOptions, proposalServiceOptions } from './proposalDefaults.js';
import { saveProposal } from './proposalActions.js';

const BLANK = { name: '', category: 'Other', marketplace: 'Any', service: 'Any', targetClientType: 'Other', status: 'Draft', version: '1.0', favorite: false, description: '', problem: '', servicesIncluded: '', deliverables: '', process: '', benefits: '', requirements: '', pricing: '', terms: '', callToAction: '', content: '', notes: '' };
const BIG = [['problem', 'Problem / client need', 3], ['servicesIncluded', 'Services included (one per line)', 6], ['deliverables', 'Deliverables', 5], ['process', 'Process', 6], ['benefits', 'Benefits', 5], ['requirements', 'Client requirements', 5], ['pricing', 'Pricing (text only - no invoicing)', 4], ['terms', 'Terms & conditions', 5], ['callToAction', 'Call to action', 4]];

export default function ProposalModal({ id }) {
  const s = useStore(), ui = useUI(), ex = id ? (s.proposals || []).find(p => p.id === id) : null;
  const [f, set] = useState(() => ex ? { ...BLANK, ...ex } : BLANK); const [err, setErr] = useState(''); const ta = useRef(null);
  const b = k => ({ value: f[k] ?? '', onChange: e => set(p => ({ ...p, [k]: e.target.value })) });
  const insert = v => {
    const el = ta.current, a = el ? el.selectionStart : f.content.length, z = el ? el.selectionEnd : f.content.length;
    set(p => ({ ...p, content: p.content.slice(0, a) + v + p.content.slice(z) }));
    setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(a + v.length, a + v.length); } }, 0);
  };
  const save = () => { if (!f.name.trim()) return setErr('Proposal name is required.'); saveProposal(id, f); ui.toast(id ? 'Proposal updated.' : 'Proposal created.'); ui.close(); };
  if (id && !ex) return <Modal title="Edit proposal" onClose={ui.close}><div className="err">This proposal no longer exists.</div></Modal>;
  return <Modal wide title={id ? 'Edit proposal' : 'New proposal'} onClose={ui.close}>
    <h2>Basic information</h2>
    <F label="Proposal name *" full><input placeholder="e.g. Amazon Account Management Proposal" {...b('name')} /></F>
    <div className="grid2">
      <F label="Category"><select {...b('category')}><Opts list={withCurrent(categoryOptions(s), f.category)} /></select></F>
      <F label="Marketplace"><select {...b('marketplace')}><Opts list={withCurrent(proposalMarketplaceOptions(s), f.marketplace)} /></select></F>
      <F label="Service"><select {...b('service')}><Opts list={withCurrent(proposalServiceOptions(s), f.service)} /></select></F>
      <F label="Target client type"><select {...b('targetClientType')}><Opts list={withCurrent(CLIENT_TYPES, f.targetClientType)} /></select></F>
      <F label="Status"><select {...b('status')}><Opts list={withCurrent(STATUSES, f.status)} /></select></F>
      <F label="Version"><input placeholder="1.0" {...b('version')} /></F></div>
    <label className="chk mb"><input type="checkbox" checked={!!f.favorite} onChange={e => set(p => ({ ...p, favorite: e.target.checked }))} /> ★ Favorite</label>
    <h2>Overview</h2>
    <F label="Short description" full><textarea rows="2" {...b('description')} /></F>
    {BIG.map(([k, l, r]) => <F key={k} label={l} full><textarea rows={r} {...b(k)} /></F>)}
    <h2>Proposal content</h2>
    <F label="Complete proposal text (reusable master copy)" full><textarea ref={ta} rows="18" {...b('content')} /></F>
    <div className="vars mb"><div className="muted sm">Variables - click to insert at the cursor. They are stored as text and not replaced in this version.</div>
      <div className="chips">{PROPOSAL_VARIABLES.map(v => <button type="button" key={v} className="chip sm" onClick={() => insert(v)}>{v}</button>)}</div></div>
    <F label="Internal notes (not part of the proposal)" full><textarea rows="2" {...b('notes')} /></F>
    {err && <div className="err">{err}</div>}
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>{id ? 'Save changes' : 'Create proposal'}</button></div>
  </Modal>;
}
