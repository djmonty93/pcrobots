import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as proxyRequest } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.env.PORT ?? "3000");
const rootDir = resolve(process.cwd(), "dist");
const indexPath = join(rootDir, "index.html");
const proxyTarget = new URL(process.env.PCROBOTS_API_PROXY_URL ?? "http://127.0.0.1:3101");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function sendFile(response, filePath) {
  const contentType = contentTypes.get(extname(filePath)) ?? "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": filePath === indexPath ? "no-cache" : "public, max-age=31536000, immutable"
  });
  createReadStream(filePath).pipe(response);
}

function proxyApi(request, response) {
  const upstream = proxyRequest(
    {
      protocol: proxyTarget.protocol,
      hostname: proxyTarget.hostname,
      port: proxyTarget.port,
      method: request.method,
      path: request.url,
      headers: { ...request.headers, host: proxyTarget.host }
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );

  upstream.on("error", (error) => {
    response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  });

  request.pipe(upstream);
}

createServer(async (request, response) => {
  const requestPath = request.url ? request.url.split("?")[0] : "/";

  if (requestPath.startsWith("/api") || requestPath === "/health") {
    proxyApi(request, response);
    return;
  }

  const normalizedPath = requestPath === "/" ? indexPath : normalize(join(rootDir, requestPath));

  if (!normalizedPath.startsWith(rootDir)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const fileStats = await stat(normalizedPath);
    if (fileStats.isFile()) {
      sendFile(response, normalizedPath);
      return;
    }
  } catch {
    if (existsSync(indexPath)) {
      sendFile(response, indexPath);
      return;
    }
  }

  response.writeHead(404).end("Not found");
}).listen(port, "0.0.0.0", () => {
  console.log(`@pcrobots/web listening on http://0.0.0.0:${port}`);
});
