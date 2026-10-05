import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fmtDate } from './data/util.js';
import { isOverdue } from './logic.js';
export const UI = createContext(null);
export const useUI = () => useContext(UI);
const slug = s => String(s).toLowerCase().replace(/[^a-z]+/g, '-');
export const Badge = ({ v }) => <span className={'badge b-' + slug(v)}>{v}</span>;
export const Bar = ({ pct }) => <div className="bar"><i style={{ width: pct + '%' }} /></div>;
export const Opts = ({ list, blank }) => <>{blank != null && <option value="">{blank}</option>}{list.map(o => { const v = o.v ?? o, l = o.l ?? o; return <option key={v} value={v}>{l}</option>; })}</>;
export function useForm(init) { const [f, set] = useState(init); const b = k => ({ value: f[k] ?? '', onChange: e => set(p => ({ ...p, [k]: e.target.value })) }); return [f, b, set]; }
export const F = ({ label, children, full }) => <label className={'f' + (full ? ' full' : '')}><span>{label}</span>{children}</label>;
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement('textarea'); a.value = t; document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); }
}
// Esc closes only the TOP modal. Modals can nest (MVP 3E: the email composer opens inside the message-generator modal),
// so each open modal registers on a stack and only the last one reacts. onClose is read through a ref, so re-renders never reorder the stack.
const modalStack = [];
export function Modal({ title, onClose, children, wide }) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const me = {}; modalStack.push(me);
    const f = e => { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === me) closeRef.current(); };
    addEventListener('keydown', f);
    return () => { removeEventListener('keydown', f); modalStack.splice(modalStack.indexOf(me), 1); };
  }, []);
  return <div className="ov" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className={'modal' + (wide ? ' wide' : '')}>
    <div className="mh"><h3>{title}</h3><button className="x" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>;
}
export function TaskLine({ t, s }) {
  const ui = useUI(), cl = s.clients.find(c => c.id === t.clientId), od = isOverdue(t);
  return <div className="line click" onClick={() => ui.open('task', { id: t.id })}>
    <div><b>{t.name}</b><div className="muted sm">{cl?.company} · {s.services.find(x => x.id === t.serviceId)?.name}</div></div>
    <div className="r"><span className={'sm ' + (od ? 'od' : 'muted')}>{od ? 'Overdue · ' : ''}{fmtDate(t.dueDate)}</span><Badge v={t.status} /></div></div>;
}
