/* Ryan Dundas — main.js
   - Theme toggle (persisted)
   - Mobile nav
   - Portfolio filter
   - FAQ accordion (one open at a time)
   - Nav scroll behavior + active-section highlighting
   - Smooth scroll for anchor links
   - Contact form (Web3Forms + fetch, inline success / error states)
*/

(function () {
  'use strict';

  /* ---------- HERO VIDEO (respect reduced motion) ---------- */
  const heroVideo = document.getElementById('hero-loop');
  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  /* ---------- VIRTUAL TOUR (click to load) ----------
     The tour iframe (3DVista hosting on net-fs.com) is only created when the visitor
     asks for it, so nothing third-party loads with the page. Without JS the link
     simply opens the tour in a new tab. */
  document.querySelectorAll('.tour-start').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let "open in new tab" work
      e.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.src = link.href;
      iframe.title = link.dataset.tourTitle || 'Virtual tour';
      // Ryan's embed code minus camera/microphone (a tour never needs them) and the
      // non-standard "vr; xr" tokens browsers reject. VR headsets use xr-spatial-tracking.
      iframe.allow = 'fullscreen; accelerometer; gyroscope; magnetometer; xr-spatial-tracking; autoplay';
      iframe.setAttribute('allowfullscreen', '');
      link.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ---------- ANIMATED LOGO (contact) ----------
     Play only while on screen; reduced-motion visitors keep the still poster. */
  const logoVideo = document.querySelector('.contact-logo-video');
  if (logoVideo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            logoVideo.play().catch(() => {});
          } else if (!logoVideo.paused) {
            logoVideo.pause();
          }
        });
      }, { rootMargin: '200px 0px' }).observe(logoVideo);
    } else {
      logoVideo.play().catch(() => {});
    }
  }

  /* ---------- PHOTO VIEWER (V5) ----------
     Click (or Enter/Space on) any On Set, Reality TV or About photo to see it full
     screen. Close with the X, by clicking the photo or the dark area, or with Esc. */
  const lightbox = document.getElementById('lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const lbImg = lightbox.querySelector('.lightbox-img');
    const lbClose = lightbox.querySelector('.lightbox-close');
    let opener = null;
    const openPhoto = (img) => {
      opener = img;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lightbox.showModal();
      document.documentElement.classList.add('lightbox-open');
      lbClose.focus();
    };
    const closePhoto = () => { if (lightbox.open) lightbox.close(); };
    lightbox.addEventListener('close', () => {
      document.documentElement.classList.remove('lightbox-open');
      lbImg.src = 'data:,';
      if (opener) opener.focus({ preventScroll: true });
    });
    lbClose.addEventListener('click', closePhoto);
    lbImg.addEventListener('click', closePhoto);
    // The dialog fills the screen; a click that lands on it (not the photo or X) is the backdrop.
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closePhoto(); });

    document.querySelectorAll('.onset-item img, .rtv-photo img, .about-photo img, .about-gallery img').forEach((img) => {
      img.classList.add('zoomable');
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'View full screen: ' + (img.alt || 'photo'));
      img.addEventListener('click', () => openPhoto(img));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhoto(img); }
      });
    });
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

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;

      tabs.forEach(t => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-pressed', String(active));
      });

      // Switching filters always exits the "collapsed" state so every match shows.
      grid && grid.classList.remove('collapsed');

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

      updateShowMore();
    });
  });

  /* ---------- SHOW MORE (cap the default grid, filters still reveal all) ---------- */
  const grid = document.querySelector('#work .video-grid');
  const showMoreBtn = document.getElementById('work-show-more');
  const COLLAPSE_AT = 9; // show this many before "Show more" appears (All view only)

  // Only meaningful on the "All" view; other filters show their full (small) set.
  const updateShowMore = () => {
    if (!grid || !showMoreBtn) return;
    const activeTab = document.querySelector('.filter-tab.active');
    const isAll = !activeTab || activeTab.dataset.filter === 'all';
    const total = cards.length;
    if (isAll && total > COLLAPSE_AT) {
      grid.classList.add('collapsed');
      showMoreBtn.hidden = false;
      showMoreBtn.textContent = 'Show all work';
      showMoreBtn.setAttribute('aria-expanded', 'false');
    } else {
      grid.classList.remove('collapsed');
      showMoreBtn.hidden = true;
    }
  };

  if (showMoreBtn && grid) {
    showMoreBtn.addEventListener('click', () => {
      grid.classList.remove('collapsed');
      showMoreBtn.hidden = true;
      showMoreBtn.setAttribute('aria-expanded', 'true');
    });
    updateShowMore();
  }

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

  /* ---------- CONTACT EMAIL (assembled at runtime; kept out of static HTML) ----------
     Ryan's address (dundasmediaservices@ since V4, 2026-11-06) is base64-encoded so it never appears as plaintext in the page
     source. We decode it here to wire the mailto link(s), which defeats the
     overwhelming majority of email-harvesting scrapers. (The form no longer needs
     the address at all: Web3Forms routes by access key.) */
  const CONTACT_EMAIL = (() => { try { return atob('ZHVuZGFzbWVkaWFzZXJ2aWNlc0BnbWFpbC5jb20='); } catch (e) { return ''; } })();

  // Reveal the real mailto on the contact link(s).
  document.querySelectorAll('.js-email').forEach((a) => {
    if (!CONTACT_EMAIL) return;
    a.href = 'mailto:' + CONTACT_EMAIL;
    a.textContent = CONTACT_EMAIL;
  });

  /* ---------- CONTACT FORM (Web3Forms AJAX → Ryan's inbox) ----------
     Switched from FormSubmit on 2026-11-06 after a multi-hour FormSubmit outage.
     The access key lives in the form's hidden "access_key" input (public by design).
     Success shows the thank-you panel; ANY failure (service down, network error,
     rejected submission) shows an inline "email me directly" message instead of
     sending the visitor to an error page, so no inquiry is silently lost. */
  const form = document.getElementById('contact-form');
  const successEl = document.getElementById('contact-success');
  const errorEl = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');
  const FORM_ENDPOINT = 'https://api.web3forms.com/submit';

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!submitBtn) return;

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      if (errorEl) errorEl.hidden = true;

      const data = {};
      new FormData(form).forEach((v, k) => { data[k] = v; });

      const showError = () => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        if (errorEl) errorEl.hidden = false;
      };

      // Give up after 20 s so a hung service never leaves "Sending…" forever.
      const controller = 'AbortController' in window ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 20000) : null;

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
        signal: controller ? controller.signal : undefined,
      })
        .then(async (res) => {
          let json = {};
          try { json = await res.json(); } catch (err) { /* non-JSON error page */ }
          if (res.ok && json && (json.success === true || json.success === 'true')) {
            form.hidden = true;
            if (successEl) successEl.hidden = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          } else {
            showError();
          }
        })
        .catch(showError)
        .finally(() => { if (timer) clearTimeout(timer); });
    });
  }

  /* ---------- SCROLL REVEAL (staggered, one-shot, hover-safe) ---------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealSelector = [
    // Hero copy is excluded: it has its own 10s CSS intro (styles.css "Hero intro").
    '.trust-tv', '.logo-bar', '.featured-item',
    '.section-header', '.reel-frame', '.video-card',
    '.onset-item', '.rtv-copy', '.rtv-photo', '.crew-roles',
    '.service-card', '.process-step', '.about-photo',
    '.about-text', '.about-gallery figure', '.tour-embed', '.tour-explainer',
    '.contact-form', '.contact-details'
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
