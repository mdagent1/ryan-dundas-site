/* Ryan Dundas — main.js
   - Theme toggle (persisted)
   - Mobile nav
   - Portfolio filter
   - FAQ accordion (one open at a time)
   - Nav scroll behavior + active-section highlighting
   - Smooth scroll for anchor links
   - Contact form (Netlify Forms + fetch + JS fallback success state)
*/

(function () {
  'use strict';

  /* ---------- HERO VIDEO (respect reduced motion) ---------- */
  const heroVideo = document.getElementById('hero-loop');
  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  /* ---------- THEME TOGGLE ---------- */
  const themeBtn = document.getElementById('theme-toggle');
  const html = document.documentElement;

  const updateThemeLabel = () => {
    if (!themeBtn) return;
    const isLight = html.classList.contains('light');
    themeBtn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
  };
  updateThemeLabel();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      // Suppress transitions across the swap so every themed color recomputes
      // instantly (transitioned var() changes otherwise get stuck in Chromium).
      html.classList.add('theme-switching');
      // Commit the no-transition state BEFORE changing the theme variables.
      void getComputedStyle(html).backgroundColor;
      const isLight = html.classList.toggle('light');
      try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) {}
      updateThemeLabel();
      // Commit the new themed values while transitions are still off, then
      // re-enable transitions on the next frame for normal hover behavior.
      void getComputedStyle(html).backgroundColor;
      requestAnimationFrame(() => html.classList.remove('theme-switching'));
    });
  }

  /* ---------- MOBILE NAV ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const body = document.body;

  const closeMenu = () => {
    body.classList.remove('nav-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');
  };

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const isOpen = body.classList.toggle('nav-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      if (mobileMenu) mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    });
  }
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMenu();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('nav-open')) closeMenu();
  });

  /* ---------- PORTFOLIO FILTER (scoped to the Work section) ---------- */
  const tabs = document.querySelectorAll('.filter-tab');
  const cards = document.querySelectorAll('#work .video-card');
  const adsNote = document.querySelector('.ads-note[data-note="ads"]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;

      tabs.forEach(t => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });

      let shown = 0;
      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !match);
        // Re-fade the cards that are now visible, with a light stagger.
        card.classList.remove('refade');
        if (match) {
          const idx = shown++;
          // Force reflow so the animation restarts, then apply.
          void card.offsetWidth;
          card.style.animationDelay = Math.min(idx, 8) * 45 + 'ms';
          card.classList.add('refade');
        }
      });

      // Show the "opens in Drive" note only while viewing Social Ads
      if (adsNote) adsNote.hidden = !(filter === 'ads' || filter === 'all');
    });
  });

  /* ---------- FAQ ACCORDION ---------- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-q');
    const answer = item.querySelector('.faq-a');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all others
      faqItems.forEach(other => {
        if (other !== item) {
          const ob = other.querySelector('.faq-q');
          const oa = other.querySelector('.faq-a');
          if (ob) ob.setAttribute('aria-expanded', 'false');
          if (oa) oa.classList.remove('open');
        }
      });

      btn.setAttribute('aria-expanded', String(!isOpen));
      answer.classList.toggle('open', !isOpen);
    });
  });

  /* ---------- NAV SCROLL BEHAVIOR ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 80);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Section highlighting via IntersectionObserver */
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-40% 0px -50% 0px' });

    sections.forEach(s => obs.observe(s));
  }

  /* ---------- SMOOTH SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Close mobile menu if open
      if (body.classList.contains('nav-open')) closeMenu();
    });
  });

  /* ---------- CONTACT FORM (FormSubmit AJAX → Ryan's inbox) ---------- */
  const form = document.getElementById('contact-form');
  const successEl = document.getElementById('contact-success');
  const submitBtn = document.getElementById('submit-btn');
  // AJAX endpoint mirrors the form's action so submissions email Ryan without a page redirect.
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/dundasrw@gmail.com';

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!submitBtn) return;

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      const formData = new FormData(form);
      const data = {};
      formData.forEach((v, k) => { data[k] = v; });

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json && (json.success === true || json.success === 'true')) {
            form.hidden = true;
            if (successEl) successEl.hidden = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          } else {
            // e.g. first-time activation pending — fall back to a full submit
            // so FormSubmit's own flow (and confirmation) can complete.
            form.submit();
          }
        })
        .catch(() => {
          // Network/CORS issue: fall back to a normal form POST so the
          // message still goes through (uses the form's action + _next).
          form.submit();
        });
    });
  }

  /* ---------- SCROLL REVEAL (staggered, one-shot, hover-safe) ---------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSelector = [
    '.hero-content > *', '.trust-tv', '.logo-bar', '.featured-item',
    '.section-header', '.reel-frame', '.video-card',
    '.onset-item', '.service-card', '.process-step', '.about-photo',
    '.about-text', '.about-gallery figure', '.contact-form', '.contact-details'
  ].join(',');
  const revealEls = Array.from(document.querySelectorAll(revealSelector));

  // Reveal one element, then exempt it (.rvd) once done so hover transforms work.
  const reveal = (el) => {
    const i = parseInt(el.dataset.revealIndex || '0', 10);
    el.style.transitionDelay = Math.min(i, 6) * 80 + 'ms';
    el.classList.add('is-visible');
    const done = (ev) => {
      if (ev && ev.propertyName && ev.propertyName !== 'opacity') return;
      el.classList.add('rvd');
      el.classList.remove('is-visible');
      el.style.transitionDelay = '';
      el.removeEventListener('transitionend', done);
    };
    el.addEventListener('transitionend', done);
    // Safety net in case transitionend never fires.
    setTimeout(done, 1400);
  };

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('rvd')); // show, no animation
  } else {
    // Stagger index among reveal siblings sharing a parent.
    const groupCount = new Map();
    revealEls.forEach(el => {
      const parent = el.parentElement;
      const n = groupCount.get(parent) || 0;
      el.dataset.revealIndex = n;
      groupCount.set(parent, n + 1);
    });

    const pending = new Set();
    const revealObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        pending.delete(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    const vh0 = window.innerHeight || document.documentElement.clientHeight;
    revealEls.forEach(el => {
      // Already in view or scrolled past (reload mid-page) → reveal now; else observe.
      if (el.getBoundingClientRect().top < vh0 * 0.9) {
        reveal(el);
      } else {
        pending.add(el);
        revealObs.observe(el);
      }
    });

    // Fallback: fast/programmatic scrolling can skip IntersectionObserver samples,
    // so a throttled scroll sweep guarantees nothing is left stranded off-screen.
    let ticking = false;
    const sweep = () => {
      ticking = false;
      if (!pending.size) return;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      pending.forEach(el => {
        if (el.getBoundingClientRect().top < vh * 0.88) {
          reveal(el);
          pending.delete(el);
          revealObs.unobserve(el);
        }
      });
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(sweep); }
    }, { passive: true });
  }
})();
