const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = "127.0.0.1";
const PORT = 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${HOST}:${PORT}`).pathname);
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return normalized === path.sep ? "/index.html" : normalized;
}

function sendFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestPath = safePathname(req.url || "/");
  let filePath = path.join(ROOT, requestPath);

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (err && requestPath === "/") {
      filePath = path.join(ROOT, "index.html");
    }

    sendFile(filePath, res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Local site running at http://${HOST}:${PORT}`);
});
