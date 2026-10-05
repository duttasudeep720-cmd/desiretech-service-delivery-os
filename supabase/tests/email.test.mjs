// Run: npm test   (Node 20, no extra packages). Uses an in-memory fake of the Supabase queue + a fake Apps Script.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { handleSend, processQueue, validateInput, getConfig, callAppsScript, MESSAGES } from '../functions/_shared/core.js';

const SECRET = 'test-shared-secret-0123456789', URLX = 'https://script.google.com/macros/s/FAKE/exec';
const cfg = (o = {}) => ({ ...getConfig({ APPS_SCRIPT_URL: URLX, APPS_SCRIPT_SECRET: SECRET, EMAIL_DAILY_CAP: '80' }), ...o });
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const input = (n, o = {}) => ({ to: 'client@example.com', subject: 'Hello Acme', message: 'Hi Acme, welcome.', communicationId: ID(n), clientId: 'c1', ...o });

function fakeDb() { // mirrors the SQL semantics: unique communication_id, atomic claim, recover, release
  const rows = []; let seq = 0;
  return {
    rows,
    async getByCommId(c) { return rows.find(r => r.communication_id === c) || null; },
    async insert(row) { if (rows.some(r => r.communication_id === row.communication_id)) return { duplicate: true }; const r = { id: 'id' + ++seq, ...row }; rows.push(r); return { row: r }; },
    async claimFailed(c, patch) { const r = rows.find(x => x.communication_id === c && x.status === 'failed'); if (!r) return null; Object.assign(r, patch); return r; },
    async update(id, patch) { Object.assign(rows.find(r => r.id === id), patch); },
    async countRecent(since) { return rows.filter(r => ['processing', 'sent'].includes(r.status) && r.processing_started_at > since).length; },
    async claimDue(limit) { const now = new Date().toISOString(); const due = rows.filter(r => r.status === 'pending' && r.scheduled_at <= now).slice(0, limit); due.forEach(r => { r.status = 'processing'; r.attempts++; r.processing_started_at = now; }); return due.map(r => ({ ...r })); },
    async recoverStale(before, msg) { const s = rows.filter(r => r.status === 'processing' && r.processing_started_at < before); s.forEach(r => { r.status = 'failed'; r.error_code = 'interrupted'; r.error = msg; }); return s.length; },
    async release(ids) { rows.filter(r => ids.includes(r.id)).forEach(r => { r.status = 'pending'; r.attempts--; }); },
  };
}
const appsScript = (behaviour = 'ok') => { const calls = []; const f = async (url, init) => { const b = JSON.parse(init.body); calls.push(b); if (typeof behaviour === 'function') return behaviour(b, calls); if (behaviour === 'down') throw new TypeError('fetch failed'); if (behaviour === 'html') return new Response('<html>Sign in</html>', { status: 200 }); if (behaviour === '503') return new Response('x', { status: 503 }); if (behaviour === 'quota') return Response.json({ ok: false, code: 'quota' }); if (behaviour === 'badtoken') return Response.json({ ok: false, code: 'auth' }); return Response.json({ ok: true, from: 'owner@gmail.com' }); }; f.calls = calls; return f; };
const mk = (o = {}) => { const logs = []; return { db: fakeDb(), cfg: cfg(), fetchImpl: appsScript(), log: l => logs.push(l), logs, ...o }; };

test('validation: recipient/subject/body/id/schedule', () => {
  assert.equal(validateInput(input(1)).ok, true);
  for (const bad of [{ to: '' }, { to: 'a@b' }, { to: 'a@b.com\nBcc: x@y.com' }, { subject: '' }, { subject: 'a\nb' }, { message: '  ' }, { communicationId: 'nope' }, { scheduledAt: 'not a date' }]) assert.equal(validateInput(input(1, bad)).ok, false, JSON.stringify(bad));
});

test('manual send: calls Apps Script with the EDITED values, row ends sent, body cleared, no secret in response/logs', async () => {
  const d = mk(), r = await handleSend(input(1, { subject: 'Edited subject', message: 'Edited body' }), d);
  assert.equal(r.status, 200); assert.equal(r.body.status, 'sent'); assert.equal(r.body.from, 'owner@gmail.com');
  assert.deepEqual([d.fetchImpl.calls[0].recipient, d.fetchImpl.calls[0].subject, d.fetchImpl.calls[0].body], ['client@example.com', 'Edited subject', 'Edited body']);
  assert.equal(d.fetchImpl.calls[0].token, SECRET);
  assert.equal(d.db.rows[0].status, 'sent'); assert.equal(d.db.rows[0].body, null); assert.ok(d.db.rows[0].sent_at); assert.equal(d.db.rows[0].attempts, 1);
  const out = JSON.stringify(r) + d.logs.join('');
  assert.ok(!out.includes(SECRET) && !out.includes('Edited body') && !out.includes('client@example.com'), 'no secret/content/recipient in response or logs');
  assert.ok(!JSON.stringify(d.db.rows).includes(SECRET), 'secret never stored');
  assert.ok(d.logs.some(l => l.includes('email_send_started')) && d.logs.some(l => l.includes('email_send_success')));
});

test('failure: Apps Script unavailable / timeout-ish / html login page / quota / 503 => failed, safe message, attempted flag', async () => {
  for (const [b, code] of [['down', 'unavailable'], ['503', 'unavailable'], ['html', 'auth'], ['quota', 'quota'], ['badtoken', 'auth']]) {
    const d = mk({ fetchImpl: appsScript(b) }), r = await handleSend(input(1), d);
    assert.equal(r.body.ok, false); assert.equal(r.body.code, code); assert.equal(r.body.attempted, true);
    assert.equal(d.db.rows[0].status, 'failed'); assert.equal(d.db.rows[0].error_code, code); assert.equal(d.db.rows[0].error, MESSAGES[code]);
    assert.ok(!JSON.stringify(r).includes(SECRET));
  }
});

test('timeout is classified as timeout (abort), never retried automatically', async () => {
  const f = (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' }))));
  const real = global.setTimeout; global.setTimeout = (fn, ms) => real(fn, ms > 1000 ? 5 : ms); // shrink the 25s timeout
  try { const r = await callAppsScript(cfg(), { a: 1 }, f); assert.deepEqual(r, { ok: false, code: 'timeout' }); } finally { global.setTimeout = real; }
});

test('duplicate prevention: same communicationId sent twice / double-click => one email', async () => {
  const d = mk(); await handleSend(input(1), d); const r2 = await handleSend(input(1), d);
  assert.equal(d.fetchImpl.calls.length, 1); assert.equal(r2.body.duplicate, true); assert.equal(r2.body.status, 'sent');
  const d2 = mk(); d2.db.rows.push({ id: 'x', communication_id: ID(2), status: 'processing', attempts: 1 });
  const r3 = await handleSend(input(2), d2); assert.equal(r3.status, 409); assert.equal(d2.fetchImpl.calls.length, 0);
});

test('retry after failure re-uses the same row (attempts increments) and can then succeed once', async () => {
  const d = mk({ fetchImpl: appsScript('down') }); await handleSend(input(1), d);
  d.fetchImpl = appsScript('ok'); const r = await handleSend(input(1, { message: 'Fixed body' }), d);
  assert.equal(r.body.status, 'sent'); assert.equal(d.db.rows.length, 1); assert.equal(d.db.rows[0].attempts, 2);
});

test('not configured / daily cap / db failure => nothing is sent', async () => {
  const a = mk({ cfg: cfg({ configured: false }) }); assert.equal((await handleSend(input(1), a)).body.code, 'not_configured'); assert.equal(a.fetchImpl.calls.length, 0);
  const b = mk({ cfg: cfg({ dailyCap: 1 }) }); await handleSend(input(1), b); const r = await handleSend(input(2), b);
  assert.equal(r.status, 429); assert.equal(r.body.code, 'quota'); assert.equal(b.fetchImpl.calls.length, 1);
  const c = mk(); c.db.insert = async () => { throw new Error('db'); }; const r2 = await handleSend(input(3), c);
  assert.equal(r2.body.code, 'db'); assert.equal(c.fetchImpl.calls.length, 0, 'never send if it could not be recorded');
});

test('scheduled: future email is queued pending and NOT sent by the API', async () => {
  const d = mk(), r = await handleSend(input(1, { scheduledAt: new Date(Date.now() + 3600e3).toISOString() }), d);
  assert.equal(r.body.status, 'pending'); assert.equal(d.fetchImpl.calls.length, 0); assert.equal(d.db.rows[0].status, 'pending');
});

test('cron: pending -> processing -> sent; running the scheduler twice does not send twice', async () => {
  const d = mk(), past = new Date(Date.now() - 60e3).toISOString();
  await handleSend(input(1, { scheduledAt: new Date(Date.now() + 3600e3).toISOString() }), d); d.db.rows[0].scheduled_at = past;
  const seen = []; const origUpdate = d.db.update; d.db.update = async (id, p) => { seen.push(p.status); return origUpdate(id, p); };
  const a = await processQueue(d), b = await processQueue(d);
  assert.deepEqual([a.claimed, a.sent, b.claimed, b.sent], [1, 1, 0, 0]); assert.equal(d.fetchImpl.calls.length, 1); assert.equal(d.db.rows[0].status, 'sent'); assert.deepEqual(seen, ['sent']);
});

test('cron: two OVERLAPPING runs never claim the same row', async () => {
  const d = mk(); for (let i = 1; i <= 3; i++) await handleSend(input(i, { scheduledAt: new Date(Date.now() + 3600e3).toISOString() }), d); d.db.rows.forEach(r => r.scheduled_at = new Date(Date.now() - 1000).toISOString());
  const [a, b] = await Promise.all([processQueue(d), processQueue(d)]);
  assert.equal(a.claimed + b.claimed, 3); assert.equal(d.fetchImpl.calls.length, 3); assert.equal(new Set(d.fetchImpl.calls.map(c => c.communication_id)).size, 3);
});

test('cron: unavailable => re-queued with backoff, max 3 attempts, then failed; quota/auth => failed, rest released, no hammering', async () => {
  const d = mk({ fetchImpl: appsScript('down') }); await handleSend(input(1, { scheduledAt: new Date(Date.now() + 3600e3).toISOString() }), d);
  const row = d.db.rows[0];
  for (let i = 1; i <= 3; i++) { row.scheduled_at = new Date(Date.now() - 1000).toISOString(); const r = await processQueue(d); assert.equal(r.requeued, i < 3 ? 1 : 0); assert.equal(row.status, i < 3 ? 'pending' : 'failed'); }
  assert.equal(d.fetchImpl.calls.length, 3);
  const q = mk({ fetchImpl: appsScript('quota') }); for (let i = 1; i <= 3; i++) await handleSend(input(i, { scheduledAt: new Date(Date.now() + 3600e3).toISOString() }), q);
  q.db.rows.forEach(r => r.scheduled_at = new Date(Date.now() - 1000).toISOString());
  const r = await processQueue(q); assert.equal(q.fetchImpl.calls.length, 1); assert.deepEqual(q.db.rows.map(x => x.status), ['failed', 'pending', 'pending']); assert.equal(q.db.rows[0].error_code, 'quota'); assert.equal(q.db.rows[1].attempts, 0);
});

test('cron: stale "processing" rows are marked failed (never auto re-sent) and daily cap is respected', async () => {
  const d = mk(); d.db.rows.push({ id: 's1', communication_id: ID(9), status: 'processing', attempts: 1, processing_started_at: new Date(Date.now() - 3600e3).toISOString() });
  const r = await processQueue(d); assert.equal(r.recovered, 1); assert.equal(d.db.rows[0].status, 'failed'); assert.equal(d.db.rows[0].error_code, 'interrupted'); assert.equal(d.fetchImpl.calls.length, 0);
  const c = mk({ cfg: cfg({ dailyCap: 0.5 }) }); c.cfg.dailyCap = 0; assert.equal((await processQueue(c)).skipped, 'daily_cap');
});

// ---- Google Apps Script (Code.gs) executed against mocks ----
function loadScript(props = { SHARED_SECRET: SECRET }, { quota = 100, throwOnSend = '' } = {}) {
  const sent = [], cache = new Map();
  const ctx = {
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) || null, put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@gmail.com' }) },
    MailApp: { getRemainingDailyQuota: () => quota - sent.length, sendEmail: o => { if (throwOnSend) throw new Error(throwOnSend); sent.push(o); } },
  };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  const post = o => JSON.parse(ctx.doPost({ postData: { contents: typeof o === 'string' ? o : JSON.stringify(o) } }).text);
  return { post, sent, ctx };
}
const good = (o = {}) => ({ token: SECRET, communication_id: ID(1), recipient: 'client@example.com', subject: 'Hi', body: 'Body', ...o });

test('Apps Script: valid request sends one plain-text email via MailApp; retry of same communication_id is not re-sent', () => {
  const s = loadScript(); const r = s.post(good()); assert.equal(r.ok, true); assert.equal(r.from, 'owner@gmail.com');
  assert.deepEqual({ ...s.sent[0] }, { to: 'client@example.com', subject: 'Hi', body: 'Body' });
  const r2 = s.post(good()); assert.equal(r2.duplicate, true); assert.equal(s.sent.length, 1);
});
test('Apps Script: wrong/missing token, unset secret, bad JSON, bad fields => rejected, nothing sent, nothing echoed', () => {
  const s = loadScript();
  assert.equal(s.post(good({ token: 'wrong' })).code, 'auth'); assert.equal(s.post(good({ token: undefined })).code, 'auth');
  assert.equal(s.post('{nope').code, 'invalid'); assert.equal(s.post(good({ recipient: 'bad' })).code, 'invalid'); assert.equal(s.post(good({ subject: 'a\nBcc: x' })).code, 'invalid'); assert.equal(s.post(good({ body: ' ' })).code, 'invalid');
  assert.equal(loadScript({}).post(good()).code, 'not_configured'); assert.equal(s.sent.length, 0);
  assert.ok(!JSON.stringify(s.post(good({ token: 'wrong' }))).includes(SECRET));
});
test('Apps Script: quota exhausted or MailApp quota error => code quota; other errors => generic send_failed', () => {
  assert.equal(loadScript(undefined, { quota: 0 }).post(good()).code, 'quota');
  assert.equal(loadScript(undefined, { throwOnSend: 'Service invoked too many times for one day: email.' }).post(good()).code, 'quota');
  const r = loadScript(undefined, { throwOnSend: 'secret internal detail' }).post(good()); assert.equal(r.code, 'send_failed'); assert.ok(!JSON.stringify(r).includes('secret internal'));
});
