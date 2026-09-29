// Site-wide behaviour: mobile navigation and inquiry-form validation.
document.documentElement.classList.add("js");

(function nav() {
  const toggle = document.querySelector(".nav-toggle");
  const header = document.querySelector(".site-header");
  if (!toggle || !header) return;
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("nav-open")) {
      header.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });
})();

(function forms() {
  document.querySelectorAll("form[data-validate]").forEach((form) => {
    const landing = form.querySelector("[data-landing]");
    if (landing) landing.value = sessionStorageGet("landing_page") || location.pathname;
    const status = form.querySelector(".form-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.querySelectorAll(".field-error").forEach((el) => el.remove());
      let firstBad = null;
      form.querySelectorAll("[required]").forEach((field) => {
        const ok = field.value.trim() !== "" && field.checkValidity();
        field.setAttribute("aria-invalid", String(!ok));
        if (!ok) {
          const msg = document.createElement("p");
          msg.className = "field-error";
          msg.id = field.id + "-error";
          msg.textContent =
            field.type === "email" && field.value ? "Enter a valid email address." : "This field is required.";
          field.insertAdjacentElement("afterend", msg);
          field.setAttribute("aria-describedby", msg.id);
          firstBad = firstBad || field;
        }
      });
      if (firstBad) return firstBad.focus();

      if (!form.getAttribute("action")) {
        status.textContent =
          "This form isn't connected yet. Please use the email or phone details on this page.";
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.textContent = "Sending…";
      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(res.statusText);
        location.href = "/thank-you/";
      } catch {
        status.textContent =
          "Sorry, something went wrong sending that. Please try again or contact us directly.";
        button.disabled = false;
      }
    });
  });

  function sessionStorageGet(k) {
    try {
      if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, location.pathname + location.search);
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  }
})();
