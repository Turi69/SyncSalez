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
