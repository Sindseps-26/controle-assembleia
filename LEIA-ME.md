# SINDSEPS — Manual Operacional do Sistema de Presença e Quórum

Guia prático para a Mesa Diretora, Coordenação e Conferentes de Portaria.

---

## 💡 1. Como o Sistema Funciona

O sistema foi criado para substituir as listas de papel por um processo digital rápido, seguro e sem filas:

1. **O Servidor Público:** Chega ao evento, abre o link no celular, preenche seus dados (incluindo CPF para atualização cadastral) e gera sua **Credencial Digital**.
2. **O Conferente na Portaria:** Com a câmera do celular, faz a leitura do QR Code da credencial do servidor em menos de 1 segundo.
3. **A Mesa Diretora:** Acompanha em tempo real em um computador o quórum oficial subindo na tela, com gráficos por secretaria e bloqueio automático de tentativas repetidas.

---

## 🔄 2. Como Trocar ou Criar uma Nova Assembleia

Você não precisa mexer em arquivos nem reiniciar o sistema para mudar de assembleia. Tudo é feito visualmente na tela do **Painel da Diretoria**:

### Para usar uma assembleia que já existe:
1. No topo da tela do Painel, clique no campo **Assembleia**.
2. Escolha a assembleia desejada na lista.
3. O painel carrega na hora o quórum e a lista daquele evento, e avisa todos os celulares das portarias sobre a troca.

### Para criar a assembleia da próxima semana:
1. No topo da tela do Painel, clique no botão **⚙️ Opções** e depois em **➕ Nova Assembleia**.
2. Digite o **Nome da Assembleia** (ex: *Campanha Salarial 2026*), a **Data** e a **Pauta**.
3. Clique em **Criar Assembleia**.
4. **O que acontece automaticamente:**
   - O sistema zera o quórum para começar a nova contagem.
   - Quando o servidor que foi à assembleia passada abrir o celular hoje, o sistema avisa que é uma nova assembleia, apaga a credencial antiga e pede um novo preenchimento para a assembleia de hoje.
   - Os dados da assembleia anterior não são perdidos — ficam arquivados com segurança no histórico.

---

## 📲 3. Como Funciona a Coleta de Presença

### A. Servidor com Celular (Fluxo Padrão — 95% dos casos):
1. O servidor se conecta ao Wi-Fi ou acessa o link divulgado pelo Sindicato.
2. Preenche Nome, Matrícula, Secretaria/Órgão e CPF.
3. Aceita o termo de consentimento da LGPD e clica em **Gerar Credencial**.
4. A tela exibe o QR Code dinâmico com um relógio de segundos correndo ao vivo.
5. Na portaria, o conferente aponta a câmera para a tela do servidor:
   - A tela pisca verde com o aviso **"CONFIRMADO!"** e toca um sinal sonoro.
   - A presença é somada ao quórum da diretoria no mesmo segundo.

### B. Servidor Sem Celular ou com Bateria Descarregada:
1. O servidor se dirige a qualquer um dos conferentes na portaria.
2. O conferente clica no botão **"Digitar Matrícula"** na tela do seu leitor.
3. Digita a matrícula e o nome do servidor e confirma.
4. A presença é computada normalmente e recebe a identificação de registro manual para auditoria.

---

## 📊 4. Tipos de Relatórios Gerados pelo Sistema

Ao final das deliberações, a Mesa Diretora pode emitir três tipos de relatórios oficiais:

### 1. Ata Oficial para Assinatura (Impressão em Papel ou PDF A4)
- **Onde clicar:** Botão **🖨️ Imprimir Lista Oficial**.
- **O que contém:** Cabeçalho institucional do SINDSEPS, nome da assembleia, data, pauta discutida, quórum final homologado, relação nominal dos presentes e campos oficiais para assinatura da **Mesa Diretora** e da **Comissão de Credenciamento**.

### 2. Planilha Excel Completa (.xls) da Assembleia
- **Onde clicar:** Botão **⬇ Exportar Excel (.xls)**.
- **O que contém:** Arquivo formatado para abrir no Excel com todas as colunas: Matrícula, CPF, Nome, Órgão, Horário exato de entrada, Portão de acesso e método de validação (QR Code ou Manual).

### 3. Histórico Anual Consolidado
- **Onde clicar:** Menu **⚙️ Opções ➔ 📅 Histórico de Assembleias ➔ Baixar Planilha**.
- **O que contém:** Uma planilha única contendo todas as assembleias realizadas no ano, permitindo cruzar dados de frequência e engajamento dos servidores por secretaria.

---

## 🛡️ 5. Segurança e Regras Antifraude

* **Tentativa de passar duas vezes:** Se o mesmo servidor (mesma matrícula) for lido uma segunda vez em qualquer portaria, o sistema não soma a presença e lança um alerta vermelho na tabela de **Ocorrências de Auditoria** como *"Leitura repetida na portaria"*.
* **Proteção contra prints de WhatsApp:** O QR Code muda a cada 10 segundos e possui um relógio na tela. O conferente confere os segundos rodando na hora, barrando fotos estáticas enviadas por colegas ausentes.
* **Privacidade do CPF (LGPD):** O CPF coletado não aparece no QR Code (ninguém na fila consegue ver o documento do colega). No painel da diretoria ele aparece mascarado (`XXX.***.***-XX`), sendo exibido completo apenas no relatório oficial emitido pela coordenação.

---

## 📶 6. Funcionamento com Oscilação de Internet (Sincronização Automática)

Se houver qualquer instabilidade momentânea na conexão de internet durante o credenciamento:
1. Os conferentes continuam apontando a câmera e lendo os QR Codes normalmente.
2. O leitor armazena as presenças de forma segura na memória interna do aparelho.
3. Assim que a conexão com o servidor for restabelecida, o aplicativo sincroniza todos os registros em segundo plano automaticamente, sem intervenção manual e sem risco de perda de dados.
