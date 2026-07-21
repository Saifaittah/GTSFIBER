(() => {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const panel = document.querySelector("[data-contact-panel]");
  const feedback = form.querySelector("[data-contact-feedback]");
  const submitBtn = form.querySelector("[data-contact-submit]");
  const submitLabel = form.querySelector("[data-contact-submit-label]");
  const spinner = form.querySelector("[data-contact-spinner]");
  const lang = document.documentElement.lang === "ar" ? "ar" : "en";

  const copy = {
    en: {
      sending: "Sending…",
      submit: "Request Consultation",
      success: "Thank you. Your inquiry has been sent successfully. Our team will respond shortly.",
      network: "We could not send your message. Check your connection and try again.",
      validationName: "Please enter your full name (at least 2 characters).",
      validationEmail: "Please enter a valid email address.",
      validationMessage: "Please enter a message (at least 10 characters).",
    },
    ar: {
      sending: "جاري الإرسال…",
      submit: "طلب استشارة",
      success: "شكرًا لك. تم إرسال استفسارك بنجاح. سيتواصل معك فريقنا قريبًا.",
      network: "تعذر إرسال رسالتك. تحقق من الاتصال وحاول مرة أخرى.",
      validationName: "يرجى إدخال الاسم الكامل (حرفان على الأقل).",
      validationEmail: "يرجى إدخال بريد إلكتروني صالح.",
      validationMessage: "يرجى إدخال رسالة (10 أحرف على الأقل).",
    },
  };

  const t = copy[lang] || copy.en;
  const defaultSubmitText = submitLabel ? submitLabel.textContent : t.submit;

  function setState(state, message) {
    if (panel) {
      panel.classList.remove("is-loading", "is-success", "is-error");
      if (state) panel.classList.add(state);
    }

    if (feedback) {
      if (!message) {
        feedback.hidden = true;
        feedback.textContent = "";
        feedback.classList.remove("is-success", "is-error");
        return;
      }
      feedback.hidden = false;
      feedback.textContent = message;
      feedback.classList.remove("is-success", "is-error");
      if (state === "is-success") feedback.classList.add("is-success");
      if (state === "is-error") feedback.classList.add("is-error");
    }

    const loading = state === "is-loading";
    if (submitBtn) submitBtn.disabled = loading;
    if (submitLabel) submitLabel.textContent = loading ? t.sending : defaultSubmitText;
    if (spinner) spinner.hidden = !loading;
  }

  function validateClient() {
    const name = (form.querySelector('[name="name"]')?.value || "").trim();
    const email = (form.querySelector('[name="email"]')?.value || "").trim();
    const message = (form.querySelector('[name="message"]')?.value || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (name.length < 2) return t.validationName;
    if (!emailOk) return t.validationEmail;
    if (message.length < 10) return t.validationMessage;
    return null;
  }

  function markFieldErrors() {
    const nameEl = form.querySelector('[name="name"]');
    const emailEl = form.querySelector('[name="email"]');
    const messageEl = form.querySelector('[name="message"]');
    [nameEl, emailEl, messageEl].forEach((el) => {
      if (el) el.classList.remove("field-invalid");
    });

    const name = (nameEl?.value || "").trim();
    const email = (emailEl?.value || "").trim();
    const message = (messageEl?.value || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (nameEl && name.length < 2) nameEl.classList.add("field-invalid");
    if (emailEl && !emailOk) emailEl.classList.add("field-invalid");
    if (messageEl && message.length < 10) messageEl.classList.add("field-invalid");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setState(null, "");

    const clientError = validateClient();
    if (clientError) {
      markFieldErrors();
      setState("is-error", clientError);
      feedback?.focus();
      return;
    }

    setState("is-loading", "");

    const action = form.getAttribute("action") || "contact.php";

    try {
      const res = await fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        throw new Error("invalid_json");
      }

      if (!res.ok || !data?.ok) {
        const msg = typeof data?.message === "string" ? data.message : t.network;
        markFieldErrors();
        setState("is-error", msg);
        feedback?.focus();
        return;
      }

      form.reset();
      setState("is-success", typeof data.message === "string" ? data.message : t.success);
      feedback?.focus();
    } catch {
      setState("is-error", t.network);
      feedback?.focus();
    }
  });

  form.querySelectorAll(".field").forEach((field) => {
    field.addEventListener("input", () => field.classList.remove("field-invalid"));
  });
})();
