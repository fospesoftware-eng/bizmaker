/* ═══════════════════════════════════════════════════════════
   BIZMAKER — inner-page interactions
   Contact enquiry composition + contextual prefill
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const interest = params.get("interest") || "";
  const asset = params.get("asset") || "";
  const select = form.querySelector("#cf-interest");
  const message = form.querySelector("#cf-message");
  const status = document.getElementById("formStatus");

  if (interest && select) {
    const match = [...select.options].find(
      o => o.value.toLowerCase() === interest.toLowerCase()
    );
    if (match) select.value = match.value;
  }

  if (asset && message && !message.value) {
    message.value = `I would like details on: ${asset}.\n\n`;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    const data = new FormData(form);
    const get = key => String(data.get(key) || "").trim();
    const name = get("name");
    const email = get("email");
    const org = get("organisation");
    const area = get("interest") || "General";
    const text = get("message");

    const subject = `Enquiry — ${area}${asset ? ` — ${asset}` : ""}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      org ? `Organisation: ${org}` : "",
      `Area of interest: ${area}`,
      asset ? `Asset: ${asset}` : "",
      "",
      text,
    ].filter(Boolean).join("\n");

    if (status) {
      status.textContent = "Opening your email application with the enquiry prepared…";
    }

    window.location.href =
      `mailto:hello@bizmaker.ae?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
