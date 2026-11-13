import http from "node:http";
import { request as httpRequest } from "node:http";
import net from "node:net";

const routes = new Map([
  ["/hermes3d-perf-baseline", { port: 3411, label: "Baseline · 35763d9" }],
  ["/hermes3d-perf-pr23", { port: 3421, label: "PR #23 · 9a43734" }],
]);

const index = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hermes3D PR #23 review</title><style>body{margin:0;background:#090d12;color:#eef;font:16px system-ui;padding:24px}main{max-width:560px;margin:auto}a{display:block;margin:16px 0;padding:18px;border:1px solid #39475a;border-radius:12px;color:#fff;text-decoration:none;background:#121923}small{color:#9ba8b8}</style><main><h1>Hermes3D performance review</h1><p>Compare the same deterministic public demo. Check visual fidelity first, then smoothness and heat.</p><a href="/hermes3d-perf-baseline/office">Baseline <small>35763d9</small></a><a href="/hermes3d-perf-pr23/office">PR #23 <small>9a43734</small></a><p><small>Tailnet-only preview. Real-phone performance is not certified until Captain confirms.</small></p></main>`;

function inject(html, prefix, label) {
  const bridge = `<script>(()=>{const p=${JSON.stringify(prefix)};const f=window.fetch;window.fetch=(u,o)=>{const r=u instanceof Request;const x=new URL(r?u.url:u,location.href);if(x.host===location.host&&x.pathname.startsWith('/api/')){x.pathname=p+x.pathname;u=r?new Request(x,u):x.toString()}return f.call(window,u,o)};const W=window.WebSocket;window.WebSocket=class extends W{constructor(u,p2){if(typeof u==='string'){const x=new URL(u,location.href);if(x.host===location.host&&x.pathname.startsWith('/api/'))u=x.protocol+'//'+x.host+p+x.pathname+x.search}p2===undefined?super(u):super(u,p2)}}})()</script><div style="position:fixed;right:8px;top:8px;z-index:2147483647;padding:4px 7px;border-radius:5px;background:#090d12cc;color:#fff;font:600 11px system-ui;pointer-events:none;box-shadow:0 1px 5px #0008">${label}</div>`;
  return html
    .replaceAll('href="/_next/', `href="${prefix}/_next/`)
    .replaceAll('src="/_next/', `src="${prefix}/_next/`)
    .replace("<body", `${bridge}<body`);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://preview");
  if (url.pathname === "/hermes3d-perf" || url.pathname === "/hermes3d-perf/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(index);
  }
  const entry = [...routes].find(([prefix]) => url.pathname === prefix || url.pathname.startsWith(prefix + "/"));
  if (!entry) { res.writeHead(404); return res.end("Not found"); }
  const [prefix, target] = entry;
  const path = url.pathname.slice(prefix.length) || "/";
  const upstream = httpRequest({ hostname: "127.0.0.1", port: target.port, method: req.method, path: path + url.search, headers: { ...req.headers, host: `127.0.0.1:${target.port}`, "accept-encoding": "identity" } }, upstreamRes => {
    const type = String(upstreamRes.headers["content-type"] ?? "");
    if (!type.includes("text/html")) { res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers); upstreamRes.pipe(res); return; }
    const chunks = [];
    upstreamRes.on("data", chunk => chunks.push(chunk));
    upstreamRes.on("end", () => {
      const body = Buffer.from(inject(Buffer.concat(chunks).toString("utf8"), prefix, target.label));
      const headers = { ...upstreamRes.headers, "content-length": body.length, "cache-control": "no-store" };
      delete headers["content-encoding"];
      res.writeHead(upstreamRes.statusCode ?? 200, headers); res.end(body);
    });
  });
  upstream.on("error", error => { res.writeHead(502); res.end(`Preview unavailable: ${error.code}`); });
  req.pipe(upstream);
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://preview");
  const entry = [...routes].find(([prefix]) => url.pathname.startsWith(prefix + "/"));
  if (!entry) return socket.destroy();
  const [prefix, target] = entry;
  const upstreamPath = url.pathname.slice(prefix.length) + url.search;
  const upstream = net.connect(target.port, "127.0.0.1", () => {
    const headers = Object.entries({ ...req.headers, host: `127.0.0.1:${target.port}` })
      .map(([name, value]) => `${name}: ${value}`)
      .join("\r\n");
    upstream.write(`${req.method} ${upstreamPath} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
});

server.listen(Number(process.env.PORT ?? 3403), "127.0.0.1", () => console.log(`Preview proxy listening on 127.0.0.1:${process.env.PORT ?? 3403}`));
