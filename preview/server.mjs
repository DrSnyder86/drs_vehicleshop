import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const resourceRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const allowedRoots = ["preview", "html"].map((directory) =>
  path.join(resourceRoot, directory),
);
const allowedRealRoots = await Promise.all(allowedRoots.map((root) => realpath(root)));
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"],
]);

function requestedPort() {
  const argumentIndex = process.argv.indexOf("--port");
  const candidate =
    argumentIndex >= 0
      ? process.argv[argumentIndex + 1]
      : process.env.DRS_VEHICLESHOP_PREVIEW_PORT || "4173";
  const port = Number.parseInt(candidate, 10);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`Invalid preview port: ${candidate}`);
  }
  return port;
}

function sendText(response, status, message, headers = {}) {
  const body = `${message}\n`;
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(body);
}

function resolveRequestPath(requestUrl) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(new URL(requestUrl, `http://${host}`).pathname);
  } catch (_) {
    return null;
  }
  if (decodedPath.includes("\0") || decodedPath.includes("\\")) return null;

  let normalizedPath = path.posix.normalize(decodedPath);
  if (normalizedPath === "/") normalizedPath = "/preview/index.html";
  if (normalizedPath === "/preview" || normalizedPath === "/preview/") {
    normalizedPath = "/preview/index.html";
  }
  if (normalizedPath === "/html" || normalizedPath === "/html/") {
    normalizedPath = "/html/index.html";
  }
  if (!normalizedPath.startsWith("/preview/") && !normalizedPath.startsWith("/html/")) {
    return null;
  }

  const filePath = path.resolve(resourceRoot, `.${normalizedPath}`);
  const allowed = allowedRoots.some(
    (root) => filePath === root || filePath.startsWith(`${root}${path.sep}`),
  );
  return allowed ? filePath : null;
}

const port = requestedPort();
const server = createServer(async (request, response) => {
  if (!request.url) return sendText(response, 400, "Bad request");
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendText(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
  }

  let requestPath;
  try {
    requestPath = new URL(request.url, `http://${host}`).pathname;
  } catch (_) {
    return sendText(response, 400, "Bad request");
  }
  if (requestPath === "/" || requestPath === "/preview") {
    response.writeHead(302, {
      "Cache-Control": "no-store",
      "Content-Length": 0,
      Location: "/preview/",
      "X-Content-Type-Options": "nosniff",
    });
    return response.end();
  }

  const filePath = resolveRequestPath(request.url);
  if (!filePath) return sendText(response, 404, "Not found");

  let realFilePath;
  let fileStats;
  try {
    realFilePath = await realpath(filePath);
    const allowed = allowedRealRoots.some(
      (root) => realFilePath === root || realFilePath.startsWith(`${root}${path.sep}`),
    );
    if (!allowed) return sendText(response, 404, "Not found");
    fileStats = await stat(realFilePath);
  } catch (_) {
    return sendText(response, 404, "Not found");
  }
  if (!fileStats.isFile()) return sendText(response, 404, "Not found");

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": fileStats.size,
    "Content-Type":
      mimeTypes.get(path.extname(realFilePath).toLowerCase()) || "application/octet-stream",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") return response.end();

  const stream = createReadStream(realFilePath);
  stream.on("error", () => {
    if (!response.headersSent) sendText(response, 500, "Unable to read file");
    else response.destroy();
  });
  stream.pipe(response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`DRS preview port ${port} is already in use. Try: node preview/server.mjs --port 4174`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log("DRS Vehicle Shop UI Previewer");
  console.log(`Open http://${host}:${port}/preview/`);
  console.log("Mock data only; this server cannot call FiveM, Lua, or the database.");
  console.log("Press Ctrl+C to stop.");
});

let closing = false;
function closeServer() {
  if (closing) return;
  closing = true;
  server.close(() => process.exit(0));
  server.closeAllConnections?.();
  const forcedExit = setTimeout(() => process.exit(0), 1000);
  forcedExit.unref();
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
