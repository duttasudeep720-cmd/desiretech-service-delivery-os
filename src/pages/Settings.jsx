import { useState } from 'react';
import { useStore, db, getState, commit, migrate } from '../data/store.js';
import { addDemoOnboarding } from '../onboarding/actions.js';
import { clearDemo, resetDemo, wipeAll } from '../data/actions.js';
import { useUI } from '../ui.jsx';
import EmailSettings from '../email/EmailSettings.jsx';

export default function Settings() {
  const s = useStore(), ui = useUI(); const [m, setM] = useState('');
  const exp = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })); a.download = `desiretech-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  const imp = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const d = JSON.parse(t); if (d.v !== 1) throw new Error('Not a DesireTech backup file.'); commit(migrate(d)); ui.toast('Backup restored.'); }).catch(x => ui.toast(x.message)); e.target.value = ''; };
  const ask = (msg, fn) => confirm(msg) && fn();
  return <>
    <div className="head"><h1>Settings</h1></div>
    <div className="cols"><div className="card"><h2>Marketplaces</h2>
      {s.marketplaces.map(x => <div className="row mb" key={x.id}><input value={x.name} onChange={e => db.update('marketplaces', x.id, { name: e.target.value })} style={{ flex: 1 }} />
        <button className="btn sm warn" onClick={() => (s.clientServices.some(c => c.marketplaceId === x.id) || s.serviceTemplates.some(t => t.marketplaceId === x.id)) ? ui.toast('In use by a client or template.') : db.remove('marketplaces', x.id)}>Delete</button></div>)}
      <div className="row"><input placeholder="New marketplace (e.g. JioMart)" value={m} onChange={e => setM(e.target.value)} style={{ flex: 1 }} /><button className="btn pri" onClick={() => { if (m.trim()) { db.insert('marketplaces', { name: m.trim() }); setM(''); } }}>Add</button></div></div>
      <div className="card"><h2>Services</h2>{s.services.map(x => <div className="row mb" key={x.id}><input value={x.name} onChange={e => db.update('services', x.id, { name: e.target.value })} style={{ flex: 1 }} /></div>)}
        <div className="muted sm">Create new services from Service Templates.</div></div>
      <EmailSettings />
      <div className="card"><h2>WhatsApp</h2><div className="row mb"><span className="badge b-completed">Available</span></div><div className="muted sm">Available through WhatsApp click-to-chat. No connection or login is needed — DesireTech opens a prefilled chat and you send the message yourself.</div></div>
      <div className="card"><h2>Data</h2><p className="muted sm">Data is stored in this browser (localStorage). Export a backup regularly.</p>
        <div className="row mb"><button className="btn" onClick={exp}>Export backup</button><label className="btn">Import backup<input type="file" accept="application/json" hidden onChange={imp} /></label></div>
        <div className="row"><button className="btn" onClick={() => { addDemoOnboarding(); ui.toast('Demo onboarding clients added (ABC Fashion, SehatSutra, XYZ Brand).'); }}>Add demo onboarding clients</button>
          <button className="btn" onClick={() => ask('Remove all demo clients and their data?', clearDemo)}>Clear demo data</button>
          <button className="btn" onClick={() => ask('Replace ALL data with fresh demo data?', resetDemo)}>Reset to demo data</button>
          <button className="btn warn" onClick={() => ask('Delete ALL clients and data (templates are kept)?', wipeAll)}>Wipe all data</button></div></div></div></>;
}
