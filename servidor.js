const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Index page se acessar a raiz
  if (reqPath === '/index.html' && !fs.existsSync(path.join(BASE_DIR, 'index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sistema de Presença Sindical</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f3ee; color: #111; margin: 0; padding: 24px; line-height: 1.5; }
  .wrap { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #b8b7ae; border-radius: 4px; padding: 24px; }
  h1 { font-size: 1.4rem; color: #0d1b3e; margin-bottom: 8px; }
  p { color: #555; margin-bottom: 20px; font-size: .95rem; }
  .grid { display: flex; flex-direction: column; gap: 14px; }
  .card { display: block; text-decoration: none; padding: 16px; border: 2px solid #0d1b3e; border-radius: 4px; background: #fafafa; color: inherit; transition: all .15s; }
  .card:hover { background: #0d1b3e; color: #fff; }
  .card h2 { font-size: 1.1rem; margin: 0 0 4px 0; color: #0d1b3e; }
  .card:hover h2 { color: #fff; }
  .card p { font-size: .85rem; margin: 0; color: inherit; }
  .badge { display: inline-block; font-size: .75rem; font-weight: bold; padding: 2px 6px; background: #1a7a3c; color: #fff; border-radius: 2px; margin-bottom: 6px; }
  .badge-conf { background: #8a6500; }
  .badge-painel { background: #1a2d5a; }
  footer { margin-top: 24px; font-size: .8rem; color: #666; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Assembleia Sindical — Controle de Presença</h1>
  <p>Selecione a página correspondente à sua função:</p>
  <div class="grid">
    <a href="/cadastro.html" class="card">
      <span class="badge">Para os Trabalhadores</span>
      <h2>1. Credencial do Participante (cadastro.html)</h2>
      <p>Preenchimento do CPF/nome e exibição do QR Code com relógio ao vivo.</p>
    </a>
    <a href="/conferente.html" class="card">
      <span class="badge badge-conf">Para os Conferentes (Portaria)</span>
      <h2>2. Leitor do Conferente (conferente.html)</h2>
      <p>Câmera para leitura do QR Code, vereditos instantâneos e exportação CSV.</p>
    </a>
    <a href="/painel.html" class="card">
      <span class="badge badge-painel">Para a Coordenação</span>
      <h2>3. Painel de Consolidação (painel.html)</h2>
      <p>Arrastar os CSVs dos conferentes, auditar duplicatas e imprimir lista oficial.</p>
    </a>
    <a href="/LEIA-ME.md" class="card" style="border-color:#888;">
      <h2 style="color:#555;font-size:1rem;">Manual e Instruções (LEIA-ME.md)</h2>
      <p>Como rodar no dia, trocar as chaves e cuidados operacionais.</p>
    </a>
  </div>
  <footer>Rede local: disponível via IP ou localhost na porta 8080</footer>
</div>
</body>
</html>`);
    return;
  }

  const filePath = path.join(BASE_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Arquivo não encontrado: ' + reqPath);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}/ e http://192.168.1.96:${PORT}/`);
});
