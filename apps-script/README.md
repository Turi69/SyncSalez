# Waitlist backend — setup

The site's waitlist form POSTs to a Google Apps Script web app, which (1) appends a row to a Google Sheet and (2) sends a WhatsApp confirmation via Meta's WhatsApp Cloud API. This file walks through getting both wired up.

The frontend is already built. Until the steps below are completed, the form will simulate a successful submission locally so the UI is testable, but **no data will be saved and no WhatsApp message will be sent**. Look for `[waitlist] simulated submit (no endpoint configured)` in the browser console — that's the giveaway.

---

## Part 1 — Sheet + Apps Script (10 minutes)

### 1. Create the sheet
1. Go to <https://sheets.new>. Name it something like **SyncSalez Waitlist**.
2. You don't need to set up the columns by hand — the script creates the `Waitlist` tab and headers on the first submission.

### 2. Open the script editor
- In the new sheet, click **Extensions → Apps Script**. A new tab opens.

### 3. Paste the script
- In the Apps Script tab, **delete** anything inside `Code.gs`.
- Open `apps-script/Code.gs` from this repo, **copy its full contents**, and paste them into `Code.gs` in the editor.
- Click **Save** (the disk icon, or `Ctrl+S`).

### 4. Deploy as a web app
- Click **Deploy → New deployment**.
- Click the gear icon next to "Select type" → choose **Web app**.
- Fill in:
  - **Description:** `SyncSalez waitlist`
  - **Execute as:** *Me*
  - **Who has access:** **Anyone** (this is required so the public form can POST without authentication; the URL itself is the only thing acting as a key)
- Click **Deploy**. Authorize the script when prompted (Google will warn that it isn't verified — click **Advanced → Go to <project name> (unsafe) → Allow**; this is a private script you wrote, the warning is standard for unverified personal scripts).
- Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfycb.../exec`.

### 5. Sanity-check it
- Paste the Web app URL into a browser tab. You should see:
  ```json
  {"ok":true,"service":"syncsalez-waitlist"}
  ```

### 6. Wire it into the site
- Open `index.html`. Find the line:
  ```html
  <div class="waitlist" id="waitlist" ... data-endpoint="REPLACE_WITH_APPS_SCRIPT_URL">
  ```
- Replace `REPLACE_WITH_APPS_SCRIPT_URL` with your Web app URL.
- Bump the cache version on the JS load line at the bottom of `<body>` so browsers pick up the change:
  ```html
  <script src="assets/site.js?v=5"></script>
  ```
- Commit + push. Once GitHub Pages rebuilds (~30–60s), submitting the form will append a row to your sheet.

> **If you ever update `Code.gs`**, you must redeploy: **Deploy → Manage deployments → pencil icon → New version → Deploy**. The URL stays the same.

---

## Part 2 — WhatsApp confirmation message (30–60 minutes the first time)

There are two parts: get credentials from Meta, and create an approved message template. The script reads four values from Apps Script's *Script Properties*.

### A. Get WhatsApp Cloud API credentials

1. Go to <https://developers.facebook.com/> and create (or open) an app of type **Business**.
2. In the app dashboard, add the **WhatsApp** product.
3. Under **WhatsApp → API Setup**, you'll see:
   - A **Phone number ID** (copy it — this goes into `WA_PHONE_NUMBER_ID`).
   - A **temporary access token** (good for 24h — fine for testing).
4. For production you want a **permanent token**. Easiest way: create a System User in [Business Settings](https://business.facebook.com/settings/) and generate a token with `whatsapp_business_messaging` + `whatsapp_business_management` permissions. Copy that token — it goes into `WA_TOKEN`.

### B. Create the message template

WhatsApp does not allow you to message users out of the blue with arbitrary text — you must use a **pre-approved template** for the first message.

1. In **WhatsApp Manager → Message templates**, click **Create template**.
2. Name it `waitlist_confirmation` (must match `WA_TEMPLATE_NAME` in script properties — defaults to that).
3. Category: **Marketing** or **Utility** (Utility approves faster).
4. Language: pick the one matching `WA_TEMPLATE_LANG` (defaults to `en`).
5. Body text — example:

   ```
   Hi {{1}}, you're on the SyncSalez waitlist! 🎉

   We'll notify you the moment we go live, and as a founding member you get special early access. Reply STOP to opt out.
   ```

   The `{{1}}` placeholder is the user's first name; the script fills it in.
6. Submit for review. Approval is usually a few minutes to a few hours.

### C. Set the four script properties

In Apps Script: **Project Settings (gear icon) → Script properties → Add script property**, add four rows:

| Key                  | Value                                                  |
|----------------------|--------------------------------------------------------|
| `WA_TOKEN`           | Your access token from step A.4                        |
| `WA_PHONE_NUMBER_ID` | Your phone number ID from step A.3                     |
| `WA_TEMPLATE_NAME`   | `waitlist_confirmation` (or whatever you named it)     |
| `WA_TEMPLATE_LANG`   | `en` (or your template's language)                     |

Save. The script picks them up on the next request — no redeploy needed.

### D. Test
- Submit the form on the live site with **your own** WhatsApp number.
- A row should appear in the sheet; the confirmation message should land on your phone within seconds.
- If the row lands but no message arrives, open Apps Script → **Executions** to see the WhatsApp API error (almost always: template not approved yet, phone not in test list during sandbox phase, or wrong language code).

---

## Fallbacks / alternatives

- **No WhatsApp credentials yet?** Leave `WA_TOKEN` unset. The script silently skips the send (signups still save to the sheet). You can then manually message the row each day, or batch-message via WhatsApp Business app.
- **Want email confirmation instead?** Add a `MailApp.sendEmail(...)` call inside `sendWhatsApp_` — Apps Script lets you send up to 100 emails/day for free with no setup.
- **Twilio instead of Meta Cloud API?** Replace the `UrlFetchApp.fetch` block with a call to Twilio's `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` endpoint, basic-auth'd with your Twilio SID + auth token. Twilio's WhatsApp template requirements are the same.

---

## Troubleshooting

- **Form shows "Something went wrong"** — Check the browser console for the failed request. Common: the deployed URL changed because you used "New deployment" instead of "Manage deployments → New version" (the URL changes on the former; you'd need to update `data-endpoint` again). Also check Apps Script → Executions for server-side errors.
- **Sheet row says "Submitted at" but is timestamped wrong** — Apps Script timestamps are in the script's timezone. Set it under **Project Settings → Timezone**.
- **CORS error in console** — The frontend posts as `text/plain` to avoid CORS preflight, and Apps Script accepts it. If you see a preflight error, somebody changed `Content-Type` in the `fetch` call back to `application/json`. Don't.
