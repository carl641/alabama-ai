# Alabama AI: agency website

Static website for an AI consulting, automation and training agency serving Alabama businesses, built from the *Alabama AI Agency Site Plan* (launch phase: 28 pages + 3 utility pages).

Plain HTML, CSS and JavaScript. The only tooling is a zero-dependency Node build script that wraps page fragments in the shared layout.

## Quick start

```bash
npm run dev          # preview build + local server at http://localhost:8080
npm run build        # preview build into dist/ (all pages, drafts marked, noindex)
npm run build:prod   # production build: only `status: ready` pages, fails on open placeholders
```

Requires Node 18+. Deploy the `dist/` folder to any static host (Netlify, Cloudflare Pages, GitHub Pages, S3…).

## Project layout

```
site.config.js          Business facts: brand, contact details, base city, form + booking URLs, robots choices
scripts/build.js        Builder: front matter, shortcodes, link checker, sitemap, robots.txt, gate report
scripts/serve.js        Tiny static server for dist/
src/layout.js           <head>, header/nav, footer, CTA band, contact form, booking embed
src/assets/css/styles.css
src/assets/js/          main.js (nav + form validation) and the two demo scripts
src/pages/              One HTML fragment per page; the file path becomes the URL
```

## Writing pages

Each file in `src/pages/` starts with a front-matter comment:

```html
<!--
title: SEO title
description: Meta description
h1: Working H1
status: draft
gate: The publication gate from the site plan
-->
<section class="section">…</section>
```

Shortcodes: `{{todo: …}}`, `{{site.key}}`, `{{cta}}`, `{{related: /a/, /b/}}`, `{{contact_form}}`, `{{booking}}`, `{{email_link}}`, `{{phone_link}}`. See the header of `scripts/build.js`.

## Publication gates: how to take a page live

The site plan requires every claim to be real. Anything we could not verify (team, prices, base location, client proof, supported software, contact details) is a **placeholder**, shown in preview builds as a yellow *TO VERIFY* highlight.

1. Run `npm run dev` and open **/_gates/**. It lists every page, its gate and its open placeholders.
2. Fill in `site.config.js` (email, phone, base city, service model, form endpoint, booking URL, domain).
3. Replace each `{{todo: …}}` in the page with verified content, or remove the section.
4. When the page's gate is met, set `status: ready`.
5. `npm run build:prod` publishes only ready pages. It fails if a ready page still has a placeholder or links to a page that isn't ready. Only ready pages go in `sitemap.xml`.

Preview builds are `noindex` with a `Disallow: /` robots.txt, so a staging deploy stays out of search.

## Still needed from the business

- Real business name/domain, base city and delivery model (remote / on-site / hybrid)
- Named team members and verified bios
- Actual prices or estimating rules for each engagement type
- A form endpoint that validates server-side and routes to a person; a booking calendar URL
- Security controls, subprocessors and retention policy verified by the technical owner
- Privacy notice and terms reviewed by a qualified adviser
- A live voice demo line (the browser demos are scripted simulations with fictional data)
- Decision on GPTBot training access (`site.config.js → robots`)
