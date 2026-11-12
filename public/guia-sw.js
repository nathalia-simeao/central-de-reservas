// Service worker do app PMY Guias: o Chrome do Android só oferece "Instalar app"
// quando o site tem um. Não guarda nada em cache (os dados mudam o tempo todo):
// só repassa as páginas para a rede e, sem internet, mostra um aviso simples.
const OFFLINE = `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PMY Guias</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#F4DCDC;font-family:system-ui,sans-serif;color:#1b1b1b;text-align:center;padding:24px">
<div><h1 style="color:#006600;font-size:22px">Sem internet</h1><p>Confira a conexão e toque para tentar de novo.</p>
<button onclick="location.reload()" style="font:inherit;padding:12px 20px;border:0;border-radius:12px;background:#006600;color:#fff">Tentar de novo</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
