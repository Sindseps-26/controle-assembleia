# LEIA-ME — Sistema de Controle de Presença Sindical

## Arquivos

| Arquivo | Quem usa | Onde roda |
|---|---|---|
| `cadastro.html` | Cada participante | Celular do trabalhador |
| `conferente.html` | Conferente (6 aparelhos) | Celular do conferente |
| `painel.html` | Coordenação | Desktop/notebook |

---

## Como configurar antes de cada assembleia

Abra `cadastro.html` **e** `conferente.html` em um editor de texto e localize o bloco:

```js
/* ========================================================
   CONFIGURE AQUI — ajuste antes de cada assembleia
======================================================== */
var EVENTO           = 'ASSEMBLEIA-2026';        // ← mude para identificar a assembleia
var CHAVE            = 'mude-a-cada-assembleia'; // ← troque por uma frase secreta nova
var ROTACAO          = 10;   // segundos por janela
var TOLERANCIA       = 300;  // 5 minutos de tolerância para fuso/relógio
var SENHA_CONFERENTE = 'Portaria@2026'; // ← senha dos conferentes da portaria
var SENHA_PAINEL     = 'Sindseps#2026'; // ← senha da Mesa Diretora no painel.html
```

**Senhas configuradas:**
- **Portaria / Conferente:** `Portaria@2026`
- **Mesa Diretora / Painel:** `Sindseps#2026`

*(Ambas podem ser alteradas livremente diretamente no topo dos arquivos `conferente.html` e `painel.html`).*

**Os valores de `EVENTO` e `CHAVE` precisam ser idênticos nos dois arquivos.**

---

## Por que HTTPS é obrigatório para o conferente

O `conferente.html` usa `getUserMedia` (câmera) do navegador.
Por norma de segurança, os navegadores modernos só concedem acesso à câmera em:

- páginas servidas via **HTTPS**, ou
- `localhost` (para testes locais).

**Em HTTP comum a câmera é bloqueada e o sistema não funciona.**

Opções simples de hospedagem HTTPS:
- GitHub Pages (gratuito)
- Netlify Drop (arraste a pasta)
- Qualquer servidor com certificado Let's Encrypt

O `cadastro.html` não usa câmera e pode ser aberto diretamente do disco (`file://`).
O `painel.html` também não usa câmera; pode rodar offline.

---

## Troque a CHAVE a cada assembleia

A `CHAVE` entra na assinatura FNV-1a de cada QR. Ela **impede que alguém gere
um QR genérico com um aplicativo de terceiros** sem conhecer a chave.

**Porém**: a chave está no código-fonte do `cadastro.html`, que fica no celular
do trabalhador. Quem inspecionar o HTML pode extraí-la.

**O que isso significa na prática:**

> A assinatura barra o gerador genérico de QR (celular que tentaria burlar sem
> ter passado pelo formulário). Ela **não barra** um atacante determinado que
> inspecione o código e gere um payload falso com a chave correta.
>
> **A defesa real é o conferente olhando o relógio correr.** Um QR gerado a
> mais de (ROTACAO + TOLERANCIA) segundos atrás é recusado automaticamente pelo
> sistema. Mesmo com a chave, uma foto de tela fica inválida em poucos segundos.

Trocando a chave a cada assembleia, o ataque requer esforço a cada vez —
tornando-o impraticável para a fraude comum de "pedir ao colega para assinar".

---

## Fluxo de operação no dia

1. **Antes**: Edite `EVENTO` e `CHAVE` nos dois arquivos. Distribua `cadastro.html`
   (WhatsApp, e-mail ou link hospedado). Instale `conferente.html` nos 6 aparelhos
   via HTTPS.

2. **Na entrada**: O trabalhador abre `cadastro.html`, preenche CPF e nome, mostra
   a tela ao conferente. O conferente aponta a câmera para o QR.

3. **Sem celular**: O conferente usa o botão "Digitar CPF" no `conferente.html`
   para registro manual — esses registros aparecem marcados como `manual` no CSV.

4. **Ao final**: Cada conferente toca "Exportar" no seu aparelho e salva o CSV.
   Todos os CSVs são arrastados para o `painel.html` para consolidação.

5. **Múltiplas Assembleias no Ano**: O `painel.html` possui gerenciador integrado de assembleias.
   A Mesa Diretora pode criar novas assembleias com nome e data, alternar entre elas a qualquer momento,
   consultar o histórico do ano e emitir listas de presença/CSV individuais para cada evento sem misturar dados.

6. **Próxima assembleia**: Troque a `CHAVE` por uma frase nova.

---

## Segurança e limitações honestas

| O sistema **impede** | O sistema **não impede** |
|---|---|
| QR gerado por app genérico sem a chave | Quem inspecionar o código e extrair a chave |
| Foto de tela do QR (expira em ~55 s) | Engenharia social entre colegas |
| Mesmo CPF sendo lido duas vezes | Declaração de CPF falso no formulário |
| QR de evento diferente | Trabalhador com dois celulares |

A proteção principal **é operacional**, não técnica: o conferente vê o relógio
correndo na tela do trabalhador e sabe que é ao vivo.
