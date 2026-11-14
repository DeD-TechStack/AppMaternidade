import { useCallback, useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FRASE_DE_EXEMPLO, NIVEIS_DE_TIPO, PAPEIS_DE_ESPACO } from '../componentes/base/amostraSistema.ts'
import { Botao, type VarianteBotao } from '../componentes/base/Botao.tsx'
import { Campo } from '../componentes/base/Campo.tsx'
import { Coluna, Colunas } from '../componentes/base/layout/Colunas.tsx'
import { Pilha } from '../componentes/base/layout/Pilha.tsx'
import { QuadroLayout } from '../componentes/base/layout/QuadroLayout.tsx'
import { Secao } from '../componentes/base/layout/Secao.tsx'
import { Acordeao } from '../componentes/campo/Acordeao.tsx'
import { CartaoFlutuante } from '../componentes/campo/CartaoFlutuante.tsx'
import { CenaEstudio } from '../componentes/campo/CenaEstudio.tsx'
import { Citacao } from '../componentes/campo/Citacao.tsx'
import { Depoimento } from '../componentes/campo/Depoimento.tsx'
import { FaixaCacau } from '../componentes/campo/FaixaCacau.tsx'
import { FaixaSelos } from '../componentes/campo/FaixaSelos.tsx'
import { Ilustracao, NOMES_ILUSTRACAO, type NomeIlustracao } from '../componentes/campo/Ilustracao.tsx'
import { Numeros } from '../componentes/campo/Numeros.tsx'
import { PainelCampo, type VariantePainel } from '../componentes/campo/PainelCampo.tsx'
import { TabelaComparacao } from '../componentes/campo/TabelaComparacao.tsx'
import { Titulo } from '../componentes/campo/Titulo.tsx'
import { NOMES_DE_PAGINA } from '../conteudo/publicas-texto.ts'
import { FATOS } from '../conteudo/textos.ts'
import {
  ILUSTRACOES_DA_AMOSTRA,
  LINHAS_DA_TABELA,
  PALETA,
  PERGUNTAS,
  RELATOS,
  SECOES,
} from '../conteudo/sistema.ts'
import { CamadaHover } from '../movimento/CamadaHover.tsx'
import { Cortina } from '../movimento/Cortina.tsx'
import { EntradaCena } from '../movimento/EntradaCena.tsx'
import { LinhasEscalonadas } from '../movimento/LinhasEscalonadas.tsx'
import { useTituloDaPagina } from './publicas/useTitulo.ts'

interface PropsParte {
  /** Âncora da seção na página. */
  id?: string
  rotulo: string
  titulo: readonly [string] | readonly [string, string]
  /** O título só para o leitor de tela (a peça já fala por si, como a citação). */
  tituloOculto?: boolean
  texto?: string
  children: ReactNode
}

/**
 * Uma parte da página: uma `Secao` com o cabeçalho no quadro (o rótulo curto em Outfit e o título de duas linhas, juntos,
 * e o texto depois) e a peça. O espaço entre o cabeçalho e as peças é `bloco`; o da seção é o da primitiva.
 */
function Parte({ id: ancora, rotulo, titulo, tituloOculto = false, texto, children }: PropsParte) {
  const id = useId()
  return (
    <Secao id={ancora} aria-labelledby={id}>
      <Pilha vao="bloco">
        <QuadroLayout className="cm-sistema-cabeca">
          <Pilha vao="pilha">
            <Pilha vao="junto">
              <p className="cm-rotulo">{rotulo}</p>
              {tituloOculto ? (
                <h2 id={id} className="sr-only">
                  {titulo.join(' ')}
                </h2>
              ) : (
                <Titulo nivel="h2" id={id} linhas={titulo} />
              )}
            </Pilha>
            {texto ? <p className="cm-corpo cm-medida cm-texto-2">{texto}</p> : null}
          </Pilha>
        </QuadroLayout>
        {children}
      </Pilha>
    </Secao>
  )
}

const ESTADOS = [
  { legenda: 'normal', props: {} },
  { legenda: 'com o cursor em cima', props: { 'data-forcar': 'hover' } },
  { legenda: 'com foco do teclado', props: { 'data-forcar': 'foco' } },
  { legenda: 'desativado', props: { desativado: true } },
] as const

function FilaDeBotoes({ variante, nome, texto }: { variante: VarianteBotao; nome: string; texto: string }) {
  return (
    <div className="cm-fila">
      <p className="cm-rotulo cm-fila-rotulo">{nome}</p>
      {ESTADOS.map((estado) => (
        <div key={estado.legenda} className="cm-amostra-botao">
          <Botao variante={variante} {...estado.props}>
            {texto}
          </Botao>
          <p className="cm-pequeno cm-texto-2">{estado.legenda}</p>
        </div>
      ))}
    </div>
  )
}

const PAINEIS: ReadonlyArray<{ variante: VariantePainel; nome: string; uso: string }> = [
  { variante: 'mel', nome: 'Mel', uso: 'O campo de mídia: uma cena ou uma tela de verdade por dobra.' },
  { variante: 'oliva', nome: 'Oliva', uso: 'O segundo campo: pedestal, selos e a tabela de comparação.' },
  { variante: 'areia', nome: 'Areia', uso: 'O descanso entre painéis, para os depoimentos.' },
  { variante: 'cacau', nome: 'Cacau', uso: 'A faixa escura, com o texto de papel e o primário de mel.' },
]

/**
 * A largura calculada de um elemento, em px, lida de novo quando a janela muda de tamanho. `null` enquanto o
 * elemento não existe ou quando o navegador não devolve um número (jsdom devolve o texto da variável).
 */
function useLarguraCalculada(elemento: HTMLElement | null): number | null {
  const assinar = useCallback((avisar: () => void) => {
    window.addEventListener('resize', avisar)
    return () => window.removeEventListener('resize', avisar)
  }, [])
  const ler = useCallback(() => {
    if (!elemento) return -1
    const largura = Number.parseFloat(window.getComputedStyle(elemento).width)
    return Number.isFinite(largura) ? largura : -1
  }, [elemento])
  const largura = useSyncExternalStore(assinar, ler, () => -1)
  return largura < 0 ? null : largura
}

const EM_PX = (valor: number) => `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} px`

/** Uma barra do papel de espaço: o quadrado tem a largura e a altura do token, e o valor é o calculado agora. */
function BarraDeEspaco({ papel }: { papel: (typeof PAPEIS_DE_ESPACO)[number] }) {
  const [barra, definirBarra] = useState<HTMLElement | null>(null)
  const largura = useLarguraCalculada(barra)
  return (
    <li className="flex items-center gap-4" data-espaco={papel}>
      <div
        ref={definirBarra}
        className="cm-espaco-barra shrink-0"
        style={{ width: `var(--espaco-${papel})`, height: `var(--espaco-${papel})` }}
        data-espaco-barra={papel}
        aria-hidden="true"
      />
      <p className="cm-pequeno flex min-w-0 flex-wrap items-baseline gap-x-4">
        <span className="font-semibold">{`espaco-${papel}`}</span>
        <span className="cm-texto-2 tabular-nums" data-espaco-valor="">
          {largura === null ? '' : EM_PX(largura)}
        </span>
      </p>
    </li>
  )
}

/**
 * A página do sistema visual (/sistema): o Campo de mel com as peças de verdade, na ordem do contrato
 * (paleta, tipo, níveis de tipo, espaço, botões e campos, casca, painéis, cena com o cartão flutuante, números,
 * ilustrações, citação, faixa de cacau, selos, tabela, depoimentos e perguntas). A cortina abre a página na
 * primeira visita, e o painel da abertura entra quando ela sobe. O espaço da página sai das primitivas de layout.
 */
export function Sistema() {
  useTituloDaPagina(NOMES_DE_PAGINA.sistema)
  const [cortinaFeita, setCortinaFeita] = useState(false)
  const aoTerminarCortina = useCallback(() => setCortinaFeita(true), [])
  const idPaleta = useId()

  return (
    <>
      <Cortina aoTerminar={aoTerminarCortina} />
      <main className="cm-sistema">
        {/* Abertura: o título e, ao lado, a paleta num painel de mel (texto e mídia: vão de mídia). */}
        <Secao aria-labelledby={idPaleta}>
          <QuadroLayout>
            <Colunas fracoes="1fr 1fr" vao="midia" aPartirDe={1100} alinhar="centro">
              <Coluna className="cm-sistema-heroi-texto">
                <Pilha vao="grupo">
                  <Pilha vao="pilha">
                    <Titulo nivel="h1" linhas={['Campo de mel,', 'a base do site.']} />
                    <p className="cm-lide">
                      Papel, mel e cacau; Literata nos títulos e Outfit no texto. Cada peça desta página é a mesma que
                      o site usa, com os estados dela.
                    </p>
                  </Pilha>
                  <div className="cm-sistema-acoes">
                    <Botao to="/como-funciona">Ver como funciona</Botao>
                    <Botao variante="texto" href="#tipo">
                      Ir aos componentes
                    </Botao>
                  </div>
                </Pilha>
              </Coluna>

              <Coluna>
                <EntradaCena pronta={cortinaFeita} className="cm-sistema-heroi-painel">
                  <PainelCampo variante="mel" luz largura="celula">
                    <p className="cm-rotulo">Paleta</p>
                    <h2 id={idPaleta} className="cm-h4 cm-paleta-titulo">
                      {SECOES.paleta[0]}
                    </h2>
                    <ul className="cm-paleta" data-paleta="">
                      {PALETA.map((papel) => (
                        <li key={papel.token} className="cm-amostra-cor">
                          <span
                            className="cm-amostra-cor-bloco"
                            style={{ backgroundColor: `var(--color-${papel.token})` }}
                            aria-hidden="true"
                          />
                          <span className="cm-amostra-cor-nome cm-pequeno">{papel.nome}</span>
                          <span className="cm-amostra-cor-hex cm-pequeno">{`#${papel.hex}`}</span>
                          <span className="cm-rotulo">{papel.uso}</span>
                        </li>
                      ))}
                    </ul>
                  </PainelCampo>
                </EntradaCena>
              </Coluna>
            </Colunas>
          </QuadroLayout>
        </Secao>

        <Parte id="tipo" rotulo="Tipo" titulo={SECOES.tipo}>
          {/* Cada linha da escala sobe 48 px e aparece ao entrar na janela, uma a cada 250 ms (M4). */}
          <QuadroLayout>
            <LinhasEscalonadas
              className="cm-tipos"
              classeLinha="cm-tipo-linha"
              linhas={[
                <>
                  <p className="cm-rotulo cm-texto-2">Título 1, Literata 600, 84 por 88</p>
                  <p className="cm-h1">
                    A rotina do bebê,
                    <span className="cm-segunda-linha">dividida com carinho.</span>
                  </p>
                </>,
                <>
                  <p className="cm-rotulo cm-texto-2">Título 2, 56 por 62</p>
                  <p className="cm-h2">
                    Quem chega no turno
                    <span className="cm-segunda-linha">já sabe o que houve.</span>
                  </p>
                </>,
                <>
                  <p className="cm-rotulo cm-texto-2">Título 3, 36 por 42</p>
                  <p className="cm-h3">Mamada às 02:40, lado esquerdo</p>
                </>,
                <>
                  <p className="cm-rotulo cm-texto-2">Título 4, 24 por 30</p>
                  <p className="cm-h4">Desde que você saiu</p>
                </>,
                <>
                  <p className="cm-rotulo cm-texto-2">Outfit: corpo 18, pequeno 15, rótulo 14</p>
                  <div className="cm-tipo-textos">
                    <p className="cm-corpo cm-medida">
                      Cada adulto autorizado registra sono, mamada e fralda com um ou dois toques, e todos veem o
                      mesmo dia, com o nome de quem registrou.
                    </p>
                    <p className="cm-pequeno cm-texto-2">Registrado por Bruno às 04:05.</p>
                    <p className="cm-rotulo">Última mamada</p>
                  </div>
                </>,
                <>
                  <p className="cm-rotulo cm-texto-2">Algarismos tabulares nos tempos</p>
                  <p className="cm-h3 cm-tabular cm-tabular-amostra">
                    <span>00:12:40</span>
                    <span>01:05:09</span>
                    <span>10:47:33</span>
                  </p>
                </>,
              ]}
            />
          </QuadroLayout>
        </Parte>

        <Parte rotulo="Níveis de tipo" titulo={['Nove níveis de tipo,', 'a mesma frase.']}>
          <QuadroLayout>
            <Pilha as="ul" vao="grupo">
              {NIVEIS_DE_TIPO.map(({ nivel, classes }) => (
                <li key={nivel} data-nivel={nivel}>
                  <Pilha vao="junto">
                    <p className="cm-pequeno cm-texto-2">{nivel}</p>
                    <p className={classes} data-amostra-tipo="">
                      {FRASE_DE_EXEMPLO}
                    </p>
                  </Pilha>
                </li>
              ))}
            </Pilha>
          </QuadroLayout>
        </Parte>

        <Parte
          rotulo="Espaço"
          titulo={['Espaço por papel,', 'medido na largura de agora.']}
          texto="Cada quadrado tem a largura e a altura do token. O valor ao lado é o que o navegador calcula nesta largura de janela."
        >
          <QuadroLayout>
            <Pilha as="ul" vao="pilha">
              {PAPEIS_DE_ESPACO.map((papel) => (
                <BarraDeEspaco key={papel} papel={papel} />
              ))}
            </Pilha>
          </QuadroLayout>
        </Parte>

        <Parte rotulo="Botões e campos" titulo={SECOES.botoes}>
          <QuadroLayout>
            <Pilha vao="grupo">
              <FilaDeBotoes variante="primario" nome="Primário" texto="Criar conta" />
              <FilaDeBotoes variante="contorno" nome="Contorno" texto="Convidar alguém" />
              <FilaDeBotoes variante="texto" nome="Texto" texto="Ver como funciona" />
            </Pilha>
          </QuadroLayout>
          <PainelCampo variante="cacau" className="cm-sistema-mel">
            <FilaDeBotoes variante="mel" nome="Mel, sobre o cacau" texto="Iniciar mamada" />
          </PainelCampo>
          <QuadroLayout>
            <Colunas fracoes="1fr 1fr 1fr" aPartirDe={900} alinhar="inicio">
              <Coluna>
                <Campo id="sistema-email" tipo="email" rotulo="E-mail" ajuda="O convite chega neste endereço." />
              </Coluna>
              <Coluna>
                <Campo id="sistema-senha" tipo="senha" rotulo="Senha" />
              </Coluna>
              <Coluna>
                <Campo
                  id="sistema-nome"
                  rotulo="Nome do bebê"
                  defaultValue=""
                  erro="Escreva o nome ou o apelido do bebê."
                />
              </Coluna>
            </Colunas>
          </QuadroLayout>
        </Parte>

        <Parte
          rotulo="Cabeçalho e rodapé"
          titulo={SECOES.casca}
          texto="O cabeçalho desta página é o de verdade: fica no alto ao rolar e, abaixo de 1100 px, guarda os links no menu de altura cheia. O rodapé, de mel, fecha todas as páginas."
        >
          <QuadroLayout>
            <Botao variante="contorno" href="#rodape">
              Ir ao rodapé
            </Botao>
          </QuadroLayout>
        </Parte>

        <Parte rotulo="Painéis de campo" titulo={SECOES.paineis}>
          <QuadroLayout>
            <Colunas fracoes="1fr 1fr" aPartirDe={768} className="cm-grade-paineis">
              {PAINEIS.map((painel) => (
                <Coluna key={painel.variante} className="flex">
                  <PainelCampo variante={painel.variante} largura="celula" className="grow">
                    <h3 className="cm-h3">{painel.nome}</h3>
                    <p className="cm-corpo">{painel.uso}</p>
                  </PainelCampo>
                </Coluna>
              ))}
            </Colunas>
          </QuadroLayout>
        </Parte>

        <Parte
          rotulo="Cena de estúdio e cartão flutuante"
          titulo={SECOES.cena}
          texto="A cena é uma foto de estúdio com a captura das nossas telas; o cartão por cima é um cartão de verdade, não uma imagem."
        >
          <CenaEstudio
            base="/cenas/sistema/trio-mel"
            largura={1536}
            altura={1024}
            alt="Três celulares sobre pedestais de oliva, num fundo de mel, mostrando telas do site AppMaternidade: a base do sistema, a escala de títulos e o rodapé de mel."
            prioritaria
          >
            <CartaoFlutuante giro={-2} posicao="baixo-esquerda">
              <p className="cm-cartao-sessao-rotulo">Mamada em andamento</p>
              <p className="cm-cartao-sessao-tempo">00:12:40</p>
              <p className="cm-cartao-sessao-quem">Lado esquerdo, Juliana</p>
            </CartaoFlutuante>
          </CenaEstudio>
          <QuadroLayout as="section" aria-labelledby="sistema-numeros">
            <h2 id="sistema-numeros" className="sr-only">
              {SECOES.numeros[0]}
            </h2>
            <Numeros itens={FATOS} />
          </QuadroLayout>
        </Parte>

        <Parte rotulo="Ilustrações" titulo={SECOES.ilustracoes} texto="Traço preto sobre papel ou mel, nunca sobre o cacau.">
          <QuadroLayout>
            <Pilha vao="pilha">
              <ul className="cm-ilustracoes">
                {ILUSTRACOES_DA_AMOSTRA.map((item, i) => (
                  <li key={item.nome}>
                    <CamadaHover
                      className="cm-ilustracao-cartao"
                      classeCamada="cm-camada-resumo"
                      camada={<p className="cm-corpo">{item.resumo}</p>}
                    >
                      <Link to={item.destino} className="cm-ilustracao-cartao">
                        <span className="cm-ilustracao-quadro" data-fundo={i % 2 === 0 ? 'mel' : 'papel'}>
                          <Ilustracao nome={item.nome as NomeIlustracao} decorativa carregamento="eager" />
                        </span>
                        <span className="cm-ilustracao-legenda cm-corpo">{item.titulo}</span>
                      </Link>
                    </CamadaHover>
                  </li>
                ))}
              </ul>
              <p className="cm-pequeno cm-texto-2">{`${NOMES_ILUSTRACAO.length} desenhos, em WebP 1× e 2×.`}</p>
            </Pilha>
          </QuadroLayout>
        </Parte>

        <Parte rotulo="Citação" titulo={SECOES.citacao} tituloOculto>
          <QuadroLayout>
            <Citacao
              texto="Pomada só à noite, a de dia acabou. Se ela acordar, o bico está na bolsa."
              autor="Carla, avó da Heloísa, na nota das 22:40"
            />
          </QuadroLayout>
        </Parte>

        <Secao as="div">
          <Pilha vao="bloco">
            <QuadroLayout>
              <p className="cm-rotulo cm-sistema-rotulo-solto">Faixa de cacau</p>
            </QuadroLayout>
            <FaixaCacau brilho aria-labelledby="sistema-faixa">
              <div className="cm-faixa-texto">
                <Titulo nivel="h2" id="sistema-faixa" linhas={SECOES.faixa} />
                <p className="cm-lide">
                  O botão de iniciar mamada fica na metade de baixo da tela, grande, em mel sobre o escuro.
                </p>
                <Botao variante="mel" to="/como-funciona">
                  Ver como funciona
                </Botao>
              </div>
            </FaixaCacau>
          </Pilha>
        </Secao>

        <Parte rotulo="Selos" titulo={SECOES.selos}>
          <QuadroLayout>
            <FaixaSelos />
          </QuadroLayout>
        </Parte>

        <Parte rotulo="Tabela de comparação" titulo={SECOES.tabela}>
          <TabelaComparacao
            legenda="O que muda entre o AppMaternidade e o caderno com as mensagens soltas"
            linhas={LINHAS_DA_TABELA}
          />
        </Parte>

        <Secao as="div">
          <Pilha vao="bloco">
            <QuadroLayout>
              <p className="cm-rotulo cm-sistema-rotulo-solto">Depoimentos</p>
            </QuadroLayout>
            <Depoimento
              aria-labelledby="sistema-depoimentos"
              titulo={<Titulo nivel="h2" id="sistema-depoimentos" linhas={SECOES.depoimentos} />}
              relatos={RELATOS}
            />
          </Pilha>
        </Secao>

        <Parte rotulo="Perguntas frequentes" titulo={SECOES.perguntas}>
          <QuadroLayout>
            <Acordeao itens={PERGUNTAS} />
          </QuadroLayout>
        </Parte>
      </main>
    </>
  )
}
