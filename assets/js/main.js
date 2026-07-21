(() => {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const toast = document.querySelector("[data-toast]");
  const years = document.querySelectorAll("[data-year]");
  const staticSubmit = document.querySelector("[data-static-submit]");
  const videoShell = document.querySelector("[data-video-shell]");
  const videoPlay = document.querySelector("[data-video-play]");
  const pageLang = document.documentElement.lang || "en";
  const langSwitcher = document.querySelector("[data-lang-switcher]");
  const i18n = {
    en: { openMenu: "Open menu", closeMenu: "Close menu" },
    ar: { openMenu: "فتح القائمة", closeMenu: "إغلاق القائمة" },
  };
  const t = i18n[pageLang] || i18n.en;

  function getCurrentLang() {
    const path = window.location.pathname || "";
    const htmlLang = (document.documentElement.lang || "en").toLowerCase();
    const inArFolder =
      /\/ar\//i.test(path) ||
      /\\ar\\/.test(path) ||
      path.endsWith("/ar") ||
      path.endsWith("\\ar");
    return inArFolder || htmlLang.startsWith("ar") ? "ar" : "en";
  }

  function getCurrentPageFile() {
    const path = window.location.pathname || "";
    return path.endsWith("/") || path.endsWith("\\")
      ? "index.html"
      : (path.split(/[/\\]/).pop() || "index.html");
  }

  function setupLangSwitcher() {
    if (!langSwitcher) return;
    const isAr = getCurrentLang() === "ar";
    const file = getCurrentPageFile();
    const enBtn = langSwitcher.querySelector('[data-lang="en"]');
    const arBtn = langSwitcher.querySelector('[data-lang="ar"]');
    const enHref = isAr ? `../${file}` : file;
    const arHref = isAr ? file : `ar/${file}`;

    if (enBtn) {
      enBtn.href = enHref;
      enBtn.classList.toggle("is-active", !isAr);
      if (!isAr) enBtn.setAttribute("aria-current", "page");
      else enBtn.removeAttribute("aria-current");
    }
    if (arBtn) {
      arBtn.href = arHref;
      arBtn.classList.toggle("is-active", isAr);
      if (isAr) arBtn.setAttribute("aria-current", "page");
      else arBtn.removeAttribute("aria-current");
    }
  }

  function setNavOpen(isOpen) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? t.closeMenu : t.openMenu);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.contains("is-open");
      setNavOpen(!isOpen);
    });

    nav.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("a")) setNavOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setNavOpen(false);
    });
  }

  // Subtle sticky-header shadow when scrolling.
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  setupLangSwitcher();

  // Footer year (static site-friendly).
  if (years.length) {
    const y = String(new Date().getFullYear());
    years.forEach((n) => (n.textContent = y));
  }

  // Demo form submit (legacy pages only; contact page uses contact-form.js).
  if (staticSubmit && toast && !document.querySelector("[data-contact-form]")) {
    staticSubmit.addEventListener("click", () => {
      toast.hidden = false;
      toast.textContent = "Thanks! This is a static demo (no backend).";
      window.clearTimeout(window.__gtsToastTimer);
      window.__gtsToastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 2200);
    });
  }

  // Video intro — custom play only (no native controls / dual play buttons).
  if (videoShell && videoPlay) {
    const video = videoShell.querySelector("video");
    if (video) {
      video.removeAttribute("controls");
      video.controls = false;

      async function playVideo() {
        try {
          await video.play();
          videoShell.classList.add("is-playing");
        } catch {
          // ignore (browser may block without user gesture)
        }
      }

      function pauseVideo() {
        video.pause();
        videoShell.classList.remove("is-playing");
      }

      videoPlay.addEventListener("click", (e) => {
        e.stopPropagation();
        if (video.paused) playVideo();
        else pauseVideo();
      });

      // Tap the video surface to pause; resume via custom play button only.
      video.addEventListener("click", () => {
        if (!video.paused) pauseVideo();
      });

      video.addEventListener("play", () => videoShell.classList.add("is-playing"));
      video.addEventListener("pause", () => videoShell.classList.remove("is-playing"));
      video.addEventListener("ended", () => {
        videoShell.classList.remove("is-playing");
        try {
          video.currentTime = 0;
        } catch {
          /* ignore */
        }
      });
    }
  }

  // Laser Screed — autoplay muted video when in view.
  const laserVideos = document.querySelectorAll("[data-laser-video]");
  if (laserVideos.length) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    laserVideos.forEach((video) => {
      if (!(video instanceof HTMLVideoElement)) return;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;

      if (prefersReducedMotion) return;

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              video.play().catch(() => {});
            } else {
              video.pause();
            }
          });
        },
        { threshold: 0.35 }
      );
      io.observe(video);
    });
  }

  // About page — statistics count-up on scroll (update data-count-end / data-count-suffix per card)
  const aboutStats = document.querySelector("[data-about-stats]");
  if (aboutStats) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const statCards = [...aboutStats.querySelectorAll(".about-stat-card")];

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function revealStatCard(card) {
      card.classList.add("is-visible", "is-counted");
    }

    function setCardFinal(card) {
      const end = Number(card.dataset.countEnd) || 0;
      const suffix = card.dataset.countSuffix || "";
      const display = card.querySelector("[data-count-display]");
      const suffixEl = card.querySelector("[data-count-suffix-el]");
      if (display) display.textContent = String(end);
      if (suffixEl) suffixEl.textContent = suffix;
      card.classList.add("is-visible", "is-counted");
    }

    function runCountUp(card) {
      if (card.classList.contains("is-counted")) return;
      const end = Number(card.dataset.countEnd) || 0;
      const suffix = card.dataset.countSuffix || "";
      const display = card.querySelector("[data-count-display]");
      const suffixEl = card.querySelector("[data-count-suffix-el]");
      if (!display) return;

      card.classList.add("is-counted");
      if (prefersReducedMotion || end <= 0) {
        setCardFinal(card);
        return;
      }

      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const value = Math.round(end * easeOutCubic(t));
        display.textContent = String(value);
        if (suffixEl) suffixEl.textContent = suffix;
        if (t < 1) requestAnimationFrame(tick);
        else display.textContent = String(end);
      }

      requestAnimationFrame(tick);
    }

    if (prefersReducedMotion) {
      statCards.forEach((card) => {
        if (card.hasAttribute("data-stat-cert")) revealStatCard(card);
        else setCardFinal(card);
      });
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const card = entry.target;
            if (card.hasAttribute("data-stat-cert")) revealStatCard(card);
            else {
              card.classList.add("is-visible");
              runCountUp(card);
            }
            io.unobserve(card);
          });
        },
        { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
      );
      statCards.forEach((card) => io.observe(card));
    } else {
      statCards.forEach((card) => {
        if (card.hasAttribute("data-stat-cert")) revealStatCard(card);
        else {
          card.classList.add("is-visible");
          setCardFinal(card);
        }
      });
    }
  }

  // About page — Mission & Vision card reveal
  const aboutMv = document.querySelector("[data-about-mv]");
  if (aboutMv) {
    const mvCards = [...aboutMv.querySelectorAll(".about-mv-card")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      mvCards.forEach((card) => card.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const mvIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            mvIo.unobserve(entry.target);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
      );
      mvCards.forEach((card) => mvIo.observe(card));
    } else {
      mvCards.forEach((card) => card.classList.add("is-visible"));
    }
  }

  // About page — timeline reveal on scroll
  const aboutTimeline = document.querySelector("[data-about-timeline]");
  if (aboutTimeline) {
    const timelineItems = [...aboutTimeline.querySelectorAll(".about-timeline-item")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      timelineItems.forEach((item) => item.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const timelineIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            timelineIo.unobserve(entry.target);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
      );
      timelineItems.forEach((item) => timelineIo.observe(item));
    } else {
      timelineItems.forEach((item) => item.classList.add("is-visible"));
    }
  }

  // About page — Why Choose GTS card reveal
  const aboutWhy = document.querySelector("[data-about-why]");
  if (aboutWhy) {
    const whyCards = [...aboutWhy.querySelectorAll(".about-why-card")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      whyCards.forEach((card) => card.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const whyIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            whyIo.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
      );
      whyCards.forEach((card) => whyIo.observe(card));
    } else {
      whyCards.forEach((card) => card.classList.add("is-visible"));
    }
  }

  // About page — Industries We Serve card reveal
  const aboutIndustries = document.querySelector("[data-about-industries]");
  if (aboutIndustries) {
    const industryCards = [...aboutIndustries.querySelectorAll(".about-industry-card")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      industryCards.forEach((card) => card.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const industriesIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            industriesIo.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
      );
      industryCards.forEach((card) => industriesIo.observe(card));
    } else {
      industryCards.forEach((card) => card.classList.add("is-visible"));
    }
  }

  // About page — Certifications card reveal
  const aboutCert = document.querySelector("[data-about-cert]");
  if (aboutCert) {
    const certCards = [...aboutCert.querySelectorAll(".about-cert-card")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      certCards.forEach((card) => card.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const certIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            certIo.unobserve(entry.target);
          });
        },
        { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
      );
      certCards.forEach((card) => certIo.observe(card));
    } else {
      certCards.forEach((card) => card.classList.add("is-visible"));
    }
  }

  // About page — Leadership card reveal
  const aboutLeadership = document.querySelector("[data-about-leadership]");
  if (aboutLeadership) {
    const leaderCards = [...aboutLeadership.querySelectorAll(".about-leader-card")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      leaderCards.forEach((card) => card.classList.add("is-visible"));
    } else if ("IntersectionObserver" in window) {
      const leaderIo = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            leaderIo.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
      );
      leaderCards.forEach((card) => leaderIo.observe(card));
    } else {
      leaderCards.forEach((card) => card.classList.add("is-visible"));
    }
  }

  document.querySelectorAll("[data-projects-carousel]").forEach((projectCarousel) => {
    const viewport = projectCarousel.querySelector("[data-projects-viewport]");
    const prevBtn = projectCarousel.querySelector("[data-carousel-prev]");
    const nextBtn = projectCarousel.querySelector("[data-carousel-next]");
    if (!viewport || !prevBtn || !nextBtn) return;

    const slides = () => [...viewport.querySelectorAll(".projects-carousel-slide")];
    const isRtl = () => getComputedStyle(viewport).direction === "rtl";

    function updateActiveSlide() {
      const list = slides();
      if (!list.length) return;
      const vRect = viewport.getBoundingClientRect();
      const vCenter = vRect.left + vRect.width / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      list.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - vCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      list.forEach((el, i) => el.classList.toggle("is-active", i === bestIdx));
    }

    function updateCarouselButtons() {
      updateActiveSlide();
      const idx = getActiveIndex();
      const len = slides().length;
      const atStart = idx <= 0;
      const atEnd = idx >= len - 1;
      if (isRtl()) {
        // Left chevron advances, right chevron goes back
        prevBtn.disabled = atEnd;
        nextBtn.disabled = atStart;
      } else {
        prevBtn.disabled = atStart;
        nextBtn.disabled = atEnd;
      }
    }

    function getActiveIndex() {
      const list = slides();
      const idx = list.findIndex((el) => el.classList.contains("is-active"));
      return idx >= 0 ? idx : 0;
    }

    function scrollToSlide(index, behavior = "smooth") {
      const list = slides();
      const el = list[index];
      if (!el) return;

      const vRect = viewport.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const rtl = isRtl();
      let delta;

      // First slide: pin to the inline-start edge (left in LTR, right in RTL).
      if (index === 0 || el.classList.contains("is-first")) {
        delta = rtl ? eRect.right - vRect.right : eRect.left - vRect.left;
      } else {
        const eCenter = eRect.left + eRect.width / 2;
        const vCenter = vRect.left + vRect.width / 2;
        delta = eCenter - vCenter;
      }

      viewport.scrollTo({ left: viewport.scrollLeft + delta, behavior });
    }

    function scrollCarousel(dir) {
      const list = slides();
      if (!list.length) return;
      const nextIndex = Math.min(list.length - 1, Math.max(0, getActiveIndex() + dir));
      scrollToSlide(nextIndex);
    }

    prevBtn.addEventListener("click", () => scrollCarousel(isRtl() ? 1 : -1));
    nextBtn.addEventListener("click", () => scrollCarousel(isRtl() ? -1 : 1));

    let carouselScrollTid = 0;
    viewport.addEventListener(
      "scroll",
      () => {
        window.clearTimeout(carouselScrollTid);
        carouselScrollTid = window.setTimeout(updateCarouselButtons, 48);
        updateCarouselButtons();
      },
      { passive: true }
    );

    viewport.addEventListener("keydown", (e) => {
      const rtl = isRtl();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollCarousel(rtl ? 1 : -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollCarousel(rtl ? -1 : 1);
      }
    });

    window.addEventListener(
      "resize",
      () => window.requestAnimationFrame(() => {
        scrollToSlide(getActiveIndex(), "auto");
        updateCarouselButtons();
      }),
      { passive: true }
    );

    scrollToSlide(0, "auto");
    updateCarouselButtons();
  });
})();
