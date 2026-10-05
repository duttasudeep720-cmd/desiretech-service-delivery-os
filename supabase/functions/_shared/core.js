// Email adapter core: validation, Apps Script call, manual send, queue processing.
// Plain JS with injected dependencies (db, fetch, clock, log) so it runs in Deno (Edge Functions) AND in Node tests.
// Opening statement of intent: "sent" means Google Apps Script/MailApp ACCEPTED the message - never "delivered".

const EMAIL_RE = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BAD_HEADER = /[\r\n\0]/;

export const LIMITS = {
  to: 254,
  subject: 300,
  message: 100000,
  id: 64
};

export const MAX_ATTEMPTS = 3;
export const STALE_MINUTES = 15;
export const APPS_SCRIPT_TIMEOUT_MS = 25000;

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024;

export const MESSAGES = {
  not_configured: 'Email automation is not configured. Administrator setup required.',
  unavailable: 'The email service (Google Apps Script) is not reachable. Please try again later.',
  timeout: 'The email service timed out. The email may or may not have been sent - check the Gmail Sent folder before retrying.',
  auth: 'The email service rejected the request. Administrator: check the Apps Script deployment access and shared secret.',
  quota: 'Email quota exceeded. Try again after Google resets the daily quota (within 24 hours).',
  send_failed: 'Email could not be sent. Please try again.',
  in_progress: 'This email is already being sent.',
  db: 'The email could not be recorded, so it was not sent. Please try again.',
  interrupted: 'Sending was interrupted. Check the Gmail Sent folder before sending again.'
};

export const HTTP = {
  invalid: 400,
  not_configured: 503,
  in_progress: 409,
  quota: 429,
  auth: 502,
  unavailable: 502,
  timeout: 504,
  db: 500,
  send_failed: 502
};

export function getConfig(env) {
  const url = String(env.APPS_SCRIPT_URL || '').trim();
  const secret = String(env.APPS_SCRIPT_SECRET || '');
  const cap = parseInt(env.EMAIL_DAILY_CAP || '80', 10);

  return {
    appsScriptUrl: url,
    secret,
    configured:
      /^https:\/\/script\.google(usercontent)?\.com\//.test(url) &&
      secret.length >= 16,
    dailyCap:
      Number.isFinite(cap) && cap > 0
        ? cap
        : 80
  };
}

function validateAttachments(rawAttachments) {
  if (rawAttachments == null) {
    return {
      ok: true,
      value: []
    };
  }

  if (!Array.isArray(rawAttachments)) {
    return {
      ok: false,
      message: 'Attachments are not valid.'
    };
  }

  if (rawAttachments.length > MAX_ATTACHMENTS) {
    return {
      ok: false,
      message:
        'You can attach a maximum of ' +
        MAX_ATTACHMENTS +
        ' files.'
    };
  }

  const attachments = [];
  let totalBytes = 0;

  for (let i = 0; i < rawAttachments.length; i++) {
    const item =
      rawAttachments[i] &&
      typeof rawAttachments[i] === 'object'
        ? rawAttachments[i]
        : {};

    const name =
      typeof item.name === 'string'
        ? item.name.trim()
        : '';

    const mimeType =
      typeof item.mimeType === 'string'
        ? item.mimeType.trim()
        : '';

    const data =
      typeof item.data === 'string'
        ? item.data
        : '';

    if (!name || !data) {
      return {
        ok: false,
        message: 'Invalid attachment.'
      };
    }

    if (
      name.length > 255 ||
      BAD_HEADER.test(name)
    ) {
      return {
        ok: false,
        message: 'Invalid attachment filename.'
      };
    }

    if (
      !mimeType ||
      mimeType.length > 200 ||
      BAD_HEADER.test(mimeType)
    ) {
      return {
        ok: false,
        message: 'Invalid attachment type.'
      };
    }

    if (
      !/^[A-Za-z0-9+/]*={0,2}$/.test(data) ||
      data.length % 4 !== 0
    ) {
      return {
        ok: false,
        message: 'Invalid attachment data.'
      };
    }

    let padding = 0;

    if (data.endsWith('==')) {
      padding = 2;
    } else if (data.endsWith('=')) {
      padding = 1;
    }

    const decodedBytes =
      Math.floor(data.length * 3 / 4) -
      padding;

    if (
      !Number.isFinite(decodedBytes) ||
      decodedBytes <= 0
    ) {
      return {
        ok: false,
        message: 'Invalid attachment data.'
      };
    }

    totalBytes += decodedBytes;

    if (totalBytes > MAX_ATTACHMENTS_BYTES) {
      return {
        ok: false,
        message:
          'Attachments are too large. Maximum total size is 10 MB.'
      };
    }

    attachments.push({
      name,
      mimeType,
      data
    });
  }

  return {
    ok: true,
    value: attachments
  };
}

// -> { ok: true, value } | { ok: false, message }
export function validateInput(input) {
  const b =
    input && typeof input === 'object'
      ? input
      : {};

  const to =
    typeof b.to === 'string'
      ? b.to.trim()
      : '';

  const subject =
    typeof b.subject === 'string'
      ? b.subject.trim()
      : '';

  const message =
    typeof b.message === 'string'
      ? b.message
      : '';

  const communicationId =
    typeof b.communicationId === 'string'
      ? b.communicationId.trim()
      : '';

  const clientId =
    typeof b.clientId === 'string'
      ? b.clientId.slice(0, LIMITS.id)
      : '';

  const leadId =
    typeof b.leadId === 'string'
      ? b.leadId.slice(0, LIMITS.id)
      : '';

  if (!to) {
    return {
      ok: false,
      message: 'Enter a recipient email address.'
    };
  }

  if (
    to.length > LIMITS.to ||
    BAD_HEADER.test(to) ||
    !EMAIL_RE.test(to)
  ) {
    return {
      ok: false,
      message: 'Enter one valid recipient email address.'
    };
  }

  if (!subject) {
    return {
      ok: false,
      message: 'Enter a subject.'
    };
  }

  if (
    subject.length > LIMITS.subject ||
    BAD_HEADER.test(subject)
  ) {
    return {
      ok: false,
      message:
        'The subject must be a single line of up to 300 characters.'
    };
  }

  if (!message.trim()) {
    return {
      ok: false,
      message: 'Enter a message.'
    };
  }

  if (
    message.length > LIMITS.message ||
    message.includes('\0')
  ) {
    return {
      ok: false,
      message: 'The message is too long.'
    };
  }

  if (!UUID_RE.test(communicationId)) {
    return {
      ok: false,
      message: 'The request was not understood.'
    };
  }

  const attachmentResult =
    validateAttachments(b.attachments);

  if (!attachmentResult.ok) {
    return attachmentResult;
  }

  const attachments = attachmentResult.value;

  let scheduledAt = null;

  if (
    b.scheduledAt != null &&
    b.scheduledAt !== ''
  ) {
    const t = Date.parse(b.scheduledAt);

    if (!Number.isFinite(t)) {
      return {
        ok: false,
        message: 'The scheduled time is not valid.'
      };
    }

    if (attachments.length > 0) {
      return {
        ok: false,
        message:
          'Attachments are currently supported for immediate emails only.'
      };
    }

    scheduledAt =
      new Date(t).toISOString();
  }

  return {
    ok: true,
    value: {
      to,
      subject,
      message,
      communicationId,
      clientId,
      leadId,
      attachments,
      scheduledAt
    }
  };
}

// -> { ok: true, from } | { ok: false, code, message }
// Never throws, never returns the secret.
export async function callAppsScript(
  cfg,
  payload,
  fetchImpl = fetch
) {
  const ctrl = new AbortController();

  const timer = setTimeout(
    () => ctrl.abort(),
    APPS_SCRIPT_TIMEOUT_MS
  );

  try {
    const res = await fetchImpl(
      cfg.appsScriptUrl,
      {
        method: 'POST',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: cfg.secret,
          ...payload
        })
      }
    );

    if (res.status >= 500) {
      return {
        ok: false,
        code: 'unavailable'
      };
    }

    let data = null;

    try {
      data = JSON.parse(await res.text());
    } catch {
      // Google login/HTML page => deployment is not public
    }

    if (
      !data ||
      typeof data !== 'object'
    ) {
      return {
        ok: false,
        code: 'auth'
      };
    }

    if (data.ok === true) {
      return {
        ok: true,
        from:
          typeof data.from === 'string'
            ? data.from
            : '',
        attachmentCount:
          Number.isFinite(data.attachmentCount)
            ? data.attachmentCount
            : 0
      };
    }

    const code = [
      'auth',
      'quota',
      'invalid',
      'not_configured'
    ].includes(data.code)
      ? (
          data.code === 'not_configured'
            ? 'auth'
            : data.code
        )
      : 'send_failed';

    return {
      ok: false,
      code
    };
  } catch (e) {
    return {
      ok: false,
      code:
        e && e.name === 'AbortError'
          ? 'timeout'
          : 'unavailable'
    };
  } finally {
    clearTimeout(timer);
  }
}

const fail = (
  code,
  extra = {}
) => ({
  status: HTTP[code] || 502,
  body: {
    ok: false,
    code,
    message:
      MESSAGES[code] ||
      MESSAGES.send_failed,
    ...extra
  }
});

const logger =
  deps =>
    (event, f = {}) =>
      (deps.log || console.log)(
        JSON.stringify({
          event,
          ts: new Date().toISOString(),
          ...f
        })
      );

async function markResult(
  db,
  row,
  r,
  nowIso
) {
  if (r.ok) {
    await db.update(
      row.id,
      {
        status: 'sent',
        sent_at: nowIso,
        sent_from: r.from || null,
        body: null,
        error: null,
        error_code: null,
        updated_at: nowIso
      }
    );

    return;
  }

  await db.update(
    row.id,
    {
      status: 'failed',
      error:
        MESSAGES[r.code] ||
        MESSAGES.send_failed,
      error_code: r.code,
      updated_at: nowIso
    }
  );
}

// Manual / API send.
// deps: { db, cfg, fetchImpl, now(), log }
export async function handleSend(
  input,
  deps
) {
  const { db, cfg } = deps;

  const log = logger(deps);

  const now = () =>
    deps.now
      ? deps.now()
      : new Date();

  if (!cfg.configured) {
    return fail('not_configured');
  }

  const v = validateInput(input);

  if (!v.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        code: 'invalid',
        message: v.message
      }
    };
  }

  const x = v.value;

  const base = {
    communicationId:
      x.communicationId
  };

  const f = {
    communication_id:
      x.communicationId,
    client_id:
      x.clientId || undefined
  };

  log(
    'email_send_started',
    f
  );

  let row;

  try {
    const existing =
      await db.getByCommId(
        x.communicationId
      );

    if (existing) {
      if (existing.status === 'sent') {
        return {
          status: 200,
          body: {
            ok: true,
            status: 'sent',
            duplicate: true,
            ...base,
            sentAt:
              existing.sent_at,
            from:
              existing.sent_from || ''
          }
        };
      }

      if (
        existing.status ===
        'processing'
      ) {
        return fail(
          'in_progress',
          base
        );
      }

      if (
        existing.status ===
        'pending'
      ) {
        return {
          status: 200,
          body: {
            ok: true,
            status: 'pending',
            duplicate: true,
            ...base
          }
        };
      }
    }

    const sendNow =
      !x.scheduledAt ||
      Date.parse(x.scheduledAt) <=
        now().getTime();

    if (sendNow) {
      const used =
        await db.countRecent(
          new Date(
            now().getTime() -
              86400000
          ).toISOString()
        );

      if (
        used >= cfg.dailyCap
      ) {
        log(
          'email_quota_exceeded',
          {
            ...f,
            status: 'blocked',
            reason: 'daily_cap'
          }
        );

        return {
          status: 429,
          body: {
            ok: false,
            code: 'quota',
            message:
              'Daily sending limit (' +
              cfg.dailyCap +
              ') reached. ' +
              MESSAGES.quota,
            ...base
          }
        };
      }
    }

    const fields = {
      client_id:
        x.clientId || null,
      lead_id:
        x.leadId || null,
      recipient:
        x.to,
      subject:
        x.subject,
      body:
        x.message,
      error: null,
      error_code: null,
      updated_at:
        now().toISOString()
    };

    if (!sendNow) {
      const ins =
        await db.insert({
          ...fields,
          communication_id:
            x.communicationId,
          status: 'pending',
          scheduled_at:
            x.scheduledAt,
          attempts: 0
        });

      if (ins.duplicate) {
        return fail(
          'in_progress',
          base
        );
      }

      return {
        status: 200,
        body: {
          ok: true,
          status: 'pending',
          ...base,
          scheduledAt:
            x.scheduledAt
        }
      };
    }

    if (existing) {
      row =
        await db.claimFailed(
          x.communicationId,
          {
            ...fields,
            status: 'processing',
            processing_started_at:
              now().toISOString(),
            attempts:
              (existing.attempts || 0) +
              1
          }
        );

      if (!row) {
        return fail(
          'in_progress',
          base
        );
      }
    } else {
      const ins =
        await db.insert({
          ...fields,
          communication_id:
            x.communicationId,
          status: 'processing',
          scheduled_at:
            now().toISOString(),
          processing_started_at:
            now().toISOString(),
          attempts: 1
        });

      if (ins.duplicate) {
        return fail(
          'in_progress',
          base
        );
      }

      row = ins.row;
    }
  } catch (e) {
    log(
      'email_send_failed',
      {
        ...f,
        status: 'db_error'
      }
    );

    return fail(
      'db',
      base
    );
  }

  const r =
    await callAppsScript(
      cfg,
      {
        communication_id:
          x.communicationId,
        recipient:
          x.to,
        subject:
          x.subject,
        body:
          x.message,
        attachments:
          x.attachments
      },
      deps.fetchImpl
    );

  const t =
    now().toISOString();

  try {
    await markResult(
      db,
      row,
      r,
      t
    );
  } catch {
    log(
      'email_send_failed',
      {
        ...f,
        status:
          'db_error_after_send',
        sent:
          r.ok
      }
    );

    if (r.ok) {
      return {
        status: 200,
        body: {
          ok: true,
          status: 'sent',
          ...base,
          sentAt: t,
          from:
            r.from || '',
          attachmentCount:
            r.attachmentCount || 0
        }
      };
    }
  }

  if (r.ok) {
    log(
      'email_send_success',
      {
        ...f,
        status: 'sent'
      }
    );

    return {
      status: 200,
      body: {
        ok: true,
        status: 'sent',
        ...base,
        sentAt: t,
        from:
          r.from || '',
        attachmentCount:
          r.attachmentCount || 0
      }
    };
  }

  log(
    r.code === 'quota'
      ? 'email_quota_exceeded'
      : r.code === 'unavailable'
        ? 'apps_script_unavailable'
        : 'email_send_failed',
    {
      ...f,
      status: 'failed',
      code: r.code
    }
  );

  return fail(
    r.code === 'invalid'
      ? 'send_failed'
      : r.code,
    {
      ...base,
      attempted: true
    }
  );
}

// Cron entry.
// Scheduled attachments are intentionally not supported yet.
export async function processQueue(
  deps,
  { limit = 10 } = {}
) {
  const { db, cfg } = deps;

  const log = logger(deps);

  const now = () =>
    deps.now
      ? deps.now()
      : new Date();

  const out = {
    claimed: 0,
    sent: 0,
    failed: 0,
    requeued: 0,
    recovered: 0,
    skipped: ''
  };

  if (!cfg.configured) {
    out.skipped =
      'not_configured';
    return out;
  }

  out.recovered =
    await db.recoverStale(
      new Date(
        now().getTime() -
          STALE_MINUTES *
            60000
      ).toISOString(),
      MESSAGES.interrupted
    );

  const used =
    await db.countRecent(
      new Date(
        now().getTime() -
          86400000
      ).toISOString()
    );

  const room = Math.min(
    limit,
    cfg.dailyCap - used
  );

  if (room <= 0) {
    out.skipped =
      'daily_cap';

    log(
      'email_quota_exceeded',
      {
        status: 'blocked',
        reason: 'daily_cap'
      }
    );

    return out;
  }

  const rows =
    await db.claimDue(room);

  out.claimed =
    rows.length;

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {
    const row = rows[i];

    const f = {
      communication_id:
        row.communication_id,
      client_id:
        row.client_id ||
        undefined
    };

    log(
      'email_send_started',
      f
    );

    const r =
      await callAppsScript(
        cfg,
        {
          communication_id:
            row.communication_id,
          recipient:
            row.recipient,
          subject:
            row.subject,
          body:
            row.body,
          attachments: []
        },
        deps.fetchImpl
      );

    const t =
      now().toISOString();

    if (r.ok) {
      await markResult(
        db,
        row,
        r,
        t
      );

      out.sent++;

      log(
        'email_send_success',
        {
          ...f,
          status: 'sent'
        }
      );

      continue;
    }

    if (
      r.code ===
        'unavailable' &&
      row.attempts <
        MAX_ATTEMPTS
    ) {
      await db.update(
        row.id,
        {
          status: 'pending',
          scheduled_at:
            new Date(
              now().getTime() +
                10 *
                  60000 *
                  row.attempts
            ).toISOString(),
          error:
            MESSAGES.unavailable,
          error_code:
            'unavailable',
          updated_at: t
        }
      );

      out.requeued++;

      log(
        'apps_script_unavailable',
        {
          ...f,
          status:
            'requeued',
          attempts:
            row.attempts
        }
      );

      continue;
    }

    await markResult(
      db,
      row,
      r,
      t
    );

    out.failed++;

    log(
      r.code === 'quota'
        ? 'email_quota_exceeded'
        : 'email_send_failed',
      {
        ...f,
        status: 'failed',
        code: r.code
      }
    );

    if (
      r.code === 'quota' ||
      r.code === 'auth'
    ) {
      const rest =
        rows
          .slice(i + 1)
          .map(x => x.id);

      if (rest.length) {
        await db.release(
          rest
        );

        out.requeued +=
          rest.length;
      }

      break;
    }
  }

  return out;
}