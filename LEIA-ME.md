# SINDSEPS — Sistema de Controle de Presença e Quórum Sindical

Sistema institucional do **SINDSEPS** (Sindicato dos Servidores da Prefeitura do Salvador) para controle de acesso, validação dinâmica de credenciais por QR Code rotativo, deduplicação em tempo real e consolidação de quórum em assembleias deliberativas.

---

## 📁 Estrutura dos Arquivos

| Arquivo | Função | Ambiente / Acesso |
|---|---|---|
| `servidor.js` | Backend HTTP e API REST (tempo real, sessões, persistência atômica) | Node.js (Servidor Local ou Railway) |
| `iniciar-servidor.bat` | Inicializador automatizado com detecção de rede | Executável Windows (Coordenação) |
| `index.html` | Portal de Acesso e QR Code para conexão Wi-Fi | Telão / Computador da Recepção |
| `cadastro.html` | Formulário e Credencial Digital com QR Rotativo Dinâmico | Smartphone do Servidor Participante |
| `conferente.html` | Leitor Óptico dos Conferentes (Portaria / Fileiras) | Smartphones dos 6 Conferentes (HTTPS) |
| `painel.html` | Mesa Diretora: Consolidação, Auditoria, Histórico e Relatórios | Computador / Notebook da Coordenação |

---

## ⚙️ Gestão Centralizada de Assembleias (Sem Edição Manual)

O sistema conta com **gestão automática de sessão**. Não é necessário editar arquivos de código antes de cada assembleia:

1. **Abertura da Assembleia:** A Mesa Diretora acessa o `painel.html`, cria ou seleciona a assembleia do dia e clica em **Ativar**.
2. **Sincronização Automática:** O painel publica a sessão ativa no servidor (`POST /api/sessao`), definindo o identificador exclusivo do evento (`EVENTO`) e a chave criptográfica correspondente.
3. **Detecção nos Dispositivos:**
   - **`conferente.html`** busca a assembleia ativa via `/api/sessao` e sincroniza as regras de validação instantaneamente.
   - **`cadastro.html`** identifica automaticamente a assembleia atual. Se o trabalhador possuir cadastro salvo de uma assembleia anterior, o sistema detecta a mudança de evento, descarta o cache antigo e solicita o preenchimento para a assembleia de hoje.

> **Fallback Offline:** Caso o servidor central esteja temporariamente inacessível, os arquivos mantêm parâmetros padrão embutidos para operação autônoma emergencial via arquivos CSV.

---

## 🔒 Segurança e Gestão de Acessos

Para proteção institucional, o sistema adota barreiras de acesso por perfil:

- **Módulo Conferente (`conferente.html`):** Protegido por senha operacional de portaria para liberação da câmera e das leituras.
- **Mesa Diretora (`painel.html`):** Protegido por senha de coordenação para homologação de dados, gestão de assembleias e exportações.
- **API de Administração do Servidor:** Operações sensíveis (como `POST /api/presencas/limpar`) exigem o token `X-Admin-Token` configurado via variável de ambiente `TOKEN_ADMIN` no servidor.

> [!TIP]
> Altere as senhas padrão nos cabeçalhos de script dos arquivos `conferente.html` e `painel.html` antes de publicar o sistema em eventos oficiais.

---

## 🛡️ Coleta de CPF e Conformidade com a LGPD

O sistema foi estruturado em conformidade com a **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**:

### 1. Base Legal e Finalidade
- **Bases Legais:** Art. 7º, incisos VI (exercício regular de direitos em processos estatutários) e IX (legítimo interesse da organização sindical).
- **Finalidade Declarada:** Atualização cadastral dos filiados, validação estatutária da condição de servidor público municipal e higienização da base de dados do sindicato.
- **Termo de Consentimento:** O formulário do `cadastro.html` exige aceite expresso do servidor para a coleta e tratamento das informações antes da geração da credencial.

### 2. Segurança Técnica por Design (*Privacy by Design*)
- **Payload do QR Seguro:** O CPF **NUNCA** é inserido na carga de dados do QR Code. O QR contém apenas Nome, Matrícula, Órgão, Carimbo Temporal e Assinatura Criptográfica. Isso impede que terceiros na fila ou pessoas próximas leiam o CPF alheio.
- **Canal Separado:** O CPF preenchido é transmitido de forma isolada ao servidor pela rota segura `/api/presenca-cpf` e armazenado em arquivo protegido (`cpfs.json`), não exposto publicamente.
- **Máscara de Privacidade no Painel:** Na interface do `painel.html`, o CPF é exibido no formato mascarado `XXX.***.***-XX`, preservando a privacidade individual e permitindo conferência apenas aos auditores autorizados.
- **Não Versionamento:** Os arquivos de dados sensíveis (`presencas.json`, `assembleias.json`, `cpfs.json`) estão blindados no `.gitignore` contra envio acidental a repositórios públicos.

---

## 🚀 Fluxo Operacional no Dia da Assembleia

1. **Inicialização:**
   - Dê dois cliques em `iniciar-servidor.bat` (ou execute `npm start`).
   - O terminal exibirá o endereço IP local detectado (ex: `http://192.168.1.96:8080`).

2. **Recepção e Conexão:**
   - Projete ou abra `index.html` na recepção do evento.
   - O telão exibirá o QR Code de acesso direto para os servidores conectarem seus celulares ao formulário de credenciamento.

3. **Portaria e Conferentes:**
   - Os 6 conferentes acessam `conferente.html` via HTTPS em seus aparelhos.
   - Informam a matrícula e a senha de portaria para liberar o leitor de QR Code.

4. **Credenciamento do Servidor:**
   - O servidor abre `cadastro.html`, preenche nome, matrícula, CPF (para recadastramento) e órgão.
   - Ao aceitar os termos da LGPD, é gerada a credencial com QR Code rotativo que se atualiza automaticamente.

5. **Entrada e Validação:**
   - O conferente aponta a câmera para a credencial do servidor.
   - O sistema valida a assinatura FNV-1a, o limite de tolerância temporal e envia a presença ao servidor central em tempo real.
   - Caso o participante não possua celular, o conferente utiliza a função **Digitar Matrícula** para registro manual assistido.

6. **Consolidação pela Mesa Diretora:**
   - O `painel.html` recebe os dados ao vivo sem necessidade de transferência física de arquivos.
   - Exibe quórum consolidado, percentual de validação digital, ocorrências auditadas e gráficos por secretaria.
   - Ao término, emite a Ata Oficial de Quórum para impressão ou exporta a planilha homologada em formato Excel (`.xls`).

---

## 📱 Requisito de Câmera (HTTPS)

Os navegadores modernos (Chrome, Safari, Firefox, Edge) **exigem HTTPS** para liberar o acesso à câmera via `getUserMedia` em dispositivos móveis (exceto no endereço `localhost`).

Para os aparelhos dos conferentes, sirva a aplicação através de:
- Servidor local com proxy SSL / Túnel Seguro (Cloudflare Tunnel, ngrok);
- Deploy em nuvem (Railway, Netlify, Vercel ou servidor institucional com certificado Let's Encrypt).
