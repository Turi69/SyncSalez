// SyncSalez site interactions

// Theme — locked to light for now. Dark theme tokens remain wired up in
// site.css under [data-theme="dark"] for when we re-enable the toggle.
(function () {
  document.documentElement.setAttribute('data-theme', 'light');
  try { localStorage.removeItem('ss-theme'); } catch (e) {}
})();

(function () {
  // FAQ accordion
  document.addEventListener('click', (e) => {
    const q = e.target.closest('.faq__q');
    if (q) {
      const item = q.closest('.faq__item');
      item.classList.toggle('is-open');
    }
  });

  // ============================================================
  // Fullscreen mobile menu — built from the in-DOM .nav__links
  // ============================================================
  function buildOverlay() {
    if (document.querySelector('.nav-overlay')) return;
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const links = nav.querySelector('.nav__links');
    const cta = nav.querySelector('.nav__cta');
    const logo = nav.querySelector('.nav__logo');

    const overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // top bar (logo + close)
    const top = document.createElement('div');
    top.className = 'nav-overlay__top';
    if (logo) top.appendChild(logo.cloneNode(true));
    const closeBtn = document.createElement('button');
    closeBtn.className = 'nav-overlay__close';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>';
    closeBtn.addEventListener('click', closeMenu);
    top.appendChild(closeBtn);
    overlay.appendChild(top);

    // We mirror desktop visibility — anything hidden on desktop (inline
    // style="display:none" or the hidden attribute) stays out of the mobile
    // menu too.
    const isHidden = el => !el || el.hasAttribute('hidden') ||
                           (el.style && el.style.display === 'none');

    // Inner column — vertically centred. Holds either the visible nav links
    // (when there are any) or the editorial brand block (when desktop nav is
    // empty, which is the current state — waitlist phase).
    const inner = document.createElement('div');
    inner.className = 'nav-overlay__inner';

    let stagger = 0;
    const setStagger = el => { el.style.setProperty('--idx', ++stagger); };

    // Body — clone each visible .nav__item.
    const body = document.createElement('div');
    body.className = 'nav-overlay__body';
    if (links) {
      Array.from(links.children).forEach(item => {
        if (isHidden(item)) return;
        if (item.classList && item.classList.contains('has-dropdown')) {
          const group = document.createElement('div');
          group.className = 'nav-overlay__group';
          setStagger(group);
          const dd = item.querySelector('.dropdown');
          const firstTextNode = Array.from(item.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
          const headLabel = (firstTextNode ? firstTextNode.textContent : item.textContent).trim();
          const heading = document.createElement('button');
          heading.className = 'nav-overlay__heading';
          heading.type = 'button';
          heading.innerHTML = '<span>' + headLabel + '</span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 4.5l3 3 3-3"/></svg>';
          heading.addEventListener('click', () => group.classList.toggle('is-open'));
          group.appendChild(heading);
          const sub = document.createElement('div');
          sub.className = 'nav-overlay__sub';
          if (dd) {
            dd.querySelectorAll('a').forEach(a => {
              const cloned = a.cloneNode(true);
              cloned.addEventListener('click', closeMenu);
              sub.appendChild(cloned);
            });
          }
          group.appendChild(sub);
          body.appendChild(group);
        } else if (item.tagName === 'A') {
          const a = item.cloneNode(true);
          a.className = 'nav-overlay__leaf';
          a.addEventListener('click', closeMenu);
          setStagger(a);
          body.appendChild(a);
        }
      });
    }
    const hasBodyItems = body.children.length > 0;
    if (hasBodyItems) inner.appendChild(body);

    // Editorial brand block — only when the desktop nav has no visible links.
    // Gives the menu purpose and presence instead of a sea of empty space.
    if (!hasBodyItems) {
      const eyebrow = document.createElement('div');
      eyebrow.className = 'nav-overlay__eyebrow';
      eyebrow.innerHTML = '<span class="nav-overlay__pulse" aria-hidden="true"></span>Coming soon';
      setStagger(eyebrow);
      inner.appendChild(eyebrow);

      const headline = document.createElement('h2');
      headline.className = 'nav-overlay__headline';
      headline.innerHTML = 'Save your<br/>spot.';
      setStagger(headline);
      inner.appendChild(headline);

      const lede = document.createElement('p');
      lede.className = 'nav-overlay__lede';
      lede.textContent = 'SyncSalez is opening access in waves. Join the waitlist and be first when your window opens.';
      setStagger(lede);
      inner.appendChild(lede);
    }

    // CTA pair — primary button + login link, mirrored from desktop CTA.
    if (cta) {
      const ctas = document.createElement('div');
      ctas.className = 'nav-overlay__ctas';
      const primary = cta.querySelector('.btn--primary');
      const login = cta.querySelector('.nav__login');
      if (primary && !isHidden(primary)) {
        const cloned = primary.cloneNode(true);
        cloned.classList.remove('btn--sm');
        cloned.addEventListener('click', closeMenu);
        ctas.appendChild(cloned);
      }
      if (login && !isHidden(login)) {
        const cloned = login.cloneNode(true);
        cloned.className = 'nav-overlay__login';
        cloned.addEventListener('click', closeMenu);
        ctas.appendChild(cloned);
      }
      if (ctas.children.length > 0) {
        setStagger(ctas);
        inner.appendChild(ctas);
      }
    }

    overlay.appendChild(inner);

    // Watermark — giant SyncSalez wordmark anchoring the bottom. Echoes the
    // existing footer wordmark pattern. Only shown when there are no body
    // links (the editorial-only state) so it never competes with content.
    if (!hasBodyItems) {
      const watermark = document.createElement('div');
      watermark.className = 'nav-overlay__watermark';
      watermark.setAttribute('aria-hidden', 'true');
      watermark.textContent = 'SyncSalez.';
      setStagger(watermark);
      overlay.appendChild(watermark);
    }

    document.body.appendChild(overlay);
  }
  function openMenu() {
    buildOverlay();
    document.body.classList.add('menu-open');
    const ov = document.querySelector('.nav-overlay');
    if (ov) ov.setAttribute('aria-hidden', 'false');
  }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    const ov = document.querySelector('.nav-overlay');
    if (ov) ov.setAttribute('aria-hidden', 'true');
  }
  document.addEventListener('click', (e) => {
    const ham = e.target.closest('.nav__hamburger');
    if (ham) {
      e.preventDefault();
      if (document.body.classList.contains('menu-open')) closeMenu();
      else openMenu();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 980 && document.body.classList.contains('menu-open')) closeMenu();
  });

  // Theme toggle disabled — site is locked to light mode for now.
  // Remove any toggle that an older cached site.js may have injected.
  document.querySelectorAll('.theme-toggle').forEach(el => el.remove());

  // Nav dropdowns — open on click (not hover)
  const dropdowns = document.querySelectorAll('.nav__item.has-dropdown');
  dropdowns.forEach(d => {
    d.setAttribute('role', 'button');
    d.setAttribute('tabindex', '0');
    d.setAttribute('aria-haspopup', 'true');
    d.setAttribute('aria-expanded', 'false');
  });
  function closeAllDropdowns(except) {
    dropdowns.forEach(d => {
      if (d === except) return;
      d.classList.remove('is-open');
      d.setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('click', (e) => {
    const insidePanel = e.target.closest('.dropdown');
    if (insidePanel) return; // let link clicks navigate
    const trigger = e.target.closest('.nav__item.has-dropdown');
    if (trigger) {
      e.preventDefault();
      const willOpen = !trigger.classList.contains('is-open');
      closeAllDropdowns(trigger);
      trigger.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    } else {
      closeAllDropdowns();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAllDropdowns(); return; }
    const trigger = e.target.closest && e.target.closest('.nav__item.has-dropdown');
    if (trigger && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      trigger.click();
    }
  });

  // Pricing toggle (Monthly | Yearly)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-bill]');
    if (!t) return;
    const period = t.dataset.bill;
    document.querySelectorAll('[data-bill]').forEach(b => b.classList.toggle('is-on', b.dataset.bill === period));
    document.querySelectorAll('[data-monthly], [data-yearly]').forEach(el => {
      if (el.dataset.monthly !== undefined) el.style.display = period === 'monthly' ? '' : 'none';
      if (el.dataset.yearly !== undefined) el.style.display = period === 'yearly' ? '' : 'none';
    });
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Number counter — when a data-counter enters viewport, tick from 0 → target
  // Uses thousands grouping. Optional data-prefix / data-suffix.
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      counterIO.unobserve(el);
      const target = parseFloat(el.dataset.target || '0');
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        // ease-out cubic
        const e = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(target * e) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(target) + suffix;
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-counter]').forEach(el => counterIO.observe(el));
})();

/* ============================================================
   WAITLIST MODAL
   - Self-injects on every page so "Get started" / "Join waitlist"
     CTAs open it in place — no need to navigate home first.
   - Opens on any [data-action="waitlist"] click, or on page load if
     the URL hash is #waitlist (so cross-page links can target it).
   - POSTs as text/plain to dodge CORS preflight (Apps Script accepts
     and parses the body as JSON server-side).
   ============================================================ */
(() => {
  const WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx2By9utbTNRMvfWzyRge0Dc3O6QWIjLOfs715Y1-lJvmR5rMEix3NMt8WbWmPK5lRh/exec';

  const MODAL_HTML = `
<div class="waitlist" id="waitlist" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="waitlist-title">
  <div class="waitlist__backdrop" data-waitlist-close></div>
  <div class="waitlist__panel" role="document">
    <button class="waitlist__close" aria-label="Close" data-waitlist-close>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3 L13 13 M13 3 L3 13"/></svg>
    </button>

    <div class="waitlist__view" data-view="form">
      <span class="waitlist__pill"><span class="dot-pulse"></span> Coming soon</span>
      <h2 id="waitlist-title" class="waitlist__title">Be first in line.</h2>
      <p class="waitlist__lead">SyncSalez is launching soon. Join the waitlist and you'll be among the first to know — plus you get founding-merchant perks and special early access reserved for the list.</p>

      <form class="waitlist__form" id="waitlist-form" novalidate>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">
          <div class="field" data-field="firstName" style="min-width:0;">
            <label for="wl-fname">First name<span class="field__req" aria-hidden="true">*</span></label>
            <input id="wl-fname" name="firstName" type="text" autocomplete="given-name" required />
          </div>
          <div class="field" data-field="lastName" style="min-width:0;">
            <label for="wl-lname">Last name<span class="field__req" aria-hidden="true">*</span></label>
            <input id="wl-lname" name="lastName" type="text" autocomplete="family-name" required />
          </div>
        </div>
        <div class="field" data-field="email">
          <label for="wl-email">Email<span class="field__req" aria-hidden="true">*</span></label>
          <input id="wl-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />
          <small class="field__hint">We'll send your confirmation here.</small>
        </div>
        <div class="field" data-field="phone">
          <label for="wl-phone">WhatsApp number<span class="field__req" aria-hidden="true">*</span></label>
          <input id="wl-phone" name="phone" type="tel" autocomplete="tel" placeholder="+234 803 000 0000" required />
        </div>
        <div class="field" data-field="location">
          <label for="wl-location">Location<span class="field__req" aria-hidden="true">*</span></label>
          <input id="wl-location" name="location" type="text" placeholder="City, State" required />
        </div>
        <div class="field" data-field="category">
          <label for="wl-category">Business category<span class="field__req" aria-hidden="true">*</span></label>
          <select id="wl-category" name="category" required>
            <option value="">Select your business type</option>
            <option>Provision stores &amp; supermarkets</option>
            <option>Pharmacies</option>
            <option>Fashion &amp; cosmetics</option>
            <option>Food &amp; drinks</option>
            <option>Electronics</option>
            <option>Building materials</option>
            <option>Other</option>
          </select>
        </div>

        <button type="submit" class="waitlist__submit" disabled>
          <span class="waitlist__submit-text">Join the waitlist</span>
          <span class="waitlist__submit-loading">
            <span class="spinner" aria-hidden="true"></span>
            Submitting…
          </span>
        </button>
        <p class="waitlist__note">By joining, you agree we may contact you about SyncSalez. We never share your info.</p>
      </form>
    </div>

    <div class="waitlist__view" data-view="success" hidden>
      <div class="waitlist__icon waitlist__icon--ok" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>
      </div>
      <h2 class="waitlist__title">You're on the list.</h2>
      <p class="waitlist__lead">We just sent your confirmation to your inbox. As soon as SyncSalez goes live, you'll be among the first to know — keep an eye on your email.</p>
      <button type="button" class="btn btn--primary" data-waitlist-close>Done</button>
    </div>

    <div class="waitlist__view" data-view="error" hidden>
      <div class="waitlist__icon waitlist__icon--err" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><circle cx="12" cy="16" r="0.5"/></svg>
      </div>
      <h2 class="waitlist__title">Something went wrong.</h2>
      <p class="waitlist__lead waitlist__error-msg">Please try again. If it keeps happening, reach us at <a href="mailto:hello@syncsalez.com">hello@syncsalez.com</a>.</p>
      <button type="button" class="btn btn--primary" data-waitlist-retry>Try again</button>
    </div>
  </div>
</div>`;

  // Inject the modal into every page that loads this script (idempotent —
  // if a page already has #waitlist in its source, we leave it alone).
  function injectModal() {
    if (document.getElementById('waitlist')) return document.getElementById('waitlist');
    const wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML.trim();
    const node = wrap.firstElementChild;
    document.body.appendChild(node);
    return node;
  }

  const modal = injectModal();
  if (!modal) return;

  const PLACEHOLDER = 'REPLACE_WITH_APPS_SCRIPT_URL';
  // Endpoint can be overridden by a data-endpoint attribute on the modal
  // (legacy support); otherwise we use the constant defined above.
  const endpoint = modal.dataset.endpoint || WAITLIST_ENDPOINT;
  const isConfigured = endpoint && endpoint !== PLACEHOLDER;

  const form = modal.querySelector('#waitlist-form');
  const submitBtn = modal.querySelector('.waitlist__submit');
  const views = {
    form:    modal.querySelector('[data-view="form"]'),
    success: modal.querySelector('[data-view="success"]'),
    error:   modal.querySelector('[data-view="error"]'),
  };
  const errorMsg = modal.querySelector('.waitlist__error-msg');
  const successTitle = views.success.querySelector('.waitlist__title');
  const successLead  = views.success.querySelector('.waitlist__lead');

  // Two flavours of the success view — fresh signup vs. already on the list.
  // Both titles are templates: `{firstName}` is replaced with what the user
  // typed on submit. If we somehow don't have a name, any whitespace/comma
  // immediately preceding the placeholder is stripped along with it so the
  // headline still reads cleanly (defensive only — validation guarantees
  // a non-empty firstName in practice).
  const SUCCESS_DEFAULT = {
    title: "Locked in, {firstName}",
    lead:  "Your spot is saved. Sit tight, we're building something worth the wait.",
  };
  const SUCCESS_DUPLICATE = {
    title: "Nice to see you again {firstName}",
    lead:  "You joined the waitlist already. Your spot is safe, we don't lose track of the early ones.",
  };
  function setSuccessCopy(duplicate, firstName) {
    const c = duplicate ? SUCCESS_DUPLICATE : SUCCESS_DEFAULT;
    const fname = (firstName || '').trim();
    successTitle.textContent = fname
      ? c.title.replace('{firstName}', fname)
      : c.title.replace(/[\s,]*\{firstName\}/, '');
    successLead.textContent  = c.lead;
  }

  // Names of the form controls we always require. Used to (a) drive the
  // disabled state of the submit button so the user can't click it until
  // every field has a value, and (b) double-check on the client side
  // before we send anything to the backend.
  const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'location', 'category'];
  function allRequiredFilled() {
    return REQUIRED_FIELDS.every((name) => {
      const el = form.elements[name];
      if (!el) return false;
      return String(el.value || '').trim().length > 0;
    });
  }
  function updateSubmitButtonState() {
    // Don't fight the loading state — while a submit is in flight the
    // button is intentionally disabled and we leave it alone.
    if (submitBtn.classList.contains('is-loading')) return;
    submitBtn.disabled = !allRequiredFilled();
  }
  form.addEventListener('input', updateSubmitButtonState);
  form.addEventListener('change', updateSubmitButtonState);
  // Initial state — disabled until the user fills everything.
  submitBtn.disabled = true;

  let lastFocus = null;
  // Holds the quiz context (vertical, pain, score, priority tag, etc.)
  // captured at the moment a quiz CTA is clicked. Cleared on close.
  let pendingQuizContext = null;

  function showView(name) {
    Object.entries(views).forEach(([k, el]) => { el.hidden = (k !== name); });
  }

  // Capture mode controls which fields are visible + required.
  //   'full'  → name, email, phone, location, category   (default for site-wide CTAs)
  //   'phone' → name, email, phone                       (Results 2 & 3)
  //   'email' → name, email                              (Results 1, 4, 5)
  function applyCapture(mode) {
    const m = mode === 'phone' || mode === 'email' ? mode : 'full';
    modal.dataset.capture = m;
    const phoneInput    = modal.querySelector('#wl-phone');
    const locationInput = modal.querySelector('#wl-location');
    const categoryInput = modal.querySelector('#wl-category');
    if (phoneInput)    phoneInput.required    = (m !== 'email');
    if (locationInput) locationInput.required = (m === 'full');
    if (categoryInput) categoryInput.required = (m === 'full');
  }

  function open(trigger) {
    lastFocus = trigger || document.activeElement;
    showView('form');
    submitBtn.classList.remove('is-loading');
    updateSubmitButtonState();
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('waitlist-open');
    setTimeout(() => {
      const first = modal.querySelector('.field:not([hidden]) input, .field:not([hidden]) select');
      if (first) first.focus();
    }, 50);
  }

  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('waitlist-open');
    pendingQuizContext = null;
    applyCapture('full');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Open triggers — any element with data-action="waitlist"
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action="waitlist"]');
    if (trigger) {
      e.preventDefault();
      // If this CTA originated from the quiz, attach its context to the
      // upcoming submission for CRM tagging. The capture mode is always
      // 'full' now — every entry point shows the same waitlist form so
      // the experience is consistent across outcomes and the rest of
      // the site.
      const quizCta = trigger.getAttribute('data-quiz-cta');
      if (quizCta) {
        const ctx = window.__quizContext ? { ...window.__quizContext, priorityTag: quizCta } : { priorityTag: quizCta };
        pendingQuizContext = ctx;
      } else {
        pendingQuizContext = null;
      }
      applyCapture('full');
      open(trigger);
    }
  });

  // Close triggers — backdrop, close button, success/error "Done" buttons
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-waitlist-close]')) {
      e.preventDefault();
      close();
    }
    if (e.target.closest('[data-waitlist-retry]')) {
      e.preventDefault();
      showView('form');
      submitBtn.classList.remove('is-loading');
      updateSubmitButtonState();
    }
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      close();
    }
  });

  // Client-side validation. Every field is required regardless of how the
  // modal was opened — the disabled-until-filled submit button means we
  // should never see these errors trigger in practice, but keep them as
  // a fallback in case JS state drifts.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validate(data) {
    if (!data.firstName || data.firstName.trim().length < 1) return 'Please enter your first name.';
    if (!data.lastName  || data.lastName.trim().length  < 1) return 'Please enter your last name.';
    if (!data.email     || !EMAIL_RE.test(data.email))       return 'Please enter a valid email address.';
    const digits = (data.phone || '').replace(/\D/g, '');
    if (digits.length < 8) return 'Please enter a valid WhatsApp number.';
    if (!data.location  || data.location.trim().length  < 2) return 'Please enter your location.';
    if (!data.category)                                       return 'Please pick a business category.';
    return null;
  }

  // Disable submit until every required field has a value -------
  // Visual cue (red asterisk in each label) is in the markup; this
  // is the gate that prevents an empty submission. Runs on every
  // input/change event from the form.
  const requiredFields = form.querySelectorAll('[required]');
  function syncWaitlistSubmit() {
    if (submitBtn.classList.contains('is-loading')) return;
    const allFilled = Array.from(requiredFields)
      .every((el) => (el.value || '').trim().length > 0);
    submitBtn.disabled = !allFilled;
  }
  form.addEventListener('input', syncWaitlistSubmit);
  form.addEventListener('change', syncWaitlistSubmit);
  syncWaitlistSubmit();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      firstName: (fd.get('firstName') || '').toString().trim(),
      lastName:  (fd.get('lastName') || '').toString().trim(),
      email:    (fd.get('email') || '').toString().trim(),
      phone:    (fd.get('phone') || '').toString().trim(),
      location: (fd.get('location') || '').toString().trim(),
      category: (fd.get('category') || '').toString().trim(),
      // Useful context for the sheet
      submittedAt: new Date().toISOString(),
      pageUrl: location.href,
      userAgent: navigator.userAgent,
      captureMode: modal.dataset.capture || 'full',
      // Quiz context (vertical, pain, score, priority tag, etc.) — only
      // present when the modal was opened from a quiz CTA.
      ...(pendingQuizContext || {}),
    };

    const err = validate(data);
    if (err) {
      errorMsg.textContent = err;
      // Keep them on the form; flash the error inline by jumping the view briefly?
      // Simpler: alert via the error view with retry — but we want them to stay on
      // the form for fixable validation issues. Use a temporary inline notice.
      alert(err);
      return;
    }

    submitBtn.classList.add('is-loading');
    submitBtn.disabled = true;

    try {
      let isDuplicate = false;
      if (!isConfigured) {
        // Simulate success in dev (no backend wired up yet)
        await new Promise(r => setTimeout(r, 1200));
        console.info('[waitlist] simulated submit (no endpoint configured)', data);
      } else {
        // text/plain avoids a CORS preflight; Apps Script parses
        // e.postData.contents as JSON regardless.
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const out = await res.json().catch(() => ({ ok: true }));
        if (out && out.ok === false) throw new Error(out.error || 'Submission failed');
        // Backend reports duplicate when the email or phone is already on
        // the waitlist sheet. Older deployments won't send this flag —
        // treat any missing flag as "fresh signup" so we degrade safely.
        isDuplicate = !!(out && out.duplicate);
      }
      setSuccessCopy(isDuplicate, data.firstName);
      showView('success');
    } catch (err) {
      console.error('[waitlist] submit failed', err);
      errorMsg.innerHTML = 'Please try again. If it keeps happening, reach us at <a href="mailto:hello@syncsalez.com">hello@syncsalez.com</a>.';
      showView('error');
    } finally {
      submitBtn.classList.remove('is-loading');
      updateSubmitButtonState();
    }
  });

  // Auto-open if the URL hash is #waitlist (e.g. user arrived via a
  // cross-page link). We listen on hashchange too so in-page anchor
  // navigations work even after initial load.
  function maybeOpenFromHash() {
    if (location.hash === '#waitlist' && modal.getAttribute('aria-hidden') === 'true') {
      open(null);
    }
  }
  window.addEventListener('hashchange', maybeOpenFromHash);
  // Defer one frame so the page is fully laid out before the modal animation runs.
  requestAnimationFrame(maybeOpenFromHash);
})();

/* ============================================================
   PAGE LOADER
   - Vertical-dial animation that scrolls through SyncSalez features
     and lands on the brand name, then scales out + fades to reveal
     the page beneath.
   - The CSS handles all visual timing (spin → hold → zoom-fade) via
     keyframe animations. This script only locks body scroll while
     the loader is up and removes the element after the animation
     completes. Runs on every page load, every time.
   ============================================================ */
(() => {
  const loader = document.getElementById('loader');
  if (!loader) return;

  document.body.classList.add('loader-active');

  // CSS timeline: spin 3.2s + hold 0.5s + zoom-fade 1.0s = 4.7s.
  // Add a 100ms buffer to be sure the final keyframe has painted.
  setTimeout(() => {
    loader.remove();
    document.body.classList.remove('loader-active');
  }, 4800);
})();

/* ============================================================
   QUIZ — Is SyncSalez right for your shop?
   6-question interactive quiz, scored, routed to one of 5
   outcomes, with vertical / pain personalization.
   ============================================================ */
(() => {
  const quiz = document.getElementById('quiz');
  if (!quiz) return;

  // ---------- CONFIG ----------
  const QUESTIONS = [
    {
      id: 'sells',
      title: 'What do you sell?',
      key: 'vertical',
      options: [
        { tag: 'A', label: 'Groceries, provisions, or FMCG',          score: 15 },
        { tag: 'B', label: 'Medicines or health products',            score: 15 },
        { tag: 'C', label: 'Clothing, fashion, or beauty',            score: 15 },
        { tag: 'D', label: 'Food, drinks, or meals',                  score: 15 },
        { tag: 'E', label: 'Electronics or phone products',           score: 15 },
        { tag: 'F', label: 'Building materials or hardware',          score: 15 },
        { tag: 'G', label: 'Other physical products',                 score: 15 },
        { tag: 'H', label: 'Online-only (Instagram, WhatsApp, web)',  score: 15 },
        { tag: 'I', label: 'Services only (no physical products)',    score:  0, terminal: true },
      ],
    },
    {
      id: 'shops',
      title: 'How many shops do you run?',
      options: [
        { tag: 'A', label: '1 shop',           score:  5 },
        { tag: 'B', label: '2 to 3 shops',     score: 10 },
        { tag: 'C', label: '4 to 10 shops',    score: 15 },
        { tag: 'D', label: 'More than 10',     score: 15, lead: 'enterprise' },
      ],
    },
    {
      id: 'catalog',
      title: 'How many different products do you sell?',
      options: [
        { tag: 'A', label: 'Fewer than 50',    score:  5 },
        { tag: 'B', label: '50 to 500',        score: 10 },
        { tag: 'C', label: '500 to 2,000',     score: 15 },
        { tag: 'D', label: 'More than 2,000',  score: 15 },
      ],
    },
    {
      id: 'pain',
      title: 'What slows you down most every day?',
      key: 'pain',
      options: [
        { tag: 'A', label: 'Stock going missing without explanation',     score: 20 },
        { tag: 'B', label: 'Customers owing money I cannot track',        score: 20 },
        { tag: 'C', label: 'Running out of best sellers without warning', score: 20 },
        { tag: 'D', label: 'Managing sizes, colours, or variants',        score: 20 },
        { tag: 'E', label: 'Tracking expiry dates and batches',           score: 20 },
        { tag: 'F', label: 'Orders coming from WhatsApp, walk-ins, and Instagram at once', score: 20 },
        { tag: 'G', label: 'None of these',                               score:  5 },
      ],
    },
    {
      id: 'system',
      title: 'How do you record sales right now?',
      options: [
        { tag: 'A', label: 'A paper notebook',                  score: 15 },
        { tag: 'B', label: 'WhatsApp messages or memory',       score: 15 },
        { tag: 'C', label: 'A spreadsheet',                     score: 15 },
        { tag: 'D', label: 'Another retail or POS app',         score: 10 },
        { tag: 'E', label: 'I have not started yet',            score: 15 },
      ],
    },
    {
      id: 'connectivity',
      title: 'How is the internet at your shop?',
      options: [
        { tag: 'A', label: 'Often poor or off',                            score: 20 },
        { tag: 'B', label: 'Drops sometimes',                              score: 15 },
        { tag: 'C', label: 'Strong most of the time',                      score: 10 },
        { tag: 'D', label: 'I sell in person, internet does not matter',   score: 20 },
      ],
    },
  ];

  // Pain → top 3 features
  const PAIN_FEATURES = {
    A: ['Blind Count', 'Action Logs', 'Cash Drawer Reconciliation'],
    B: ['Customer Debt Tracking', 'Auto WhatsApp Reminders', 'Customer Lifetime Value'],
    C: ['Low Stock Alerts', 'AI Demand Forecast', 'Auto Reorder Drafts'],
    D: ['Variant Manager', 'Bundle Builder', 'Catalogue Sharing'],
    E: ['Batch Tracking', 'Expiry Alerts (30-day pre-warning)', 'FIFO Prompts'],
    F: ['Storefront', 'WhatsApp Order Queue', 'Order Source Tracking'],
    G: ['POS', 'Stock', 'Reports'],
  };

  // Vertical → image + nicely-named segment for outcome copy
  const VERTICALS = {
    A: { name: 'provision shop',          image: 'assets/persona-matriarch.png' },
    B: { name: 'pharmacy',                image: 'assets/persona-matriarch.png' },
    C: { name: 'fashion business',        image: 'assets/persona-fashion.png'   },
    D: { name: 'food & restaurant shop',  image: 'assets/persona-restaurant.png'},
    E: { name: 'electronics shop',        image: 'assets/persona-restaurant.png'},
    F: { name: 'building materials shop', image: 'assets/persona-wholesaler.png'},
    G: { name: 'shop',                    image: 'assets/persona-matriarch.png' },
    H: { name: 'online business',         image: 'assets/persona-fashion.png'   },
  };

  // Online-only re-weighted copy for pain D and F (Q1 = H)
  const ONLINE_PAIN_LEAD = {
    D: 'Stop sending the wrong size to the wrong customer. Variant inventory across Instagram, WhatsApp, and your storefront stays in sync.',
    F: 'One inbox for every order. WhatsApp DMs, Instagram messages, and storefront checkouts land in the same queue. Nothing gets missed.',
  };

  const ONLINE_COMPARE_LINE = 'Already using Bumpa or Catlog? SyncSalez adds inventory accuracy, debt tracking, and offline reliability. Try free for 7 days and decide for yourself.';

  // ---------- STATE ----------
  let qIndex = 0;
  const answers = []; // [{ qId, tag, score, lead?, label }]

  const els = {
    qNum:     quiz.querySelector('[data-q-num]'),
    qFill:    quiz.querySelector('[data-q-fill]'),
    qTitle:   quiz.querySelector('[data-q-title]'),
    qOptions: quiz.querySelector('[data-q-options]'),
    qResult:  quiz.querySelector('[data-q-result]'),
    qBack:    quiz.querySelector('[data-quiz-back]'),
  };

  // ---------- HELPERS ----------
  function arrSvg() {
    return '<span class="quiz__option-arr"><svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3 L9 6 L3 9"/></svg></span>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function setState(state) {
    quiz.setAttribute('data-state', state);
    if (state !== 'intro') {
      // Smooth-scroll the quiz into view so question text is visible
      // without the user having to manually scroll.
      const top = quiz.getBoundingClientRect().top + window.scrollY - 24;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  function renderQuestion() {
    const q = QUESTIONS[qIndex];
    els.qNum.textContent = String(qIndex + 1);
    els.qFill.style.width = (((qIndex + 1) / QUESTIONS.length) * 100).toFixed(1) + '%';
    els.qTitle.textContent = q.title;

    els.qOptions.innerHTML = q.options.map((opt, i) => `
      <button type="button" class="quiz__option" data-q-pick="${i}">
        <span>${escapeHtml(opt.label)}</span>
        ${arrSvg()}
      </button>
    `).join('');

    els.qBack.disabled = (qIndex === 0);
  }

  function recordAnswer(opt) {
    answers[qIndex] = {
      qId:   QUESTIONS[qIndex].id,
      tag:   opt.tag,
      score: opt.score,
      lead:  opt.lead || null,
      label: opt.label,
    };
  }

  function advance() {
    // Q1=I → terminal (services only): jump straight to outcome 1
    const last = answers[answers.length - 1];
    if (qIndex === 0 && last && last.tag === 'I') {
      return showResult();
    }
    if (qIndex < QUESTIONS.length - 1) {
      qIndex++;
      renderQuestion();
    } else {
      showResult();
    }
  }

  function goBack() {
    if (qIndex === 0) return;
    qIndex--;
    answers.pop();
    renderQuestion();
  }

  // Build outcome from accumulated answers.
  // No pricing. No plan names. Every result lands on a single waitlist CTA
  // tagged with a priority code, plus an optional secondary on Result 2.
  function buildOutcome() {
    const verticalAns     = answers.find(a => a && a.qId === 'sells');
    const painAns         = answers.find(a => a && a.qId === 'pain');
    const shopsAns        = answers.find(a => a && a.qId === 'shops');
    const catalogAns      = answers.find(a => a && a.qId === 'catalog');
    const systemAns       = answers.find(a => a && a.qId === 'system');
    const connectivityAns = answers.find(a => a && a.qId === 'connectivity');

    const verticalTag = verticalAns ? verticalAns.tag : 'G';
    const painTag     = painAns     ? painAns.tag     : 'G';
    const isOnline    = verticalTag === 'H';
    const total       = answers.reduce((s, a) => s + (a ? a.score : 0), 0);
    const verticalMeta = VERTICALS[verticalTag] || VERTICALS.G;

    // Context block that travels with the waitlist submission. Drives
    // CRM tagging and the personalised confirmation email.
    const baseCtx = {
      quizScore:     total,
      vertical:      verticalTag,
      verticalLabel: verticalAns ? verticalAns.label : '',
      pain:          painTag,
      painLabel:     painAns ? painAns.label : '',
      shopCount:     shopsAns ? shopsAns.label : '',
      productCount:  catalogAns ? catalogAns.label : '',
      currentTool:   systemAns ? systemAns.label : '',
      connectivity:  connectivityAns ? connectivityAns.label : '',
    };

    // Result 1 — Q1=I, services only. Email-only capture.
    if (verticalTag === 'I') {
      return {
        kind: 'service-lead',
        meta:  'Result',
        title: 'SyncSalez fits shops with products to sell.',
        body:  'We focus on inventory, sales, and order management for businesses with stock to track. For service-only businesses, tools like Wave Accounting or QuickBooks fit better today. If we build a service-business plan in the future, we will let you know.',
        features: [],
        ctaText:     'Notify me if SyncSalez adds a service plan',
        secondary:   null,
        priorityTag: 'Service Lead',
        capture:     'email',
        showImage:   true,
        verticalMeta,
        // Score 0 in spec, but a token 10% fill keeps the gauge visually
        // alive at the very low end of the deep-blue band.
        score:       10,
        gradient:    'service',
        ctx: { ...baseCtx, priorityTag: 'Service Lead' },
      };
    }

    // For Results 2–5: build the personalised feature list.
    // Online-only (H) leads with the four storefront/queue features and
    // appends pain-matched extras after de-dupe.
    let features;
    if (isOnline) {
      const onlineCore = ['Storefront', 'Catalogue Sharing', 'WhatsApp Order Queue', 'Order Source Tracking'];
      const painList   = (PAIN_FEATURES[painTag] || []).filter(f => !onlineCore.includes(f));
      features = [...onlineCore, ...painList];
    } else {
      features = (PAIN_FEATURES[painTag] || PAIN_FEATURES.G).slice();
    }

    const onlineLeadCopy = isOnline && ONLINE_PAIN_LEAD[painTag] ? ONLINE_PAIN_LEAD[painTag] : null;

    // Result 2 — score 85–100. Multi-branch priority. Phone+email.
    if (total >= 85) {
      return {
        kind: 'priority',
        meta: 'Recommended for you',
        title: 'SyncSalez is built for businesses like yours.',
        body: (onlineLeadCopy ? onlineLeadCopy + ' ' : '') +
          'You run multiple shops, hold a wide catalogue, and feel a clear daily pain we solve. Our team is preparing early access for shops with multi-branch needs. Join the waitlist and we will get in touch personally to set you up.',
        features:    features.slice(0, 3),
        ctaText:     'Join the priority waitlist',
        secondary:   'Book a 20-minute conversation',
        priorityTag: 'Multi-Branch Priority',
        capture:     'phone',
        showImage:   true,
        verticalMeta,
        score:       total,
        gradient:    'priority',
        ctx: { ...baseCtx, priorityTag: 'Multi-Branch Priority' },
      };
    }

    // Result 3 — score 70–84. Growth priority. Phone+email.
    if (total >= 70) {
      return {
        kind: 'growth',
        meta: 'Recommended for you',
        title: 'SyncSalez fits your shop today and grows with it.',
        body: (onlineLeadCopy ? onlineLeadCopy + ' ' : '') +
          'You have a single shop or a small chain, real daily pains, and you are ready to upgrade from your current setup. We are rolling out access in waves. Join the waitlist and we will let you know the moment you are in.',
        features:    features.slice(0, 3),
        ctaText:     'Join the waitlist',
        secondary:   null,
        priorityTag: 'Growth Priority',
        capture:     'phone',
        showImage:   true,
        verticalMeta,
        score:       total,
        gradient:    'growth',
        ctx: { ...baseCtx, priorityTag: 'Growth Priority' },
      };
    }

    // Result 4 — score 50–69. Standard priority. Email-only.
    if (total >= 50) {
      return {
        kind: 'standard',
        meta: 'Recommended for you',
        title: 'SyncSalez is a strong fit for where you are now.',
        body: (onlineLeadCopy ? onlineLeadCopy + ' ' : '') +
          'You will run your first sale within 10 minutes of getting access. As your shop grows, the deeper features open up. Join the waitlist for early access.',
        features:    features.slice(0, 2),
        ctaText:     'Join the waitlist',
        secondary:   null,
        priorityTag: 'Standard Priority',
        capture:     'email',
        showImage:   true,
        verticalMeta,
        score:       total,
        gradient:    'standard',
        ctx: { ...baseCtx, priorityTag: 'Standard Priority' },
      };
    }

    // Result 5 — score < 50, Q1 ≠ I. Light priority. Email-only.
    return {
      kind: 'light',
      meta:  'Result',
      title: 'SyncSalez works, and you have time to grow into it.',
      body:  'Your business is small and your daily pains are mild today. SyncSalez will be a good fit as you scale. Join the waitlist and we will reach out when access opens.',
      features:    [],
      ctaText:     'Join the waitlist',
      secondary:   null,
      priorityTag: 'Light Priority',
      capture:     'email',
      showImage:   true,
      verticalMeta,
      score:       Math.max(total, 25),
      gradient:    'light',
      ctx: { ...baseCtx, priorityTag: 'Light Priority' },
    };
  }

  function showResult() {
    const o = buildOutcome();

    // Stash the quiz context globally so the waitlist modal can read it
    // when a CTA is clicked. The capture mode + priority tag also ride on
    // the CTA itself via data-* attributes (more robust than relying only
    // on the global, in case the user opens multiple CTAs in sequence).
    window.__quizContext = o.ctx;

    // Single-column when there's no aside image (Results 1 and 5)
    quiz.classList.toggle('quiz--no-aside', !o.showImage);

    const featuresHtml = o.features.length ? `
      <div class="quiz__result-features">
        ${o.features.map(f => `<div class="quiz__result-feature">${escapeHtml(f)}</div>`).join('')}
      </div>
    ` : '';

    const ctaAttrs = `data-action="waitlist" data-quiz-cta="${escapeHtml(o.priorityTag)}" data-quiz-capture="${escapeHtml(o.capture)}"`;

    const ctaPrimary = `<a class="btn btn--invert" href="#waitlist" ${ctaAttrs}>${escapeHtml(o.ctaText)} <span class="arr"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 9 L9 3 M5 3 H9 V7"/></svg></span></a>`;

    // Fill amount is driven by the score; dashoffset is the inverse since
    // pathLength=100 means dashoffset 0 == fully drawn.
    const fillPct = Math.max(0, Math.min(100, o.score || 0));
    const target  = 100 - fillPct;
    const gradKey = o.gradient || 'growth';

    // Plain-language label that sits in the middle of the dial. Mapped
    // from the gradient key so it stays in lockstep with the score band.
    const GAUGE_LABEL = {
      service:  'Not the<br/>right fit',
      light:    'Light fit',
      standard: 'Good fit',
      growth:   'Strong fit',
      priority: 'Strong fit,<br/>multi-shop<br/>priority'
    };
    const gaugeLabel = GAUGE_LABEL[gradKey] || '';

    const aside = o.showImage
      ? `<aside class="quiz__media">
          <div class="quiz__media-frame quiz__media-frame--gauge">
            <svg class="gauge gauge--${gradKey}" viewBox="6 4 208 188" style="--gauge-target: ${target}" aria-hidden="true" focusable="false">
              <defs>
                <!-- Tier gradients — each tier is one semantic colour with
                     a tonal sweep from a darker shade through the brand
                     hex to a lighter shade. Cool-to-green progression
                     signals fit level without alarmist heat.
                     1 = Slate blue   (no fit)        #4A6FA5
                     5 = Sky blue     (light fit)     #5B9BD5
                     4 = Teal         (good fit)      #3CB4A0
                     3 = Fresh green  (strong fit)    #4CAF50
                     2 = Deep emerald (priority)      #1B7A3E
                -->
                <linearGradient id="gaugeFill-service" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#2D4570"/>
                  <stop offset="55%"  stop-color="#4A6FA5"/>
                  <stop offset="100%" stop-color="#7B97C4"/>
                </linearGradient>
                <linearGradient id="gaugeFill-light" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#3478B0"/>
                  <stop offset="55%"  stop-color="#5B9BD5"/>
                  <stop offset="100%" stop-color="#8FBDE5"/>
                </linearGradient>
                <linearGradient id="gaugeFill-standard" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#1F8B7A"/>
                  <stop offset="55%"  stop-color="#3CB4A0"/>
                  <stop offset="100%" stop-color="#76CCBC"/>
                </linearGradient>
                <linearGradient id="gaugeFill-growth" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#2E7D32"/>
                  <stop offset="55%"  stop-color="#4CAF50"/>
                  <stop offset="100%" stop-color="#81C784"/>
                </linearGradient>
                <linearGradient id="gaugeFill-priority" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#0F4A26"/>
                  <stop offset="55%"  stop-color="#1B7A3E"/>
                  <stop offset="100%" stop-color="#4AA068"/>
                </linearGradient>
                <!-- pathLength MUST live on the shape itself; <use> ignores it. -->
                <path id="gaugePath" d="M 52 168 A 82 82 0 1 1 168 168" fill="none" pathLength="100"/>
              </defs>
              <!-- Track — soft slate on the white surface -->
              <use href="#gaugePath" stroke="rgba(15,23,42,0.08)" stroke-width="28"/>
              <!-- Animated fill -->
              <use href="#gaugePath" stroke="url(#gaugeFill-${gradKey})" stroke-width="28" stroke-dasharray="100 100" stroke-dashoffset="100" class="gauge__fill"/>
              <!-- Tick dividers — match parent background to punch clean segment gaps -->
              <use href="#gaugePath" class="gauge__ticks" stroke-width="32" stroke-dasharray="0.5 6.2"/>
              <!-- Bright leading head -->
              <use href="#gaugePath" stroke="#FFFFFF" stroke-width="34" stroke-dasharray="1 99" stroke-dashoffset="100" class="gauge__head"/>
            </svg>
            <div class="gauge__label" aria-hidden="true">${gaugeLabel}</div>
          </div>
        </aside>`
      : '';

    els.qResult.innerHTML = `
      <div class="quiz__result-text">
        <div class="quiz__result-meta">${escapeHtml(o.meta)}</div>
        <h2 class="quiz__result-title">${escapeHtml(o.title)}</h2>
        <p class="quiz__result-body">${escapeHtml(o.body)}</p>
        ${featuresHtml}
        <div class="quiz__result-actions">
          ${ctaPrimary}
        </div>
        <button type="button" class="quiz__retake" data-quiz-restart>Retake the quiz</button>
      </div>
      ${aside}
    `;
    setState('result');
  }

  function reset() {
    // "Retake the quiz" — restart from Q1 directly, no intro detour.
    // The intro view is now bypassed everywhere (modal opener also
    // auto-advances), so dropping back into the active form keeps the
    // flow consistent.
    qIndex = 0;
    answers.length = 0;
    renderQuestion();
    setState('active');
  }

  // ---------- EVENTS ----------
  // Click handlers — delegated so dynamically-built options work
  quiz.addEventListener('click', (e) => {
    if (e.target.closest('[data-quiz-start]')) {
      qIndex = 0;
      answers.length = 0;
      renderQuestion();
      setState('active');
      return;
    }
    if (e.target.closest('[data-quiz-back]')) {
      goBack();
      return;
    }
    if (e.target.closest('[data-quiz-restart]')) {
      reset();
      return;
    }
    const pick = e.target.closest('[data-q-pick]');
    if (pick) {
      const i = parseInt(pick.getAttribute('data-q-pick'), 10);
      const opt = QUESTIONS[qIndex].options[i];
      // Visual confirmation flash
      [...els.qOptions.querySelectorAll('.quiz__option')].forEach(b => b.classList.remove('is-picked'));
      pick.classList.add('is-picked');
      recordAnswer(opt);
      setTimeout(advance, 220);
    }
  });
})();

/* ============================================================
   QUIZ MODAL — open/close behaviour.
   The quiz card lives inside #quiz-modal, hidden until any
   [data-action="quiz"] click opens it. Closes on backdrop click,
   the close button, the Escape key, or after the user finishes
   the quiz and clicks a CTA that opens the waitlist modal
   (we close the quiz so the waitlist comes forward cleanly).
   ============================================================ */
(function quizModalCtl() {
  const modal = document.getElementById('quiz-modal');
  if (!modal) return;
  const quiz = modal.querySelector('#quiz');

  function open() {
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quiz-modal-open');
    // Visitor already committed by clicking the outer CTA — skip the
    // intro view and drop them straight into question 1. We briefly
    // set state="intro" so the existing start handler can fire from
    // a clean slate, then click [data-quiz-start] which resets answers,
    // renders Q1, and advances state to "active".
    if (quiz) {
      quiz.setAttribute('data-state', 'intro');
      const startBtn = quiz.querySelector('[data-quiz-start]');
      if (startBtn) startBtn.click();
    }
    // Move focus into the modal for screen readers.
    requestAnimationFrame(() => {
      const target = modal.querySelector('.quiz__option, .quiz-modal__close');
      if (target) target.focus({ preventScroll: true });
    });
  }
  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quiz-modal-open');
  }

  // Open triggers
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action="quiz"]');
    if (!trigger) return;
    e.preventDefault();
    open();
  });

  // Close triggers (backdrop + close button)
  modal.addEventListener('click', (e) => {
    if (e.target.closest('[data-quiz-modal-close]')) {
      e.preventDefault();
      close();
    }
  });

  // Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      close();
    }
  });

  // When the quiz CTA fires the waitlist, close the quiz behind it so
  // the waitlist modal isn't stacked on top of an open quiz.
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="waitlist"]') &&
        modal.getAttribute('aria-hidden') === 'false') {
      // Defer so the waitlist handler still sees the original event/context.
      setTimeout(close, 0);
    }
  });
})();

/* ============================================================
   STICKY CTA — invert against dark backgrounds.
   The default sticky pill is slate-900 on the off-white canvas,
   which disappears once it scrolls in front of a dark-band section
   (band-dark / band-blue / footer). On those sections we flip it to
   brand blue so the CTA stays legible at all times.
   ============================================================ */
(function stickyCtaCtl() {
  const cta = document.querySelector('.sticky-cta');
  if (!cta) return;

  // Two band families with distinct contrast needs:
  //   blue  → CTA flips to a white pill (brand-blue on brand-blue is invisible)
  //   dark  → CTA flips to brand blue (slate-900 default disappears on slate-900)
  const blueSections = [...document.querySelectorAll('.band-blue')];
  const darkSections = [...document.querySelectorAll('.band-dark, .footer, .canvas-deep')];
  if (!blueSections.length && !darkSections.length) return;

  function hits(list, y) {
    for (let i = 0; i < list.length; i++) {
      const s = list[i].getBoundingClientRect();
      if (s.top <= y && s.bottom >= y) return true;
    }
    return false;
  }

  let ticking = false;
  function check() {
    ticking = false;
    // getBoundingClientRect on a display:none element returns zeros, so
    // when the CTA is hidden (≥720px) this is a fast no-op.
    const r = cta.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const probeY = r.top + r.height / 2;

    const onBlue = hits(blueSections, probeY);
    const onDark = !onBlue && hits(darkSections, probeY);
    cta.classList.toggle('sticky-cta--on-blue', onBlue);
    cta.classList.toggle('sticky-cta--on-dark', onDark);
  }
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(check);
  }

  window.addEventListener('scroll',  schedule, { passive: true });
  window.addEventListener('resize',  schedule, { passive: true });
  // Re-check after layout shifts (images loading, fonts swapping, etc.)
  window.addEventListener('load',    schedule);
  document.addEventListener('readystatechange', schedule);
  check();
})();
