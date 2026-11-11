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
- **Pylon**: "Design in Pylon" opens Pylon at the customer's address with name, email and phone filled in.
- **Xero**: when a job is Won, create a **draft** invoice (deposit or full) in Xero in one tap. Nothing is sent or approved automatically.
- **Website enquiries become customers automatically** (quote form, EV shop, contact form, chat) with a "call today" reminder.
- Works offline; changes upload when the phone is back in range. CSV export, backup/restore, CSV import.

## Roles
- **Admin**: sends specials, connects Xero, deletes customers, exports / imports / restores, manages the team.
- **Staff**: everything else. Everyone sees every customer (the "looked after by" field is for organising, not hiding).
- The first person to sign in becomes the admin; they promote others in More -> Team.
- Roles control what the app lets people do. They do not hide data from someone technical who is signed in, so only create logins for people you trust with the customer list.

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

### 5. Put it on each phone
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
