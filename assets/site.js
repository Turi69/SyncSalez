// SyncSalez site interactions

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

    // body — clone each .nav__item
    const body = document.createElement('div');
    body.className = 'nav-overlay__body';
    if (links) {
      Array.from(links.children).forEach(item => {
        if (item.classList && item.classList.contains('has-dropdown')) {
          const group = document.createElement('div');
          group.className = 'nav-overlay__group';
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
          body.appendChild(a);
        }
      });
    }
    overlay.appendChild(body);

    // foot — primary CTA + login
    const foot = document.createElement('div');
    foot.className = 'nav-overlay__foot';
    if (cta) {
      const login = cta.querySelector('.nav__login');
      const primary = cta.querySelector('.btn--primary');
      if (primary) {
        const cloned = primary.cloneNode(true);
        cloned.classList.remove('btn--sm');
        cloned.addEventListener('click', closeMenu);
        foot.appendChild(cloned);
      }
      if (login) {
        const cloned = login.cloneNode(true);
        cloned.className = 'nav-overlay__login';
        cloned.addEventListener('click', closeMenu);
        foot.appendChild(cloned);
      }
    }
    overlay.appendChild(foot);
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
   - Opens on any [data-action="waitlist"] click
   - POSTs as text/plain to dodge CORS preflight (Apps Script accepts
     and parses the body as JSON server-side)
   - Falls back to a simulated success when endpoint is the placeholder
     so the UI is testable before the backend is wired up
   ============================================================ */
(() => {
  const modal = document.getElementById('waitlist');
  if (!modal) return;

  const PLACEHOLDER = 'REPLACE_WITH_APPS_SCRIPT_URL';
  const endpoint = modal.dataset.endpoint;
  const isConfigured = endpoint && endpoint !== PLACEHOLDER;

  const form = modal.querySelector('#waitlist-form');
  const submitBtn = modal.querySelector('.waitlist__submit');
  const views = {
    form:    modal.querySelector('[data-view="form"]'),
    success: modal.querySelector('[data-view="success"]'),
    error:   modal.querySelector('[data-view="error"]'),
  };
  const errorMsg = modal.querySelector('.waitlist__error-msg');

  let lastFocus = null;

  function showView(name) {
    Object.entries(views).forEach(([k, el]) => { el.hidden = (k !== name); });
  }

  function open(trigger) {
    lastFocus = trigger || document.activeElement;
    showView('form');
    submitBtn.classList.remove('is-loading');
    submitBtn.disabled = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('waitlist-open');
    setTimeout(() => {
      const first = modal.querySelector('input, select');
      if (first) first.focus();
    }, 50);
  }

  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('waitlist-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Open triggers — any element with data-action="waitlist"
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action="waitlist"]');
    if (trigger) {
      e.preventDefault();
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
      submitBtn.disabled = false;
    }
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      close();
    }
  });

  // Lightweight client-side validation
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validate(data) {
    if (!data.name || data.name.trim().length < 2) return 'Please enter your full name.';
    if (!data.email || !EMAIL_RE.test(data.email)) return 'Please enter a valid email address.';
    // very forgiving phone check: must contain at least 8 digits
    const digits = (data.phone || '').replace(/\D/g, '');
    if (digits.length < 8) return 'Please enter a valid WhatsApp number.';
    if (!data.location || data.location.trim().length < 2) return 'Please enter your location.';
    if (!data.category) return 'Please pick a business category.';
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      name:     (fd.get('name') || '').toString().trim(),
      email:    (fd.get('email') || '').toString().trim(),
      phone:    (fd.get('phone') || '').toString().trim(),
      location: (fd.get('location') || '').toString().trim(),
      category: (fd.get('category') || '').toString().trim(),
      // Useful context for the sheet
      submittedAt: new Date().toISOString(),
      pageUrl: location.href,
      userAgent: navigator.userAgent,
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
      }
      showView('success');
    } catch (err) {
      console.error('[waitlist] submit failed', err);
      errorMsg.innerHTML = 'Please try again. If it keeps happening, reach us at <a href="mailto:hello@syncsalez.com">hello@syncsalez.com</a>.';
      showView('error');
    } finally {
      submitBtn.classList.remove('is-loading');
      submitBtn.disabled = false;
    }
  });
})();
