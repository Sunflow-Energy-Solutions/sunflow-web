# Sunflow CRM

Staff-only customer app for Sunflow. Works in any browser and installs on a phone like an app (no app store needed).
It is separate from the public website: it lives in this `crm/` folder and is deployed as its own site.

## What it does
- **Today**: overdue and due follow-ups, upcoming installs, new leads, upgrade opportunities. "Show only mine" filter.
- **Calendar**: Month, Week and Upcoming views of installs (multi-day installs shown as 1/2, 2/2), site visits and follow-ups.
  Tap a day to see it, Add to schedule a visit or call with a time, filter by type or "only mine". Two installs on one day get a warning
  (also shown when you set an install date). "Add to my phone calendar (.ics)" exports a snapshot for Apple / Google / Outlook calendar.
  Each customer page has a "Coming up" list of their future installs and follow-ups.
- **Customers**: fast add (name + phone is enough), search by name / phone / suburb / brand, "My customers" filter,
  one-tap Call, Text, Email, Map. Each customer is **looked after by** one staff member.
- **Systems & quotes**: solar kW, panel / battery / inverter brand, EV charger, price, every quote sent, install date.
- **Site details & install record** (per job, under Edit): roof type, phase, network, NMI, retailer, existing system, switchboard notes;
  then serial numbers, certificate (CES) number, electrician, warranty - the details needed for warranty claims and compliance.
- **Photos & documents**: take a photo or attach a PDF on the customer, the job, or a checklist step; stored privately, shrunk on the phone before upload.
- **Paperwork checklist** (per job, starts when the job is Won): 31 Victorian steps from signed quote to handover pack, adapting to
  solar / battery / EV. Everyone sees the same ticks, with who did them and when. Add any standard step to a job from a dropdown, remove
  steps that do not apply, or write your own. Each step has a paperclip for its photos / documents (e.g. the certificate on "CES lodged"),
  so everything for a job is stored against the job. Marking a job Installed warns if required steps are missing. Print a job sheet if needed.
  It is a **starter list** - have your licensed electrician confirm it. Edit the default list in `src/checklist.ts`.
- **Job progress** (Pipeline -> Job progress): every won / installed job with a progress bar, the required steps still outstanding,
  install date, file count, and whether the thank-you has gone out. "Only mine" filter.
- **Thank you & review request**: when a job is marked Installed (or any time from the job), send the customer a thank-you **email** from the
  CRM (with Google / Facebook review buttons) and a **text** that opens ready-to-send in the staff member's Messages app. Sending ticks the
  checklist's review step, finishes the reminder and records who sent it. Admins set review links and wording in More -> Thank-you & reviews.
- **Pipeline**: New lead -> Contacted -> Site visit -> Quote sent -> Negotiating -> Won -> Installed (or Lost, with a reason).
- **Automatic follow-ups** (numbers in `src/automation.ts`): new lead: call today - quote sent: call after 3 and 10 days -
  lost: call after 30 days, email after 6 months - installed: check-in after 2 weeks, check-up after 12 months.
- **Upgrade finder**: installed customers with solar but no battery, no EV charger, a small system, or a system 5+ years old.
- **Email specials** (admins): pick a group, write or pick a template, send a test, then send. Only customers ticked
  "OK to email specials" receive it, and every email carries an unsubscribe link.
- **Pylon**: "Design in Pylon" opens Pylon at the customer's address with name, email and phone filled in. When the customer **e-signs a
  proposal in Pylon**, the job in the CRM is filled from that signed design (system size, panel / inverter / battery, price, quote marked
  accepted), moved to Won, its reminders and checklist set up, and the Pylon link saved. Designs that are only sent never reach the CRM, so
  you can send as many options as you like. Needs Pylon API access (see "Pylon -> CRM" below).
- **Lead sources**: every enquiry records where it came from (Facebook / Instagram ad, Google ad, Google search, referral, phone call...) and the ad campaign
  when known. The website remembers the ad link a visitor arrived through for 30 days and sends it with the form they submit. More -> Lead sources shows
  enquiries, quotes, jobs won, win rate and won value per source and per campaign. To get campaign names, put UTM tags on ad links, e.g.
  `https://www.sunflowenergysolutions.com.au/battery?utm_source=facebook&utm_medium=paid_social&utm_campaign=spring-battery`.
- **Xero**: when a job is Won, create a **draft** invoice (deposit or full) in Xero in one tap. Nothing is sent or approved automatically.
- **Enquiries become customers automatically**, from the website forms and chat, Facebook / Instagram lead ads, Google lead forms or any
  other source (see "Online ads -> CRM"), each with a "call today" reminder and the campaign recorded.
- Works offline; changes upload when the phone is back in range. CSV export, backup/restore, CSV import.

## Roles
- **Admin**: everything - sends specials, connects Xero, imports from Pylon, assigns leads, deletes customers, exports / imports / restores, manages the team.
- **Staff**: sees every customer and works on them, but can't change the team, send specials or connect other systems.
- **Limited**: sees **only the customers assigned to them** - with those customers' jobs, follow-ups, notes, photos, documents and calendar entries.
  This is enforced by the database itself (row-level security), not just hidden in the app: another customer's data is never sent to a limited
  person's phone, and the server refuses attempts to read, change or reassign it. Limited people can't see specials history, settings or reports on
  other people's customers, can't create Xero invoices, and can only email their own customers.
- The first person to sign in becomes the admin. **Everyone after that starts as Limited** until an admin changes them in More -> Team.

### New leads and assigning them
Leads from the website, ads, Pylon and (if left blank) phone calls arrive **unassigned**: only admins and Staff see them. They appear at the top of
**Today** under "New leads to assign" - pick who gets each one, and it moves to that person along with its follow-up and history (they see it within
about 30 seconds). Customers -> **Unassigned** filters the same list. A repeat enquiry from a customer who is already assigned goes straight to their
owner. Reassigning a customer takes it away from the previous owner's phone the next time that phone syncs.

### Adding a limited person
1. Run the latest `supabase/schema.sql` in Supabase (SQL Editor) **first** - it adds the rules that make "limited" real.
2. Supabase -> Authentication -> Users -> Add user (email + password).
3. In the CRM: More -> Team -> add them with the same email and the role **Limited** (or let them sign in once; they appear as Limited).
4. Give them leads from Today -> "New leads to assign", or let them add their own customers (those are theirs automatically).

Test it once: sign in as them on another device and confirm they see only their customers.

## Try it now (no setup)
```bash
cd crm
npm install      # first time only
npm run dev      # http://localhost:5174
```
Without the settings below it stores data **on that device only** (photos, roles, Xero and email sending are switched off).
Use More -> "Try it with sample customers" to look around. Do not enter real customers until the shared database is connected.

## Go live: shared data for the whole team (about 30 minutes, free tiers)

### 1. Database - Supabase
1. Create a free project at supabase.com (choose the Sydney region).
2. SQL Editor -> paste all of `supabase/schema.sql` -> Run. (Run it again whenever this file changes - it is safe to repeat.
   The thank-you settings need the latest version.)
3. Authentication -> Sign In / Providers -> turn **off** "Allow new users to sign up".
4. Authentication -> Users -> **Add user** for each staff member (email + password).
5. Project Settings -> API: copy the **Project URL**, the **anon public** key and the **service_role** key.

### 2. Hosting - Vercel (a second project, separate from the website)
1. Vercel -> Add New Project -> the same GitHub repo, **Root Directory = `crm`**.
2. Environment variables (see `.env.example`):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_URL` | Project URL (again) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key - **secret, never share** |
| `RESEND_API_KEY` | same Resend key the website uses |
| `MAIL_FROM` | `Sunflow Energy Solutions <specials@sunflowenergysolutions.com.au>` |
| `MAIL_REPLY_TO` | `info@sunflowenergysolutions.com.au` |
| `UNSUBSCRIBE_SECRET` | any long random text (also signs the Xero connection) |
| `APP_URL` | the CRM's address, e.g. `https://crm.sunflowenergysolutions.com.au` |

3. Deploy. Optionally add the domain `crm.sunflowenergysolutions.com.au` under Project -> Domains.
4. Sign in, open More: the first person in becomes admin. Add the rest of the team there.

### 3. Website enquiries -> CRM
In the **website's** Vercel project add `CRM_SUPABASE_URL` (the same Project URL) and `CRM_SUPABASE_SERVICE_ROLE_KEY`
(the same service_role key), then redeploy. New quote requests, EV orders, contact messages and chat enquiries then appear in the CRM
as a New lead with a call-today task. Repeat enquiries with the same email attach to the existing customer. Leave the variables
out and the website behaves exactly as before. The quote and EV forms have an unticked "email me offers" box that sets email consent.

### 4. Xero (optional)
1. developer.xero.com -> My Apps -> **New app** (Web app). Redirect URI: `https://<your CRM address>/api/xero-callback`.
2. Copy the Client ID and create a Client secret. Add to the CRM's Vercel project: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`.
3. Optional: `XERO_SALES_ACCOUNT_CODE` (your sales account code in Xero; default `200`), `XERO_TAX_TYPE` (default `OUTPUT` = GST on income),
   `XERO_SCOPES` (default is the granular scopes required for apps created after 2 March 2026; older apps may need `accounting.transactions`).
4. Redeploy, then More -> Xero -> **Connect Xero** and approve. When you mark a job Won you'll be offered a draft invoice.
5. Check Xero's current developer pricing tier for a single connected business before relying on it.
6. **First time:** create one test invoice and have your bookkeeper confirm the account code, GST treatment and how rebates/STCs should appear.

### 5. Online ads -> CRM (optional)
The CRM accepts leads from any tool that can send a web request, so Facebook / Instagram lead ads, Google lead forms and landing pages all
land as a New lead with a call-today reminder. Repeat enquiries with the same email attach to the existing customer.
1. In the CRM's Vercel project add `LEAD_WEBHOOK_SECRET` (any long random text, mark it Secret) and redeploy.
2. **Facebook / Instagram lead ads** (simplest route): in Make.com or Zapier, trigger "New lead in Facebook Lead Ads", then an HTTP / Webhooks
   action: `POST https://<CRM address>/api/lead`, header `x-api-key: <your secret>`, body type JSON, and map the lead form fields
   (full name, email, phone, suburb / postcode, what they are interested in, campaign / form name). Field names are matched loosely
   (`full_name`, `phone_number`, `city`, `zip_code`, `campaign_name`...). Set `source` to "Facebook lead ad".
3. Add `"marketing_consent": "yes"` only if the lead form has a clear opt-in to marketing emails; otherwise leave it out.
4. Test with a real test lead from Facebook's Lead Ads Testing Tool: it should appear in the CRM within a minute.
(A direct Meta integration without Make / Zapier is possible later but needs a Meta developer app and app review.)

### 6. Pylon -> CRM (optional; needs Pylon API access)
1. In Pylon: **Settings -> API** (app.getpylon.com/settings/api). If the page is missing or locked, ask Pylon support to enable API access.
2. Create an API token that can read projects and designs, and add it to the CRM's Vercel project as `PYLON_API_TOKEN` (Secret).
3. Create a **Webhook destination** with URL `https://<CRM address>/api/pylon-webhook` and the events `web_proposals.signed`
   (customer e-signed a proposal) and, if you take deposits through Pylon, `gateway_payments.created`.
4. Pylon shows a secret for the destination: add it as `PYLON_WEBHOOK_SECRET` (Secret) and redeploy the CRM.
5. How it fits together: staff click **Design in Pylon** on a job (the job's id travels to Pylon as the project's reference number), build and
   send as many designs as needed, and only when the customer **signs** does the CRM update that job from the signed design.
   If the reference is missing the CRM falls back to matching the customer's email, and if nobody matches it creates the customer.
6. **Jobs signed before this was connected**: More -> Pylon: import signed jobs. Pick a period, Find signed jobs, tick the ones to bring in, Import.
   Each shows whether it will update an existing job, add to an existing customer or create a new one; nothing is imported until you choose it, and a
   project is never imported twice.
7. Pylon's delivery log (in the same API settings) shows whether each event reached the CRM; failures are retried for about 31 hours.
Prices come across exactly as Pylon states them on the proposal; check GST treatment against your first real signed job.

### 8. Put it on each phone
Open the CRM address, sign in, then iPhone: Safari -> Share -> **Add to Home Screen**. Android: Chrome -> menu -> **Install app**.

## Privacy and the Spam Act
- Marketing emails only go to people who agreed, and every email has a working unsubscribe, honoured across all devices.
- Customer data is readable only by signed-in staff (Supabase row-level security); photos and documents sit in a private bucket and
  are only reachable through short-lived signed links. Keep public sign-ups turned off.
- The Xero connection tokens are stored where signed-in users cannot read them; only the server can.
- "Delete this customer" (admin) also removes their photos and documents.

## Code map
- `src/automation.ts` - follow-up rules and upgrade logic; `src/checklist.ts` - paperwork checklist template and print sheet
- `src/store.tsx`, `src/cloud.ts` - data, roles, offline queue, sync and file storage (Supabase)
- `src/screens/*`, `src/components/*` - screens, forms, files, checklist
- `api/send-special.ts`, `api/unsubscribe.ts` - email sending and unsubscribe; `api/xero.ts`, `api/xero-callback.ts`, `api/_xero.ts` - Xero
- `../src/lib/crm.ts` - the website-side function that creates CRM customers from enquiries
- `npm run icons` - rebuild app icons from the Sunflow logo
- `npm run brands` - rebuild the panel / battery / inverter / EV charger brand suggestions from `output/pylon-components/Sunflow_Supplier_Catalogue.xlsx`
  (brand names only, no prices; writes `src/catalogue.generated.ts`). Run it after the catalogue changes, then commit.
