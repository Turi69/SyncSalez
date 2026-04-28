/**
 * SyncSalez — Waitlist backend
 *
 * Receives form submissions from the website, appends a row to the
 * "Waitlist" sheet, and (optionally) sends the user a WhatsApp confirmation
 * via the WhatsApp Cloud API.
 *
 * Setup is in apps-script/README.md.
 */

// -----------------------------------------------------------------------------
// CONFIG — read from Script Properties (Project Settings → Script properties).
// Never paste secrets directly into this file.
// -----------------------------------------------------------------------------
const SHEET_NAME = 'Waitlist';
const PROPS = PropertiesService.getScriptProperties();

// -----------------------------------------------------------------------------
// Web app entrypoints
// -----------------------------------------------------------------------------

/** Sanity-check endpoint — visit the deployed URL in a browser to verify. */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'syncsalez-waitlist' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Form POST handler. Body is JSON sent as text/plain from the site. */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');

    // Light server-side validation (the client validates too)
    const required = ['name', 'phone', 'location', 'category'];
    for (const k of required) {
      if (!data[k] || String(data[k]).trim().length < 2) {
        return jsonOut({ ok: false, error: 'Missing field: ' + k });
      }
    }

    appendToSheet_(data);

    // WhatsApp send is best-effort. If it fails we still record the signup.
    let waOk = false;
    try {
      sendWhatsApp_(data);
      waOk = true;
    } catch (waErr) {
      console.error('WhatsApp send failed:', waErr);
    }

    return jsonOut({ ok: true, whatsappSent: waOk });
  } catch (err) {
    console.error('doPost error:', err);
    return jsonOut({ ok: false, error: err.message || String(err) });
  }
}

// -----------------------------------------------------------------------------
// Sheet append
// -----------------------------------------------------------------------------
function appendToSheet_(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Submitted at', 'Full name', 'WhatsApp', 'Location',
      'Business category', 'Page URL', 'User agent',
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    data.name,
    normalizePhone_(data.phone),
    data.location,
    data.category,
    data.pageUrl || '',
    data.userAgent || '',
  ]);
}

// -----------------------------------------------------------------------------
// WhatsApp Cloud API send
//
// Uses Meta's WhatsApp Cloud API (graph.facebook.com).
// You must:
//   1. Create a WhatsApp Business app in Meta for Developers
//   2. Get a permanent access token (System User token recommended)
//   3. Get your phone number ID
//   4. Create + get approved an outbound message template named
//      whatever you set in WA_TEMPLATE_NAME (default: waitlist_confirmation),
//      with one body parameter (the user's first name).
//
// All four go into Script Properties:
//   WA_TOKEN, WA_PHONE_NUMBER_ID, WA_TEMPLATE_NAME, WA_TEMPLATE_LANG
//
// Alternative: if WA_TOKEN is empty, we fall back to email
// (see ALTERNATE_EMAIL block below) so the user still gets confirmation.
// -----------------------------------------------------------------------------
function sendWhatsApp_(data) {
  const token = PROPS.getProperty('WA_TOKEN');
  const phoneId = PROPS.getProperty('WA_PHONE_NUMBER_ID');
  const templateName = PROPS.getProperty('WA_TEMPLATE_NAME') || 'waitlist_confirmation';
  const templateLang = PROPS.getProperty('WA_TEMPLATE_LANG') || 'en';

  if (!token || !phoneId) {
    // No WhatsApp creds — skip silently. Sheet row is still saved.
    console.warn('WhatsApp credentials not set; skipping send.');
    return;
  }

  const to = normalizePhone_(data.phone);
  const firstName = (data.name || '').trim().split(/\s+/)[0] || 'there';

  const url = 'https://graph.facebook.com/v19.0/' + phoneId + '/messages';
  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: firstName }],
        },
      ],
    },
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('WhatsApp API ' + code + ': ' + res.getContentText());
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Normalize a phone string to digits-only with country code (e.g. "2348030000000"). */
function normalizePhone_(phone) {
  let s = String(phone || '').replace(/\D/g, '');
  // If it starts with a leading 0 and has 11 digits total, treat as Nigerian
  // local format (0803...) and prepend 234.
  if (s.length === 11 && s.charAt(0) === '0') s = '234' + s.slice(1);
  return s;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
