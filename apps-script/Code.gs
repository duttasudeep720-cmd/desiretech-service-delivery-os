/**
 * DesireTech Email Automation - Google Apps Script Web App.
 * Sends email with MailApp from the Google account that owns/authorizes this script.
 * Setup: docs/EMAIL_APPS_SCRIPT_SETUP.md
 *
 * Script Properties (Project Settings -> Script properties). NEVER put real values in this file:
 *   SHARED_SECRET  required  long random string, same value as the Supabase secret APPS_SCRIPT_SECRET
 *   SENDER_NAME    optional  display name, e.g. "DesireTech"
 *
 * Note: Apps Script cannot read HTTP headers in doPost, so the secret travels in the JSON body (over HTTPS).
 */
var MAX_FIELD = { to: 254, subject: 300, body: 100000 };
var EMAIL_RE = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/;

function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function safeEqual_(a, b) { // constant-time string compare
  if (a.length !== b.length) return false;
  var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function doGet() { return out_({ ok: true, service: 'desiretech-email-automation' }); } // health check only, reveals nothing

function doPost(e) {
  var lock = null;
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 250000) return out_({ ok: false, code: 'invalid', message: 'Bad request.' });
    var data; try { data = JSON.parse(raw); } catch (err) { return out_({ ok: false, code: 'invalid', message: 'Bad request.' }); }

    var props = PropertiesService.getScriptProperties(), secret = props.getProperty('SHARED_SECRET');
    if (!secret || secret.length < 16) return out_({ ok: false, code: 'not_configured', message: 'SHARED_SECRET is not set.' });
    if (!safeEqual_(String(data.token || ''), secret)) return out_({ ok: false, code: 'auth', message: 'Unauthorized.' });

    var to = String(data.recipient || '').trim(), subject = String(data.subject || '').trim(), body = typeof data.body === 'string' ? data.body : '';
    var cid = String(data.communication_id || '').trim();
    if (!EMAIL_RE.test(to) || to.length > MAX_FIELD.to || /[\r\n]/.test(to)) return out_({ ok: false, code: 'invalid', message: 'Invalid recipient.' });
    if (!subject || subject.length > MAX_FIELD.subject || /[\r\n]/.test(subject)) return out_({ ok: false, code: 'invalid', message: 'Invalid subject.' });
    if (!body.trim() || body.length > MAX_FIELD.body) return out_({ ok: false, code: 'invalid', message: 'Invalid body.' });

    var cache = CacheService.getScriptCache(), key = cid ? 'sent:' + cid : '';
    lock = LockService.getScriptLock(); lock.waitLock(15000);
    if (key && cache.get(key)) return out_({ ok: true, duplicate: true, from: Session.getEffectiveUser().getEmail() }); // retry of an email already accepted

    if (MailApp.getRemainingDailyQuota() < 1) return out_({ ok: false, code: 'quota', message: 'Email quota exceeded.' });
    var opts = { to: to, subject: subject, body: body }; // plain text only
    var name = props.getProperty('SENDER_NAME'); if (name) opts.name = name;
    MailApp.sendEmail(opts);
    if (key) cache.put(key, '1', 21600);
    return out_({ ok: true, from: Session.getEffectiveUser().getEmail(), remainingQuota: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    var m = String(err && err.message || err);
    if (/quota|too many times|limit exceeded|service invoked/i.test(m)) return out_({ ok: false, code: 'quota', message: 'Email quota exceeded.' });
    return out_({ ok: false, code: 'send_failed', message: 'Send failed.' }); // never echo content or internals
  } finally { if (lock) { try { lock.releaseLock(); } catch (x) {} } }
}

/** Run this ONCE from the editor (Run -> authorizeAndTest) to grant the send-email permission and receive a test mail. */
function authorizeAndTest() {
  var me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: me, subject: 'DesireTech email automation test', body: 'Apps Script can send email from ' + me + '. Remaining daily quota: ' + MailApp.getRemainingDailyQuota() });
}
