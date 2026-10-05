import { useRef, useState } from 'react';
import { useStore } from '../data/store.js';
import { Modal, F, Opts, useUI, copyText } from '../ui.jsx';
import { CATEGORIES, CHANNELS, VARIABLES } from './templateDefaults.js';
import { saveCommTemplate } from './templateActions.js';
import { marketplaceOptions, serviceOptions, withCurrent } from './templateOptions.js';

const BLANK = { name: '', category: 'Sales', marketplace: 'Any', service: 'Any', channel: 'General', subject: '', body: '', notes: '', favorite: false, active: true };

export default function CommTemplateModal({ id }) {
  const s = useStore(), ui = useUI(), ex = id ? (s.communicationTemplates || []).find(t => t.id === id) : null;
  const [f, set] = useState(() => ex ? { ...BLANK, ...ex } : BLANK); const [err, setErr] = useState(''); const ta = useRef(null);
  const b = k => ({ value: f[k] ?? '', onChange: e => set(p => ({ ...p, [k]: e.target.value })) });
  const chk = k => ({ checked: !!f[k], onChange: e => set(p => ({ ...p, [k]: e.target.checked })) });
  const insert = v => { // insert at the cursor; if the field is not focused it appends. Copy fallback keeps this harmless.
    const el = ta.current, a = el ? el.selectionStart : f.body.length, z = el ? el.selectionEnd : f.body.length;
    set(p => ({ ...p, body: p.body.slice(0, a) + v + p.body.slice(z) }));
    setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(a + v.length, a + v.length); } }, 0);
  };
  const save = () => {
    if (!f.name.trim()) return setErr('Template name is required.');
    if (!f.body.trim()) return setErr('Message body is required.');
    saveCommTemplate(id, f); ui.toast(id ? 'Template updated.' : 'Template created.'); ui.close();
  };
  if (id && !ex) return <Modal title="Edit template" onClose={ui.close}><div className="err">This template no longer exists.</div></Modal>;
  return <Modal wide title={id ? 'Edit template' : 'New template'} onClose={ui.close}>
    <F label="Template name *" full><input placeholder="e.g. Amazon Service Introduction" {...b('name')} /></F>
    <div className="grid2">
      <F label="Category"><select {...b('category')}><Opts list={withCurrent(CATEGORIES, f.category)} /></select></F>
      <F label="Channel"><select {...b('channel')}><Opts list={withCurrent(CHANNELS, f.channel)} /></select></F>
      <F label="Marketplace"><select {...b('marketplace')}><Opts list={withCurrent(marketplaceOptions(s), f.marketplace)} /></select></F>
      <F label="Service"><select {...b('service')}><Opts list={withCurrent(serviceOptions(s), f.service)} /></select></F>
    </div>
    <F label="Subject (optional)" full><input {...b('subject')} /></F>
    <F label="Message body *" full><textarea ref={ta} rows="10" {...b('body')} /></F>
    <div className="vars mb"><div className="muted sm">Available variables - click to insert at the cursor. They are not replaced automatically yet.</div>
      <div className="chips">{VARIABLES.map(v => <button type="button" key={v} className="chip sm" onClick={() => insert(v)} onContextMenu={e => { e.preventDefault(); copyText(v).then(() => ui.toast('Copied ' + v)); }}>{v}</button>)}</div></div>
    <F label="Notes (optional, internal)" full><textarea rows="2" {...b('notes')} /></F>
    <div className="row mb"><label className="chk"><input type="checkbox" {...chk('favorite')} /> ★ Favorite</label><label className="chk"><input type="checkbox" {...chk('active')} /> Active</label></div>
    {err && <div className="err">{err}</div>}
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={save}>{id ? 'Save changes' : 'Create template'}</button></div>
  </Modal>;
}
