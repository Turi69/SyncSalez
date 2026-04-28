# Waitlist backend — setup

The site's waitlist form POSTs to a Google Apps Script web app, which (1) appends a row to a Google Sheet and (2) emails the user a branded confirmation via Gmail.

The frontend is already built and wired to the deployed endpoint. If you've followed the steps below once already, every form submission saves to your sheet and sends an email — no further work needed unless you change the script.

If you ever see `[waitlist] simulated submit (no endpoint configured)` in the browser console, the `data-endpoint` on `index.html` is still the placeholder. Fix that first.

---

## One-time setup (10 minutes)

### 1. Create the sheet

Go to <https://sheets.new>. Name it something like **SyncSalez Waitlist**. You don't need to set up columns — the script creates a `Waitlist` tab with bold headers + a frozen first row on the first submission.

### 2. Open the script editor

In the new sheet: **Extensions → Apps Script**. A new tab opens.

### 3. Paste the script

Delete the default `Code.gs` content. Open `apps-script/Code.gs` from this repo, copy the full contents, and paste them into the editor. **Ctrl+S** to save.

### 4. Deploy as a web app

- **Deploy → New deployment**
- Gear icon next to *Select type* → choose **Web app**
- **Description:** *SyncSalez waitlist*
- **Execute as:** *Me*
- **Who has access:** **Anyone** (the public site needs to POST without auth — the URL is your only key, so don't share it publicly)
- **Deploy** → **Authorize access**. Google will warn it's not verified — click **Advanced → Go to <project name> (unsafe) → Allow**. This is your own personal script; the warning is just because Google hasn't reviewed it.

The script asks for two permissions: read/write to spreadsheets, and send email as you. Both are required.

Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

### 5. Sanity-check it

Paste the Web app URL into a browser tab. You should see:

```json
{"ok":true,"service":"syncsalez-waitlist"}
```

### 6. Wire it into the site

Open `index.html` and find:

```html
<div class="waitlist" id="waitlist" ... data-endpoint="https://script.google.com/macros/s/.../exec">
```

If it's still `REPLACE_WITH_APPS_SCRIPT_URL`, swap in your Web app URL. Bump the JS cache version at the bottom of `<body>` so browsers pick up any related JS changes:

```html
<script src="assets/site.js?v=N"></script>
```

Commit + push. Once GitHub Pages rebuilds (~30–60s), submitting the form will append a row to your sheet **and** send the user a branded HTML confirmation email.

> **If you ever update `Code.gs`**, you must redeploy: **Deploy → Manage deployments → pencil icon → New version → Deploy**. The URL stays the same, so no frontend change is needed.

---

## What the email looks like

- **From:** `SyncSalez <your-gmail-account@gmail.com>` — display name is "SyncSalez", sender is whatever Gmail account the script runs as.
- **Subject:** *You're on the SyncSalez waitlist 🎉*
- **Body:** Personalized HTML email with the user's first name, a "Coming soon" pill, a bullet list of waitlist perks, a button back to the site, and a footer note. Plain-text fallback included for old clients.
- **Reply-to:** `hello@syncsalez.com` (edit `REPLY_TO` at the top of `Code.gs` if you have a different address).

To customize the wording: edit the `plain` array and the `htmlEmail_()` function in `Code.gs`, save, and redeploy as a new version.

---

## Quotas & operational notes

- Free Gmail accounts can send **100 emails/day** through MailApp; Google Workspace gets **1,500/day**. For a launch waitlist that's plenty; if you ever exceed it, swap MailApp for SendGrid/Postmark via `UrlFetchApp`.
- The script saves the row **first**, then attempts the email. If the email send fails (quota, malformed address, Gmail blip), the row is still saved and the response includes `emailSent: false`. Open **Apps Script → Executions** to see the error.
- The "from" address is the Google account that owns the script. If you'd rather emails come from a custom domain (`hello@syncsalez.com`), the cleanest path is to add that domain to your Gmail account as a *Send mail as* alias, then `MailApp.sendEmail({from: 'hello@syncsalez.com', ...})`. Setup is in Gmail → Settings → Accounts → Send mail as.

---

## Troubleshooting

- **Form shows "Something went wrong"** — Check the browser console for the failed request. Most common: deployed URL changed because *New deployment* was used instead of *Manage deployments → New version*. Also check **Apps Script → Executions** for server-side errors.
- **Row appears in the sheet but no email arrives** — Open **Apps Script → Executions** for the failing run. Common: the user's email is malformed, the email landed in spam (search Gmail for "SyncSalez waitlist"), or you've hit the daily quota.
- **Email lands in spam / Promotions** — Asking the user to add your sender to their address book or move it to Inbox once teaches Gmail to deliver future emails to the inbox. For better deliverability long-term, send from a custom domain with SPF + DKIM set up.
- **CORS error in console** — The frontend posts as `text/plain` to skip preflight. If you see a preflight error, somebody changed `Content-Type` in the `fetch` call back to `application/json`. Don't.

---

## Going back to WhatsApp later

The previous WhatsApp Cloud API version of this script is in git history (commit `88748a5`). If you ever want to add WhatsApp send back alongside email — or replace email with it — `git show 88748a5:apps-script/Code.gs` recovers the old send function. The frontend doesn't need to change either way; the same form payload supports both.
