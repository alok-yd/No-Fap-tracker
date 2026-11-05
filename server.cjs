const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const DIST = path.resolve(__dirname, "dist");
const PORT = Number(process.env.PORT || 10000);
const HOST = "0.0.0.0";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function reply(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(message);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");

  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return reply(res, 405, "Method not allowed");
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
  } catch {
    return reply(res, 400, "Bad request");
  }

  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
  }

  const fileCandidate = path.resolve(DIST, "." + pathname);
  if (fileCandidate !== DIST && !fileCandidate.startsWith(DIST + path.sep)) {
    return reply(res, 403, "Forbidden");
  }

  let file = fileCandidate;
  let info;
  try {
    info = await fs.promises.stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
    info = await fs.promises.stat(file);
    if (!info.isFile()) throw new Error("Not a file");
  } catch {
    if (path.extname(pathname)) return reply(res, 404, "Not found");
    file = path.join(DIST, "index.html");
    try {
      info = await fs.promises.stat(file);
    } catch {
      return reply(res, 503, "Build output is missing; run npm run build.");
    }
  }

  const immutable = pathname.startsWith("/assets/");
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache"
  });

  if (method === "HEAD") return res.end();
  const stream = fs.createReadStream(file);
  stream.on("error", () => res.destroy());
  stream.pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log("NOFAP server listening on " + HOST + ":" + PORT);
});
server.on("error", (error) => {
  console.error("NOFAP server failed to start:", error);
  process.exit(1);
});
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
