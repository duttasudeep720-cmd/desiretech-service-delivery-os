# Email Automation setup (Supabase + Google Apps Script + Gmail)

```
Service OS -> Supabase Edge Function (email-send) -> Google Apps Script Web App -> MailApp/Gmail -> recipient
Supabase Cron -> Edge Function (email-process-queue) -> same Apps Script  (scheduled emails)
```
No Google Cloud project, Gmail API, OAuth client or paid email service is needed. Cost: Rs 0 on Supabase Free + Apps Script.
Emails are sent **from the Google account that owns/authorizes the script**. "Sent" = Google accepted the email; delivery is never confirmed.

## 1. Google Apps Script (administrator, ~5 min)
1. Open https://script.google.com -> **New project** (signed in as the Gmail/Workspace account that should send).
2. Replace the editor contents with `apps-script/Code.gs`.
3. **Project Settings -> Script properties -> Add**: `SHARED_SECRET` = a long random string (generate: `openssl rand -hex 32`). Optional `SENDER_NAME` = `DesireTech`.
4. In the editor choose function **authorizeAndTest** -> **Run** -> review permissions -> Allow. You receive a test email (this is the one-time send-email authorization).
5. **Deploy -> New deployment -> Web app**: Execute as **Me**; Who has access **Anyone**. (Required so Supabase can call it without a Google login; the shared secret is what protects it.) Deploy and copy the **Web app URL** (ends in `/exec`).
6. Open that URL in a browser: you should see `{"ok":true,"service":"desiretech-email-automation"}`.
7. After editing the code later: **Deploy -> Manage deployments -> Edit -> New version**.

Note: Apps Script cannot read HTTP headers, so the secret is sent inside the HTTPS JSON body, not an `Authorization` header.

## 2. Supabase (administrator)
1. SQL editor -> run `supabase/migrations/20261005000000_email_queue.sql`.
2. Install the Supabase CLI, `supabase login`, `supabase link --project-ref YOUR-REF`.
3. Secrets (never committed; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically):
```
supabase secrets set APPS_SCRIPT_URL="<Web app URL>" APPS_SCRIPT_SECRET="<same value as SHARED_SECRET>" CRON_SECRET="<another long random string>"
# optional: ALLOWED_ORIGIN="https://your-site.netlify.app"   EMAIL_DAILY_CAP=80
```
4. Deploy:
```
supabase functions deploy email-send
supabase functions deploy email-process-queue --no-verify-jwt
```
`email-send` keeps JWT verification on, so use the project's **anon (JWT) key** in the app. `email-process-queue` is protected by `CRON_SECRET` instead.

## 3. Cron (scheduled emails)
Enable extensions **pg_cron** and **pg_net** (Database -> Extensions), store the secret in Vault, then run (replace the placeholders):
```sql
select vault.create_secret('<CRON_SECRET value>', 'email_cron_secret');
select cron.schedule('email-process-queue', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-REF.supabase.co/functions/v1/email-process-queue',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'email_cron_secret')),
    body := '{}'::jsonb) $$);
```
Each run claims due `pending` rows atomically (`FOR UPDATE SKIP LOCKED`): `pending -> processing -> sent|failed`. Overlapping or repeated runs cannot send the same row twice.
Transient "Apps Script unreachable" failures are re-queued with back-off (max 3 attempts). Quota, authorization, timeout and interrupted sends are **not** retried automatically (a timeout may already have been sent). A row stuck in `processing` for 15 minutes is marked `failed` ("interrupted"); check the Gmail Sent folder before sending it again.
To queue a scheduled email: POST to `email-send` with `scheduledAt` (ISO time in the future). Test row: `insert into email_queue (communication_id, recipient, subject, body) values (gen_random_uuid(), 'you@example.com', 'Test', 'Hello');` then run the cron call manually.

## 4. The app (Netlify)
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public values) and redeploy. Settings -> **Email Automation** should read **Configured**. Open Message Generator -> Email -> Send Email.

## Quotas and limits (do not assume unlimited)
- MailApp: about **100 recipients/day** for a consumer Gmail account, about **1,500/day** for Google Workspace (Google may change this). The app caps at `EMAIL_DAILY_CAP` (default 80) in any rolling 24 h; when Google reports a quota error the email is marked `failed` ("quota exceeded") and not retried.
- Apps Script web apps have a ~30 s execution limit per call; the function times out at 25 s.
- Supabase Free: 500 MB database, 500k Edge Function invocations/month; a free project pauses after a week of inactivity (cron then stops until you resume it).
- Plain-text email only; no attachments.

## Security notes
- `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, `CRON_SECRET` and the service-role key exist only as Edge Function secrets / Script Properties.
- The browser only holds the public anon key. `email_queue` has RLS enabled with no policies, so the anon key cannot read it.
- **Known limitation:** the Service OS has no login, so anyone who has the site's anon key can call `email-send`. Mitigations in place: the daily cap and the Apps Script quota. Add Supabase Auth (and require a signed-in user in the function) before exposing the site publicly.
