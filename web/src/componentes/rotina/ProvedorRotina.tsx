import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { COMUM, ESTADOS } from '../../conteudo/rotina.ts'
import type { ContextoRotina, DadosRotina } from '../../dados/rotina.tipos.ts'
import { OPERACOES_ROTINA, podeAlterarItem } from '../../dados/rotina.tipos.ts'
import type { ErroDados, Resultado } from '../../dados/comum.ts'
import { AvisoDaTela } from '../app/AvisoDaTela.tsx'
import { Botao } from '../base/Botao.tsx'
import { Pilha, QuadroLayout, Secao } from '../base/layout/index.ts'
import { useSessao } from '../conta/sessao.tsx'
import { AvisoDeErro } from './AvisoDeErro.tsx'
import { nomeDoAutor } from './formatos.ts'
import { TituloRotina } from './TituloRotina.tsx'
import { tituloDaRota } from './tituloDaRota.ts'
import {
  ContextoDaRotina,
  type BebeAtivo,
  type ConfirmacaoDaRotina,
  type NovaConfirmacao,
  type SituacaoDaRotina,
  type ValorRotina,
} from './contexto.ts'
import { useDadosRotina } from './dadosRotina.tsx'

// O provedor da área da rotina: uma rota sem caminho, pai de todas as telas dela (R38-30). Lê o contexto
// (famílias, papéis, membros e bebês) pela `DadosConta`, escolhe o bebê ativo (R38-03), guarda a
// confirmação única (R38-07) e faz as seções relerem: ao abrir, depois de cada escrita, ao voltar à aba
// e pelo `Atualizar` (R38-12). Desmontar (sair da área) joga tudo fora: nada vai para o navegador (D-5). A
// madrugada acompanha a mesma rota (`handle.area` em `rotas/rotina.tsx`, `componentes/rotina/madrugada.ts`).

type Operacao = (...argumentos: unknown[]) => Promise<Resultado<unknown>>

/** Qualquer operação que devolva `sessao_encerrada` (token vencido) avisa a sessão de login (RF-11). */
function envolver(dados: DadosRotina, aoEncerrar: () => void): DadosRotina {
  const copia: Record<string, unknown> = {}
  for (const nome of OPERACOES_ROTINA) {
    copia[nome] = async (...argumentos: unknown[]) => {
      const operacao = (dados as unknown as Record<string, Operacao>)[nome]
      const resultado = await operacao.apply(dados, argumentos)
      if (!resultado.ok && resultado.erro.classe === 'sessao_encerrada') aoEncerrar()
      return resultado
    }
  }
  return copia as unknown as DadosRotina
}

const coletor = new Intl.Collator('pt-BR', { sensitivity: 'base' })
const comparar = (a: string, b: string) => coletor.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)

/** Todos os bebês: famílias por nome e, dentro de cada uma, bebês por nome (pt-BR, sem diferença de maiúscula). */
export function listarBebes(contexto: ContextoRotina): BebeAtivo[] {
  const familias = [...contexto.familias].sort((a, b) => comparar(a.nome, b.nome) || comparar(a.id, b.id))
  return familias.flatMap((familia) =>
    [...familia.bebes]
      .sort((a, b) => comparar(a.nome, b.nome) || comparar(a.id, b.id))
      .map((bebe) => ({ bebe, familia, papel: familia.meuPapel, arquivado: bebe.estado === 'arquivado' })),
  )
}

/** O seletor mostra os ativos e, depois, o grupo `Arquivados`. */
export function ordenarParaOSeletor(bebes: BebeAtivo[]): BebeAtivo[] {
  return [...bebes.filter((b) => !b.arquivado), ...bebes.filter((b) => b.arquivado)]
}

/** A escolha ao abrir a área (R38-03): o primeiro ativo; sem ativo, o primeiro arquivado (só leitura). */
function bebePadrao(bebes: BebeAtivo[]): BebeAtivo | null {
  return bebes.find((b) => !b.arquivado) ?? bebes[0] ?? null
}

interface Carga {
  estado: 'carregando' | 'pronto' | 'erro'
  contexto: ContextoRotina | null
  erro: ErroDados | null
}

export function ProvedorRotina() {
  const base = useDadosRotina()
  const { recarregarConta } = useSessao()
  const { pathname } = useLocation()
  const dados = useMemo(() => envolver(base, () => void recarregarConta()), [base, recarregarConta])

  const [carga, setCarga] = useState<Carga>({ estado: 'carregando', contexto: null, erro: null })
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [perdeu, setPerdeu] = useState(false)
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoDaRotina | null>(null)
  const pedido = useRef(0)
  const ativoAnterior = useRef<string | null>(null)

  const bebes = useMemo(() => (carga.contexto ? listarBebes(carga.contexto) : []), [carga.contexto])
  const ativo = useMemo((): BebeAtivo | null => {
    const escolhida = escolhido === null ? undefined : bebes.find((b) => b.bebe.id === escolhido)
    return escolhida ?? bebePadrao(bebes)
  }, [bebes, escolhido])

  useEffect(() => {
    ativoAnterior.current = ativo?.bebe.id ?? null
  }, [ativo])

  // A leitura começa fora do corpo do efeito: o estado só muda quando a resposta chega.
  useEffect(() => {
    queueMicrotask(() => {
      pedido.current += 1
      const meu = pedido.current
      void dados.contexto().then((lido) => {
        if (meu !== pedido.current) return
        if (!lido.ok) {
          setCarga((anterior) => (anterior.contexto ? { ...anterior, erro: lido.erro } : { estado: 'erro', contexto: null, erro: lido.erro }))
          return
        }
        const anterior = ativoAnterior.current
        if (anterior !== null && !lido.valor.familias.some((familia) => familia.bebes.some((bebe) => bebe.id === anterior))) {
          setPerdeu(true)
        }
        setCarga({ estado: 'pronto', contexto: lido.valor, erro: null })
      })
    })
  }, [dados, versao])

  const atualizar = useCallback(() => setVersao((anterior) => anterior + 1), [])

  // Voltar a aba: as telas releem (não há tempo real nem leitura periódica).
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible') atualizar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [atualizar])

  const escolherBebe = useCallback((id: string) => {
    setEscolhido(id)
    setPerdeu(false)
  }, [])

  const mostrarConfirmacao = useCallback((nova: NovaConfirmacao) => {
    setConfirmacao((anterior) => ({ id: (anterior?.id ?? 0) + 1, ...nova }))
  }, [])
  const fecharConfirmacao = useCallback(() => setConfirmacao(null), [])

  const contexto = carga.contexto
  const situacao: SituacaoDaRotina = ativo ? 'bebe' : contexto && contexto.familias.length > 0 ? 'familia_sem_bebe' : 'sem_familia'

  const valor = useMemo<ValorRotina | null>(() => {
    if (!contexto) return null
    return {
      dados,
      contaId: contexto.contaId,
      contexto,
      situacao,
      ativo,
      bebes: ordenarParaOSeletor(bebes),
      acessoPerdido: perdeu,
      versao,
      atualizar,
      escolherBebe,
      podeAlterar: ({ criadoPor, familiaId, bebeId }) => {
        const familia = contexto.familias.find((candidata) => candidata.id === familiaId)
        if (!familia) return false
        const bebe = bebeId === null ? undefined : familia.bebes.find((candidato) => candidato.id === bebeId)
        if (bebe?.estado === 'arquivado') return false
        return podeAlterarItem(familia.meuPapel, criadoPor, contexto.contaId)
      },
      nomeDoAutor: (autor, familiaId) => nomeDoAutor(contexto.familias.find((familia) => familia.id === familiaId), autor),
      confirmacao,
      mostrarConfirmacao,
      fecharConfirmacao,
    }
  }, [dados, contexto, situacao, ativo, bebes, perdeu, versao, atualizar, escolherBebe, confirmacao, mostrarConfirmacao, fecharConfirmacao])

  if (carga.estado === 'carregando') {
    return (
      <>
        <main aria-busy="true" data-tela="rotina-carregando">
          <Secao>
            <QuadroLayout>
              <p>{COMUM.carregando}</p>
            </QuadroLayout>
          </Secao>
        </main>
        <AvisoDaTela />
      </>
    )
  }

  if (carga.estado === 'erro' && carga.erro) {
    return (
      <>
        <main data-tela="rotina-erro">
          <Secao>
            <QuadroLayout>
              <div className="max-w-md">
                <AvisoDeErro erro={carga.erro} aoTentarDeNovo={atualizar} />
              </div>
            </QuadroLayout>
          </Secao>
        </main>
        <AvisoDaTela />
      </>
    )
  }

  if (!valor) return null

  // Sem bebê não há tela de rotina: o estado "Família sem bebê" ou "Sem família" (R38-03). A rota mantém o
  // próprio h1 (QA-01). Na família sem bebê, quem pode mudar a família (não é observador) ganha o botão que leva
  // à tela Família, onde fica "Adicionar bebê"; a família é a primeira do contexto, também para o papel.
  if (situacao !== 'bebe') {
    const familia = contexto?.familias[0]
    const comBotao = situacao === 'familia_sem_bebe' && !perdeu && familia !== undefined && familia.meuPapel !== 'observador'
    return (
      <>
        <main className="text-corpo" data-tela="rotina-sem-bebe">
          <Secao>
            <QuadroLayout>
              <Pilha vao="bloco">
                <TituloRotina
                  titulo={tituloDaRota(pathname)}
                  linha={perdeu ? ESTADOS.acessoPerdido : situacao === 'sem_familia' ? ESTADOS.semFamilia : ESTADOS.familiaSemBebe}
                />
                {comBotao ? (
                  <Botao to={`/app/familia?familia=${familia.id}`} tamanho="app" className="self-start">
                    {ESTADOS.cadastrarBebe}
                  </Botao>
                ) : null}
              </Pilha>
            </QuadroLayout>
          </Secao>
        </main>
        <AvisoDaTela />
      </>
    )
  }

  return (
    <ContextoDaRotina value={valor}>
      {/* A releitura do contexto falhou com dados anteriores: a tela continua com o que já tinha (formulário,
          painel e texto digitado ficam), e o aviso com `Tentar de novo` aparece junto dela (R8). */}
      {carga.erro ? (
        <QuadroLayout className="pt-esp-pilha">
          <div className="max-w-md" data-releitura-falhou="contexto">
            <AvisoDeErro erro={carga.erro} papel={ativo?.papel ?? null} aoTentarDeNovo={atualizar} />
          </div>
        </QuadroLayout>
      ) : null}
      <Outlet />
    </ContextoDaRotina>
  )
}
