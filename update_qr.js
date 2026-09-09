const fs = require('fs');
const qrcodeMin = fs.readFileSync('node_modules/qrcodejs/qrcode.min.js', 'utf8');

// ==========================================
// 1. UPDATE index.html
// ==========================================
let indexHtml = fs.readFileSync('index.html', 'utf8');

const startMarkerIndex = '/* Gerador de QR Code inline para o link do celular */';
const endMarkerIndex = 'function copiarLink()';

const startIdxI = indexHtml.indexOf(startMarkerIndex);
const endIdxI = indexHtml.indexOf(endMarkerIndex);

if (startIdxI === -1 || endIdxI === -1) {
  console.error('Markers not found in index.html', startIdxI, endIdxI);
  process.exit(1);
}

const replacementIndex = `/* Biblioteca QRCode inline (ES5, zero dependências) */\n` +
  qrcodeMin + `\n\n` +
  `var host = window.location.hostname;\n` +
  `if (!host || host === 'localhost' || host === '127.0.0.1') {\n` +
  `  host = '192.168.1.96';\n` +
  `}\n` +
  `var port = window.location.port ? ':' + window.location.port : ':8080';\n` +
  `var mobileTarget = 'http://' + host + port + '/cadastro.html';\n` +
  `document.getElementById('mobile-url').textContent = mobileTarget;\n\n` +
  `var qrBox = document.getElementById('wifi-qr');\n` +
  `qrBox.innerHTML = '';\n` +
  `new QRCode(qrBox, {\n` +
  `  text: mobileTarget,\n` +
  `  width: 140,\n` +
  `  height: 140,\n` +
  `  correctLevel: QRCode.CorrectLevel.M\n` +
  `});\n\n`;

indexHtml = indexHtml.substring(0, startIdxI) + replacementIndex + indexHtml.substring(endIdxI);
indexHtml = indexHtml.replace(
  '<canvas id="wifi-qr" width="140" height="140"></canvas>',
  '<div id="wifi-qr" style="display:inline-block;padding:6px;background:#fff;border:1px solid #ddd;border-radius:4px"></div>'
);

fs.writeFileSync('index.html', indexHtml, 'utf8');
console.log('index.html updated successfully');

// ==========================================
// 2. UPDATE cadastro.html
// ==========================================
let cadHtml = fs.readFileSync('cadastro.html', 'utf8');

// Replace canvas in credencial view with a div container
cadHtml = cadHtml.replace(
  '<canvas id="qr-canvas"></canvas>',
  '<div id="qr-container" style="display:inline-block;padding:8px;background:#fff;border:1px solid #ddd;border-radius:4px"></div>'
);

// Replace custom QR generator in cadastro.html
const startMarkerCad = '/* ---- GF(256) para QR Code ---- */';
const endMarkerCad = '/* ---- FNV-1a 32 bits (ES5-safe) ---- */';

const startIdxC = cadHtml.indexOf(startMarkerCad);
const endIdxC = cadHtml.indexOf(endMarkerCad);

if (startIdxC === -1 || endIdxC === -1) {
  console.error('Markers not found in cadastro.html', startIdxC, endIdxC);
  process.exit(1);
}

const replacementCad = `/* ---- Biblioteca QRCode inline (ES5, zero dependências) ---- */\n` +
  qrcodeMin + `\n\n`;

cadHtml = cadHtml.substring(0, startIdxC) + replacementCad + cadHtml.substring(endIdxC);

// Update renderizarQR function in cadastro.html
const oldRender = `/* ---- Renderizar QR ---- */
function renderizarQR(cpf,nome){
  var payload=gerarPayload(cpf,nome);
  var canvas=document.getElementById('qr-canvas');
  var wrap=document.getElementById('qr-wrap');
  var largura=Math.min(wrap.clientWidth-24,400);
  var modulos=41; /* versão 6 esperada */
  var quiet=4;
  var scale=Math.max(4,Math.floor(largura/(modulos+2*quiet)));
  QRGEN.render(payload,canvas,scale);
}`;

const newRender = `/* ---- Renderizar QR ---- */
var qrInstance = null;
function renderizarQR(cpf,nome){
  var payload=gerarPayload(cpf,nome);
  var container=document.getElementById('qr-container');
  if(!qrInstance){
    container.innerHTML='';
    var largura=Math.min(window.innerWidth - 60, 260);
    qrInstance=new QRCode(container,{
      text:payload,
      width:largura,
      height:largura,
      correctLevel:QRCode.CorrectLevel.M
    });
  } else {
    qrInstance.makeCode(payload);
  }
}`;

cadHtml = cadHtml.replace(oldRender, newRender);

// In btn-corrigir listener, reset qrInstance
cadHtml = cadHtml.replace(
  "cpfAtual='';nomeAtual='';",
  "cpfAtual='';nomeAtual='';qrInstance=null;var qc=document.getElementById('qr-container');if(qc)qc.innerHTML='';"
);

fs.writeFileSync('cadastro.html', cadHtml, 'utf8');
console.log('cadastro.html updated successfully');
console.log('cadastro.html size:', fs.statSync('cadastro.html').size, 'bytes');
