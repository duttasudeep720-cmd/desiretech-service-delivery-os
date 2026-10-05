import { useState } from 'react';
import { useStore, db } from '../data/store.js';
import { createReport } from '../data/actions.js';
import { useUI, Badge, Opts, Empty, F } from '../ui.jsx';
import { by, cycleInfo, cycleLabel, reportSections, REPORT_SECTIONS } from '../logic.js';
import { monthLabel, fmtDate } from '../data/util.js';

export default function Reports({ id }) {
  const s = useStore(); const [cy, setCy] = useState('');
  if (id) return <Editor id={id} />;
  return <>
    <div className="head"><h1>Monthly Reports</h1></div>
    <div className="card"><h2>Generate report</h2><div className="row"><select value={cy} onChange={e => setCy(e.target.value)} style={{ flex: 1 }}><Opts blank="Select client service + month" list={s.cycles.map(c => ({ v: c.id, l: cycleLabel(s, c) }))} /></select>
      <button className="btn pri" disabled={!cy} onClick={() => (location.hash = '#/reports/' + createReport(cy))}>Generate / open</button></div></div>
    {s.reports.length ? <div className="tw"><table><thead><tr><th>Client</th><th>Service</th><th>Period</th><th>Status</th><th>Updated</th></tr></thead><tbody>
      {s.reports.map(r => { const c = by(s.cycles, r.cycleId), i = c && cycleInfo(s, c); return <tr key={r.id} className="click" onClick={() => (location.hash = '#/reports/' + r.id)}><td><b>{i?.client?.company}</b></td><td>{i?.sv?.name}</td><td>{c && monthLabel(c.month)}</td><td><Badge v={r.status} /></td><td>{fmtDate((r.updatedAt || '').slice(0, 10))}</td></tr>; })}</tbody></table></div> : <Empty>No reports yet. Generate one from a monthly service.</Empty>}</>;
}

function Editor({ id }) {
  const s = useStore(), ui = useUI(), r = by(s.reports, id), c = r && by(s.cycles, r.cycleId);
  const [sec, setSec] = useState(r?.sections || {}); const [prev, setPrev] = useState(r?.status === 'Final');
  if (!r || !c) return <Empty>Report not found. <a href="#/reports">Back</a></Empty>;
  const i = cycleInfo(s, c), locked = r.status === 'Final';
  const save = extra => { db.update('reports', id, { sections: sec, updatedAt: new Date().toISOString(), ...extra }); ui.toast(extra?.status === 'Final' ? 'Report finalized.' : 'Report saved.'); };
  const regen = () => setSec(reportSections(s, c, { recommendations: sec.recommendations, nextPlan: sec.nextPlan }));
  return <>
    <div className="noprint"><a href="#/reports" className="muted sm">← Reports</a>
      <div className="head"><div><h1>{i.client?.company} · {monthLabel(c.month)}</h1><div className="muted">{i.sv?.name} <Badge v={r.status} /></div></div>
        <div className="row"><button className="btn" onClick={() => setPrev(!prev)}>{prev ? 'Edit' : 'Preview'}</button><button className="btn" onClick={() => { setPrev(true); setTimeout(() => print(), 150); }}>Print / Save as PDF</button>
          {!locked && <><button className="btn" onClick={regen}>Refresh from latest work</button><button className="btn" onClick={() => save()}>Save draft</button><button className="btn pri" onClick={() => { save({ status: 'Final' }); setPrev(true); }}>Finalize</button></>}
          {locked && <button className="btn" onClick={() => { db.update('reports', id, { status: 'Draft' }); setPrev(false); }}>Reopen as draft</button>}</div></div>
      {!prev && <div className="card">{REPORT_SECTIONS.map(([k, l]) => <F key={k} label={l} full><textarea rows={k === 'summary' ? 3 : 5} value={sec[k] || ''} onChange={e => setSec({ ...sec, [k]: e.target.value })} placeholder={k === 'recommendations' ? 'Add recommendations for the client…' : k === 'nextPlan' ? 'Enter next month priorities…' : ''} /></F>)}
        <div className="muted sm">Tip: in the print dialog choose "Save as PDF" to download.</div></div>}</div>
    {prev && <div className="rep"><div className="rh"><b>DESIRETECH</b> MONTHLY SERVICE REPORT<div className="tag">Desire – Launch – Sell – Grow – Scale</div></div>
      <table className="meta"><tbody>{[['Client', i.client?.name], ['Company', i.client?.company], ['Marketplace', i.mp?.name], ['Service', i.sv?.name], ['Reporting period', monthLabel(c.month)]].map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
      {REPORT_SECTIONS.map(([k, l]) => <section key={k}><h3>{l}</h3><pre>{(sec[k] || '').trim() || '—'}</pre></section>)}</div>}</>;
}
