#!/usr/bin/env node
// Minimal static server for dist/. Usage: node scripts/serve.js [port]
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "dist");
const PORT = Number(process.argv[2]) || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!path.extname(p) && !p.endsWith("/")) {
      res.writeHead(301, { Location: p + "/" });
      return res.end();
    }
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, path.normalize(p));
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}`));
