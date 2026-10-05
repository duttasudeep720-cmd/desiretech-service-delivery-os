import { useState } from 'react';
import { useStore } from '../data/store.js';
import { Modal, F, useUI } from '../ui.jsx';
import { by } from '../logic.js';
import { unresolvedVariables } from '../communication/variables.js';
import { markProposalSent } from '../leads/leadActions.js';
import { useEmailStatus, sendEmail, validRecipient, newCommunicationId, NOT_CONFIGURED_MSG, UNAVAILABLE_MSG } from './emailApi.js';
import { recordSentEmail, recordFailedEmail } from './emailHistory.js';

// MVP 3E composer: Generate (3B) -> review/edit here -> confirm -> send through Email Automation (Supabase -> Apps Script) -> save to Communication History.
// initial: { to, subject, body } pre-filled by the Message Generator. meta: record context. histId: earlier Save-to-History record.
export default function EmailComposer({ initial, meta = {}, histId = '', onClose, onSent }) {
  const s = useStore(), ui = useUI(), [st, refresh] = useEmailStatus();
  const [to, setTo] = useState(initial.to || ''), [subject, setSubject] = useState(initial.subject || ''), [body, setBody] = useState(initial.body || '');
  const [commId] = useState(newCommunicationId), [step, setStep] = useState('compose'), [sending, setSending] = useState(false), [err, setErr] = useState(''), [marked, setMarked] = useState(false);
  const ready = st.state === 'configured', left = unresolvedVariables(subject, body);
  const lead = meta.leadId ? by(s.leads || [], meta.leadId) : null, canMark = !!lead && !!lead.proposalId && !['Proposal Sent', 'Won', 'Lost'].includes(lead.status) && !marked;
  const close = () => { if (!sending) onClose(); };

  const problem = () => !to.trim() ? 'Enter a recipient email address.' : !validRecipient(to) ? 'Enter one valid recipient email address.' : !subject.trim() ? 'Enter a subject.' : !body.trim() ? 'Enter a message.' : subject.includes('\n') ? 'The subject must be a single line.' : '';
  const review = () => { const m = problem(); setErr(m); if (!m) setStep('confirm'); };
  const send = async () => {
    setSending(true); setErr('');
    const r = await sendEmail({ to: to.trim(), subject: subject.trim(), message: body, communicationId: commId, clientId: meta.clientId || '', leadId: meta.leadId || '' });
    setSending(false);
    if (!r.ok) { if (r.attempted) recordFailedEmail({ meta, to: to.trim(), subject: subject.trim(), message: body, error: r.message, commId }); setErr(r.message); setStep('compose'); refresh(); return; } // no success message unless the server confirmed the email was accepted
    onSent?.(recordSentEmail({ meta, histId, to: to.trim(), subject: subject.trim(), message: body, from: r.from, commId }));
    setStep('sent');
  };

  const banner = st.state === 'loading' ? null
    : st.state === 'not_configured' ? <div className="warnbox">{NOT_CONFIGURED_MSG}</div>
    : st.state === 'unavailable' ? <div className="warnbox">{UNAVAILABLE_MSG}</div>
    : null;
  const warn = left.length > 0 && <div className="warnbox"><b>⚠ {left.length} variable{left.length > 1 ? 's are' : ' is'} still unfilled</b><div className="row">{left.map(v => <code key={v}>{v}</code>)}</div><div className="muted sm">Edit the subject or message before sending.</div></div>;

  if (step === 'sent') return <Modal title="Email sent" onClose={close}>
    <div className="okbox"><b>Email sent.</b><div className="sm">To {to.trim()} · accepted for sending by Google and saved to Communication History. Delivery is not confirmed.</div></div>
    <div className="row mt">{canMark && <button className="btn ok" onClick={() => { markProposalSent(lead.id); setMarked(true); ui.toast('Marked as Proposal Sent.'); }}>Mark Proposal Sent</button>}<span className="grow" /><button className="btn pri" onClick={close}>Close</button></div>
  </Modal>;

  if (step === 'confirm') return <Modal title="Send this email?" onClose={close}>
    <dl className="info mb"><div><dt>To</dt><dd>{to.trim()}</dd></div><div><dt>Subject</dt><dd>{subject.trim()}</dd></div></dl>
    {warn}{err && <div className="err">{err}</div>}
    <div className="row mt"><span className="grow" /><button className="btn" disabled={sending} onClick={() => setStep('compose')}>Cancel</button><button className="btn pri" disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send Email'}</button></div>
  </Modal>;

  return <Modal wide title="Send email" onClose={close}>
    {banner}
    <F label="To" full><input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="name@example.com" /></F>
    <F label="Subject" full><input value={subject} onChange={e => setSubject(e.target.value)} /></F>
    <F label="Message" full><textarea rows="12" value={body} onChange={e => setBody(e.target.value)} /></F>
    {warn}{err && <div className="err">{err}</div>}
    <div className="row mt"><span className="muted sm">Plain-text email. Attachments are not supported yet.</span><span className="grow" /><button className="btn" onClick={close}>Cancel</button><button className="btn pri" disabled={!ready} onClick={review}>Send Email</button></div>
  </Modal>;
}
