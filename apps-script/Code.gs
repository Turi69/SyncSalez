/**
 * SyncSalez — Waitlist backend
 *
 * Receives form submissions from the website, appends a row to the
 * "Waitlist" sheet, and sends the user an email confirmation via Gmail.
 *
 * Setup is in apps-script/README.md.
 */

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const SHEET_NAME = 'Waitlist';
const FROM_NAME  = 'SyncSalez';
const REPLY_TO   = 'hello@syncsalez.com';   // change once you have a real address
const SITE_URL   = 'https://turi69.github.io/SyncSalez/';

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
    const required = ['firstName', 'lastName', 'email', 'phone', 'location', 'category'];
    for (const k of required) {
      if (!data[k] || String(data[k]).trim().length < 2) {
        return jsonOut({ ok: false, error: 'Missing field: ' + k });
      }
    }

    appendToSheet_(data);

    // Email send is best-effort. If it fails we still record the signup.
    let emailOk = false;
    try {
      sendEmail_(data);
      emailOk = true;
    } catch (mailErr) {
      console.error('Email send failed:', mailErr);
    }

    return jsonOut({ ok: true, emailSent: emailOk });
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
      'Submitted at', 'First name', 'Last name', 'Email', 'WhatsApp', 'Location',
      'Business category', 'Page URL', 'User agent',
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    data.firstName,
    data.lastName,
    data.email,
    normalizePhone_(data.phone),
    data.location,
    data.category,
    data.pageUrl || '',
    data.userAgent || '',
  ]);
}

// -----------------------------------------------------------------------------
// Email confirmation
//
// Uses Gmail (MailApp) — sends from the script owner's account.
// Free Gmail: 100 sends/day.  Workspace: 1500/day.
// No setup needed beyond authorizing the script.
// -----------------------------------------------------------------------------
function sendEmail_(data) {
  const firstName = (data.firstName || '').trim() || 'there';

  const subject = 'You\'re on the SyncSalez waitlist 🎉';

  const plain = [
    'Hi ' + firstName + ',',
    '',
    'You\'re officially on the SyncSalez waitlist.',
    '',
    'SyncSalez is a point-of-sale and inventory app built for Nigerian merchants — sell offline when the network drops, catch theft before it costs you, and see your profit in real time.',
    '',
    'As a founding waitlist member, you get:',
    '  • First access when we launch',
    '  • Special early-access perks reserved for the list',
    '  • A direct line to our team if you have questions',
    '',
    'We\'ll send you launch updates and a personal heads-up the moment we go live. Watch your inbox.',
    '',
    'Thanks for joining us,',
    'The SyncSalez team',
    '',
    '— ',
    'You signed up at ' + SITE_URL + '. We won\'t share your details. Reply to this email to reach us directly.',
  ].join('\n');

  const html = htmlEmail_(firstName);

  MailApp.sendEmail({
    to:        data.email,
    subject:   subject,
    body:      plain,
    htmlBody:  html,
    name:      FROM_NAME,
    replyTo:   REPLY_TO,
  });
}

function htmlEmail_(firstName) {
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8"><title>Welcome to SyncSalez</title></head>',
    '<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">',
    '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">',
    '    <tr><td align="center">',
    '      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,0.06);overflow:hidden;">',
    '        <tr><td style="padding:32px 36px 8px;">',
    '          <div style="font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#0F172A;">SyncSalez</div>',
    '        </td></tr>',
    '        <tr><td style="padding:8px 36px 0;">',
    '          <div style="display:inline-block;padding:5px 12px;background:rgba(36,99,235,0.08);border:1px solid rgba(36,99,235,0.16);color:#2463EB;border-radius:9999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:18px;">Coming soon</div>',
    '          <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;letter-spacing:-0.025em;font-weight:600;color:#0F172A;">You\'re on the list, ' + escapeHtml_(firstName) + '.</h1>',
    '          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">SyncSalez is a point-of-sale and inventory app built for Nigerian merchants — sell offline when the network drops, catch theft before it costs you, and see your profit in real time.</p>',
    '          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#0F172A;font-weight:500;">As a founding waitlist member, you get:</p>',
    '          <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.7;color:#475569;">',
    '            <li>First access when we launch</li>',
    '            <li>Special early-access perks reserved for the list</li>',
    '            <li>A direct line to our team if you have questions</li>',
    '          </ul>',
    '          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#475569;">We\'ll send you launch updates and a personal heads-up the moment we go live. Watch your inbox.</p>',
    '          <a href="' + SITE_URL + '" style="display:inline-block;padding:12px 22px;background:#2463EB;color:#FFFFFF;text-decoration:none;border-radius:9999px;font-size:14px;font-weight:500;letter-spacing:-0.005em;">Visit the site →</a>',
    '          <p style="margin:32px 0 0;font-size:14px;line-height:1.6;color:#0F172A;">Thanks for joining us,<br/>The SyncSalez team</p>',
    '        </td></tr>',
    '        <tr><td style="padding:24px 36px 32px;border-top:1px solid rgba(15,23,42,0.06);margin-top:24px;">',
    '          <p style="margin:0;font-size:12px;line-height:1.6;color:#94A3B8;">You signed up at <a href="' + SITE_URL + '" style="color:#94A3B8;">SyncSalez</a>. We won\'t share your details. Reply to this email to reach us directly.</p>',
    '        </td></tr>',
    '      </table>',
    '    </td></tr>',
    '  </table>',
    '</body></html>',
  ].join('');
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

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
