import { useState } from 'react';
import { Modal, F } from '../ui.jsx';
import { unresolvedVariables } from '../communication/variables.js';
import { normalizePhone, phoneProblem, waLink, recordWhatsAppOpened, MSG_NO_MESSAGE, MSG_NO_PHONE } from './whatsapp.js';

// MVP 3F composer: phone + message (both editable) -> official wa.me click-to-chat in a new tab -> history record "WhatsApp Opened".
// initial: { phone, body } from the Message Generator. meta: record context the generator already resolved.
export default function WhatsAppComposer({ initial, meta = {}, onClose, onOpened }) {
  const [phone, setPhone] = useState(initial.phone || ''), [body, setBody] = useState(initial.body || ''), [err, setErr] = useState(initial.phone ? '' : MSG_NO_PHONE), [done, setDone] = useState(false);
  const left = unresolvedVariables(body), norm = normalizePhone(phone);
  const open = () => {
    const m = phoneProblem(phone) || (!body.trim() ? MSG_NO_MESSAGE : ''); setErr(m); if (m) return;
    const w = window.open(waLink(norm, body), '_blank', 'noopener,noreferrer');
    if (!w) { setErr('Your browser blocked the new tab. Please allow pop-ups for this site and click Open WhatsApp again.'); return; }
    onOpened?.(recordWhatsAppOpened({ meta, phone: norm, message: body })); setDone(true);
  };
  if (done) return <Modal title="WhatsApp opened" onClose={onClose}>
    <div className="okbox"><b>WhatsApp was opened with your message.</b><div className="sm">Send it manually inside WhatsApp. It is saved in Communication History as “WhatsApp Opened” — DesireTech cannot confirm it was sent.</div></div>
    <div className="row mt"><span className="grow" /><button className="btn pri" onClick={onClose}>Close</button></div></Modal>;
  return <Modal wide title="Send via WhatsApp" onClose={onClose}>
    <F label="Recipient phone" full><input type="tel" inputMode="tel" value={phone} onChange={e => { setPhone(e.target.value); setErr(''); }} placeholder="e.g. 8310747603 or +91 83107 47603" /></F>
    <div className="muted sm mb">{norm ? <>WhatsApp number: <b>+{norm}</b></> : 'Include the country code for non-Indian numbers.'}</div>
    <F label="Message (editable)" full><textarea rows="10" value={body} onChange={e => { setBody(e.target.value); setErr(''); }} /></F>
    {left.length > 0 && <div className="warnbox"><b>⚠ {left.length} variable{left.length > 1 ? 's are' : ' is'} still unfilled</b><div className="row">{left.map(v => <code key={v}>{v}</code>)}</div><div className="muted sm">Edit the message before opening WhatsApp.</div></div>}
    {err && <div className="err">{err}</div>}
    <div className="row mt"><span className="muted sm">Opens WhatsApp click-to-chat. You send the message yourself.</span><span className="grow" /><button className="btn" onClick={onClose}>Cancel</button><button className="btn pri" onClick={open}>Open WhatsApp</button></div>
  </Modal>;
}
