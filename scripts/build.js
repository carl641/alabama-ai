#!/usr/bin/env node
// Static site builder. No dependencies.
//
//   node scripts/build.js               preview build: every page, drafts marked, noindex
//   node scripts/build.js --production  only pages with `status: ready`; fails on open placeholders
//
// Pages live in src/pages as HTML fragments with a front-matter comment:
//
//   <!--
//   title: SEO title
//   description: Meta description
//   status: draft | ready
//   -->
//   <section>...</section>
//
// Shortcodes available in page bodies:
//   {{todo: text}}        placeholder for an unverified fact (blocks production)
//   {{site.key}}          value from site.config.js (empty => placeholder)
//   {{cta}}               standard call-to-action band (cta_* front matter overrides)
//   {{related: /a/, /b/}} cards linking to other pages
//   {{contact_form}}      inquiry form     {{booking}}  scheduling embed
//   {{email_link}}        {{phone_link}}

const fs = require("fs");
const path = require("path");
const site = require("../site.config");
const layout = require("../src/layout");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src", "pages");
const ASSETS = path.join(ROOT, "src", "assets");
const OUT = path.join(ROOT, "dist");
const ctx = { production: process.argv.includes("--production") };
const { esc } = layout;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : d.name.endsWith(".html") ? [p] : [];
  });
}

function parse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^<!--\s*\n([\s\S]*?)\n\s*-->\s*\n?/);
  if (!m) throw new Error(`${file}: missing front-matter comment`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ["title", "description", "status"]) {
    if (!meta[k]) throw new Error(`${file}: front matter needs "${k}"`);
  }
  const rel = path.relative(SRC, file).replace(/\\/g, "/").replace(/\.html$/, "");
  const url = rel === "index" ? "/" : "/" + rel.replace(/(^|\/)index$/, "") + "/";
  return { file, url, meta, body: raw.slice(m[0].length), todos: [] };
}

const pages = new Map(walk(SRC).map(parse).map((p) => [p.url, p]));

// Breadcrumbs from URL segments, using each ancestor's `crumb` (or h1/title).
for (const p of pages.values()) {
  p.indexable = p.meta.noindex !== "true";
  const segs = p.url.split("/").filter(Boolean);
  p.crumbs = [{ url: "/", label: "Home" }];
  segs.forEach((_, i) => {
    const u = "/" + segs.slice(0, i + 1).join("/") + "/";
    const t = pages.get(u);
    if (t) p.crumbs.push({ url: u, label: t.meta.crumb || t.meta.h1 || t.meta.title });
  });
}

function render(p) {
  const todo = (text) => {
    p.todos.push(text);
    return `<mark class="todo" title="Placeholder: verify before publishing">${esc(text)}</mark>`;
  };
  const siteVal = (key) => {
    const v = key.split(".").reduce((o, k) => (o == null ? o : o[k]), site);
    return v ? esc(v) : todo(`site.${key}`);
  };
  return p.body
    .replace(/\{\{todo:\s*([\s\S]*?)\}\}/g, (_, t) => todo(t.trim()))
    .replace(/\{\{site\.([\w.]+)\}\}/g, (_, k) => siteVal(k))
    .replace(/\{\{cta\}\}/g, () => layout.cta(p))
    .replace(/\{\{related:\s*([^}]*)\}\}/g, (_, list) =>
      layout.related(list.split(",").map((s) => s.trim()).filter(Boolean), pages)
    )
    .replace(/\{\{contact_form\}\}/g, () => layout.contactForm(site, todo))
    .replace(/\{\{booking\}\}/g, () => layout.booking(site, todo))
    .replace(/\{\{email_link\}\}/g, () =>
      site.email ? `<a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : todo("site.email")
    )
    .replace(/\{\{phone_link\}\}/g, () =>
      site.phone
        ? `<a href="tel:${esc(site.phone.replace(/[^\d+]/g, ""))}">${esc(site.phone)}</a>`
        : todo("site.phone")
    )
    .replace(/\{\{year\}\}/g, String(new Date().getFullYear()));
}

// ---- build ---------------------------------------------------------------

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(ASSETS, path.join(OUT, "assets"), { recursive: true });

const publish = [...pages.values()].filter((p) => !ctx.production || p.meta.status === "ready");
const published = new Set(publish.map((p) => p.url));
const errors = [];
const warnings = [];

for (const p of publish) {
  const body = render(p);
  const html = layout.page(p, site, ctx, body);
  if (ctx.production && p.todos.length) {
    errors.push(`${p.url}: ${p.todos.length} unresolved placeholder(s): ${p.todos.join(" | ")}`);
  }
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) warnings.push(`${p.url}: expected exactly one <h1>`);
  const hrefs = new Set([...html.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]));
  for (const href of hrefs) {
    if (href.startsWith("/assets/") || href === "/_gates/") continue;
    if (!published.has(href)) {
      (pages.has(href) ? warnings : errors).push(
        pages.has(href)
          ? `${p.url} links to unpublished page ${href}`
          : `${p.url} links to missing page ${href}`
      );
    }
  }
  const outFile = path.join(OUT, p.url, "index.html");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
}

// Only intended, indexable, canonical pages go in the sitemap.
const inSitemap = publish.filter((p) => p.indexable && p.meta.status === "ready");
fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${inSitemap.map((p) => `  <url><loc>${site.siteUrl}${p.url}</loc></url>`).join("\n")}
</urlset>
`
);

fs.writeFileSync(
  path.join(OUT, "robots.txt"),
  ctx.production
    ? [
        `User-agent: OAI-SearchBot\n${site.robots.allowOAISearchBot ? "Allow" : "Disallow"}: /`,
        `User-agent: GPTBot\n${site.robots.allowGPTBot ? "Allow" : "Disallow"}: /`,
        `User-agent: *\nDisallow: /thank-you/`,
        `Sitemap: ${site.siteUrl}/sitemap.xml`,
      ].join("\n\n") + "\n"
    : "# Preview build: keep out of search indexes\nUser-agent: *\nDisallow: /\n"
);

// Publication-gate dashboard (preview only).
if (!ctx.production) {
  const rows = [...pages.values()]
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(
      (p) => `<tr><td><a href="${p.url}">${esc(p.url)}</a></td><td>${esc(p.meta.phase || "")}</td>
<td><span class="tag tag-${esc(p.meta.status)}">${esc(p.meta.status)}</span></td>
<td>${esc(p.meta.gate || "")}</td><td>${
        p.todos.length ? `<ul>${p.todos.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "—"
      }</td></tr>`
    )
    .join("\n");
  const gp = {
    url: "/_gates/",
    meta: { title: "Publication gates", description: "Internal preview report", status: "draft" },
    crumbs: [{ url: "/", label: "Home" }],
    todos: [],
    indexable: false,
  };
  const body = `<section class="section"><div class="container">
<h1>Publication gates</h1>
<p class="lede">Every page stays <code>status: draft</code> until its gate is met and every placeholder is replaced with a verified fact. The production build publishes only <code>ready</code> pages.</p>
<div class="table-wrap"><table class="table gates"><thead><tr><th>URL</th><th>Phase</th><th>Status</th><th>Gate</th><th>Open placeholders</th></tr></thead>
<tbody>${rows}</tbody></table></div></div></section>`;
  fs.mkdirSync(path.join(OUT, "_gates"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "_gates", "index.html"), layout.page(gp, site, { production: true }, body));
}

// ---- report --------------------------------------------------------------

const ready = [...pages.values()].filter((p) => p.meta.status === "ready").length;
const todoCount = publish.reduce((n, p) => n + p.todos.length, 0);
console.log(
  `${ctx.production ? "Production" : "Preview"} build: ${publish.length} page(s) written to dist/ ` +
    `(${ready}/${pages.size} ready, ${inSitemap.length} in sitemap, ${todoCount} open placeholder(s))`
);
warnings.forEach((w) => console.warn("  warn  " + w));
errors.forEach((e) => console.error("  error " + e));
if (errors.length) process.exit(1);
