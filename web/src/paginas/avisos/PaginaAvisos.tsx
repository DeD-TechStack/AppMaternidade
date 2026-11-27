import { useRef, useState, type ReactNode } from 'react'
import { useAvisos } from '../../componentes/avisos/useAvisos.ts'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../../componentes/base/layout/index.ts'
import { Ilustracao } from '../../componentes/campo/Ilustracao.tsx'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import { RegiaoStatus, ResumoErro } from '../../componentes/conta/Partes.tsx'
import { useFamiliaAtual, useSessao } from '../../componentes/conta/sessao.tsx'
import { AVISOS_COMPATIBILIDADE_TEXTOS, AVISOS_TEXTOS } from '../../conteudo/avisos.ts'
import { CABECALHO } from '../../conteudo/conta.ts'
import { NOTAS } from '../../conteudo/rotina.ts'
import { faltaRpcDeAvisos, type Aviso } from '../../dados/avisos.ts'
import type { ErroDados } from '../../dados/comum.ts'
import { podeEscrever } from '../../dados/rotina.tipos.ts'

// /app/avisos (RF14:RF-08 a RF-12 e RF-19): as notas que outras pessoas escreveram nas famílias da conta, do
// mais novo ao mais velho, no máximo 50. O estado vem todo de `useAvisos()`; a página não guarda cópia da lista.
// O aviso mais novo é o painel de mel (com o desenho); os outros são papéis brancos. Cada aviso tem três
// linhas: quem escreveu, o texto inteiro e a família com o dia e a hora no fuso do aparelho.

const LIMITE_DA_LISTA = 50
const LIMITE_DO_TEXTO_CURTO = 120

/** A coluna do texto (a medida de leitura) e a que sobra, nos painéis de 900 px para cima. */
const DUAS_COLUNAS = 'min-[900px]:grid-cols-[minmax(0,var(--leitura))_minmax(0,1fr)]'

const PAINEL_DE_MEL = 'cm-painel-mel cm-painel-luz rounded-painel p-esp-painel text-cacau'
/** O texto de um botão ou link da página quebra a linha (texto a 200%, 390 px) em vez de alargar a página. */
const BOTAO_QUEBRA = 'max-w-full whitespace-normal wrap-anywhere'
const FRASE_DO_ESTADO = 'font-titulo font-normal text-titulo-1 tracking-[-0.02em] text-balance wrap-anywhere'

/** O relógio fica fora do componente: o destaque se decide na hora de desenhar. */
const agoraEmMs = () => Date.now()

const INSTANTE_ISO_UTC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/

/**
 * A chave de comparação de um instante do servidor, como texto: a fração de segundo vai a 6 dígitos (microssegundos),
 * porque `Date.parse` corta no milissegundo. Fora do formato ISO em UTC, vale o texto como veio.
 */
function chaveDoInstante(instante: string): string {
  const partes = INSTANTE_ISO_UTC.exec(instante)
  if (!partes) return instante
  return `${partes[1]}.${(partes[2] ?? '').slice(0, 6).padEnd(6, '0')}Z`
}

/** Do mais novo ao mais velho, pelo texto do instante; no empate, o id maior primeiro. */
function ordenar(avisos: Aviso[]): Aviso[] {
  return [...avisos].sort((a, b) => {
    const chaveA = chaveDoInstante(a.criadaEm)
    const chaveB = chaveDoInstante(b.criadaEm)
    if (chaveA !== chaveB) return chaveA < chaveB ? 1 : -1
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  })
}

/** Dia e hora no fuso do aparelho, com dois dígitos e sem ano. O formatador nasce a cada uso: o fuso é o de agora. */
function momentoNoAparelho(instante: string): { dia: string; hora: string } {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(Date.parse(instante)))
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? ''
  return { dia: `${valor('day')}/${valor('month')}`, hora: `${valor('hour')}:${valor('minute')}` }
}

/** O deslocamento de UTC, em minutos, de um fuso naquele instante; sem fuso, o do aparelho. `null` se o fuso não existe. */
function deslocamentoEm(instante: number, fuso?: string): number | null {
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).formatToParts(new Date(instante))
    const n = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value)
    const comoUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
    return Math.round((comoUtc - Math.floor(instante / 1000) * 1000) / 60_000)
  } catch {
    return null
  }
}

/** RF-19: algum aviso foi escrito numa família cujo fuso tem outro deslocamento que o do aparelho naquele instante. */
function temFusoDiferente(avisos: Aviso[]): boolean {
  return avisos.some((aviso) => {
    const instante = Date.parse(aviso.criadaEm)
    const daFamilia = deslocamentoEm(instante, aviso.familiaFuso)
    return daFamilia !== null && daFamilia !== deslocamentoEm(instante)
  })
}

interface ItemProps {
  aviso: Aviso
  primeiro: boolean
  agora: number
}

function ItemDoAviso({ aviso, primeiro, agora }: ItemProps) {
  const emDestaque = aviso.destaqueAte !== null && Date.parse(aviso.destaqueAte) > agora
  const { dia, hora } = momentoNoAparelho(aviso.criadaEm)
  const autor = AVISOS_TEXTOS.linhaDoAutor(aviso.autor, emDestaque)
  const momento = AVISOS_TEXTOS.linhaDoMomento(aviso.familiaNome, dia, hora)
  const sobreMel = primeiro || emDestaque

  const corDoMomento = sobreMel ? 'text-cacau' : 'text-[var(--color-texto-2)]'
  const linhaDoAutor = 'text-sobretitulo font-semibold text-balance wrap-anywhere text-cacau'
  const linhaDoTexto = 'font-titulo font-normal whitespace-pre-line wrap-anywhere text-pretty text-cacau'
  const linhaDoMomento = `text-pequeno tabular wrap-anywhere ${corDoMomento}`

  if (primeiro) {
    const curto = [...aviso.texto].length <= LIMITE_DO_TEXTO_CURTO
    const tamanho = curto ? 'text-titulo-3 tracking-[-0.005em]' : 'text-corpo min-[900px]:text-abertura'
    return (
      <li className={`${PAINEL_DE_MEL} grid gap-esp-midia items-center ${DUAS_COLUNAS}`}>
        <div className="max-w-leitura min-w-0">
          <Pilha vao="pilha">
            <p className={linhaDoAutor}>{autor}</p>
            <p className={`${linhaDoTexto} ${tamanho}`}>{aviso.texto}</p>
            <p className={linhaDoMomento}>{momento}</p>
          </Pilha>
        </div>
        <Ilustracao nome="maos-celular" decorativa className="mx-auto h-auto w-full max-w-[22rem]" />
      </li>
    )
  }

  // O papel branco (de mel enquanto a nota está em destaque). De 900 px para cima ele ocupa as duas colunas do
  // painel: o texto na coluna de leitura, a autoria e o momento na coluna da direita; a nota mantém a medida e a
  // mesma linha à esquerda do painel.
  const fundo = emDestaque ? 'bg-mel' : 'bg-branco'
  return (
    <li
      className={`${fundo} rounded-cartao p-esp-painel grid min-w-0 gap-x-esp-midia gap-y-esp-pilha ${DUAS_COLUNAS} max-w-[calc(var(--leitura)+2*var(--espaco-painel))] min-[900px]:max-w-none`}
    >
      <p className={`${linhaDoAutor} min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:self-end`}>{autor}</p>
      <p
        className={`${linhaDoTexto} text-corpo max-w-leitura min-[900px]:col-start-1 min-[900px]:row-span-2 min-[900px]:row-start-1`}
      >
        {aviso.texto}
      </p>
      <p className={`${linhaDoMomento} min-[900px]:col-start-2 min-[900px]:row-start-2 min-[900px]:self-start`}>{momento}</p>
    </li>
  )
}

/** A ação do painel vazio: escrever uma nota, para quem escreve na família atual; o Hoje, para os outros. */
function AcaoDoVazio() {
  const { estado, atual } = useFamiliaAtual()
  const { conta } = useSessao()
  // Enquanto a família carrega não há ação (um instante); sem conta completa ou com erro, vale a do Hoje.
  if (estado === 'carregando' && conta !== null) return null
  if (atual !== null && podeEscrever(atual.meuPapel)) {
    return (
      <Botao to="/app/notas/nova" variante="primario" tamanho="app" className={BOTAO_QUEBRA}>
        {NOTAS.nova}
      </Botao>
    )
  }
  return (
    <Botao to="/app/hoje" variante="primario" tamanho="app" className={BOTAO_QUEBRA}>
      {CABECALHO.irParaHoje}
    </Botao>
  )
}

interface PainelDoEstadoProps {
  frase: string
  children: ReactNode
}

/** O painel de mel dos estados sem lista (vazio e desligado): a frase, a ação e o desenho. */
function PainelDoEstado({ frase, children }: PainelDoEstadoProps) {
  return (
    <div className={`${PAINEL_DE_MEL} grid gap-esp-midia items-center ${DUAS_COLUNAS}`}>
      <Pilha vao="grupo" className="min-w-0 max-w-leitura items-start">
        <p className={FRASE_DO_ESTADO}>{frase}</p>
        {children}
      </Pilha>
      <Ilustracao nome="maos-celular" decorativa className="mx-auto h-auto w-full max-w-[22rem]" />
    </div>
  )
}

export function PaginaAvisos() {
  const titulo = useFocoNoTitulo()
  const { fase, mostrado, erro, ler, marcarVistos } = useAvisos()
  const [salvando, setSalvando] = useState(false)
  const emAndamento = useRef(false)
  const [status, setStatus] = useState<string | null>(null)
  const [falha, setFalha] = useState<{ erro: ErroDados; ate: string } | null>(null)
  // Uma falha ao marcar leva o foco ao resumo, que mora acima do botão.
  const resumo = useFocoNoResumo(falha)

  const lista = mostrado && mostrado.ligados ? ordenar(mostrado.avisos).slice(0, LIMITE_DA_LISTA) : []
  const lendoPrimeira = mostrado === null && fase === 'lendo'
  const leituraIndisponivel = faltaRpcDeAvisos(erro)
  const marcacaoIndisponivel = faltaRpcDeAvisos(falha?.erro ?? null)
  // O resumo da falha ao marcar só vale com avisos na tela: com zero avisos ele some.
  if (falha && lista.length === 0) setFalha(null)

  async function marcar(ate: string) {
    if (emAndamento.current) return
    emAndamento.current = true
    setSalvando(true)
    setFalha(null)
    setStatus(null)
    const resultado = await marcarVistos(ate)
    emAndamento.current = false
    setSalvando(false)
    if (resultado.ok) {
      setStatus(AVISOS_TEXTOS.statusMarcados)
      titulo.current?.focus()
    } else {
      setFalha({ erro: resultado.erro, ate })
    }
  }

  const mensagem = lendoPrimeira ? AVISOS_TEXTOS.lendoAvisos : status
  const comLista = lista.length > 0
  const maisDe50 = mostrado !== null && comLista && (mostrado.maisDe50 || mostrado.avisos.length > LIMITE_DA_LISTA)
  const agora = agoraEmMs()

  let corpo: ReactNode = null
  if (fase === 'erro' && erro) {
    corpo = (
      <ResumoErro
        erro={erro}
        texto={leituraIndisponivel ? AVISOS_COMPATIBILIDADE_TEXTOS.indisponiveis : undefined}
        repetivel={!leituraIndisponivel}
        aoTentarDeNovo={ler}
      />
    )
  } else if (mostrado !== null && !mostrado.ligados) {
    corpo = (
      <PainelDoEstado frase={AVISOS_TEXTOS.desligado}>
        <Botao to="/app/conta#avisos" variante="primario" tamanho="app" className={BOTAO_QUEBRA}>
          {AVISOS_TEXTOS.ligarNaConta}
        </Botao>
      </PainelDoEstado>
    )
  } else if (mostrado !== null && !comLista) {
    corpo = (
      <PainelDoEstado frase={AVISOS_TEXTOS.vazio}>
        <AcaoDoVazio />
      </PainelDoEstado>
    )
  } else if (comLista) {
    corpo = (
      <>
        <Pilha as="ul" vao="pilha">
          {lista.map((aviso, indice) => (
            <ItemDoAviso key={aviso.id} aviso={aviso} primeiro={indice === 0} agora={agora} />
          ))}
        </Pilha>
        {maisDe50 ? <p className="cm-pequeno text-[var(--cor-texto-2)]">{AVISOS_TEXTOS.maisDe50}</p> : null}
      </>
    )
  }

  return (
    <MolduraLogada ocupado={lendoPrimeira}>
      <Secao as="div">
        <QuadroLayout>
          <Pilha vao="bloco">
            <div className="flex flex-wrap items-end justify-between gap-x-esp-bloco gap-y-esp-grupo">
              <Pilha vao="grupo" className="max-w-medio min-w-0">
                <Pilha vao="pilha">
                  <h1 ref={titulo} tabIndex={-1} className="cm-h1 alvo-foco wrap-anywhere">
                    {AVISOS_TEXTOS.h1}
                  </h1>
                  <p className="cm-lide wrap-anywhere text-[var(--cor-texto-2)]">{AVISOS_TEXTOS.lead}</p>
                </Pilha>
                <RegiaoStatus mensagem={mensagem} />
                {falha ? (
                  <ResumoErro
                    erro={falha.erro}
                    texto={marcacaoIndisponivel ? AVISOS_COMPATIBILIDADE_TEXTOS.marcacaoIndisponivel : undefined}
                    repetivel={!marcacaoIndisponivel}
                    aoTentarDeNovo={() => void marcar(falha.ate)}
                    refResumo={resumo}
                  />
                ) : null}
                {comLista && temFusoDiferente(lista) ? (
                  <p className="cm-pequeno wrap-anywhere text-[var(--cor-texto-2)]">{AVISOS_TEXTOS.avisoDeFuso}</p>
                ) : null}
              </Pilha>
              {comLista ? (
                <Botao
                  variante="primario"
                  tamanho="app"
                  desativado={salvando || marcacaoIndisponivel}
                  className={BOTAO_QUEBRA}
                  onClick={() => void marcar(lista[0].criadaEm)}
                >
                  {salvando ? AVISOS_TEXTOS.botaoSalvando : AVISOS_TEXTOS.botao}
                </Botao>
              ) : null}
            </div>
            {corpo}
          </Pilha>
        </QuadroLayout>
      </Secao>
    </MolduraLogada>
  )
}
