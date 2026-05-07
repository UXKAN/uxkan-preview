/* ============================================================
   UXKAN — Homepage interactivity
   - Banner dismiss
   - Sticky-nav scroll state
   - Mobile menu
   - Intersection-observer reveals
   - Smooth scroll & back-to-top
   - Hero parallax (pointer)
   - Case-study stacking scroll
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineMq = window.matchMedia("(pointer:fine)");

  /* ---------- Sticky nav scroll state ----------
     rAF-throttled with hysteresis (12px on, 4px off) to prevent
     class-flapping at the threshold. */
  const navwrap = document.getElementById("navwrap");
  if (navwrap) {
    let navTicking = false;
    let navIsScrolled = false;
    const onScroll = () => {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(() => {
        navTicking = false;
        const y = window.scrollY;
        if (!navIsScrolled && y > 12) {
          navIsScrolled = true;
          navwrap.classList.add("is-scrolled");
        } else if (navIsScrolled && y < 4) {
          navIsScrolled = false;
          navwrap.classList.remove("is-scrolled");
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const mobileMenu = document.getElementById("mobile-menu");
  const menuToggles = document.querySelectorAll("[data-menu-toggle]");
  function setMenu(open) {
    if (!mobileMenu) return;
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
    document.documentElement.style.overflow = open ? "hidden" : "";
    document.querySelectorAll(".nav__menu-toggle").forEach(b => {
      b.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  menuToggles.forEach(btn => btn.addEventListener("click", () => {
    setMenu(!mobileMenu.classList.contains("is-open"));
  }));
  document.querySelectorAll("[data-menu-close]").forEach(a => {
    a.addEventListener("click", () => setMenu(false));
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && mobileMenu && mobileMenu.classList.contains("is-open")) setMenu(false);
  });

  /* ---------- Intersection-observer reveals ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add("is-in"));
  }

  /* ---------- Back to top ---------- */
  document.querySelectorAll("[data-back-to-top]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth"
      });
    });
  });

  /* ---------- Pause animations when their section is offscreen ----------
     Saves GPU work and prevents continuous animation behind the
     sticky nav (which would force backdrop-filter recompute every frame). */
  if ("IntersectionObserver" in window) {
    const pauseTargets = [
      { sectionSel: ".hero", animatedSel: ".hero__bg-bubbles" },
      { sectionSel: ".hero", animatedSel: ".hero__showcase" },
      { sectionSel: ".intro", animatedSel: ".trusted__row" },
    ];
    pauseTargets.forEach(({ sectionSel, animatedSel }) => {
      const section = document.querySelector(sectionSel);
      const animated = section ? section.querySelector(animatedSel) : null;
      if (!section || !animated) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          animated.classList.toggle("is-paused", !entry.isIntersecting);
        });
      }, { threshold: 0, rootMargin: "100px" });
      io.observe(section);
    });
  }

  /* ---------- Case studies — stacking scroll ----------
     The transform is applied to .case-card__inner (not the
     sticky parent) so the sticky positioning stays stable
     and we don't repaint the sticky box on every frame.
  -------------------------------------------------------- */
  const stack = document.querySelector("[data-cases-stack]");
  if (stack && !reduceMotion && window.matchMedia("(min-width: 761px)").matches) {
    const cards = Array.from(stack.querySelectorAll(".case-card"));
    if (cards.length > 1) {
      const inners = cards.map(c => c.querySelector(".case-card__inner"));
      let ticking = false;
      let lastValues = cards.map(() => ({ s: 1, t: 0 }));

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const viewportH = window.innerHeight;

          cards.forEach((card, i) => {
            const next = cards[i + 1];
            const inner = inners[i];
            if (!next || !inner) {
              if (inner && lastValues[i].s !== 1) {
                inner.style.setProperty("--case-scale", "1");
                inner.style.setProperty("--case-translate", "0px");
                lastValues[i] = { s: 1, t: 0 };
              }
              return;
            }

            const nextRect = next.getBoundingClientRect();
            const start = viewportH;
            const end = nextRect.height * 0.6;
            const range = start - end;
            const progress = clamp01((start - nextRect.top) / range);

            const scale = 1 - progress * 0.06;
            const translate = -progress * 18;

            // skip DOM writes when value hasn't meaningfully changed
            if (Math.abs(scale - lastValues[i].s) < 0.001 &&
                Math.abs(translate - lastValues[i].t) < 0.5) return;

            inner.style.setProperty("--case-scale", scale.toFixed(4));
            inner.style.setProperty("--case-translate", `${translate.toFixed(2)}px`);
            lastValues[i] = { s: scale, t: translate };
          });
        });
      };

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
    }
  }

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  /* ---------- Bento — mouse-reactive glow ----------
     Sets --mx/--my CSS vars on each card from pointer position.
     Skipped on coarse pointers (mobile/tablet) and reduced-motion. */
  if (!reduceMotion && fineMq.matches) {
    const bentoCards = document.querySelectorAll("[data-bento-card]");
    if (bentoCards.length) {
      let bentoTicking = false;
      let pending = null;

      const flush = () => {
        bentoTicking = false;
        if (!pending) return;
        const { card, x, y } = pending;
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
        pending = null;
      };

      bentoCards.forEach(card => {
        card.addEventListener("pointermove", (e) => {
          const rect = card.getBoundingClientRect();
          pending = {
            card,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          if (!bentoTicking) {
            bentoTicking = true;
            requestAnimationFrame(flush);
          }
        });
        card.addEventListener("pointerleave", () => {
          card.style.removeProperty("--mx");
          card.style.removeProperty("--my");
        });
      });
    }
  }

  /* ---------- Bento — pause background orbs offscreen ---------- */
  if ("IntersectionObserver" in window) {
    const bentoSec = document.querySelector(".section.bento");
    if (bentoSec) {
      const orbs = bentoSec.querySelectorAll(".bento__bg-orb");
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          orbs.forEach(o => o.style.animationPlayState = entry.isIntersecting ? "running" : "paused");
        });
      }, { threshold: 0, rootMargin: "100px" });
      io.observe(bentoSec);
    }
  }

})();
