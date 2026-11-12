import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { COMUM_MODERACAO, TEXTOS_ERRO_MODERACAO, TX, textoDoErroModeracao } from '../../conteudo/moderacao.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import type { SituacaoConta } from '../../dados/comunidade.ts'
import { mfaModeracaoLigado } from '../../dados/moderacao.ts'
import { erroDaChaveModeracao } from '../../dados/moderacao.erros.ts'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { Esqueleto, ResumoDeErro } from '../comunidade/Avisos.tsx'
import { useDadosComunidade } from '../comunidade/dados.ts'
import { TituloDaTela } from '../comunidade/Quadro.tsx'
import { useLeitura } from '../comunidade/useLeitura.ts'
import { MolduraLogada } from '../conta/MolduraLogada.tsx'
import { LINK_ALVO } from '../conta/Partes.tsx'
import { useSessao } from '../conta/sessao.tsx'
import { ErroDeLeituraNoPainel, SemPermissao } from './Avisos.tsx'
import { ContextoDoPainel } from './contexto.ts'
import { useDadosModeracao } from './dados.ts'
import { VerificacaoEmDuasEtapas } from './VerificacaoEmDuasEtapas.tsx'

// O quadro do painel de moderação (MAT-40:RF-10 e RF-20): a moldura logada com o link "Voltar" e o selo
// "Moderação · uso interno" no topo, o título fixo da tela, a navegação do painel e a guarda de acesso.
// A guarda lê a situação da conta antes de qualquer outra leitura: sem papel vigente (ou sem admin, na M5)
// a tela mostra só o estado "sem permissão". Com o interruptor ligado, a verificação em duas etapas vem
// logo depois e antes de qualquer leitura do painel.

/** Enquanto uma tela do painel está montada, o `<head>` pede que nenhum buscador a indexe. */
function useForaDosBuscadores() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

const LINK_DO_PAINEL = 'alvo-toque inline-flex items-center rounded-pilula px-4 font-medium no-underline'
const ATUAL = 'bg-[var(--cor-destaque)] font-semibold text-[var(--cor-sobre-destaque)]'

const semBarraFinal = (caminho: string) => (caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho)

/** A navegação do painel. A fila é a atual também nas telas de uma denúncia e de um conteúdo. */
function NavegacaoDoPainel({ admin }: { admin: boolean }) {
  const caminho = semBarraFinal(useLocation().pathname)
  const naFila =
    caminho === '/moderacao' || caminho.startsWith('/moderacao/denuncia/') || caminho.startsWith('/moderacao/conteudo/')
  const itens = [
    { para: '/moderacao', rotulo: COMUM_MODERACAO.fila, atual: naFila },
    { para: '/moderacao/auditoria', rotulo: COMUM_MODERACAO.auditoria, atual: caminho === '/moderacao/auditoria' },
    ...(admin ? [{ para: '/moderacao/papeis', rotulo: COMUM_MODERACAO.papeis, atual: caminho === '/moderacao/papeis' }] : []),
    { para: '/app/comunidade', rotulo: COMUM_MODERACAO.comunidade, atual: false },
  ]
  return (
    <nav aria-label={COMUM_MODERACAO.painel} className="mt-6">
      <ul className="m-0 flex list-none flex-wrap gap-x-2 gap-y-1 p-0">
        {itens.map((item) => (
          <li key={item.para}>
            <Link to={item.para} aria-current={item.atual ? 'page' : undefined} className={`${LINK_DO_PAINEL} ${item.atual ? ATUAL : ''}`}>
              {item.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Com o interruptor ligado, o painel só abre com a sessão em `aal2`; sem ele, abre direto e não toca no Auth. */
function PortaDaVerificacao({ children }: { children: ReactNode }) {
  const exigida = useMemo(() => mfaModeracaoLigado(), [])
  if (!exigida) return children
  return <ConferirNivel>{children}</ConferirNivel>
}

function ConferirNivel({ children }: { children: ReactNode }) {
  const dados = useDadosModeracao()
  const nivel = useLeitura(() => dados.nivelDaSessao(), 'nivel')
  const [verificada, setVerificada] = useState(false)

  if (verificada) return children
  if (nivel.estado.fase === 'carregando') return nivel.esqueleto ? <Esqueleto linhas={1} /> : null
  if (nivel.estado.fase === 'erro') {
    const { erro } = nivel.estado
    if (erro.classe === 'rede') return <ErroDeLeituraNoPainel erro={erro} aoTentarDeNovo={() => void nivel.recarregar()} />
    return <ResumoDeErro texto={textoDoErroModeracao(erro)} />
  }
  if (nivel.estado.valor === 'aal2') return children
  return <VerificacaoEmDuasEtapas aoVerificar={() => setVerificada(true)} />
}

interface Props {
  /** O `h1` fixo da tela. */
  titulo: string
  /** O link "Voltar" à fila (todas as telas, menos a M1). */
  comVoltar?: boolean
  /** A M5 exige o papel admin. */
  exigeAdmin?: boolean
  children: ReactNode
}

export function Painel({ titulo, comVoltar = true, exigeAdmin = false, children }: Props) {
  useForaDosBuscadores()
  const comunidade = useDadosComunidade()
  const { usuario } = useSessao()
  const contaId = usuario?.id ?? null
  const situacao = useLeitura(() => comunidade.situacaoDaConta(), 'situacao')
  const ultima = useRef<SituacaoConta | null>(null)
  const [perdeu, setPerdeu] = useState<'sem_papel' | 'leitura' | null>(null)

  const confere = useCallback(
    (lida: SituacaoConta) => lida.papeis.length > 0 && (!exigeAdmin || lida.papeis.includes('admin')),
    [exigeAdmin],
  )

  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null
  useEffect(() => {
    if (lida) ultima.current = lida
  }, [lida])

  const ler = useCallback(
    async <T,>(corpo: () => Promise<Resultado<T>>, ehVazio?: (valor: T) => boolean): Promise<Resultado<T>> => {
      const perdida = (): Resultado<T> => {
        setPerdeu('leitura')
        return { ok: false, erro: erroDaChaveModeracao('sem_papel') }
      }
      const antes = await comunidade.situacaoDaConta()
      if (!antes.ok) return antes
      ultima.current = antes.valor
      if (!confere(antes.valor)) return perdida()

      const lido = await corpo()
      if (!lido.ok) return lido.erro.classe === 'sem_permissao' ? perdida() : lido
      if (ehVazio?.(lido.valor)) {
        // Vazio ou sem a linha pedida: relê a situação antes de a tela mostrar "vazio" ou "não encontrado".
        const depois = await comunidade.situacaoDaConta()
        if (!depois.ok) return depois
        ultima.current = depois.valor
        if (!confere(depois.valor)) return perdida()
      }
      return lido
    },
    [comunidade, confere],
  )

  const aoErroDeAcao = useCallback((erro: ErroDados) => {
    if (erro.chave === 'sem_papel') setPerdeu('sem_papel')
  }, [])

  const semPapel = lida !== null && !confere(lida)
  const negado = perdeu !== null || semPapel
  const admin = lida?.papeis.includes('admin') ?? false

  const contexto = useMemo(
    () => ({ ler, aoErroDeAcao, perfilId: () => ultima.current?.perfilId ?? null, contaId, admin }),
    [ler, aoErroDeAcao, contaId, admin],
  )

  return (
    <MolduraLogada ocupado={situacao.estado.fase === 'carregando'}>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {comVoltar ? (
          <Link to="/moderacao" className={LINK_ALVO}>
            {COMUM_COMUNIDADE.voltar}
          </Link>
        ) : null}
        <Etiqueta>{TX.selo}</Etiqueta>
      </div>
      <TituloDaTela>{titulo}</TituloDaTela>

      {situacao.esqueleto ? (
        <div className="mt-8">
          <Esqueleto linhas={2} />
        </div>
      ) : null}
      {situacao.estado.fase === 'erro' ? (
        <div className="mt-8 max-w-[40rem]">
          <ErroDeLeituraNoPainel erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
        </div>
      ) : null}
      {negado ? (
        <div className="mt-8 max-w-[40rem]">
          <SemPermissao frasePerdida={perdeu === 'sem_papel' ? TEXTOS_ERRO_MODERACAO.sem_papel : null} />
        </div>
      ) : null}
      {lida && !negado ? (
        <ContextoDoPainel value={contexto}>
          <NavegacaoDoPainel admin={admin} />
          <div className="mt-8">
            <PortaDaVerificacao>{children}</PortaDaVerificacao>
          </div>
        </ContextoDoPainel>
      ) : null}
    </MolduraLogada>
  )
}
