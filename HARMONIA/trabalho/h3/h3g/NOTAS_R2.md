# H-3g, rodada 2: CSS compartilhado (index.css, styles/site.css, styles/campo.css)

## Tipo: classe -> nível (tamanho e entrelinha do MESMO nível; o token já é fluido 390-1440, então os pontos de quebra de tipo saíram)

| Classe | Antes | Nível |
|---|---|---|
| `.cm-h1` | 84/88 (42/46) | titulo-1 |
| `.cm-h2` | 56/62 | titulo-2 |
| `.cm-h3` | 36/42 | titulo-3 |
| `.cm-h4` | 24/30 | titulo-4 |
| `.cm-lide`, `.cm-numeros-legenda`, `.cm-depoimento-texto`, botões do bloco "Em andamento" (celular) | 24/34, 22, 20 | abertura |
| `.cm-corpo`, body, `.cm-botao`, `.cm-campo-entrada`, `.cm-pular`, `.cm-selo`, `.cm-tabela th`, botões da barra Registrar (celular) | 18/27, 17 | corpo |
| `.cm-pequeno`, `.cm-rodape-titulo`, `.botao`, `.acao-rapida`, `.rotina-semana-rotulo`, `.cm-citacao-autor`, `.cm-cartao-sessao-quem` | 15, 16 | pequeno |
| `.cm-rotulo`, rótulo/quem do cartão da sessão (celular) | 14/20 | sobretitulo |
| `.cm-numeros-valor` | 64 (40), entrelinha 1 | exibicao |
| `.cm-citacao-texto`, `.cm-cartao-sessao-tempo` | 48/56, 44 | titulo-1 (tempo no celular: titulo-2) |
| `.cm-acordeao-gatilho`, `.t-botao` | 24/1.3 | titulo-4 |
| `.t-display-xl` | 96/96 | exibicao |
| `.t-citacao`, `.t-secao`, `.t-subtitulo` | 48-56 | titulo-1 |
| `.t-rotulo`, `.ha-nota-campo` | 32/38 | titulo-2 |
| `.t-corpo-g` | 28/39 | titulo-3 |
| `.t-corpo`, `.t-corpo-p` | 20, 17 | corpo |
| `.t-ui` | 15/21 | pequeno |

Fora da escala (exceções): `.t-numero`, `.t-cronometro`, cronômetro da Sessão, `[data-ultimos] .sb-numeros-valor`,
`.cm-marca`, `.cm-cab-madrugada[data-tamanho='app']`, `.cm-cab-link`, `.cm-rodape-nome`.

## Espaço
- rem -> o px igual (até 32 px); acima disso, o papel mais próximo pelo par 390/1440 (empate: o menor).
- `.cm-cab-links` e `.cm-cab-acoes` (público, >= 1100): `clamp(16px, 2.6vw - 12px, 36px)` virou `pilha` (16 px, nunca mais largo que antes);
  o cabeçalho logado já usa `junto` e não mudou, nem as larguras de Conta + Sair.
- Folga da barra Registrar: variável `--ha-barra-altura` (64 px, é a altura da barra, não ritmo de espaço).
- Reservas do campo para o ícone: `--cm-reserva-seta` (48 px) e `--cm-reserva-olho` (56 px), derivadas do tamanho do ícone.
- Respiro do link esticado: `-9.5px / 9.5px` (era 0,59375 rem).

## Foco (A11Y-002)
`input[type='date']:focus-visible` em `styles/site.css`: `outline: 3px solid var(--cor-foco)`, `outline-offset: 2px`.
Teste: `acessibilidade.test.tsx` ("foco do campo de data").

## Não verificado
Nenhuma captura de tela nem medição de navegador nesta rodada: os tamanhos visíveis das classes compartilhadas mudaram
por decisão do líder e precisam de olho e de `medir_h`.
