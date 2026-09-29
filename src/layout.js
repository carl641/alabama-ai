// Shared page chrome: <head>, header, footer and reusable blocks.

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NAV = [
  ["/services/", "Services"],
  ["/industries/", "Industries"],
  ["/demos/", "Demos"],
  ["/process/", "Process"],
  ["/pricing/", "Pricing"],
  ["/about/", "About"],
  ["/resources/", "Guides"],
];

const FOOTER = [
  [
    "Services",
    [
      ["/services/ai-consulting/", "AI consulting"],
      ["/services/workflow-automation/", "Workflow automation"],
      ["/services/ai-chatbots/", "AI chatbots"],
      ["/services/ai-voice-agents/", "AI receptionists"],
      ["/services/custom-ai-agents/", "Custom AI agents"],
      ["/services/ai-training/", "AI training"],
    ],
  ],
  [
    "Company",
    [
      ["/about/", "About"],
      ["/process/", "Process"],
      ["/pricing/", "Pricing"],
      ["/security/", "Security"],
      ["/demos/", "Demos"],
      ["/contact/", "Contact"],
    ],
  ],
  [
    "Alabama",
    [
      ["/locations/", "Service area"],
      ["/locations/birmingham-al/", "Birmingham"],
      ["/locations/huntsville-al/", "Huntsville"],
      ["/industries/home-services/", "Home services"],
      ["/industries/professional-services/", "Professional services"],
    ],
  ],
];

function head(page, site, ctx) {
  const canonical = site.siteUrl + page.url;
  const title = page.meta.title.includes(site.brand)
    ? page.meta.title
    : `${page.meta.title} | ${site.brand}`;
  const robots = page.indexable && ctx.production ? "index, follow" : "noindex, follow";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.meta.description)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.brand)}">
<meta property="og:title" content="${esc(page.meta.title)}">
<meta property="og:description" content="${esc(page.meta.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="theme-color" content="#16233a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Figtree:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/css/styles.css">
<script>document.documentElement.classList.add("js")</script>
${structuredData(page, site)}
</head>`;
}

function structuredData(page, site) {
  const graph = [];
  if (page.url === "/") {
    const org = { "@type": "Organization", name: site.brand, url: site.siteUrl + "/" };
    if (site.legalName) org.legalName = site.legalName;
    if (site.email) org.email = site.email;
    if (site.phone) org.telephone = site.phone;
    org.areaServed = { "@type": "State", name: "Alabama" };
    graph.push(org);
  }
  if (page.crumbs.length > 1) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: page.crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: site.siteUrl + c.url,
      })),
    });
  }
  if (!graph.length) return "";
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  return `<script type="application/ld+json">${json.replace(/</g, "\\u003c")}</script>`;
}

function header(page, site) {
  const links = NAV.map(([href, label]) => {
    const current = page.url === href || (href !== "/" && page.url.startsWith(href));
    return `<li><a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a></li>`;
  }).join("");
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="wordmark" href="/" aria-label="${esc(site.brand)} home">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="currentColor"/><path d="M9 23 16 8l7 15M11.8 17.5h8.4" stroke="#f6f1e7" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="9" r="2.4" fill="#e0703f"/></svg>
      <span>${esc(site.brand)}</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="sr-only">Menu</span><span class="nav-toggle-bars" aria-hidden="true"></span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul>${links}</ul>
      <a class="btn btn-primary btn-sm" href="/book/">Book a call</a>
    </nav>
  </div>
</header>`;
}

function breadcrumbs(page) {
  if (page.crumbs.length < 2) return "";
  const items = page.crumbs
    .map((c, i) =>
      i === page.crumbs.length - 1
        ? `<li aria-current="page">${esc(c.label)}</li>`
        : `<li><a href="${c.url}">${esc(c.label)}</a></li>`
    )
    .join("");
  return `<nav class="breadcrumbs container" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function draftBanner(page, ctx) {
  if (ctx.production || page.meta.status === "ready") return "";
  return `<div class="draft-banner" role="note"><div class="container"><strong>Draft preview</strong> · ${
    page.todos.length
  } item(s) to verify · Gate: ${esc(page.meta.gate || "—")} <a href="/_gates/">All gates</a></div></div>`;
}

function footer(site) {
  const cols = FOOTER.map(
    ([h, links]) =>
      `<div><h2 class="footer-h">${h}</h2><ul>${links
        .map(([href, label]) => `<li><a href="${href}">${label}</a></li>`)
        .join("")}</ul></div>`
  ).join("");
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="wordmark" href="/">${esc(site.brand)}</a>
      <p>AI consulting, automation and training for Alabama businesses. Practical systems, human oversight, plain answers.</p>
      <a class="btn btn-light btn-sm" href="/book/">Book an AI opportunity call</a>
    </div>
    ${cols}
  </div>
  <div class="container footer-legal">
    <p>© ${new Date().getFullYear()} ${esc(site.legalName || site.brand)}</p>
    <p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/contact/">Contact</a></p>
  </div>
</footer>
<script src="/assets/js/main.js" defer></script>`;
}

function page(p, site, ctx, body) {
  const scripts = (p.meta.scripts || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<script src="/assets/js/${s}" defer></script>`)
    .join("\n");
  return `${head(p, site, ctx)}
<body class="${esc(p.meta.body_class || "")}">
${header(p, site)}
${draftBanner(p, ctx)}
<main id="main">
${breadcrumbs(p)}
${body}
</main>
${footer(site)}
${scripts}
</body>
</html>
`;
}

function cta(p) {
  const heading = p.meta.cta_heading || "Talk through the workflow you want to fix";
  const text =
    p.meta.cta_text ||
    "A 30-minute call to understand the problem, whether AI is the right tool, and what a sensible first step would cost. No obligation.";
  const label = p.meta.cta_label || "Book an AI opportunity call";
  const href = p.meta.cta_href || "/book/";
  return `<section class="cta-band"><div class="container cta-inner">
  <div><h2>${esc(heading)}</h2><p>${esc(text)}</p></div>
  <div class="cta-actions"><a class="btn btn-primary" href="${esc(href)}">${esc(label)}</a>
  <a class="btn btn-ghost-light" href="/demos/">See a demo first</a></div>
</div></section>`;
}

function related(urls, pages) {
  const cards = urls
    .map((u) => {
      const t = pages.get(u);
      if (!t) return `<a class="card card-link" href="${esc(u)}"><h3>${esc(u)}</h3></a>`;
      return `<a class="card card-link" href="${t.url}"><h3>${esc(
        t.meta.card_title || t.meta.h1 || t.meta.title
      )}</h3><p>${esc(t.meta.summary || t.meta.description)}</p><span class="card-arrow" aria-hidden="true">→</span></a>`;
    })
    .join("");
  return `<div class="grid grid-3 related">${cards}</div>`;
}

function contactForm(site, todo) {
  const action = site.formEndpoint || "";
  const note = action
    ? ""
    : `<p class="form-note">${todo("Connect site.formEndpoint to a server-side handler that validates input and routes to a named person.")}</p>`;
  return `<form class="form" method="post" action="${esc(action)}" data-validate novalidate>
  ${note}
  <div class="form-row">
    <label for="f-name">Your name</label>
    <input id="f-name" name="name" autocomplete="name" required>
  </div>
  <div class="form-row">
    <label for="f-email">Work email</label>
    <input id="f-email" name="email" type="email" autocomplete="email" required>
  </div>
  <div class="form-row">
    <label for="f-company">Business name <span class="optional">(optional)</span></label>
    <input id="f-company" name="company" autocomplete="organization">
  </div>
  <div class="form-row">
    <label for="f-location">Where in Alabama is your business?</label>
    <input id="f-location" name="location" placeholder="City or county" required>
  </div>
  <div class="form-row">
    <label for="f-topic">What are you trying to improve?</label>
    <select id="f-topic" name="topic" required>
      <option value="">Choose one</option>
      <option>Not sure yet: I want an assessment</option>
      <option>Workflow automation</option>
      <option>Website or customer chatbot</option>
      <option>AI receptionist / phone calls</option>
      <option>Custom AI agent</option>
      <option>Team AI training</option>
      <option>Something else</option>
    </select>
  </div>
  <div class="form-row">
    <label for="f-message">Describe the workflow or problem</label>
    <textarea id="f-message" name="message" rows="5" required aria-describedby="f-message-hint"></textarea>
    <p class="hint" id="f-message-hint">Please don't include passwords, patient or financial records, or other sensitive data.</p>
  </div>
  <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
  <input type="hidden" name="landing_page" data-landing>
  <button class="btn btn-primary" type="submit">Send inquiry</button>
  <p class="form-status" role="status" aria-live="polite"></p>
  <p class="hint">We use these details only to reply to you. See our <a href="/privacy/">privacy notice</a>.</p>
</form>`;
}

function booking(site, todo) {
  if (!site.bookingUrl) {
    return `<div class="booking-placeholder">${todo(
      "Set site.bookingUrl to the real scheduling page, then test booking and CRM attribution end to end."
    )}<p>Until then, <a href="/contact/">send an inquiry</a> and we'll reply with times.</p></div>`;
  }
  return `<div class="booking-embed"><iframe src="${esc(
    site.bookingUrl
  )}" title="Book an AI opportunity call" loading="lazy"></iframe></div>
<p class="hint">Calendar not loading? <a href="${esc(site.bookingUrl)}" rel="noopener">Open the booking page</a> or <a href="/contact/">send an inquiry</a>.</p>`;
}

module.exports = { page, cta, related, contactForm, booking, esc };
