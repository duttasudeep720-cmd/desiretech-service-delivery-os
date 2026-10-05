/**
 * DesireTech Email Automation - Google Apps Script Web App.
 *
 * Supports:
 * - Plain-text emails
 * - Multiple attachments
 * - 10 MB total attachment limit
 *
 * Script Properties:
 *   SHARED_SECRET  required
 *   SENDER_NAME    optional
 */

var MAX_FIELD = { to: 254, subject: 300, body: 100000 };
var MAX_REQUEST_BYTES = 15000000;
var MAX_ATTACHMENTS_BYTES = 10 * 1024 * 1024;
var MAX_ATTACHMENTS = 10;

var EMAIL_RE = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/;

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) {
    d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return d === 0;
}

function doGet() {
  return out_({
    ok: true,
    service: 'desiretech-email-automation'
  });
}

function doPost(e) {
  var lock = null;

  try {
    var raw = e && e.postData && e.postData.contents;

    if (!raw || raw.length > MAX_REQUEST_BYTES) {
      return out_({
        ok: false,
        code: 'invalid',
        message: 'Bad request.'
      });
    }

    var data;

    try {
      data = JSON.parse(raw);
    } catch (err) {
      return out_({
        ok: false,
        code: 'invalid',
        message: 'Bad request.'
      });
    }

    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('SHARED_SECRET');

    if (!secret || secret.length < 16) {
      return out_({
        ok: false,
        code: 'not_configured',
        message: 'SHARED_SECRET is not set.'
      });
    }

    if (!safeEqual_(String(data.token || ''), secret)) {
      return out_({
        ok: false,
        code: 'auth',
        message: 'Unauthorized.'
      });
    }

    var to = String(data.recipient || '').trim();
    var subject = String(data.subject || '').trim();
    var body = typeof data.body === 'string' ? data.body : '';
    var cid = String(data.communication_id || '').trim();

    if (
      !EMAIL_RE.test(to) ||
      to.length > MAX_FIELD.to ||
      /[\r\n]/.test(to)
    ) {
      return out_({
        ok: false,
        code: 'invalid',
        message: 'Invalid recipient.'
      });
    }

    if (
      !subject ||
      subject.length > MAX_FIELD.subject ||
      /[\r\n]/.test(subject)
    ) {
      return out_({
        ok: false,
        code: 'invalid',
        message: 'Invalid subject.'
      });
    }

    if (!body.trim() || body.length > MAX_FIELD.body) {
      return out_({
        ok: false,
        code: 'invalid',
        message: 'Invalid body.'
      });
    }

    /*
     * Attachments format:
     *
     * attachments: [
     *   {
     *     name: "file.pdf",
     *     mimeType: "application/pdf",
     *     data: "<base64>"
     *   }
     * ]
     */

    var attachments = Array.isArray(data.attachments)
      ? data.attachments
      : [];

    if (attachments.length > MAX_ATTACHMENTS) {
      return out_({
        ok: false,
        code: 'invalid',
        message: 'Too many attachments.'
      });
    }

    var blobs = [];
    var totalBytes = 0;

    for (var i = 0; i < attachments.length; i++) {
      var a = attachments[i] || {};

      var name = String(a.name || '').trim();
      var mimeType = String(a.mimeType || '').trim();
      var base64 = String(a.data || '');

      if (!name || !base64) {
        return out_({
          ok: false,
          code: 'invalid',
          message: 'Invalid attachment.'
        });
      }

      if (name.length > 255 || /[\r\n\0]/.test(name)) {
        return out_({
          ok: false,
          code: 'invalid',
          message: 'Invalid attachment filename.'
        });
      }

      if (!mimeType || mimeType.length > 200 || /[\r\n\0]/.test(mimeType)) {
        return out_({
          ok: false,
          code: 'invalid',
          message: 'Invalid attachment type.'
        });
      }

      /*
       * Base64 represents approximately 4/3 of the original
       * binary size. Calculate the decoded size without storing
       * unnecessary copies.
       */
      var padding = 0;

      if (base64.endsWith('==')) {
        padding = 2;
      } else if (base64.endsWith('=')) {
        padding = 1;
      }

      var decodedBytes = Math.floor(base64.length * 3 / 4) - padding;

      totalBytes += decodedBytes;

      if (totalBytes > MAX_ATTACHMENTS_BYTES) {
        return out_({
          ok: false,
          code: 'invalid',
          message: 'Attachments are too large. Maximum total size is 10 MB.'
        });
      }

      try {
        var bytes = Utilities.base64Decode(base64);

        var blob = Utilities.newBlob(
          bytes,
          mimeType,
          name
        );

        blobs.push(blob);
      } catch (attachmentError) {
        return out_({
          ok: false,
          code: 'invalid',
          message: 'Invalid attachment data.'
        });
      }
    }

    var cache = CacheService.getScriptCache();
    var key = cid ? 'sent:' + cid : '';

    lock = LockService.getScriptLock();
    lock.waitLock(15000);

    if (key && cache.get(key)) {
      return out_({
        ok: true,
        duplicate: true,
        from: Session.getEffectiveUser().getEmail()
      });
    }

    if (MailApp.getRemainingDailyQuota() < 1) {
      return out_({
        ok: false,
        code: 'quota',
        message: 'Email quota exceeded.'
      });
    }

    var opts = {
      to: to,
      subject: subject,
      body: body
    };

    var senderName = props.getProperty('SENDER_NAME');

    if (senderName) {
      opts.name = senderName;
    }

    if (blobs.length > 0) {
      opts.attachments = blobs;
    }

    MailApp.sendEmail(opts);

    if (key) {
      cache.put(key, '1', 21600);
    }

    return out_({
      ok: true,
      from: Session.getEffectiveUser().getEmail(),
      remainingQuota: MailApp.getRemainingDailyQuota(),
      attachmentCount: blobs.length
    });

  } catch (err) {
    var m = String(err && err.message || err);

    if (
      /quota|too many times|limit exceeded|service invoked/i.test(m)
    ) {
      return out_({
        ok: false,
        code: 'quota',
        message: 'Email quota exceeded.'
      });
    }

    return out_({
      ok: false,
      code: 'send_failed',
      message: 'Send failed.'
    });

  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (x) {}
    }
  }
}

/**
 * Run this ONCE from the editor:
 * Run -> authorizeAndTest
 */
function authorizeAndTest() {
  var me = Session.getEffectiveUser().getEmail();

  MailApp.sendEmail({
    to: me,
    subject: 'DesireTech email automation test',
    body:
      'Apps Script can send email from ' +
      me +
      '. Remaining daily quota: ' +
      MailApp.getRemainingDailyQuota()
  });
}