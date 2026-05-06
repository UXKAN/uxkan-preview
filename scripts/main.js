/* ============================================================
   UXKAN — Homepage interactivity.
   Banner dismiss, sticky-nav scroll state, mobile menu, tabs,
   intersection-observer reveals, smooth scroll, back-to-top.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Banner dismiss ---------- */
  const banner = document.getElementById("banner");
  const bannerKey = "uxkan:banner-dismissed-v1";
  if (banner) {
    if (sessionStorage.getItem(bannerKey) === "1") banner.hidden = true;
    banner.addEventListener("click", function (e) {
      const target = e.target.closest("[data-dismiss='banner']");
      if (!target) return;
      banner.hidden = true;
      try { sessionStorage.setItem(bannerKey, "1"); } catch (_) {}
    });
  }

  /* ---------- Sticky nav scroll state ---------- */
  const navwrap = document.getElementById("navwrap");
  if (navwrap) {
    const onScroll = () => {
      navwrap.classList.toggle("is-scrolled", window.scrollY > 8);
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

  /* ---------- Tabs (keyboard accessible) ---------- */
  const tabs = Array.from(document.querySelectorAll("[role='tab']"));
  const panels = Array.from(document.querySelectorAll("[role='tabpanel']"));
  function activateTab(tab, focus) {
    tabs.forEach(t => {
      const isActive = t === tab;
      t.setAttribute("aria-selected", isActive ? "true" : "false");
      t.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach(p => {
      const isActive = p.id === tab.getAttribute("aria-controls");
      p.hidden = !isActive;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(tab => {
    tab.addEventListener("click", () => activateTab(tab, false));
    tab.addEventListener("keydown", e => {
      const i = tabs.indexOf(tab);
      if (e.key === "ArrowRight") { e.preventDefault(); activateTab(tabs[(i + 1) % tabs.length], true); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); activateTab(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      if (e.key === "Home")       { e.preventDefault(); activateTab(tabs[0], true); }
      if (e.key === "End")        { e.preventDefault(); activateTab(tabs[tabs.length - 1], true); }
    });
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
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add("is-in"));
  }

  /* ---------- Back to top ---------- */
  document.querySelectorAll("[data-back-to-top]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  /* ---------- Subtle hero parallax (pointer-driven) ---------- */
  const hero = document.querySelector(".hero");
  const visualCards = document.querySelectorAll(".hero__visual-card");
  if (hero && visualCards.length && window.matchMedia("(pointer:fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let raf = 0;
    let tx = 0, ty = 0;
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener("pointerleave", () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    function apply() {
      raf = 0;
      visualCards.forEach((card, i) => {
        const depth = (i + 1) * 4;
        card.style.translate = `${tx * depth}px ${ty * depth - (i % 2 ? 4 : 0)}px`;
      });
    }
  }
})();
