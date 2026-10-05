import { useEmailStatus, NOT_CONFIGURED_MSG, UNAVAILABLE_MSG } from './emailApi.js';

// MVP 3G: no Google sign-in in the app any more. Email is sent by a Google Apps Script set up once by an administrator.
export default function EmailSettings() {
  const [st] = useEmailStatus(), ok = st.state === 'configured';
  return <div className="card"><h2>Email Automation</h2>
    {st.state === 'loading' ? <div className="muted sm">Checking status…</div> : <>
      <div className="row mb"><span className={'badge' + (ok ? ' b-completed' : '')}>{ok ? 'Configured' : 'Not configured'}</span></div>
      {ok && <div className="sm">Connected through Google Apps Script. Emails are sent from the Google account that owns the script.</div>}
      {st.state === 'not_configured' && <div className="warnbox"><b>Status: Not configured</b><div>{NOT_CONFIGURED_MSG}</div><div className="muted sm">See docs/EMAIL_APPS_SCRIPT_SETUP.md.</div></div>}
      {st.state === 'unavailable' && <div className="warnbox">{UNAVAILABLE_MSG}</div>}
      <div className="muted sm mt">Google limits how many emails an account can send per day. “Sent” means Google accepted the email for sending; DesireTech cannot confirm it was delivered.</div></>}
  </div>;
}
