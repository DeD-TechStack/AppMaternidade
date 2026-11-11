import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Botao, type VarianteBotao } from '../componentes/base/Botao.tsx'
import { Campo } from '../componentes/base/Campo.tsx'
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

interface PropsSecao {
  /** Âncora da seção na página. */
  id?: string
  rotulo: string
  titulo: readonly [string] | readonly [string, string]
  /** O título só para o leitor de tela (a peça já fala por si, como a citação). */
  tituloOculto?: boolean
  texto?: string
  children: ReactNode
}

/** Uma parte da página: o rótulo curto em Outfit, o título de duas linhas e a peça. */
function Secao({ id: ancora, rotulo, titulo, tituloOculto = false, texto, children }: PropsSecao) {
  const id = useId()
  return (
    <section id={ancora} className="cm-sistema-secao" aria-labelledby={id}>
      <div className="cm-area cm-sistema-cabeca">
        <p className="cm-rotulo">{rotulo}</p>
        {tituloOculto ? (
          <h2 id={id} className="sr-only">
            {titulo.join(' ')}
          </h2>
        ) : (
          <Titulo nivel="h2" id={id} linhas={titulo} />
        )}
        {texto ? <p className="cm-corpo cm-medida cm-texto-2">{texto}</p> : null}
      </div>
      {children}
    </section>
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
 * A página do sistema visual (/sistema): o Campo de mel com as peças de verdade, na ordem do contrato
 * (paleta, tipo, botões e campos, casca, painéis, cena com o cartão flutuante, números, ilustrações,
 * citação, faixa de cacau, selos, tabela, depoimentos e perguntas). A cortina abre a página na primeira
 * visita, e o painel da abertura entra quando ela sobe.
 */
export function Sistema() {
  const [cortinaFeita, setCortinaFeita] = useState(false)
  const aoTerminarCortina = useCallback(() => setCortinaFeita(true), [])
  const idPaleta = useId()

  return (
    <>
      <Cortina aoTerminar={aoTerminarCortina} />
      <main className="cm-sistema">
        {/* Abertura: o título e, ao lado, a paleta num painel de mel. */}
        <section className="cm-area cm-sistema-abertura cm-sistema-heroi" aria-labelledby={idPaleta}>
          <div className="cm-sistema-heroi-texto">
            <Titulo nivel="h1" linhas={['Campo de mel,', 'a base do site.']} />
            <p className="cm-lide">
              Papel, mel e cacau; Literata nos títulos e Outfit no texto. Cada peça desta página é a mesma que o site
              usa, com os estados dela.
            </p>
            <div className="cm-sistema-acoes">
              <Botao to="/como-funciona">Ver como funciona</Botao>
              <Botao variante="texto" href="#tipo">
                Ir aos componentes
              </Botao>
            </div>
          </div>

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
        </section>

        <Secao id="tipo" rotulo="Tipo" titulo={SECOES.tipo}>
          {/* Cada linha da escala sobe 48 px e aparece ao entrar na janela, uma a cada 250 ms (M4). */}
          <LinhasEscalonadas
            className="cm-area cm-tipos"
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
                    Cada adulto autorizado registra sono, mamada e fralda com um ou dois toques, e todos veem o mesmo
                    dia, com o nome de quem registrou.
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
        </Secao>

        <Secao rotulo="Botões e campos" titulo={SECOES.botoes}>
          <div className="cm-area cm-grade-botoes">
            <FilaDeBotoes variante="primario" nome="Primário" texto="Criar conta" />
            <FilaDeBotoes variante="contorno" nome="Contorno" texto="Convidar alguém" />
            <FilaDeBotoes variante="texto" nome="Texto" texto="Ver como funciona" />
          </div>
          <PainelCampo variante="cacau" className="cm-sistema-mel">
            <FilaDeBotoes variante="mel" nome="Mel, sobre o cacau" texto="Iniciar mamada" />
          </PainelCampo>
          <div className="cm-area cm-campos">
            <Campo id="sistema-email" tipo="email" rotulo="E-mail" ajuda="O convite chega neste endereço." />
            <Campo id="sistema-senha" tipo="senha" rotulo="Senha" />
            <Campo
              id="sistema-nome"
              rotulo="Nome do bebê"
              defaultValue=""
              erro="Escreva o nome ou o apelido do bebê."
            />
          </div>
        </Secao>

        <Secao
          rotulo="Cabeçalho e rodapé"
          titulo={SECOES.casca}
          texto="O cabeçalho desta página é o de verdade: fica no alto ao rolar e, abaixo de 1100 px, guarda os links no menu de altura cheia. O rodapé, de mel, fecha todas as páginas."
        >
          <div className="cm-area">
            <Botao variante="contorno" href="#rodape">
              Ir ao rodapé
            </Botao>
          </div>
        </Secao>

        <Secao rotulo="Painéis de campo" titulo={SECOES.paineis}>
          <div className="cm-area cm-grade-paineis">
            {PAINEIS.map((painel) => (
              <PainelCampo key={painel.variante} variante={painel.variante} largura="celula">
                <h3 className="cm-h3">{painel.nome}</h3>
                <p className="cm-corpo">{painel.uso}</p>
              </PainelCampo>
            ))}
          </div>
        </Secao>

        <Secao
          rotulo="Cena de estúdio e cartão flutuante"
          titulo={SECOES.cena}
          texto="A cena é uma foto de estúdio com a captura das nossas telas; o cartão por cima é HTML de verdade."
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
          <section className="cm-area cm-cena-numeros" aria-labelledby="sistema-numeros">
            <h2 id="sistema-numeros" className="sr-only">
              {SECOES.numeros[0]}
            </h2>
            <Numeros itens={FATOS} />
          </section>
        </Secao>

        <Secao rotulo="Ilustrações" titulo={SECOES.ilustracoes} texto="Traço preto sobre papel ou mel, nunca sobre o cacau.">
          <div className="cm-area">
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
          <p className="cm-pequeno cm-texto-2 cm-ilustracoes-nota">{`${NOMES_ILUSTRACAO.length} desenhos, em WebP 1× e 2×.`}</p>
          </div>
        </Secao>

        <Secao rotulo="Citação" titulo={SECOES.citacao} tituloOculto>
          <div className="cm-area">
            <Citacao
              texto="Pomada só à noite, a de dia acabou. Se ela acordar, o bico está na bolsa."
              autor="Carla, avó da Heloísa, na nota das 22:40"
            />
          </div>
        </Secao>

        <div className="cm-sistema-secao">
          <div className="cm-area">
            <p className="cm-rotulo cm-sistema-rotulo-solto">Faixa de cacau</p>
          </div>
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
        </div>

        <Secao rotulo="Selos" titulo={SECOES.selos}>
          <div className="cm-area">
            <FaixaSelos />
          </div>
        </Secao>

        <Secao rotulo="Tabela de comparação" titulo={SECOES.tabela}>
          <TabelaComparacao
            legenda="O que muda entre o AppMaternidade e o caderno com as mensagens soltas"
            linhas={LINHAS_DA_TABELA}
          />
        </Secao>

        <div className="cm-sistema-secao">
          <div className="cm-area">
            <p className="cm-rotulo cm-sistema-rotulo-solto">Depoimentos</p>
          </div>
          <Depoimento
            aria-labelledby="sistema-depoimentos"
            titulo={<Titulo nivel="h2" id="sistema-depoimentos" linhas={SECOES.depoimentos} />}
            relatos={RELATOS}
          />
        </div>

        <Secao rotulo="Perguntas frequentes" titulo={SECOES.perguntas}>
          <div className="cm-area">
            <Acordeao itens={PERGUNTAS} />
          </div>
        </Secao>
      </main>
    </>
  )
}
