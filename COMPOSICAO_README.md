# Início, composição de referência: “a luz, pela hora”

Branch `fable/home-composicao`, worktree `.worktrees/_fable_home`. É uma composição navegável para decidir direção, não a página de produção: os testes da Início atual quebram (lista no fim).

**Ver:** de `web/`, `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4795 --strictPort` e abrir `http://127.0.0.1:4795/`. Galeria: `.oc/composicao/GALERIA.html` (41 PNGs em `.oc/composicao/capturas/`).

## O que mudou e por quê

- **Um fio só: a luz muda com a hora.** Pessoas, luminária, celular e título ficam em pé na mesma linha de chão. A noite entra sempre pela direita (de onde o Ícaro chega) e o dia pela esquerda (o lado da janela). Antes, cada faixa tinha a sua própria lógica.
- **As placas viraram recortes.** `web/scripts/composicao/exportar_recortes.py` tira a parede e o chão chapados de cada placa; a página desenha parede e chão com tokens. Uma composição serve às duas paletas, sem emenda entre placa e fundo.
- **A tela do produto aparece grande**, num celular desenhado em CSS (o bisel é um token: acompanha a paleta e não borra). O Histórico mostra as linhas de que a cena fala (16:00 pela Juliana, 17:30 pelo Ícaro).
- **A hora é tipografia.** Legendas na voz da hora (Literata 800 tabular), a hora escrita na parede, “Dormiu às 20:30.” em pé no chão.
- Texto: tudo vem de `conteudo/inicio.ts`. Só entraram `INI_HORAS` (16:00, 17:30, 20:30, trechos das legendas) e `INI_REF` (rótulos das vagas, não são texto de produto).

## Sequência

| # | Cena | O que tem |
|---|---|---|
| 1 | 16:00, sala de dia | h1, lede, os dois CTAs na parede clara; M05 (a entrega) na emenda dia/noite; legenda no chão |
| 2 | 17:30, “Agora é comigo.” | M06, a luminária acende; Histórico grande |
| 3 | 20:30, “Dormiu às 20:30.” | a mesma parede da cena 2; tela Hoje em modo madrugada; **vaga A03** |
| 4 | “E quando sou só eu?” | o dia entra pela esquerda; M04; tela Família |
| 5 | “Ninguém dá nota para o seu dia.” | o tapete da M04 vira o chão da faixa; quatro fatos; tela Notas |
| 6 | Perguntas | a noite entra pela direita; quatro perguntas abertas; a porta; **vaga A06** |
| 7 | Fecho | a rua (A05) na linha do rodapé; as janelas acendem; h2 e CTA |

## Movimento com a rolagem

- **1440, cenas 1 a 3:** uma faixa presa (`position: sticky`) com 300 % de largura. A rolagem vertical nativa move um `translateX` por *view timeline* em CSS, sem JavaScript: a câmera anda da sala de dia para a de noite, com paradas em cada cena. No caminho a luminária acende, o Histórico rola da manhã até 17:30 e a régua das três horas enche.
- Só vale em `(min-width: 69em)` paisagem, `min-height: 40em`, dentro de `@supports (animation-timeline: view())` e `prefers-reduced-motion: no-preference`. Fora disso (390, Firefox, movimento reduzido) as três cenas **empilham** e ficam paradas; nenhum conteúdo depende do movimento.
- Cenas 4 e 6: a parede entra de lado (`clip-path`) quando a faixa aparece. Cena 7: as janelas acendem.
- As cenas 2 e 3 não têm elemento focável, então o teclado nunca cai num painel fora da tela.

## Técnica observada no REA, uso próprio

| Referência | Técnica | Onde |
|---|---|---|
| Good Inside | interface real mostrada grande | cenas 2, 3, 4 e 5 |
| Sweet Tape, Pato Jack | um material só em toda camada desenhada | o grão de papel dos recortes |
| Sweet Tape | um gesto com sentido | a parede que anda com a hora (cenas 1 a 3, 4 e 6) |
| Mosaic, Les Intranquilles | o objeto do produto ao lado do argumento | o celular em pé no chão da cena |
| Extrafazant, Later | faixas diferenciadas, fecho contrastante | dia, tapete, noite, rua |
| Maxima | um mundo desenhado coerente | uma linha de chão em toda a página |

## Paleta

`?paleta=hora-azul` liga a paleta B (CARD_C1) e fica na aba (`sessionStorage`); `?paleta=casa` volta. É um bloco `html[data-paleta="hora-azul"]` em `styles/tokens.css` e a arte em `/composicao/b/`. **As telas do produto em B são as capturas reais recoloridas pelo script**, não capturas de um produto já em B.

## Vagas e masters

- **Aguarda arte:** A03, o berço (cena 3); A06, a porta de corpo inteiro (cena 6). As duas aparecem como contorno tracejado com rótulo.
- **Aguarda master melhor:** a rua (A05/M11) está dentro do master (0,91 a 1440) mas a auditoria a dá como mole em 1:1; a camada de luz da M06 (`m06-luz-792w.png`) fica em 0,88 a 448 px.
- Dentro do master (natural ÷ (largura CSS × 2), a 1440): M05 0,93; M06 1,00; M04 0,91; porta 1,09; capturas ≥ 1,56. Nada foi ampliado nem esticado.

## Verificado e não verificado

- Verificado: `npm.cmd run build` verde, `tsc` e `eslint` limpos nos arquivos tocados; sem rolagem horizontal em 320, 390, 720 e 1440 (`scrollWidth = clientWidth`); capturas das duas paletas olhadas uma a uma.
- **Não verificado:** contraste por ferramenta (só por cálculo nas legendas), leitor de tela, foco visível percorrido à mão, zoom só de texto a 200 % (testei 720 px, o equivalente ao zoom do navegador), Safari e Firefox, aparelho real.
- `stylelint` falha com 70 erros `harmonia/valores-soltos` em `composicao.css` (medidas próprias da composição, fora dos papéis do DESIGN.md).
- Saiu desta composição: o botão “Explorar a tela” do Histórico. A tela Família está com `alt=""` (não há texto para ela no deck).

## Testes quebrados

Suíte inteira rodada uma vez neste estado (`vitest run`, 566 s): **8 arquivos falham, 86 testes de 5274**; 227 arquivos passam.

| Arquivo | Falhas |
|---|---|
| `src/paginas/inicio.test.tsx` | 55 |
| `src/paginas/inicioFaixas.test.tsx` | 13 |
| `src/movimento/troca/vez.test.tsx` | 12 |
| `src/teste/estilo.test.ts` | 2 |
| `src/teste/rotasPublicas.test.tsx` | 1 |
| `src/teste/harmonia.test.ts` | 1 |
| `src/rotas.test.tsx` | 1 |
| `src/exportacoes.test.ts` | 1 |

Os três primeiros descrevem a estrutura antiga da Início. Não rodei a suíte na base antes de mexer, então não posso afirmar que os outros cinco quebraram só por causa desta composição; não li as mensagens de falha deles.
