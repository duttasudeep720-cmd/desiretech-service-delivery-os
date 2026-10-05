import { useState } from 'react';
import { useStore } from '../data/store.js';
import { addDays, today, fmtDate } from '../data/util.js';
import { by } from '../logic.js';
import { useUI, Modal, F, Opts, useForm } from '../ui.jsx';
import { ACCOUNT_STATUS, looksSecret, SECRET_MSG } from './logic.js';
import { BASIC_ITEMS } from './defaults.js';
import { createLead, updateLead, submitOnboarding } from './actions.js';
import { leadPrefill } from '../leads/leadConvert.js';
import { convertedClient } from '../leads/leadDefaults.js';
import { linkLeadClient, logLeadActivity } from '../leads/leadActions.js';

const STEPS = ['Client', 'Marketplaces', 'Services', 'Onboarding plan'];
const blank = { name: '', company: '', contact: '', email: '', phone: '', businessType: '', website: '', notes: '' };
const entry = (marketplaceId, key, a = {}) => ({ key, marketplaceId, otherName: '', storeName: a.storeName || '', sellerId: a.sellerId || '', storeUrl: a.storeUrl || '', accountStatus: a.accountStatus || 'Active', notes: a.notes || '' });

// leadId (MVP 3D): converting a lead. The wizard is pre-filled from the lead; a lead that already has a client resumes that client instead of creating a second one.
export function NewClientModal({ clientId, leadId }) {
  const s = useStore(), ui = useUI(), lead = leadId ? by(s.leads || [], leadId) : null;
  const [resume] = useState(() => clientId || (lead && convertedClient(s, lead)?.id) || ''), ex = resume && by(s.clients, resume), pre = lead && !ex ? leadPrefill(s, lead) : null;
  const [step, setStep] = useState(ex ? 2 : 1), [cid, setCid] = useState(ex ? ex.id : '');
  const [f, b] = useForm(ex ? { ...blank, ...ex } : pre ? { ...blank, ...pre.form } : blank);
  const [mps, setMps] = useState(() => ex ? s.clientAccounts.filter(a => a.clientId === ex.id).map(a => entry(a.marketplaceId, a.marketplaceId, a)) : pre ? pre.mpIds.map(id => entry(id, id)) : []);
  const [sel, setSel] = useState(() => new Set(pre ? pre.keys : []));
  const [showAll, setShowAll] = useState(false), [due, setDue] = useState(addDays(today(), 14)), [err, setErr] = useState('');
  const mpName = m => m.marketplaceId ? by(s.marketplaces, m.marketplaceId)?.name : (m.otherName.trim() || 'Other marketplace');
  const go = n => { setErr(''); setStep(n); };

  const step1 = () => {
    if (!f.name.trim()) return setErr('Client name is required.');
    if (looksSecret(f.notes)) return setErr(SECRET_MSG);
    const row = { name: f.name.trim(), company: f.company.trim() || f.name.trim(), contact: f.contact.trim() || f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), businessType: f.businessType.trim(), website: f.website.trim(), notes: f.notes };
    if (cid) updateLead(cid, row); else { const nid = createLead(row); setCid(nid); if (lead) linkLeadClient(lead.id, nid); }
    go(2);
  };

  const toggleMp = m => setMps(p => p.some(x => x.key === m.id) ? p.filter(x => x.key !== m.id) : [...p, entry(m.id, m.id)]);
  const addOther = () => setMps(p => [...p, entry('', 'other_' + Date.now())]);
  const patchMp = (key, patch) => setMps(p => p.map(x => x.key === key ? { ...x, ...patch } : x));
  const step2 = () => {
    if (!mps.length) return setErr('Select at least one marketplace.');
    if (mps.some(m => !m.marketplaceId && !m.otherName.trim())) return setErr('Enter a name for the "Other" marketplace.');
    if (mps.some(m => looksSecret(m.notes, m.storeName))) return setErr(SECRET_MSG);
    const names = mps.map(m => mpName(m).toLowerCase()); if (new Set(names).size !== names.length) return setErr('The same marketplace is selected twice.');
    setSel(p => new Set([...p].filter(k => mps.some(m => m.key === k.split('|')[0])))); go(3);
  };

  // Services are read from the existing templates (never hardcoded): a service is offered for a marketplace when a monthly
  // service template or an onboarding template exists for it. "Show all services" lifts that filter.
  const offered = m => s.services.filter(sv => showAll
    || s.serviceTemplates.some(t => t.marketplaceId === m.marketplaceId && t.serviceId === sv.id)
    || s.onboardingTemplates.some(t => t.serviceId === sv.id && (t.marketplaceId === m.marketplaceId || !t.marketplaceId)));
  const toggleSv = (mKey, svId) => setSel(p => { const n = new Set(p), k = mKey + '|' + svId; n.has(k) ? n.delete(k) : n.add(k); return n; });
  const step3 = () => { if (!sel.size) return setErr('Select at least one service.'); go(4); };

  const picks = [...sel].map(k => { const [mKey, svId] = k.split('|'); return { mpKey: mKey, serviceId: svId, m: mps.find(x => x.key === mKey) }; }).filter(x => x.m);
  const info = p => {
    const tpl = s.onboardingTemplates.find(t => t.marketplaceId === p.m.marketplaceId && t.serviceId === p.serviceId) || s.onboardingTemplates.find(t => !t.marketplaceId && t.serviceId === p.serviceId);
    const items = tpl ? s.onboardingTemplateItems.filter(i => i.templateId === tpl.id) : BASIC_ITEMS;
    const tasks = items.filter(i => i.kind === 'task').length + (items.some(i => i.key === 'scope' && i.kind === 'task') ? 0 : 1);
    const monthly = s.serviceTemplates.some(t => t.marketplaceId === p.m.marketplaceId && t.serviceId === p.serviceId);
    return { tpl, tasks, reqs: items.filter(i => i.kind === 'requirement').length, monthly };
  };
  const create = () => {
    if (!due) return setErr('Choose a target completion date.');
    const ids = submitOnboarding({ clientId: cid, marketplaces: mps.map(m => ({ ...m, marketplaceId: m.marketplaceId })), services: picks.map(p => ({ mpKey: p.mpKey, serviceId: p.serviceId })), dueDate: due });
    if (lead && ids.length) logLeadActivity(lead.id, `Onboarding plan created for ${ids.length} service${ids.length > 1 ? 's' : ''}`);
    ui.close();
    if (ids.length) { ui.toast(`Onboarding plan created for ${ids.length} service${ids.length > 1 ? 's' : ''}.`); location.hash = '#/onboarding/' + ids[0]; }
    else { ui.toast('Those services already have an onboarding plan.'); location.hash = '#/clients/' + cid; }
  };

  return <Modal title="New Client" onClose={ui.close} wide>
    <div className="steps">{STEPS.map((l, i) => <div key={l} className={'stp' + (step === i + 1 ? ' on' : step > i + 1 ? ' done' : '')}><i>{step > i + 1 ? '✓' : i + 1}</i><span>{l}</span></div>)}</div>

    {step === 1 && <><div className="grid2">
      <F label="Client name *"><input autoFocus {...b('name')} /></F><F label="Company / brand name"><input {...b('company')} /></F>
      <F label="Contact person"><input {...b('contact')} /></F><F label="Business type"><input placeholder="e.g. Apparel brand, D2C wellness" {...b('businessType')} /></F>
      <F label="Email"><input type="email" {...b('email')} /></F><F label="Phone"><input {...b('phone')} /></F>
      <F label="Website" full><input placeholder="https://" {...b('website')} /></F><F label="Notes" full><textarea rows="3" {...b('notes')} /></F></div>
      {lead && !ex && <div className="okbox card sm">Pre-filled from lead <b>{lead.companyName || lead.leadName}</b>. Review and edit anything before continuing.</div>}
      <div className="muted sm">Only the client name is required. The client is saved as a <b>New Lead</b> and can be completed later.</div></>}

    {step === 2 && <><p className="muted sm">Select every marketplace this client sells on. Record only IDs and store links — <b>never marketplace passwords</b>.</p>
      <div className="chips">{s.marketplaces.map(m => <button key={m.id} className={'chip' + (mps.some(x => x.key === m.id) ? ' on' : '')} onClick={() => toggleMp(m)}>{mps.some(x => x.key === m.id) ? '✓ ' : ''}{m.name}</button>)}
        <button className="chip" onClick={addOther}>+ Other</button></div>
      {mps.map(m => <div className="card mt" key={m.key}><div className="between"><b>{mpName(m)}</b><button className="btn sm warn" onClick={() => setMps(p => p.filter(x => x.key !== m.key))}>Remove</button></div>
        <div className="grid2 mt">{!m.marketplaceId && <F label="Marketplace name *" full><input value={m.otherName} onChange={e => patchMp(m.key, { otherName: e.target.value })} /></F>}
          <F label="Seller / store name"><input value={m.storeName} onChange={e => patchMp(m.key, { storeName: e.target.value })} /></F><F label="Seller ID / account ID"><input value={m.sellerId} onChange={e => patchMp(m.key, { sellerId: e.target.value })} /></F>
          <F label="Store URL"><input placeholder="https://" value={m.storeUrl} onChange={e => patchMp(m.key, { storeUrl: e.target.value })} /></F>
          <F label="Account status"><select value={m.accountStatus} onChange={e => patchMp(m.key, { accountStatus: e.target.value })}><Opts list={ACCOUNT_STATUS} /></select></F>
          <F label="Notes" full><input value={m.notes} onChange={e => patchMp(m.key, { notes: e.target.value })} /></F></div></div>)}</>}

    {step === 3 && <><p className="muted sm">Choose the services this client has purchased on each marketplace. Each service gets its own onboarding plan and monthly service cycle.</p>
      {mps.map(m => { const list = offered(m); return <div className="card" key={m.key}><b>{mpName(m)}</b>
        <div className="checks mt">{list.length ? list.map(sv => { const k = m.key + '|' + sv.id, pi = info({ m, serviceId: sv.id }); return <label key={sv.id} className="chk"><input type="checkbox" checked={sel.has(k)} onChange={() => toggleSv(m.key, sv.id)} /> {sv.name}
          {!pi.monthly && <span className="muted sm"> · no monthly task template yet</span>}</label>; }) : <span className="muted sm">No services available for this marketplace. Tick "Show all services" below.</span>}</div></div>; })}
      <label className="chk"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> Show all services for every marketplace</label></>}

    {step === 4 && <><p className="muted sm">The onboarding plan is generated from the Onboarding Templates (editable). Review and create it.</p>
      <div className="card"><div className="muted sm">Client</div><b>{f.company || f.name}</b> <span className="muted sm">· {f.name}</span></div>
      {picks.map(p => { const i = info(p); return <div className="card" key={p.mpKey + p.serviceId}><div className="between"><b>{mpName(p.m)} · {by(s.services, p.serviceId)?.name}</b></div>
        <div className="sm muted">{i.tasks} onboarding tasks · {i.reqs} client requirements {i.tpl ? '' : '· basic checklist (no onboarding template for this service yet)'}</div>
        {!i.monthly && <div className="sm od">No monthly task template exists for this service yet — create one under Service Templates before starting the service.</div>}</div>; })}
      <F label="Target onboarding completion date"><input type="date" value={due} onChange={e => setDue(e.target.value)} /></F><div className="muted sm">Task due dates are spread between today and {fmtDate(due)}.</div></>}

    {err && <div className="err">{err}</div>}
    <div className="row mt">{step > 1 && !(ex && step === 2) && <button className="btn" onClick={() => go(step - 1)}>Back</button>}<span className="grow" /><button className="btn" onClick={ui.close}>{step === 1 ? 'Cancel' : 'Save & close'}</button>
      {step === 1 && <button className="btn pri" onClick={step1}>Save &amp; Continue</button>}{step === 2 && <button className="btn pri" onClick={step2}>Save &amp; Continue</button>}
      {step === 3 && <button className="btn pri" onClick={step3}>Continue</button>}{step === 4 && <button className="btn pri" onClick={create}>Create onboarding plan</button>}</div>
  </Modal>;
}
