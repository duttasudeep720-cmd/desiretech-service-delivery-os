import { useState } from 'react';
import { useStore } from '../data/store.js';
import { Modal, F, useUI } from '../ui.jsx';
import { by } from '../logic.js';
import { unresolvedVariables } from '../communication/variables.js';
import { markProposalSent } from '../leads/leadActions.js';
import {
  useEmailStatus,
  sendEmail,
  validRecipient,
  newCommunicationId,
  NOT_CONFIGURED_MSG,
  UNAVAILABLE_MSG
} from './emailApi.js';
import {
  recordSentEmail,
  recordFailedEmail
} from './emailHistory.js';

// Email composer with attachment support.
// Attachments: maximum 10 files and 10 MB total.
export default function EmailComposer({
  initial,
  meta = {},
  histId = '',
  onClose,
  onSent
}) {
  const s = useStore();
  const ui = useUI();
  const [st, refresh] = useEmailStatus();

  const [to, setTo] = useState(initial.to || '');
  const [subject, setSubject] = useState(initial.subject || '');
  const [body, setBody] = useState(initial.body || '');
  const [attachments, setAttachments] = useState([]);

  const [commId] = useState(newCommunicationId);
  const [step, setStep] = useState('compose');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [marked, setMarked] = useState(false);

  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
  const MAX_ATTACHMENTS = 10;

  const ready = st.state === 'configured';
  const left = unresolvedVariables(subject, body);

  const lead = meta.leadId
    ? by(s.leads || [], meta.leadId)
    : null;

  const canMark =
    !!lead &&
    !!lead.proposalId &&
    !['Proposal Sent', 'Won', 'Lost'].includes(lead.status) &&
    !marked;

  const totalAttachmentBytes = attachments.reduce(
    (total, file) => total + file.size,
    0
  );

  const formatBytes = bytes => {
    if (bytes < 1024) {
      return String(bytes) + ' B';
    }

    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }

    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const close = () => {
    if (!sending) {
      onClose();
    }
  };

  const addAttachments = files => {
    const selected = Array.from(files || []);

    if (!selected.length) {
      return;
    }

    const combined = attachments.concat(selected);

    if (combined.length > MAX_ATTACHMENTS) {
      setErr(
        'You can attach a maximum of ' +
        MAX_ATTACHMENTS +
        ' files.'
      );
      return;
    }

    const total = combined.reduce(
      (total, file) => total + file.size,
      0
    );

    if (total > MAX_ATTACHMENT_BYTES) {
      setErr(
        'Attachments are too large. Maximum total size is 10 MB.'
      );
      return;
    }

    setErr('');
    setAttachments(combined);
  };

  const removeAttachment = index => {
    setAttachments(prev =>
      prev.filter((_, i) => i !== index)
    );
  };

  const fileToBase64 = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');

        resolve(
          comma >= 0
            ? result.slice(comma + 1)
            : result
        );
      };

      reader.onerror = () => {
        reject(
          new Error(
            'Could not read ' + file.name + '.'
          )
        );
      };

      reader.readAsDataURL(file);
    });

  const problem = () => {
    if (!to.trim()) {
      return 'Enter a recipient email address.';
    }

    if (!validRecipient(to)) {
      return 'Enter one valid recipient email address.';
    }

    if (!subject.trim()) {
      return 'Enter a subject.';
    }

    if (!body.trim()) {
      return 'Enter a message.';
    }

    if (subject.includes('\n')) {
      return 'The subject must be a single line.';
    }

    return '';
  };

  const review = () => {
    const message = problem();

    setErr(message);

    if (!message) {
      setStep('confirm');
    }
  };

  const send = async () => {
    setSending(true);
    setErr('');

    try {
      const encodedAttachments = [];

      for (const file of attachments) {
        const data = await fileToBase64(file);

        encodedAttachments.push({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: data
        });
      }

      const result = await sendEmail({
        to: to.trim(),
        subject: subject.trim(),
        message: body,
        communicationId: commId,
        clientId: meta.clientId || '',
        leadId: meta.leadId || '',
        attachments: encodedAttachments
      });

      setSending(false);

      if (!result.ok) {
        if (result.attempted) {
          recordFailedEmail({
            meta,
            to: to.trim(),
            subject: subject.trim(),
            message: body,
            error: result.message,
            commId
          });
        }

        setErr(result.message);
        setStep('compose');
        refresh();
        return;
      }

      onSent?.(
        recordSentEmail({
          meta,
          histId,
          to: to.trim(),
          subject: subject.trim(),
          message: body,
          from: result.from,
          commId
        })
      );

      setStep('sent');
    } catch (error) {
      setSending(false);

      setErr(
        error && error.message
          ? error.message
          : 'The attachment could not be prepared. Please try again.'
      );

      setStep('compose');
    }
  };

  const banner =
    st.state === 'loading'
      ? null
      : st.state === 'not_configured'
        ? (
          <div className="warnbox">
            {NOT_CONFIGURED_MSG}
          </div>
        )
        : st.state === 'unavailable'
          ? (
            <div className="warnbox">
              {UNAVAILABLE_MSG}
            </div>
          )
          : null;

  const warn =
    left.length > 0
      ? (
        <div className="warnbox">
          <b>
            ⚠ {left.length} variable
            {left.length > 1 ? 's are' : ' is'}
            {' '}still unfilled
          </b>

          <div className="row">
            {left.map(variable => (
              <code key={variable}>
                {variable}
              </code>
            ))}
          </div>

          <div className="muted sm">
            Edit the subject or message before sending.
          </div>
        </div>
      )
      : null;

  if (step === 'sent') {
    return (
      <Modal
        title="Email sent"
        onClose={close}
      >
        <div className="okbox">
          <b>Email sent.</b>

          <div className="sm">
            To {to.trim()} · accepted for sending by Google
            and saved to Communication History.
            Delivery is not confirmed.
          </div>

          {attachments.length > 0 && (
            <div className="sm mt">
              {attachments.length} attachment
              {attachments.length > 1 ? 's' : ''}
              {' '}included.
            </div>
          )}
        </div>

        <div className="row mt">
          {canMark && (
            <button
              className="btn ok"
              onClick={() => {
                markProposalSent(lead.id);
                setMarked(true);
                ui.toast('Marked as Proposal Sent.');
              }}
            >
              Mark Proposal Sent
            </button>
          )}

          <span className="grow" />

          <button
            className="btn pri"
            onClick={close}
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (step === 'confirm') {
    return (
      <Modal
        title="Send this email?"
        onClose={close}
      >
        <dl className="info mb">
          <div>
            <dt>To</dt>
            <dd>{to.trim()}</dd>
          </div>

          <div>
            <dt>Subject</dt>
            <dd>{subject.trim()}</dd>
          </div>
        </dl>

        {attachments.length > 0 && (
          <div className="info mb">
            <div>
              <dt>Attachments</dt>

              <dd>
                {attachments.map((file, index) => (
                  <div
                    key={file.name + '-' + index}
                  >
                    {file.name}
                    {' · '}
                    {formatBytes(file.size)}
                  </div>
                ))}
              </dd>
            </div>
          </div>
        )}

        {warn}

        {err && (
          <div className="err">
            {err}
          </div>
        )}

        <div className="row mt">
          <span className="grow" />

          <button
            className="btn"
            disabled={sending}
            onClick={() => setStep('compose')}
          >
            Cancel
          </button>

          <button
            className="btn pri"
            disabled={sending}
            onClick={send}
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      wide
      title="Send email"
      onClose={close}
    >
      {banner}

      <F
        label="To"
        full
      >
        <input
          type="email"
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="name@example.com"
        />
      </F>

      <F
        label="Subject"
        full
      >
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
      </F>

      <F
        label="Message"
        full
      >
        <textarea
          rows="12"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </F>

      <F
        label="Attachments"
        full
      >
        <input
          type="file"
          multiple
          onChange={e => {
            addAttachments(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="muted sm mt">
          Maximum 10 files, up to 10 MB total.
        </div>

        {attachments.length > 0 && (
          <div className="mt">
            {attachments.map((file, index) => (
              <div
                className="row"
                key={file.name + '-' + index}
                style={{ marginBottom: '6px' }}
              >
                <span>
                  {file.name}
                  {' · '}
                  {formatBytes(file.size)}
                </span>

                <span className="grow" />

                <button
                  type="button"
                  className="btn"
                  onClick={() => removeAttachment(index)}
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="muted sm">
              {attachments.length} file
              {attachments.length > 1 ? 's' : ''}
              {' · '}
              {formatBytes(totalAttachmentBytes)}
              {' / 10 MB'}
            </div>
          </div>
        )}
      </F>

      {warn}

      {err && (
        <div className="err">
          {err}
        </div>
      )}

      <div className="row mt">
        <span className="muted sm">
          Plain-text email. Attachments up to 10 MB total.
        </span>

        <span className="grow" />

        <button
          className="btn"
          onClick={close}
        >
          Cancel
        </button>

        <button
          className="btn pri"
          disabled={!ready}
          onClick={review}
        >
          Send Email
        </button>
      </div>
    </Modal>
  );
}
