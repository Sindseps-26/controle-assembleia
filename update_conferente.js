const fs = require('fs');

const jsqrCode = fs.readFileSync('node_modules/jsqr/dist/jsQR.js', 'utf8');
let html = fs.readFileSync('conferente.html', 'utf8');

// 1. Remove/hide warning about BarcodeDetector since jsQR is 100% universal
html = html.replace(
  `<div id="aviso-bd">
      ⚠ Este navegador não suporta BarcodeDetector.<br>
      Use Chrome 83+ ou Samsung Internet no Android.<br>
      A entrada manual ainda funciona.
    </div>`,
  `<div id="aviso-bd" style="display:none;background:#1a7a3c;color:#fff;padding:8px 12px;font-size:.8rem;text-align:center;margin-top:10px;border-radius:2px;line-height:1.4">
      ✓ Leitor inteligente ativo (Scanner universal compatível com todos os aparelhos).
    </div>`
);

// 2. Put jsQR library inside <script> right before FNV-1a
const fnvMarker = '/* ---- FNV-1a 32 bits (idêntico ao cadastro.html) ---- */';
if (!html.includes(fnvMarker)) {
  console.error('fnvMarker not found');
  process.exit(1);
}

const jsqrBlock = `/* ========================================================
   Biblioteca jsQR inline (Universal QR Decoder ES5)
======================================================== */
` + jsqrCode + `\n\n` + fnvMarker;

html = html.replace(fnvMarker, jsqrBlock);

// 3. Replace camera and scanning loop with robust BarcodeDetector + jsQR engine
const oldScanCode = `/* ---- Câmera e leitura ---- */
var video=document.getElementById('video');
var scanCanvas=document.getElementById('scan-canvas');
var scanCtx=scanCanvas.getContext('2d');
var conferente='',_scanAtivo=false,_detector=null;

function loopScan(){
  if(!_scanAtivo)return;
  if(!_detector){requestAnimationFrame(loopScan);return;}
  _detector.detect(video).then(function(codes){
    if(codes.length>0)processarCodigo(codes[0].rawValue);
    requestAnimationFrame(loopScan);
  }).catch(function(){requestAnimationFrame(loopScan);});
}

/* ---- Iniciar ---- */
document.getElementById('btn-iniciar').addEventListener('click',function(){
  var nome=document.getElementById('inp-nome-conf').value.trim();
  var fil=parseInt(document.getElementById('inp-fileira-inicio').value,10)||1;
  if(!nome){document.getElementById('inp-nome-conf').focus();return;}
  conferente=nome;
  document.getElementById('topbar-nome').textContent=nome;
  document.getElementById('inp-fileira').value=fil;
  try{localStorage.setItem('conf_nome',nome);localStorage.setItem('conf_fil',''+fil);}catch(e){}
  /* testar BarcodeDetector */
  if(!('BarcodeDetector' in window)){
    document.getElementById('aviso-bd').style.display='block';
  } else {
    try{_detector=new BarcodeDetector({formats:['qr_code']});}catch(e){_detector=null;}
  }
  /* câmera */
  var constraints={video:{facingMode:{exact:'environment'},
    width:{ideal:1280},height:{ideal:720}}};
  navigator.mediaDevices.getUserMedia(constraints)
    .catch(function(){
      return navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    })
    .then(function(stream){
      video.srcObject=stream;
      video.addEventListener('loadedmetadata',function(){
        video.play();
        _scanAtivo=true;
        document.getElementById('inicio').style.display='none';
        atualizarContador();
        requestAnimationFrame(loopScan);
      },{once:true});
    })
    .catch(function(err){
      alert('Câmera não disponível: '+err.message+
        '\\n\\nNecessário HTTPS. Use a entrada manual enquanto isso.');
      document.getElementById('inicio').style.display='none';
      atualizarContador();
    });
});`;

const newScanCode = `/* ---- Câmera e leitura (Híbrido: BarcodeDetector nativo + jsQR universal) ---- */
var video=document.getElementById('video');
var scanCanvas=document.getElementById('scan-canvas');
var scanCtx=scanCanvas.getContext('2d', { willReadFrequently: true });
var conferente='',_scanAtivo=false,_detector=null;
var _isScanningFrame = false;

function escanearComJsQR(){
  if (!window.jsQR || !video.videoWidth || !video.videoHeight) return false;
  var vw = video.videoWidth;
  var vh = video.videoHeight;
  
  // Escala para resolução ideal de leitura rápida (max 640px)
  var scale = Math.min(1, 640 / Math.max(vw, vh));
  var sw = Math.round(vw * scale);
  var sh = Math.round(vh * scale);
  
  if (scanCanvas.width !== sw || scanCanvas.height !== sh) {
    scanCanvas.width = sw;
    scanCanvas.height = sh;
  }
  
  scanCtx.drawImage(video, 0, 0, sw, sh);
  var imgData = scanCtx.getImageData(0, 0, sw, sh);
  var code = jsQR(imgData.data, sw, sh, {
    inversionAttempts: "dontInvert"
  });
  
  if (code && code.data) {
    processarCodigo(code.data);
    return true;
  }
  return false;
}

function loopScan(){
  if(!_scanAtivo) return;
  
  if(video.readyState === video.HAVE_ENOUGH_DATA && !_isScanningFrame){
    _isScanningFrame = true;
    
    if(_detector){
      _detector.detect(video).then(function(codes){
        if(codes && codes.length > 0){
          processarCodigo(codes[0].rawValue);
        } else {
          escanearComJsQR();
        }
        _isScanningFrame = false;
        if(_scanAtivo) requestAnimationFrame(loopScan);
      }).catch(function(){
        escanearComJsQR();
        _isScanningFrame = false;
        if(_scanAtivo) requestAnimationFrame(loopScan);
      });
      return;
    } else {
      escanearComJsQR();
      _isScanningFrame = false;
    }
  }
  
  if(_scanAtivo) requestAnimationFrame(loopScan);
}

/* ---- Iniciar ---- */
document.getElementById('btn-iniciar').addEventListener('click',function(){
  var nome=document.getElementById('inp-nome-conf').value.trim();
  var fil=parseInt(document.getElementById('inp-fileira-inicio').value,10)||1;
  if(!nome){document.getElementById('inp-nome-conf').focus();return;}
  conferente=nome;
  document.getElementById('topbar-nome').textContent=nome;
  document.getElementById('inp-fileira').value=fil;
  try{localStorage.setItem('conf_nome',nome);localStorage.setItem('conf_fil',''+fil);}catch(e){}
  
  /* Inicializar detector nativo se disponível (Chrome Android / Safari 17+) */
  if('BarcodeDetector' in window){
    try{
      BarcodeDetector.getSupportedFormats().then(function(formats){
        if(formats.indexOf('qr_code') !== -1){
          _detector = new BarcodeDetector({formats:['qr_code']});
        }
      }).catch(function(){_detector=null;});
    }catch(e){_detector=null;}
  }
  
  /* Suporte de câmera universal: traseira primeiro, fallback para qualquer câmera disponível (webcams desktop/laptop) */
  var constraintsTraseira = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };
  
  navigator.mediaDevices.getUserMedia(constraintsTraseira)
    .catch(function(){
      return navigator.mediaDevices.getUserMedia({ video: true });
    })
    .then(function(stream){
      video.srcObject=stream;
      video.setAttribute('playsinline', 'true');
      video.addEventListener('loadedmetadata',function(){
        video.play();
        _scanAtivo=true;
        document.getElementById('inicio').style.display='none';
        atualizarContador();
        requestAnimationFrame(loopScan);
      },{once:true});
    })
    .catch(function(err){
      alert('Câmera não disponível: '+err.message+
        '\\n\\nVerifique as permissões de câmera do navegador. A entrada manual continua funcionando.');
      document.getElementById('inicio').style.display='none';
      atualizarContador();
    });
});`;

if (!html.includes('var video=document.getElementById(\'video\');')) {
  console.error('oldScanCode not found in conferente.html');
  process.exit(1);
}

html = html.replace(oldScanCode, newScanCode);
fs.writeFileSync('conferente.html', html, 'utf8');
console.log('conferente.html updated successfully with jsQR and universal camera scanning!');
