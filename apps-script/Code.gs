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

    // Server-side validation. Single-character first/last names are valid
    // (matches the client-side rule).
    const required = ['firstName', 'lastName', 'email', 'phone', 'location', 'category'];
    for (const k of required) {
      const v = String(data[k] == null ? '' : data[k]).trim();
      if (!v) return jsonOut({ ok: false, error: 'Missing field: ' + k });
      if ((k === 'firstName' || k === 'lastName') && v.length < 1) {
        return jsonOut({ ok: false, error: 'Missing field: ' + k });
      }
      if (k !== 'firstName' && k !== 'lastName' && v.length < 2) {
        return jsonOut({ ok: false, error: 'Missing field: ' + k });
      }
    }

    // Don't double-add anyone who's already on the list. We tell the client
    // it succeeded (`ok: true`) but flag `duplicate: true` so the UI can
    // show "you're already on the list" instead of the fresh-signup copy.
    const dupField = findDuplicate_(data);
    if (dupField) {
      return jsonOut({ ok: true, duplicate: true, dupField: dupField });
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
// Duplicate detection — match against existing rows by email (case-insensitive)
// or normalized phone. Returns 'email', 'phone', or null.
//
// We discover the Email and WhatsApp columns by their header text so this
// works whether the sheet was created with the old "Full name" schema (8
// columns) or the new "First name / Last name" schema (9 columns).
// -----------------------------------------------------------------------------
function findDuplicate_(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return null;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return null; // header only or empty

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let emailCol = -1, phoneCol = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim().toLowerCase();
    if (h === 'email') emailCol = i;
    if (h === 'whatsapp' || h === 'phone' || h === 'whatsapp number') phoneCol = i;
  }
  if (emailCol < 0 && phoneCol < 0) return null;

  const incomingEmail = String(data.email || '').trim().toLowerCase();
  const incomingPhone = normalizePhone_(data.phone);

  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (emailCol >= 0 && incomingEmail) {
      const re = String(row[emailCol] || '').trim().toLowerCase();
      if (re && re === incomingEmail) return 'email';
    }
    if (phoneCol >= 0 && incomingPhone) {
      // Older rows may have stored a non-normalized phone — normalize on
      // both sides so equivalent numbers compare equal.
      const rp = normalizePhone_(row[phoneCol]);
      if (rp && rp === incomingPhone) return 'phone';
    }
  }
  return null;
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
  } else {
    // The waitlist sheet predates the firstName/lastName split — make sure
    // its schema is up to date before we append. Idempotent: if the
    // headers are already in the new shape, this is a no-op.
    upgradeSheetSchema_(sheet);
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

/**
 * One-time, idempotent schema upgrade.
 *
 * Detects the legacy "Full name" single column and rewrites it as separate
 * "First name" + "Last name" columns. Existing rows have their full-name
 * value split on the first space (everything before -> First name,
 * everything after -> Last name; if there's no space, it goes to First
 * name and Last name is left blank). Safe to run repeatedly — once the
 * sheet is in the new shape, this returns immediately.
 *
 * You can also run this manually from the Apps Script editor by selecting
 * `migrateHeadersOnce` in the function dropdown and clicking Run.
 */
function upgradeSheetSchema_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
                       .map(h => String(h).trim().toLowerCase());

  // Already migrated.
  if (headers.indexOf('first name') !== -1 && headers.indexOf('last name') !== -1) return;

  const fullNameCol = headers.indexOf('full name'); // 0-indexed
  if (fullNameCol === -1) return; // unknown shape — leave it alone

  const fullNameColIdx = fullNameCol + 1; // sheet API is 1-indexed

  // 1. Insert a new column to the right of "Full name" for the last name.
  sheet.insertColumnAfter(fullNameColIdx);

  // 2. Rename the original column to "First name", set the new column header.
  sheet.getRange(1, fullNameColIdx).setValue('First name');
  sheet.getRange(1, fullNameColIdx + 1).setValue('Last name');

  // 3. Split each existing row's full name on the first space.
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const fullNames = sheet.getRange(2, fullNameColIdx, lastRow - 1, 1).getValues();
    const firstNames = [];
    const lastNames  = [];
    for (let i = 0; i < fullNames.length; i++) {
      const raw = String(fullNames[i][0] || '').trim();
      if (!raw) { firstNames.push(['']); lastNames.push(['']); continue; }
      const idx = raw.indexOf(' ');
      if (idx === -1) {
        firstNames.push([raw]);
        lastNames.push(['']);
      } else {
        firstNames.push([raw.slice(0, idx).trim()]);
        lastNames.push([raw.slice(idx + 1).trim()]);
      }
    }
    sheet.getRange(2, fullNameColIdx,     fullNames.length, 1).setValues(firstNames);
    sheet.getRange(2, fullNameColIdx + 1, fullNames.length, 1).setValues(lastNames);
  }

  // 4. Reapply bold to the (now wider) header row.
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
}

/**
 * Manual entry point for the schema migration. Open the Apps Script
 * editor, pick this function in the dropdown next to the Run button,
 * and click Run. Idempotent — running it twice is a no-op the second
 * time. The web app endpoint also runs the migration automatically on
 * the next signup, so this manual run is only useful if you want to
 * tidy the sheet up before any new signups land.
 */
function migrateHeadersOnce() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log('No "' + SHEET_NAME + '" sheet found — nothing to migrate.');
    return;
  }
  upgradeSheetSchema_(sheet);
  Logger.log('Schema migration complete.');
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

  const subject = 'You are on the waitlist, ' + firstName;

  const plain = [
    'Hi ' + firstName + ',',
    '',
    'You are on the SyncSalez waitlist. Thank you for raising your hand early.',
    '',
    'We are building SyncSalez for shop owners who are tired of stock going missing, customers owing without records, and apps that stop working the moment the network drops. Your name is now on a short list of people who get access first.',
    '',
    'Here is what happens next.',
    'We will send you a WhatsApp message the moment your access window opens. Watch for a message from a SyncSalez team member, not a chatbot.',
    'You will get founding-merchant perks. Early access to features before public release. A direct line to the team for support and feedback. Recognition as a founding merchant when we launch.',
    '',
    'Talk soon,',
    '',
    'Turi',
    'Founder',
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
  const safeName = escapeHtml_(firstName);
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8"><title>You are on the SyncSalez waitlist</title></head>',
    '<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">',
    '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">',
    '    <tr><td align="center">',
    '      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,0.06);overflow:hidden;">',
    '        <tr><td style="padding:32px 36px 12px;">',
    '          <div style="font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#0F172A;">SyncSalez</div>',
    '        </td></tr>',
    '        <tr><td style="padding:4px 36px 0;">',
    '          <p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#0F172A;font-weight:500;">Hi ' + safeName + ',</p>',
    '          <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#0F172A;">You are on the SyncSalez waitlist. Thank you for raising your hand early.</p>',
    '          <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#475569;">We are building SyncSalez for shop owners who are tired of stock going missing, customers owing without records, and apps that stop working the moment the network drops. Your name is now on a short list of people who get access first.</p>',
    '          <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#0F172A;font-weight:600;letter-spacing:-0.005em;">Here is what happens next.</p>',
    '          <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#475569;">We will send you a WhatsApp message the moment your access window opens. Watch for a message from a SyncSalez team member, not a chatbot.</p>',
    '          <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#475569;">You will get founding-merchant perks. Early access to features before public release. A direct line to the team for support and feedback. Recognition as a founding merchant when we launch.</p>',
    '          <p style="margin:32px 0 4px;font-size:15px;line-height:1.5;color:#0F172A;">Talk soon,</p>',
    '          <p style="margin:0;font-size:15px;line-height:1.4;color:#0F172A;font-weight:600;">Turi</p>',
    '          <p style="margin:0 0 8px;font-size:13px;line-height:1.4;color:#94A3B8;">Founder</p>',
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
