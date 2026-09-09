const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 8080;
const BASE_DIR = __dirname;
const DB_FILE  = path.join(BASE_DIR, 'presencas.json'); // persistência em disco
const ASS_FILE = path.join(BASE_DIR, 'assembleias.json'); // persistência de assembleias em disco

/* ── Banco de dados em memória (carregado do arquivo ao iniciar) ─────────── */
let presencasDB   = [];
let assembleiasDB = [];

function carregarDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      presencasDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      console.log(`[API] ${presencasDB.length} presenças carregadas de presencas.json`);
    }
  } catch (e) {
    presencasDB = [];
    console.warn('[API] Não foi possível carregar presencas.json, iniciando vazio.');
  }

  try {
    if (fs.existsSync(ASS_FILE)) {
      assembleiasDB = JSON.parse(fs.readFileSync(ASS_FILE, 'utf-8'));
      console.log(`[API] ${assembleiasDB.length} assembleias carregadas de assembleias.json`);
    }
  } catch (e) {
    assembleiasDB = [];
    console.warn('[API] Não foi possível carregar assembleias.json, iniciando vazio.');
  }
}

function salvarDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(presencasDB, null, 2), 'utf-8');
  } catch (e) {
    console.error('[API] Erro ao salvar presencas.json:', e.message);
  }
}

function salvarAssembleiasDB() {
  try {
    fs.writeFileSync(ASS_FILE, JSON.stringify(assembleiasDB, null, 2), 'utf-8');
  } catch (e) {
    console.error('[API] Erro ao salvar assembleias.json:', e.message);
  }
}

carregarDB();

/* ── MIME types para arquivos estáticos ──────────────────────────────────── */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.csv':  'text/csv; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml'
};

/* ── Helpers de resposta ─────────────────────────────────────────────────── */
function jsonOk(res, data) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function jsonErro(res, code, msg) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({ erro: msg }));
}

function lerBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}

/* ── Servidor HTTP ───────────────────────────────────────────────────────── */
const server = http.createServer(async (req, res) => {

  /* ── CORS preflight ───────────────────────────────────────────────────── */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url    = decodeURIComponent(req.url.split('?')[0]);
  const method = req.method.toUpperCase();

  /* ════════════════════════════════════════════════════════════════════════
     API REST — Rotas de Presença em Tempo Real
  ════════════════════════════════════════════════════════════════════════ */

  /* ── GET /api/status ── healthcheck ──────────────────────────────────── */
  if (url === '/api/status' && method === 'GET') {
    jsonOk(res, { ok: true, total: presencasDB.length, timestamp: new Date().toISOString() });
    return;
  }

  /* ── GET /api/presencas ── painel busca todos os registros ───────────── */
  if (url === '/api/presencas' && method === 'GET') {
    jsonOk(res, { presencas: presencasDB, total: presencasDB.length });
    return;
  }

  /* ── POST /api/presenca ── conferente envia cada leitura ─────────────── */
  if (url === '/api/presenca' && method === 'POST') {
    let dados;
    try { dados = await lerBody(req); }
    catch (e) { jsonErro(res, 400, 'Body inválido'); return; }

    const mat = String(dados.matricula || '').trim().toUpperCase();
    if (!mat) { jsonErro(res, 422, 'Matrícula obrigatória'); return; }

    /* Deduplicação no servidor */
    const duplicado = presencasDB.some(p =>
      String(p.matricula || '').trim().toUpperCase() === mat
    );

    const registro = {
      matricula:  mat,
      nome:       String(dados.nome       || '').trim(),
      orgao:      String(dados.orgao      || '—').trim(),
      fileira:    String(dados.fileira    || '—').trim(),
      conferente: String(dados.conferente || '').trim(),
      hora:       String(dados.hora       || new Date().toLocaleTimeString('pt-BR')).trim(),
      origem:     String(dados.origem     || 'qr').trim(),
      observacao: String(dados.observacao || '').trim(),
      arquivo:    'tempo-real',
      timestamp:  new Date().toISOString(),
      duplicado:  duplicado
    };

    presencasDB.push(registro);
    salvarDB();

    console.log('[API]', duplicado
      ? `[DUPLICADO] ${mat} — ${registro.nome}`
      : `[OK] ${mat} — ${registro.nome} (${registro.conferente})`
    );

    jsonOk(res, { ok: true, duplicado, registro });
    return;
  }

  /* ── POST /api/presencas/limpar ── reset da sessão ───────────────────── */
  if (url === '/api/presencas/limpar' && method === 'POST') {
    const total = presencasDB.length;
    presencasDB = [];
    salvarDB();
    console.log(`[API] Sessão limpa — ${total} registros removidos.`);
    jsonOk(res, { ok: true, removidos: total });
    return;
  }

  /* ── GET /api/assembleias ── painel busca lista de assembleias salvas ─── */
  if (url === '/api/assembleias' && method === 'GET') {
    jsonOk(res, { assembleias: assembleiasDB, total: assembleiasDB.length });
    return;
  }

  /* ── POST /api/assembleias ── painel salva lista de assembleias no disco ─ */
  if (url === '/api/assembleias' && method === 'POST') {
    let dados;
    try { dados = await lerBody(req); }
    catch (e) { jsonErro(res, 400, 'Body inválido'); return; }

    if (Array.isArray(dados.assembleias)) {
      assembleiasDB = dados.assembleias;
      salvarAssembleiasDB();
      console.log(`[API] ${assembleiasDB.length} assembleia(s) sincronizada(s) no disco.`);
      jsonOk(res, { ok: true, total: assembleiasDB.length });
      return;
    }
    jsonErro(res, 422, 'Campo assembleias deve ser um array');
    return;
  }

  /* ════════════════════════════════════════════════════════════════════════
     Servidor de Arquivos Estáticos (comportamento original mantido)
  ════════════════════════════════════════════════════════════════════════ */

  let reqPath = url;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  if (reqPath === '/index.html' && !fs.existsSync(path.join(BASE_DIR, 'index.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sistema de Presença Sindical</title></head>
<body><h1>SINDSEPS</h1><ul>
<li><a href="/cadastro.html">Credencial do Participante</a></li>
<li><a href="/conferente.html">Leitor do Conferente</a></li>
<li><a href="/painel.html">Painel de Consolidação</a></li>
</ul></body></html>`);
    return;
  }

  const filePath = path.join(BASE_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Arquivo não encontrado: ' + reqPath);
    return;
  }

  const ext         = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  /* Detectar IP local automaticamente */
  const os = require('os');
  let localIP = 'localhost';
  Object.values(os.networkInterfaces()).forEach(list =>
    list.forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) localIP = iface.address;
    })
  );

  console.log('\n════════════════════════════════════════════════');
  console.log('  SINDSEPS — Sistema de Presença Sindical');
  console.log('════════════════════════════════════════════════');
  console.log(`  Local:      http://localhost:${PORT}/`);
  console.log(`  Rede local: http://${localIP}:${PORT}/`);
  console.log('  API REST:   /api/status | /api/presencas | /api/presenca');
  console.log('════════════════════════════════════════════════\n');
});

