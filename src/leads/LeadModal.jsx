import { useState } from 'react';
import { useStore } from '../data/store.js';
import { Modal, F, Opts, useUI } from '../ui.jsx';
import { withCurrent } from '../communication/templateOptions.js';
import { by } from '../logic.js';
import { SOURCES, STATUSES, blankLead, mpList, marketplaceOptions, serviceOptions } from './leadDefaults.js';
import { saveLead } from './leadActions.js';

export default function LeadModal({ id }) {
  const s = useStore(), ui = useUI(), ex = id ? by(s.leads || [], id) : null;
  const [f, set] = useState(() => ex ? { ...blankLead(), ...ex, marketplace: mpList(ex) } : blankLead());
  const [custom, setCustom] = useState(() => !!(ex && ex.source && !SOURCES.includes(ex.source))), [err, setErr] = useState('');
  const b = k => ({ value: f[k] ?? '', onChange: e => set(p => ({ ...p, [k]: e.target.value })) });
  const toggle = n => set(p => ({ ...p, marketplace: p.marketplace.includes(n) ? p.marketplace.filter(x => x !== n) : [...p.marketplace, n] }));
  const pickSource = v => { setCustom(v === '__custom'); set(p => ({ ...p, source: v === '__custom' ? '' : v })); };
  const mps = [...new Set([...marketplaceOptions(s), ...f.marketplace])];
  const save = () => {
    if (!f.leadName.trim()) return setErr('Lead / company name is required.');
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return setErr('Enter a valid email address or leave it empty.');
    if (custom && !f.source.trim()) return setErr('Enter the custom lead source or choose one from the list.');
    saveLead(id, f); ui.toast(id ? 'Lead updated.' : 'Lead created.'); ui.close();
  };
  if (id && !ex) return <Modal title="Edit lead" onClose={ui.close}><div className="err">This lead no longer exists.</div></Modal>;
  return <Modal wide title={id ? 'Edit lead' : 'New lead'} onClose={ui.close}>
    <h2>Basic information</h2>
    <div className="grid2"><F label="Lead / company name *"><input autoFocus {...b('leadName')} /></F><F label="Contact person"><input {...b('contactName')} /></F>
      <F label="Email"><input type="email" {...b('email')} /></F><F label="Phone"><input {...b('phone')} /></F>
      <F label="Website"><input placeholder="https://" {...b('website')} /></F><F label="Business type"><input placeholder="e.g. Apparel brand, D2C wellness" {...b('businessType')} /></F></div>
    <h2 className="sec">Sales information</h2>
    <div className="grid2"><F label="Lead source"><select value={custom ? '__custom' : f.source} onChange={e => pickSource(e.target.value)}><Opts blank="Select source" list={[...withCurrent(SOURCES, custom ? '' : f.source), { v: '__custom', l: 'Custom…' }]} /></select></F>
      {custom ? <F label="Custom source"><input placeholder="e.g. Trade fair" {...b('source')} /></F> : <span />}
      <F label="Service"><select {...b('service')}><Opts blank="Select service" list={withCurrent(serviceOptions(s), f.service)} /></select></F>
      <F label="Status"><select {...b('status')}><Opts list={STATUSES} /></select></F></div>
    <div className="f"><span>Marketplace (select all that apply)</span><div className="chips">{mps.map(n => <button type="button" key={n} className={'chip' + (f.marketplace.includes(n) ? ' on' : '')} onClick={() => toggle(n)}>{f.marketplace.includes(n) ? '✓ ' : ''}{n}</button>)}</div></div>
    <F label="Internal notes (never shared with the lead)" full><textarea rows="4" placeholder="e.g. Seller interested in Amazon account management. Manages about 50 SKUs." {...b('notes')} /></F>
    {err && <div className="err">{err}</div>}
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>{id ? 'Save changes' : 'Create lead'}</button></div>
  </Modal>;
}
