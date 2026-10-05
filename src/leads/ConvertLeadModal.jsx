import { useStore } from '../data/store.js';
import { Modal, useUI } from '../ui.jsx';
import { by } from '../logic.js';
import { convertedClient, leadTitle } from './leadDefaults.js';

// Step 1 of conversion: confirm, then hand over to the EXISTING New Client wizard (pre-filled from the lead).
export default function ConvertLeadModal({ id }) {
  const s = useStore(), ui = useUI(), l = by(s.leads || [], id), client = l && convertedClient(s, l);
  if (!l) return <Modal title="Convert lead" onClose={ui.close}><div className="err">This lead no longer exists.</div></Modal>;
  if (client) return <Modal title="Client already created" onClose={ui.close}><p>A client was already created from <b>{leadTitle(l)}</b>.</p>
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Close</button><a className="btn pri" href={'#/clients/' + client.id} onClick={ui.close}>View Client</a></div></Modal>;
  return <Modal title="Convert to client" onClose={ui.close}>
    <h2>Convert this lead into a DesireTech client?</h2>
    <p>This will start the existing client onboarding process.</p>
    <p className="muted sm">{leadTitle(l)}’s details will be pre-filled. You can review and edit everything before continuing.</p>
    <div className="row mt"><span className="grow" /><button className="btn" onClick={ui.close}>Cancel</button><button className="btn pri" onClick={() => ui.open('newClient', { leadId: l.id })}>Continue</button></div>
  </Modal>;
}
