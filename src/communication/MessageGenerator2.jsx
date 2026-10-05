import { useEffect, useMemo, useState } from 'react';
import { useStore, db } from '../data/store.js';
import { Modal, F, Opts, useUI, copyText } from '../ui.jsx';
import { by } from '../logic.js';
import { monthLabel, today } from '../data/util.js';
import { replaceVariables, unresolvedVariables, buildContext, buildLeadContext } from './variables.js';
import { leadTitle, mpList } from '../leads/leadDefaults.js';
import { logLeadActivity } from '../leads/leadActions.js';
import EmailComposer from '../email/EmailComposer.jsx';
import WhatsAppComposer from '../whatsapp/WhatsAppComposer.jsx';

const uniq = a => [...new Set(a)];
const EMPTY = { templateId: '', clientId: '', marketplaceId: '', serviceId: '', taskId: '', issueId: '', reportId: '', employee: '' };

// pre: { templateId, clientId, taskId, issueId } from quick-generate buttons. onSaved: optional (modal closes itself).
export default function TemplateMessageGenerator({ pre = {}, onSaved }) {
  const s = useStore(), ui = useUI(), all = s.communicationTemplates || [];
  const [sel, setSel] = useState(() => {
    const t = by(s.tasks, pre.taskId), i = by(s.issues, pre.issueId), src = t || i;
    return { ...EMPTY, ...pre, clientId: pre.clientId || src?.clientId || '', marketplaceId: pre.marketplaceId || src?.marketplaceId || '', serviceId: pre.serviceId || src?.serviceId || '' };
  });
  const [q, setQ] = useState(''), [chan, setChan] = useState(''), [inactive, setInactive] = useState(false);
  const [subject, setSubject] = useState(''), [body, setBody] = useState(''), [dirty, setDirty] = useState(false), [saved, setSaved] = useState(false);
  const [hist, setHist] = useState(null), [showEmail, setShowEmail] = useState(false), [showWa, setShowWa] = useState(false); // MVP 3E: { id, subject, body } of the Pending record made by Save to History; email composer open/closed
  const tpl = by(all, sel.templateId), client = by(s.clients, sel.clientId), lead = pre.leadId ? by(s.leads || [], pre.leadId) : null; // MVP 3D: lead context when no client is chosen
  const set = patch => setSel(p => ({ ...p, ...patch }));

  const tplList = all.filter(t => (t.active || inactive || t.id === sel.templateId) && (!chan || t.channel === chan) && (!q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase())));
  // Client's marketplace/service combinations (existing clientServices) - auto-picked when there is only one choice.
  const css = s.clientServices.filter(c => c.clientId === sel.clientId);
  const mpIds = uniq(css.map(c => c.marketplaceId)), svIds = uniq(css.filter(c => !sel.marketplaceId || c.marketplaceId === sel.marketplaceId).map(c => c.serviceId));
  const mpName = id => by(s.marketplaces, id)?.name, svName = id => by(s.services, id)?.name;
  const effMp = sel.marketplaceId || (mpIds.length === 1 ? mpIds[0] : mpIds.find(id => tpl && tpl.marketplace !== 'Any' && mpName(id) === tpl.marketplace) || '');
  const effSv = sel.serviceId || (svIds.length === 1 ? svIds[0] : svIds.find(id => tpl && tpl.service !== 'Any' && svName(id) === tpl.service) || '');
  const tasks = s.tasks.filter(t => t.clientId === sel.clientId && (!effMp || t.marketplaceId === effMp) && (!effSv || t.serviceId === effSv)).sort((a, b) => b.month.localeCompare(a.month) || a.code.localeCompare(b.code));
  const issues = s.issues.filter(i => i.clientId === sel.clientId);
  const reports = s.reports.filter(r => r.clientId === sel.clientId).map(r => ({ r, cy: by(s.cycles, r.cycleId) })).filter(x => x.cy).sort((a, b) => b.cy.month.localeCompare(a.cy.month));

  const ctx = useMemo(() => lead && !sel.clientId ? buildLeadContext(lead, sel) : buildContext(s, { ...sel, marketplaceId: effMp, serviceId: effSv, category: tpl?.category }), [s, sel, effMp, effSv, tpl, lead]);
  const write = (sub, txt) => { setSubject(sub); setBody(txt); setSaved(false); };
  const regen = () => { if (tpl) write(replaceVariables(tpl.subject, ctx), replaceVariables(tpl.body, ctx)); else write('', ''); setDirty(false); };
  // Auto-personalise while the user has not typed in the message; manual edits are never overwritten silently.
  useEffect(() => { if (!dirty) { if (tpl) write(replaceVariables(tpl.subject, ctx), replaceVariables(tpl.body, ctx)); else write('', ''); } }, [tpl, ctx]); // eslint-disable-line
  const askRegen = () => { if (!dirty || confirm('Replace your edits with a freshly generated message?')) regen(); };
  const reset = () => { setSel(EMPTY); setQ(''); setChan(''); setInactive(false); write('', ''); setDirty(false); };

  const left = unresolvedVariables(subject, body), hasSubject = !!(tpl?.subject || subject);
  const copy = (txt, msg) => copyText(txt).then(() => ui.toast(msg));
  const save = () => {
    if (!sel.clientId && !lead) return ui.toast('Select a client first.');
    if (!body.trim()) return ui.toast('The message is empty.');
    const row = db.insert('communications', {
      clientId: sel.clientId, leadId: lead?.id || '', leadName: lead ? leadTitle(lead) : '', date: today(), type: 'General', status: 'Pending', message: body, subject: subject.trim(),
      template: tpl?.name || '', templateId: tpl?.id || '', category: tpl?.category || '', channel: tpl?.channel || '',
      marketplace: mpName(effMp) || '', service: svName(effSv) || '', createdBy: sel.employee.trim(),
      relatedTaskId: sel.taskId, relatedIssueId: sel.issueId, relatedReportId: sel.reportId,
    });
    if (lead) logLeadActivity(lead.id, `Message saved to Communication History${tpl ? ': ' + tpl.name : ''}`);
    setHist({ id: row.id, subject, body }); setSaved(true); ui.toast('Message saved to Communication History.'); onSaved?.();
  };
  // MVP 3E: everything the email record needs comes from what the generator already resolved - nothing is re-personalised here.
  const emailMeta = { clientId: sel.clientId, leadId: lead?.id || '', leadName: lead ? leadTitle(lead) : '', template: tpl?.name || '', templateId: tpl?.id || '', category: tpl?.category || '',
    marketplace: mpName(effMp) || '', service: svName(effSv) || '', createdBy: sel.employee.trim(), relatedTaskId: sel.taskId, relatedIssueId: sel.issueId, relatedReportId: sel.reportId };
  const L = t => `${t.name} — ${t.category} · ${t.marketplace} · ${t.service} · ${t.channel}`;
  const prev = tpl ? tpl.body.replace(/\s+/g, ' ').trim() : '';
  return <div>
    <div className="card"><h2>1 · Template</h2>
      <div className="grid2"><F label="Search templates"><input placeholder="Type to narrow the list…" value={q} onChange={e => setQ(e.target.value)} /></F>
        <F label="Channel"><select value={chan} onChange={e => setChan(e.target.value)}><Opts blank="All channels" list={[...new Set(all.map(t => t.channel).filter(Boolean))]} /></select></F>
        <label className="chk" style={{ alignSelf: 'center' }}><input type="checkbox" checked={inactive} onChange={e => setInactive(e.target.checked)} /> Include inactive templates</label></div>
      <F label="Template"><select value={sel.templateId} onChange={e => { set({ templateId: e.target.value }); setSaved(false); }}><Opts blank={tplList.length ? 'Select a template' : 'No matching templates'} list={tplList.map(t => ({ v: t.id, l: L(t) }))} /></select></F>
      {tpl && <div className="tpreview"><div className="row"><b>{tpl.name}</b><span className="badge">{tpl.category}</span><span className="badge">{tpl.channel}</span><span className="badge">{tpl.marketplace}</span><span className="badge">{tpl.service}</span></div>
        <div className="muted sm">{prev.length > 220 ? prev.slice(0, 220) + '…' : prev}</div></div>}
      {!all.length && <div className="muted sm">No templates yet - create some under the Templates tab.</div>}</div>
    <div className="card"><h2>2 · Client &amp; context</h2>
      <F label="Client"><select value={sel.clientId} onChange={e => set({ clientId: e.target.value, marketplaceId: '', serviceId: '', taskId: '', issueId: '', reportId: '' })}><Opts blank={lead ? 'No client yet (use lead details)' : 'Select client'} list={s.clients.map(c => ({ v: c.id, l: c.company }))} /></select></F>
      {lead && !client && <dl className="info mb"><div><dt>Lead</dt><dd>{leadTitle(lead)}</dd></div><div><dt>Contact person</dt><dd>{lead.contactName || '—'}</dd></div><div><dt>Marketplace</dt><dd>{mpList(lead).join(', ') || '—'}</dd></div><div><dt>Service</dt><dd>{lead.service || '—'}</dd></div><div><dt>Assigned proposal</dt><dd>{lead.proposalName || '—'}</dd></div></dl>}
      {client && <dl className="info mb"><div><dt>Client</dt><dd>{client.name}</dd></div><div><dt>Company</dt><dd>{client.company || '—'}</dd></div><div><dt>Contact person</dt><dd>{client.contact || '—'}</dd></div>
        <div><dt>Marketplace</dt><dd>{mpIds.map(mpName).join(', ') || '—'}</dd></div><div><dt>Service</dt><dd>{uniq(css.map(c => c.serviceId)).map(svName).join(', ') || '—'}</dd></div></dl>}
      <div className="grid2">
        <F label="Marketplace (optional)"><select value={effMp} disabled={!client} onChange={e => set({ marketplaceId: e.target.value, serviceId: '', taskId: '' })}><Opts blank="—" list={mpIds.map(id => ({ v: id, l: mpName(id) }))} /></select></F>
        <F label="Service (optional)"><select value={effSv} disabled={!client} onChange={e => set({ serviceId: e.target.value, taskId: '' })}><Opts blank="—" list={svIds.map(id => ({ v: id, l: svName(id) }))} /></select></F>
        <F label="Task (optional)"><select value={sel.taskId} disabled={!client} onChange={e => set({ taskId: e.target.value })}><Opts blank="None" list={tasks.map(t => ({ v: t.id, l: `${t.code} · ${t.name} (${monthLabel(t.month)}, ${t.status})` }))} /></select></F>
        <F label="Issue (optional)"><select value={sel.issueId} disabled={!client} onChange={e => set({ issueId: e.target.value })}><Opts blank="None" list={issues.map(i => ({ v: i.id, l: `${i.title} (${i.status})` }))} /></select></F>
        <F label="Report period (optional)"><select value={sel.reportId} disabled={!client} onChange={e => set({ reportId: e.target.value })}><Opts blank="None" list={reports.map(({ r, cy }) => ({ v: r.id, l: `${monthLabel(cy.month)} · ${svName(cy.serviceId) || 'Report'} (${r.status})` }))} /></select></F>
        <F label="Your name (optional, for {{employee_name}})"><input value={sel.employee} onChange={e => set({ employee: e.target.value })} /></F></div></div>
    <div className="card"><div className="between"><h2>3 · Message</h2><button className="btn sm" disabled={!tpl} onClick={askRegen}>Regenerate</button></div>
      {dirty && <div className="muted sm mb">You edited this message, so changing the selections above will not overwrite it. Use Regenerate to rebuild it.</div>}
      {hasSubject && <F label="Subject (editable)" full><input value={subject} onChange={e => { setSubject(e.target.value); setDirty(true); setSaved(false); }} /></F>}
      <F label="Message (editable)" full><textarea rows="12" value={body} placeholder="Select a template and a client - the personalised message appears here." onChange={e => { setBody(e.target.value); setDirty(true); setSaved(false); }} /></F>
      {left.length ? <div className="warnbox"><b>⚠ {left.length} variable{left.length > 1 ? 's need' : ' needs'} attention</b><div className="row">{left.map(v => <code key={v}>{v}</code>)}</div><div className="muted sm">Edit the message to fill these in, or copy/save as is.</div></div>
        : body && <div className="muted sm mb">✓ No variables need attention.</div>}
      <div className="row mt"><button className="btn" onClick={reset}>Reset</button><span className="grow" />
        <button className="btn" disabled={!body} onClick={() => copy(body, 'Message copied')}>Copy Message</button>
        {hasSubject && <button className="btn" disabled={!body} onClick={() => copy(`Subject: ${subject}\n\n${body}`, 'Subject + message copied')}>Copy Subject + Message</button>}
        <button className="btn" disabled={!body || (!sel.clientId && !lead)} onClick={() => setShowEmail(true)}>Email</button>
        <button className="btn wa" disabled={!body || (!sel.clientId && !lead)} onClick={() => setShowWa(true)}>Send via WhatsApp</button>
        <button className="btn pri" disabled={!body || (!sel.clientId && !lead) || saved} onClick={save}>{saved ? 'Saved ✓' : 'Save to History'}</button></div>
      <div className="muted sm mt">Nothing is sent automatically. Use Email to review and send through Email Automation (Google Apps Script), or Send via WhatsApp to open a prefilled chat (you send it yourself).</div></div>
    {showWa && <WhatsAppComposer initial={{ phone: client?.phone || lead?.phone || '', body }} meta={emailMeta} onClose={() => setShowWa(false)} />}
    {showEmail && <EmailComposer initial={{ to: client?.email || lead?.email || '', subject, body }} meta={emailMeta} histId={hist && hist.subject === subject && hist.body === body ? hist.id : ''} onClose={() => setShowEmail(false)} onSent={() => { setHist(null); setSaved(true); }} />} {/* an earlier Save-to-History record is upgraded to Sent only if the message is unchanged since it was saved */}
  </div>;
}

export const GenerateFromTemplateModal = ({ pre }) => { const ui = useUI(); return <Modal wide title="Generate message from template" onClose={ui.close}><TemplateMessageGenerator pre={pre} onSaved={ui.close} /></Modal>; };
