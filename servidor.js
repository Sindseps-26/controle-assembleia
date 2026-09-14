const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT        = process.env.PORT || 8080;
const ADMIN_TOKEN = process.env.TOKEN_ADMIN || 'sindseps-admin-2026'; // Mude via variável de ambiente
const BASE_DIR    = __dirname;
const DB_FILE     = path.join(BASE_DIR, 'presencas.json');
const ASS_FILE    = path.join(BASE_DIR, 'assembleias.json');
const SESS_FILE   = path.join(BASE_DIR, 'sessao.json');   // Sessão ativa publicada pelo painel
const CPFS_FILE   = path.join(BASE_DIR, 'cpfs.json');     // Armazenamento protegido de CPF (não vai para o QR)
const GEO_FILE    = path.join(BASE_DIR, 'geo.json');      // Armazenamento de geolocalização capturada no cadastro

/* ── Banco de dados em memória (carregado do arquivo ao iniciar) ─────────── */
let presencasDB   = [];
let assembleiasDB = [];
let sessaoAtiva   = null; // { evento, chave, rotacao, tolerancia, assId, assNome, assData }
let cpfsDB        = {};   // { [matricula]: cpf }
let geoDB         = {};   // { [matricula]: { lat, lng, geo_acc, timestamp } }

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

  try {
    if (fs.existsSync(SESS_FILE)) {
      sessaoAtiva = JSON.parse(fs.readFileSync(SESS_FILE, 'utf-8'));
      console.log(`[API] Sessão ativa: ${sessaoAtiva.assNome || sessaoAtiva.evento}`);
    }
  } catch (e) {
    sessaoAtiva = null;
  }

  try {
    if (fs.existsSync(CPFS_FILE)) {
      cpfsDB = JSON.parse(fs.readFileSync(CPFS_FILE, 'utf-8'));
      console.log(`[API] ${Object.keys(cpfsDB).length} CPFs carregados de cpfs.json`);
    }
  } catch (e) {
    cpfsDB = {};
  }

  try {
    if (fs.existsSync(GEO_FILE)) {
      geoDB = JSON.parse(fs.readFileSync(GEO_FILE, 'utf-8'));
      console.log(`[API] ${Object.keys(geoDB).length} registros de localização carregados de geo.json`);
    }
  } catch (e) {
    geoDB = {};
  }
}

/* ── Escrita atômica: grava em .tmp e renomeia — evita corrupção ─────────── */
function escrevaAtomico(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

function salvarDB() {
  try {
    escrevaAtomico(DB_FILE, presencasDB);
  } catch (e) {
    console.error('[API] Erro ao salvar presencas.json:', e.message);
  }
}

function salvarAssembleiasDB() {
  try {
    escrevaAtomico(ASS_FILE, assembleiasDB);
  } catch (e) {
    console.error('[API] Erro ao salvar assembleias.json:', e.message);
  }
}

function salvarSessao() {
  try {
    escrevaAtomico(SESS_FILE, sessaoAtiva);
  } catch (e) {
    console.error('[API] Erro ao salvar sessao.json:', e.message);
  }
}

function salvarCPFsDB() {
  try {
    escrevaAtomico(CPFS_FILE, cpfsDB);
  } catch (e) {
    console.error('[API] Erro ao salvar cpfs.json:', e.message);
  }
}

function salvarGeoDB() {
  try {
    escrevaAtomico(GEO_FILE, geoDB);
  } catch (e) {
    console.error('[API] Erro ao salvar geo.json:', e.message);
  }
}

/* ── Backup antes de limpar ──────────────────────────────────────────────── */
function criarBackupPresencas() {
  try {
    const agora = new Date();
    const ts = agora.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(BASE_DIR, `presencas_backup_${ts}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(presencasDB, null, 2), 'utf-8');
    console.log(`[API] Backup criado: presencas_backup_${ts}.json (${presencasDB.length} registros)`);
    return backupPath;
  } catch (e) {
    console.error('[API] Erro ao criar backup:', e.message);
    return null;
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

/* Arquivos que não devem ser servidos em produção */
const ARQUIVOS_BLOQUEADOS = ['/test_qr.html'];

/* ── Detectar IP local ───────────────────────────────────────────────────── */
function obterIPLocal() {
  let localIP = 'localhost';
  Object.values(os.networkInterfaces()).forEach(list =>
    list.forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) localIP = iface.address;
    })
  );
  return localIP;
}

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
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token'
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

  /* ── GET /api/config ── retorna IP e porta para o index.html ─────────── */
  if (url === '/api/config' && method === 'GET') {
    /* Prioridade: URL pública do Railway > IP local */
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN
                       || process.env.RAILWAY_STATIC_URL
                       || '';
    let urlBase;
    if (railwayDomain) {
      /* No Railway o protocolo é sempre HTTPS */
      const dominio = railwayDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      urlBase = `https://${dominio}`;
    } else {
      const ip = obterIPLocal();
      urlBase = `http://${ip}:${PORT}`;
    }
    jsonOk(res, {
      urlBase,
      urlCadastro:   `${urlBase}/cadastro.html`,
      urlConferente: `${urlBase}/conferente.html`
    });
    return;
  }


  /* ── GET /api/sessao ── retorna configuração da assembleia ativa ──────── */
  if (url === '/api/sessao' && method === 'GET') {
    if (sessaoAtiva) {
      jsonOk(res, { ok: true, sessao: sessaoAtiva });
    } else {
      jsonOk(res, {
        ok: true,
        sessao: {
          evento: 'ASSEMBLEIA-2026',
          chave: 'mude-a-cada-assembleia',
          rotacao: 10,
          tolerancia: 600,
          assId: 'ass_padrao',
          assNome: 'Assembleia Geral',
          assData: ''
        }
      });
    }
    return;
  }

  /* ── POST /api/sessao ── painel publica assembleia ativa ─────────────── */
  if (url === '/api/sessao' && method === 'POST') {
    let dados;
    try { dados = await lerBody(req); }
    catch (e) { jsonErro(res, 400, 'Body inválido'); return; }

    if (!dados.evento || !dados.chave) {
      jsonErro(res, 422, 'Campos evento e chave são obrigatórios');
      return;
    }

    sessaoAtiva = {
      evento:     String(dados.evento).trim(),
      chave:      String(dados.chave).trim(),
      rotacao:    Number(dados.rotacao)    || 10,
      tolerancia: Number(dados.tolerancia) || 600,
      assId:      String(dados.assId      || '').trim(),
      assNome:    String(dados.assNome    || '').trim(),
      assData:    String(dados.assData    || '').trim(),
      publicadoEm: new Date().toISOString()
    };
    salvarSessao();
    console.log(`[API] Sessão ativa publicada: ${sessaoAtiva.assNome} (EVENTO=${sessaoAtiva.evento})`);
    jsonOk(res, { ok: true, sessao: sessaoAtiva });
    return;
  }

  /* ── GET /api/presencas ── painel busca todos os registros ───────────── */
  if (url === '/api/presencas' && method === 'GET') {
    const listaEnriquecida = presencasDB.map(p => {
      const mat = String(p.matricula || '').trim().toUpperCase();
      const geo = geoDB[mat] || {};
      return Object.assign({}, p, {
        cpf: p.cpf || cpfsDB[mat] || '',
        lat: (p.lat != null) ? p.lat : (geo.lat != null ? geo.lat : null),
        lng: (p.lng != null) ? p.lng : (geo.lng != null ? geo.lng : null),
        geo_acc: (p.geo_acc != null) ? p.geo_acc : (geo.geo_acc != null ? geo.geo_acc : null)
      });
    });
    jsonOk(res, { presencas: listaEnriquecida, total: listaEnriquecida.length });
    return;
  }

  /* ── POST /api/presenca-cpf ── cadastro.html envia CPF + geo separado do QR ─── */
  if (url === '/api/presenca-cpf' && method === 'POST') {
    let dados;
    try { dados = await lerBody(req); }
    catch (e) { jsonErro(res, 400, 'Body inválido'); return; }

    const mat    = String(dados.matricula || '').trim().toUpperCase();
    const cpf    = String(dados.cpf || '').replace(/\D/g, '').trim();
    const lat    = (dados.lat != null && dados.lat !== '') ? parseFloat(dados.lat) : null;
    const lng    = (dados.lng != null && dados.lng !== '') ? parseFloat(dados.lng) : null;
    const geoAcc = (dados.geo_acc != null && dados.geo_acc !== '') ? parseInt(dados.geo_acc) : null;

    if (!mat || !cpf) {
      jsonErro(res, 422, 'Matrícula e CPF são obrigatórios');
      return;
    }

    cpfsDB[mat] = cpf;
    salvarCPFsDB();

    /* Salva localização no banco geoDB para vincular quando o conferente ler o QR */
    if (lat !== null && lng !== null) {
      geoDB[mat] = {
        lat: lat,
        lng: lng,
        geo_acc: geoAcc,
        atualizadoEm: new Date().toISOString()
      };
      salvarGeoDB();
    }

    /* Se a presença já constar em presencasDB, enriquece com CPF + localização */
    let atualizou = false;
    presencasDB.forEach(p => {
      if (String(p.matricula || '').trim().toUpperCase() === mat) {
        p.cpf = cpf;
        if (lat !== null && lng !== null) {
          p.lat = lat;
          p.lng = lng;
          p.geo_acc = geoAcc;
        }
        atualizou = true;
      }
    });
    if (atualizou) salvarDB();

    const geoLog = lat !== null ? ` | geo: ${lat},${lng} (±${geoAcc}m)` : '';
    console.log(`[API] CPF associado à matrícula ${mat}${geoLog}`);
    jsonOk(res, { ok: true, matricula: mat, geoSalvo: lat !== null });
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

    const cpfAssociado = String(dados.cpf || cpfsDB[mat] || '').trim();
    const geoAssociado = geoDB[mat] || {};
    const latAssociado = (dados.lat != null && dados.lat !== '') ? parseFloat(dados.lat) : (geoAssociado.lat != null ? geoAssociado.lat : null);
    const lngAssociado = (dados.lng != null && dados.lng !== '') ? parseFloat(dados.lng) : (geoAssociado.lng != null ? geoAssociado.lng : null);
    const accAssociado = (dados.geo_acc != null && dados.geo_acc !== '') ? parseInt(dados.geo_acc) : (geoAssociado.geo_acc != null ? geoAssociado.geo_acc : null);

    const registro = {
      matricula:  mat,
      cpf:        cpfAssociado,
      nome:       String(dados.nome       || '').trim(),
      orgao:      String(dados.orgao      || '—').trim(),
      fileira:    String(dados.fileira    || '—').trim(),
      conferente: String(dados.conferente || '').trim(),
      hora:       String(dados.hora       || new Date().toLocaleTimeString('pt-BR')).trim(),
      origem:     String(dados.origem     || 'qr').trim(),
      observacao: String(dados.observacao || '').trim(),
      lat:        latAssociado,
      lng:        lngAssociado,
      geo_acc:    accAssociado,
      arquivo:    'tempo-real',
      timestamp:  new Date().toISOString(),
      duplicado:  duplicado
    };

    presencasDB.push(registro);
    salvarDB();

    console.log('[API]', duplicado
      ? `[DUPLICADO] ${mat} — ${registro.nome}`
      : `[OK] ${mat} — ${registro.nome} (${registro.conferente})` + (latAssociado ? ` [GEO: ${latAssociado},${lngAssociado}]` : '')
    );

    jsonOk(res, { ok: true, duplicado, registro });
    return;
  }

  /* ── POST /api/presencas/limpar ── reset da sessão (PROTEGIDO) ────────── */
  if (url === '/api/presencas/limpar' && method === 'POST') {
    const token = req.headers['x-admin-token'] || '';
    if (token !== ADMIN_TOKEN) {
      console.warn('[API] Tentativa de limpar sem token válido');
      jsonErro(res, 403, 'Token de administrador inválido ou ausente');
      return;
    }

    const backupPath = criarBackupPresencas();
    const total = presencasDB.length;
    presencasDB = [];
    salvarDB();
    console.log(`[API] Sessão limpa — ${total} registros removidos. Backup: ${backupPath}`);
    jsonOk(res, { ok: true, removidos: total, backup: backupPath ? path.basename(backupPath) : null });
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
     Servidor de Arquivos Estáticos
  ════════════════════════════════════════════════════════════════════════ */

  let reqPath = url;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  /* Bloquear arquivos de desenvolvimento/teste */
  if (ARQUIVOS_BLOQUEADOS.includes(reqPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado.');
    return;
  }

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
  const localIP = obterIPLocal();

  console.log('\n════════════════════════════════════════════════');
  console.log('  SINDSEPS — Sistema de Presença Sindical');
  console.log('════════════════════════════════════════════════');
  console.log(`  Local:      http://localhost:${PORT}/`);
  console.log(`  Rede local: http://${localIP}:${PORT}/`);
  console.log('  API REST:   /api/status | /api/presencas | /api/presenca');
  console.log('  Config API: /api/config | /api/sessao');
  console.log(`  Token Admin: ${ADMIN_TOKEN.slice(0, 6)}*** (configure TOKEN_ADMIN=suasenha)`);
  console.log('════════════════════════════════════════════════\n');
});
