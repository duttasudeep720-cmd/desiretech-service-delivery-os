# DESIRETECH Service Delivery OS — MVP #1 + MVP #2 (Client Onboarding) + MVP #3A (Communication Templates) + MVP #3B (Message Generator) + MVP #3C (Proposal Library) + MVP #3D (Lead → Client) + MVP #3E (Email)
Desire – Launch – Sell – Grow – Scale

Monthly service delivery for marketplace clients: client → marketplace + service → monthly cycle → auto-created tasks → notes/results/issues → client messages → monthly report → next month.

## Run locally
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # test the production build
```
Requires Node 18+.

## Deploy to Netlify
1. Push this folder to GitHub (or drag-drop the `dist/` folder after `npm run build` into Netlify Drop).
2. Netlify → Add new site → Import from Git. Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`, which also adds the SPA redirect).
3. Deploy. The app itself needs no environment variables; **Gmail sending (MVP 3E) is optional** and needs the variables in `EMAIL_SETUP.md`.

## Folder structure
```
index.html  package.json  vite.config.js  netlify.toml
src/
  main.jsx  App.jsx  style.css  ui.jsx  modals.jsx
  logic.js            pure rules: progress, status, alerts, messages, report text, cycle planning
  data/
    store.js          persistence layer (localStorage) + useStore/db/mutate  ← replace with Supabase later
    actions.js        domain actions (save client, start cycle, next month, report, reset)
    seed.js           templates + demo data   util.js  date helpers
  pages/  Dashboard Clients(+ClientDetail) Tasks Issues Communication Reports Templates Settings
```
Data model (arrays in one state object): clients, marketplaces, services, clientServices, serviceTemplates, templateTasks, cycles (monthly_service_cycles), tasks, issues, communications, reports.

## Notes
- Data lives in this browser's localStorage. Use Settings → Export backup regularly; data is per browser/device. No authentication, no external APIs, nothing is sent automatically.
- Demo data: 3 clients marked "(Demo)". Remove with Settings → Clear demo data (real clients are kept).
- Editing a template affects future monthly services only, not existing tasks.
- Report PDF: Print / Save as PDF from the browser (print stylesheet included).
- Client status/month status is calculated automatically; overdue, blocked, waiting-for-client, missing-work and report-pending alerts show on the Dashboard.


---
# MVP 2 — Client Onboarding & Service Setup
`New Client → marketplaces → services → onboarding plan → request info → verify → Ready to Start → Start Service → first monthly cycle (MVP 1)`

## What was added
- **+ New Client** (Dashboard, Clients, Onboarding): 4-step wizard — client info, marketplaces (+ seller/store/ID/URL/status, no passwords), services (read live from your templates), plan preview. Closing early leaves a *New Lead* with a **Continue setup** button.
- **Onboarding** screen: status cards, clients requiring attention, alerts, full list. **Onboarding detail** page per marketplace + service: progress (requirements / internal setup / overall), checklist, *Waiting for client*, requirement tracker (Not Requested → Requested → Received → Verified / Rejected / Not Required), internal + client-dependent tasks, messages, history.
- **Ready to Start gate**: blocks with a list of what is missing; **Force Ready to Start** needs a written reason (kept in history). **Start Service** reuses MVP 1's `startCycle/planCycle`, marks the service Active, creates the current month's cycle + tasks and opens the client page.
- **Onboarding Templates** (add / edit / delete / reorder tasks and client requirements; marketplace-specific, or "Any marketplace"). Defaults for Amazon, Myntra, Flipkart, Meesho, Blinkit + generic Advertising / Listing / Growth.
- **Communication**: 7 new message types (Welcome, Onboarding Started, Information Request, Missing Information, Reminder, Onboarding Progress, Ready to Start). Generated, editable, copyable, saveable — never sent.
- **Dashboard**: Onboarding overview + one combined *Attention required* list (onboarding, client info, blocked, overdue, reports, issues).
- Passwords/OTPs: never requested or stored; notes containing `password: …` / `OTP is …` are rejected.

## Data (same localStorage key — MVP 1 data is migrated, nothing is deleted)
New collections: `clientAccounts`, `onboardingRecords`, `onboardingTasks`, `onboardingRequirements`, `onboardingTemplates`, `onboardingTemplateItems`, `onboardingEvents`. Reused as-is: `clients, marketplaces, services, clientServices, serviceTemplates, templateTasks, cycles, tasks, issues, communications, reports`.
One onboarding record exists per **client service** (marketplace + service), so each service has its own plan and monthly cycle.

## New files
```
src/onboarding/
  logic.js  actions.js  demo.js     pure rules, domain actions, demo data
  defaults.js                      seed onboarding templates (editable in the UI)
  messages.js                      onboarding message generator
  NewClientWizard.jsx  OnboardingPage.jsx  OnboardingDetail.jsx  OnboardingTemplates.jsx  onbModals.jsx
```
Small MVP 1 edits: `planCycle` takes an optional start day (first cycle's due dates run from the start day, not day 1); `store.js` migration; `seed.js` adds monthly templates for Amazon/Flipkart Advertising, Meesho and Blinkit; client deletion / *Clear demo data* also remove onboarding data.

## Demo data
ABC Fashion (Myntra, Waiting for Client), SehatSutra (Amazon, Ready to Start — try Start Service), XYZ Brand (Amazon + Flipkart, Account Management + Advertising, Onboarding). Already have MVP 1 data in your browser? Use **Settings → Add demo onboarding clients** or the button on the Onboarding screen.

## MVP 3A: Communication Template Library
Communication → **Templates** (`#/communication/templates`): create, edit, delete, duplicate, favorite, activate/deactivate, search and filter reusable client messages (category, marketplace, service, channel, status, favorites).
- Stored in the same localStorage state as everything else, under `communicationTemplates` (so Export/Import backup includes it). 15 starter templates are added once by `migrate()` (flag `meta.mvp3a`); deleted starters are not re-created.
- Marketplace options come from Settings; Service options come from services that have a Service Template.
- Variables such as `{{client_name}}` are plain text for now (click a variable in the editor to insert it). No sending, AI or external APIs.
- Code: `src/communication/` (TemplatesTab, TemplateModal, templateActions, templateOptions, templateDefaults).

## MVP 3B: Message Generator & Personalization
Communication → **Message Generator** (`#/communication/generator`): pick a template and a client (optionally marketplace, service, task, issue, report period), the `{{variables}}` are replaced automatically, edit the result, then Copy Message / Copy Subject + Message / Save to History.
- All replacement lives in `src/communication/variables.js` (`replaceVariables`, `buildContext`). A variable with no value is left unchanged (never "undefined") and listed under "variables need attention".
- Saved messages go into the existing `communications` history (new optional fields: subject, template, category, channel, marketplace, service, createdBy, relatedTaskId, relatedIssueId, relatedReportId). Old messages keep working. History now shows a preview with a View button.
- Quick generate: "Message from Template" on the client page, task window and issue window.
- No AI, no sending, no new storage key or libraries.

## MVP 3C: Proposal Library
Communication → **Proposals** (`#/communication/proposals`): reusable master proposals - create, edit, delete, duplicate ("Copy of …", Draft), favorite, change status (Draft / Active / Archived), search, filter, preview and copy the full proposal text.
- Stored in the same localStorage state under `proposals` (included in Export/Import backup). 5 starter proposals are added once by `migrate()` (flag `meta.mvp3c`); deleted starters are not re-created.
- Category/marketplace options come from Settings; service options come from the existing services list (plus Any / Other).
- Archived proposals are hidden by default; Active ones are listed first.
- Variables such as `{{company_name}}` and `{{pricing}}` are stored as plain text and are not replaced. "Create Message" opens the MVP 3B generator (pre-selecting the "Proposal Sent Follow-up" template if present).
- Proposals are not linked to clients. No PDF, AI, sending or external APIs.
- Code: `src/proposals/`.

## MVP 3D: Lead → Proposal → Client Conversion
**Leads** (`#/leads`, new sidebar item): a small manual sales pipeline. `New → Contacted → Interested → Proposal Sent → Discussion → Won → Client` (+ `Lost`). No CRM, scraping, sending or external APIs.
- **Lead list**: pipeline strip (click a stage to filter), search (company, contact, email, phone, marketplace, service, source), filters (status, marketplace, service, source) + Clear filters. Each lead has View, Edit, Change status (dropdown), Generate Message, Assign/Change Proposal, View/Copy Proposal, Mark Proposal Sent, Convert to Client, Delete.
- **Lead details**: contact, sales info, assigned proposal, internal notes and a simple timestamped timeline (created, proposal assigned, proposal marked sent, status changes, messages saved, converted).
- **Marketplace** (multi-select) comes from Settings; **service** comes from the existing services list; **source** has the common options plus a custom entry. Stored by name, like proposals.
- **Assign Proposal** picks from the existing Proposal Library (filter by marketplace, service, client type; archived hidden). The lead stores only `proposalId` (+ `proposalName` for display) - never a copy. View/Copy reuse the MVP 3C modal and copy action. **Mark Proposal Sent** only sets the status to Proposal Sent and records the time.
- **Generate Message** opens the existing MVP 3B generator with the lead's contact, company, marketplace and service filled in (and a status-appropriate starter template when one exists). Saved messages go to the existing Communication History with an optional `leadId`/`leadName` (shown as "<name> (lead)"). Proposal context is shown in the generator but there is no `{{proposal}}` variable.
- **Convert to Client** (Won only): confirmation, then the existing **New Client wizard** opens pre-filled from the lead (company, contact, email, phone, website, business type, notes, marketplaces, and the service where a template exists). The lead is linked (`convertedClientId`, status Won) the moment the client record is saved in step 1, so abandoning the wizard can never produce a second client; the lead then shows **Client Created / View Client** (and **Complete onboarding** if no plan exists yet). A Won lead without a client shows **Won — Client conversion pending**. If the linked client is later deleted, the lead becomes convertible again.
- **Dashboard**: Lead overview (New Leads, Interested, Proposals Sent, Won, Conversion Pending) - each number opens the filtered list.
- **Data**: new `leads` collection in the same localStorage state (Export/Import backup includes it). `migrate()` adds it (flag `meta.mvp3d`); 4 demo leads are added once, only when demo clients exist. Settings → Clear demo data removes demo leads too.
- Code: `src/leads/` (leadDefaults, leadActions, leadConvert, leadUi, LeadsPage, LeadButtons, LeadModal, LeadDetailModal, AssignProposalModal, ConvertLeadModal). Small edits elsewhere: `App.jsx`, `data/store.js`, `data/seed.js`, `data/actions.js`, `onboarding/NewClientWizard.jsx`, `communication/MessageGenerator2.jsx`, `communication/variables.js`, `communication/ViewMessageModal.jsx`, `pages/Communication.jsx`, `pages/Dashboard.jsx`, `style.css`.


---
# MVP 3E — Email Integration (Gmail / Google Workspace)
`Lead / Client → Generate Message (3B) → Email → review/edit → confirm → Send via Gmail → saved to Communication History`

## What was added
- **Email** button in the Message Generator (next to Copy Message / Save to History). Opens a composer pre-filled from the generated message: *To* = client email (or lead email), *Subject* = personalised template subject, *Message* = the personalised/edited message. Everything is editable; the edited version is what is sent. Confirmation step ("Send this email?") before anything leaves.
- **Settings → Email account**: Not connected / Connected (account shown) with **Connect Gmail** / **Disconnect Gmail**. If Gmail is not configured the app runs normally and says so.
- **Real sending** through the Gmail API from Netlify Functions. "Email sent successfully." appears only after Gmail confirms; failures show a safe message and nothing is recorded.
- **Communication History** (existing collection): successful sends are stored with `channel: Email`, `direction: Outbound`, `recipient`, `subject`, `message`, client/lead, marketplace, service, template, `sentAt`, `status: Sent`. A message saved earlier with *Save to History* is upgraded to Sent (not duplicated) if it was not edited since. Lead timelines log "Email sent to …"; after emailing a lead with an assigned proposal you can click **Mark Proposal Sent**.
- Plain-text only. **No** attachments, inbox/reading, multiple mailboxes, bulk/scheduled sending or other providers.

## New / changed files
```
netlify/functions/   auth-google.js  auth-google-callback.js  email-status.js  email-send.js  email-disconnect.js
netlify/lib/         google.js (OAuth, sealed cookie, Gmail calls)   mime.js (validation + MIME)
netlify/tests/       email.test.mjs        -> npm test
src/email/           emailApi.js  EmailComposer.jsx  EmailSettings.jsx  emailHistory.js
netlify.toml (/api/* routes + functions dir)   .env.example   .gitignore (.env)   EMAIL_SETUP.md
small edits: communication/MessageGenerator2.jsx, pages/Settings.jsx, pages/Communication.jsx, communication/ViewMessageModal.jsx, ui.jsx (Esc closes only the top modal), style.css
```
Endpoints: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/email/status`, `POST /api/email/send`, `POST /api/email/disconnect`.
No migration needed (new fields only appear on new records). Tokens are never in localStorage, saved data, or backups. Setup: see **EMAIL_SETUP.md**.

## MVP 3F — WhatsApp click-to-chat
Message Generator → **Send via WhatsApp** → review phone/message → **Open WhatsApp** (official `wa.me` link, new tab). Saved to Communication History as channel WhatsApp, status **WhatsApp Opened** (not "Sent"; you send the message manually). No credentials, API or backend. Code: `src/whatsapp/`.

## MVP 3G — Email Automation (replaces Gmail OAuth)
Email Composer → Supabase Edge Function `email-send` → Google Apps Script (`MailApp`) → recipient; Supabase Cron runs `email-process-queue` for scheduled rows. Setup: `docs/EMAIL_APPS_SCRIPT_SETUP.md`. Code: `supabase/`, `apps-script/Code.gs`. `npm test` runs the adapter + Apps Script tests.
