# Capturas das telas (dentro dos aparelhos do Início)

São capturas do **nosso** site (AppMaternidade), não imagem de fora. Janela inteira em 1440×900 (computador) e 390×844 (celular), movimento reduzido, dados de exemplo do protótipo.

- **SHA de origem:** `5bde20e9c0148e41cb57a5b4958c5795d6658c3b` (ramo do cartão 44d-5, que contém o `int/refazer` em `eda47ae`, com a área logada refeita da 44d-2). As telas Hoje e Sessão vêm desse código, e não do `ab77f69` da primeira entrega.
- **Hora da captura:** 10/11/2026, 18:37:11 (UTC-03:00), em `http://127.0.0.1:5265/` (Vite deste worktree) e Chrome headless 157, pelo `.oc/telas_fonte.mjs` do cartão (CDP, `Page.captureScreenshot` da janela).
- **Sem barra de rolagem:** só na captura, um estilo injetado no navegador esconde a barra (`scrollbar-width: none` e `::-webkit-scrollbar { display: none }`); o CSS do produto não mudou. `innerWidth` é igual a `clientWidth` (1440 e 390): nenhuma largura é comida pela barra.
- **Troca (rodada visual 1, 10/11):** estas oito imagens substituem as de 16:34, que vinham do `ab77f69` com a barra do navegador dentro do aparelho.

| arquivo | tela | tema | tamanho | sha256 |
|---|---|---|---|---|
| hoje-claro-1440.png | Hoje | claro | 1440×900 | 006c1c79f4f3c37386a6863b34416b09e8ef3cb48d4966308fd0a21bb28234ef |
| hoje-claro-390.png | Hoje | claro | 390×844 | 54ac64bbc4292377924564577861eb37396f69cd60f3604946d7e041576a0eba |
| hoje-madrugada-1440.png | Hoje | madrugada | 1440×900 | 6ea0969be36335f8ae49486be4fdf19a8594d5e78beb2a37a38bcf3596ccba1d |
| hoje-madrugada-390.png | Hoje | madrugada | 390×844 | 25cfd79068ff9a9e95779564aefea94c2d886220abc8556ec10076ef56790f42 |
| sessao-claro-1440.png | Sessão | claro | 1440×900 | 1f709f645ab0d0680cdd487480416ceb586bf1a37dfa5a5c870c60dbda56b2a6 |
| sessao-claro-390.png | Sessão | claro | 390×844 | e33fcc216092fa3eca191fd7dbd283172747dbae49b0c1dd20063a8fac1a317f |
| sessao-madrugada-1440.png | Sessão | madrugada | 1440×900 | b7fd7bd79464d0ad95e7534af1ad1b26f5fb65052b3f9514b1667ec56359e8e4 |
| sessao-madrugada-390.png | Sessão | madrugada | 390×844 | 35f0a5824db3573345443ba3ddb4a7a2de6c6a49a0c246c6a241df7b443a2d9e |
