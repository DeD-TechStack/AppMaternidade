import { useMemo, useRef, useState, type RefObject } from 'react'
import { useLocation, useParams } from 'react-router'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { BOTAO_SECUNDARIO } from '../../componentes/conta/Partes.tsx'
import { AcoesDoItem, type Acao } from '../../componentes/comunidade/AcoesDoItem.tsx'
import { AvisoDeSaude, ErroDeLeitura, Esqueleto, NaoEncontrado } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { useFocoPendente, type AlvoDeFoco } from '../../componentes/comunidade/foco.ts'
import {
  FormularioDeResposta,
  ID_DO_CAMPO_DE_RESPOSTA,
  type ModoDaResposta,
} from '../../componentes/comunidade/FormularioDeResposta.tsx'
import { EtiquetaDeEstado, Meta, Texto } from '../../componentes/comunidade/Itens.tsx'
import { useCaixasDeProtecao } from '../../componentes/comunidade/Protecao.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import {
  arrumarRespostas,
  lerRespostasComAutores,
  type RespostaComAutor,
} from '../../componentes/comunidade/respostas.ts'
import { ehDaModeracao, ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura, usePaginas } from '../../componentes/comunidade/useLeitura.ts'
import { caminhoDeEntrada } from '../../componentes/comunidade/volta.ts'
import {
  COMUM_COMUNIDADE,
  DIALOGO_BLOQUEIO,
  DIALOGO_DENUNCIA,
  LISTA,
  TOPICO,
  TX,
  textoDaPassagemComunidade,
} from '../../conteudo/comunidade.ts'
import type { Resultado } from '../../dados/comum.ts'
import type { PerfilPublico, SituacaoConta, Topico as TopicoLido } from '../../dados/comunidade.ts'
import { ehUuid } from '../../dados/comunidade.regras.ts'

const CARTAO = 'flex flex-col gap-3 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]'

interface LidoDoTopico {
  topico: TopicoLido
  autor: PerfilPublico | null
}

interface ConteudoProps {
  topico: TopicoLido
  autor: PerfilPublico | null
  situacao: SituacaoConta
  /** Os perfis que a pessoa bloqueou. */
  bloqueados: ReadonlySet<string>
  /** Relê o tópico e os bloqueios (depois de bloquear); o tópico some se for do bloqueado. */
  relerTopicoEBloqueios: () => Promise<void>
  definirStatus: (mensagem: string | null) => void
  pedirFoco: (alvos: AlvoDeFoco[]) => void
  refStatus: RefObject<HTMLDivElement | null>
}

const porId = (id: string) => () => document.getElementById(id)

// O tópico inteiro, as respostas, o formulário de resposta e o menu de cada item.
function Conteudo({ topico, autor, situacao, bloqueados, relerTopicoEBloqueios, definirStatus, pedirFoco, refStatus }: ConteudoProps) {
  const dados = useDadosComunidade()
  const respostas = usePaginas((pagina) => lerRespostasComAutores(dados, topico.id, pagina), topico.id)
  const eu = useLeitura(
    async (): Promise<Resultado<PerfilPublico | null>> => {
      if (!situacao.perfilId) return { ok: true, valor: null }
      const lidos = await dados.lerPerfis([situacao.perfilId])
      return lidos.ok ? { ok: true, valor: lidos.valor[0] ?? null } : lidos
    },
    situacao.perfilId ?? '',
  )
  const [modo, setModo] = useState<ModoDaResposta>({ tipo: 'nova', citando: null })
  const escritor = ehEscritor(situacao)
  const meuPerfil = situacao.perfilId
  const apelidoProprio = eu.estado.fase === 'pronto' ? (eu.estado.valor?.apelido ?? '') : ''

  const caixas = useCaixasDeProtecao({
    moderacao: ehDaModeracao(situacao),
    aoBloqueado: async (alvo, origem) => {
      const item = origem?.closest('article') ?? null
      const proximo = item?.closest('li')?.nextElementSibling?.querySelector<HTMLElement>('article') ?? null
      await Promise.all([relerTopicoEBloqueios(), respostas.reler()])
      definirStatus(DIALOGO_BLOQUEIO.bloqueado(alvo.apelido))
      // O botão de origem; o item afetado; o item seguinte; a confirmação; o `h1`.
      pedirFoco([() => origem, () => item, () => proximo, () => refStatus.current])
    },
  })

  const ehMeu = (autorId: string | null) => autorId !== null && autorId === meuPerfil
  const topicoAberto = topico.estado === 'visivel'
  const autorDoTopicoBloqueado = topico.autorId !== null && bloqueados.has(topico.autorId)
  const podeResponder = topicoAberto && !autorDoTopicoBloqueado
  const aoEntrar = (destino: string): Acao => ({ para: caminhoDeEntrada(destino) })
  const destinoDoTopico = `/app/comunidade/topico/${topico.id}`

  /** O menu de um item de outra pessoa: denunciar o conteúdo, denunciar o perfil e bloquear. */
  function acoesDeOutraPessoa(
    tipo: 'topico' | 'resposta',
    id: string,
    autorId: string | null,
    apelido: string | null,
    visivel: boolean,
  ) {
    if (ehMeu(autorId)) return {}
    const dono = autorId !== null && apelido !== null ? { id: autorId, apelido } : null
    const titulo = tipo === 'topico' ? DIALOGO_DENUNCIA.tituloTopico : DIALOGO_DENUNCIA.tituloResposta
    return {
      denunciar: visivel
        ? escritor
          ? ({ aoClicar: (origem) => caixas.denunciar({ tipo, id }, titulo, dono, origem) } satisfies Acao)
          : aoEntrar(destinoDoTopico)
        : undefined,
      denunciarPerfil:
        dono && escritor
          ? ({
              aoClicar: (origem) => caixas.denunciar({ tipo: 'perfil', id: dono.id }, DIALOGO_DENUNCIA.tituloPerfil(dono.apelido), dono, origem),
            } satisfies Acao)
          : dono
            ? aoEntrar(destinoDoTopico)
            : undefined,
      bloquear: dono
        ? {
            rotulo: TOPICO.bloquear(dono.apelido),
            acao: meuPerfil
              ? ({ aoClicar: (origem) => caixas.bloquear(dono, origem) } satisfies Acao)
              : aoEntrar(destinoDoTopico),
          }
        : undefined,
    }
  }

  const arranjo = useMemo(
    () => (respostas.estado.fase === 'pronto' ? arrumarRespostas(respostas.estado.itens) : []),
    [respostas.estado],
  )

  function irParaOFormulario() {
    pedirFoco([porId(ID_DO_CAMPO_DE_RESPOSTA)])
  }

  function renderResposta(r: RespostaComAutor, opcoes: { semMae?: boolean; mae?: RespostaComAutor | null; filha?: boolean }) {
    const visivel = r.estado === 'visivel'
    const maeBloqueada = r.autorId !== null && bloqueados.has(r.autorId)
    const podeCitar =
      !opcoes.filha && !opcoes.semMae && r.respostaA === null && visivel && podeResponder && !maeBloqueada
    const apelido = r.autor?.apelido ?? null
    return (
      <Cartao
        as="article"
        id={`resposta-${r.id}`}
        tabIndex={-1}
        aria-labelledby={`resposta-${r.id}-autor`}
        className={`${CARTAO} alvo-foco`}
      >
        <Meta apelido={apelido} criadoEm={r.criadoEm} editadoEm={r.editadoEm} idDoAutor={`resposta-${r.id}-autor`} />
        <EtiquetaDeEstado estado={r.estado} motivo={r.motivoModeracao} />
        {opcoes.semMae ? <p className="cm-pequeno text-[var(--cor-texto-2)]">{TX.tx21}</p> : null}
        {opcoes.mae ? (
          <p className="cm-pequeno text-[var(--cor-texto-2)] wrap-anywhere">
            {TOPICO.emRespostaA(opcoes.mae.autor?.apelido ?? COMUM_COMUNIDADE.pessoaRemovida)}
          </p>
        ) : null}
        <Texto>{r.corpo}</Texto>
        <AcoesDoItem
          item={`resposta-${r.id}`}
          responder={
            podeCitar
              ? {
                  rotulo: TOPICO.responderA(apelido ?? COMUM_COMUNIDADE.pessoaRemovida),
                  acao: escritor
                    ? {
                        aoClicar: () => {
                          setModo({ tipo: 'nova', citando: r })
                          irParaOFormulario()
                        },
                      }
                    : aoEntrar(destinoDoTopico),
                }
              : undefined
          }
          editar={
            ehMeu(r.autorId) && visivel && escritor
              ? {
                  aoClicar: () => {
                    setModo({ tipo: 'editar', resposta: r })
                    irParaOFormulario()
                  },
                }
              : undefined
          }
          {...acoesDeOutraPessoa('resposta', r.id, r.autorId, apelido, visivel)}
        />
      </Cartao>
    )
  }

  const itens = respostas.estado.fase === 'pronto' ? respostas.estado : null

  return (
    <>
      <Faixa>
        <Cartao as="article" aria-label={topico.titulo} className={CARTAO}>
          <Meta
            apelido={autor?.apelido ?? null}
            criadoEm={topico.criadoEm}
            editadoEm={topico.editadoEm}
            faixa={topico.faixa}
            idDoAutor="topico-autor"
          />
          <EtiquetaDeEstado estado={topico.estado} motivo={topico.motivoModeracao} />
          <Texto>{topico.corpo}</Texto>
          <AcoesDoItem
            item={`topico-${topico.id}`}
            editar={
              ehMeu(topico.autorId) && topicoAberto && escritor ? { para: `/app/comunidade/topico/${topico.id}/editar` } : undefined
            }
            {...acoesDeOutraPessoa('topico', topico.id, topico.autorId, autor?.apelido ?? null, topicoAberto)}
          />
        </Cartao>
        {caixas.caixa}
      </Faixa>

      <Faixa aria-labelledby="respostas" aria-busy={respostas.estado.fase === 'carregando' || undefined}>
        <Pilha vao="grupo">
          <h2 id="respostas" className="cm-h4 text-titulo-4">
            {TOPICO.respostas}
          </h2>
          {respostas.esqueleto ? <Esqueleto /> : null}
          {respostas.estado.fase === 'erro' ? (
            <ErroDeLeitura erro={respostas.estado.erro} aoTentarDeNovo={() => void respostas.recarregar()} />
          ) : null}
          {itens && itens.itens.length === 0 ? <p>{TX.tx17}</p> : null}
          {itens && itens.itens.length > 0 ? (
            <Pilha as="ul" vao="grupo" className="m-0 list-none p-0">
              {arranjo.map((grupo) => (
                <li key={grupo.resposta.id} className="flex flex-col gap-esp-grupo">
                  {renderResposta(grupo.resposta, { semMae: grupo.semMae })}
                  {grupo.filhas.length > 0 ? (
                    <Pilha
                      as="ul"
                      vao="grupo"
                      className="m-0 list-none border-l-[3px] border-[var(--cor-fio-suave)] p-0 pl-4 min-[40rem]:ml-6"
                    >
                      {grupo.filhas.map((filha) => (
                        <li key={filha.id}>{renderResposta(filha, { filha: true, mae: grupo.resposta })}</li>
                      ))}
                    </Pilha>
                  ) : null}
                </li>
              ))}
            </Pilha>
          ) : null}
          {itens?.erroDaPagina ? (
            <ErroDeLeitura erro={itens.erroDaPagina} aoTentarDeNovo={() => void respostas.carregarMais()} />
          ) : null}
          {itens && itens.haMais && !itens.erroDaPagina ? (
            <div>
              <button
                type="button"
                disabled={itens.maisEmCurso}
                className={BOTAO_SECUNDARIO}
                data-tamanho="app"
                onClick={() => void respostas.carregarMais()}
              >
                {itens.maisEmCurso ? COMUM_COMUNIDADE.carregando : TOPICO.carregarMais}
              </button>
            </div>
          ) : null}
        </Pilha>
      </Faixa>

      {podeResponder ? (
        <Faixa aria-labelledby="sua-resposta">
          <Pilha vao="grupo">
            <h2 id="sua-resposta" className="cm-h4 text-titulo-4">
              {modo.tipo === 'editar' ? TOPICO.editandoResposta : TOPICO.formulario}
            </h2>
            {escritor ? (
              <FormularioDeResposta
                key={modo.tipo === 'editar' ? `editar-${modo.resposta.id}` : 'nova'}
                topicoId={topico.id}
                modo={modo}
                apelidoProprio={apelidoProprio}
                aoTirarCitacao={() => setModo({ tipo: 'nova', citando: null })}
                aoNaoEditavel={() => void respostas.reler()}
                aoConcluir={async (id, tipo) => {
                  const paginasLidas = respostas.estado.fase === 'pronto' ? respostas.estado.paginas : 1
                  setModo({ tipo: 'nova', citando: null })
                  if (tipo === 'editar') {
                    definirStatus(TX.tx26)
                    await respostas.reler()
                    // O botão de origem; o item editado; a confirmação.
                    pedirFoco([porId(`acao-editar-resposta-${id}`), porId(`resposta-${id}`), () => refStatus.current])
                    return
                  }
                  definirStatus(TX.tx27)
                  // Relê desde a 1ª página até achar a resposta nova (no máximo as já lidas mais uma).
                  await respostas.reler((lidas, paginas) => lidas.some((r) => r.id === id) || paginas >= paginasLidas + 1)
                  pedirFoco([porId(`resposta-${id}`), () => refStatus.current])
                }}
              />
            ) : (
              <div>
                <Botao to={caminhoDeEntrada(destinoDoTopico)} tamanho="app">
                  {TOPICO.paraEntrar}
                </Botao>
              </div>
            )}
          </Pilha>
        </Faixa>
      ) : null}
    </>
  )
}

function TopicoLido({ id }: { id: string }) {
  const dados = useDadosComunidade()
  const location = useLocation()
  const situacao = useSituacao()
  const espacos = useLeitura(() => dados.listarEspacos(), 'espacos')
  const topico = useLeitura(async (): Promise<Resultado<LidoDoTopico | null>> => {
    const lido = await dados.lerTopico(id)
    if (!lido.ok) return lido
    if (lido.valor === null) return { ok: true, valor: null }
    const autor = lido.valor.autorId ? await dados.lerPerfis([lido.valor.autorId]) : ({ ok: true, valor: [] } as const)
    if (!autor.ok) return autor
    return { ok: true, valor: { topico: lido.valor, autor: autor.valor[0] ?? null } }
  }, id)
  const bloqueios = useLeitura(() => dados.listarBloqueios(), 'bloqueios')
  const [status, setStatus] = useState<string | null>(() => textoDaPassagemComunidade(location.state))
  const refStatus = useRef<HTMLDivElement>(null)
  const pedirFoco = useFocoPendente()

  const lido = topico.estado.fase === 'pronto' ? topico.estado.valor : null
  const lidaSituacao = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null
  const lidosBloqueios = bloqueios.estado.fase === 'pronto' ? bloqueios.estado.valor : null
  const espaco =
    lido && espacos.estado.fase === 'pronto' ? espacos.estado.valor.find((e) => e.id === lido.topico.espacoId) : undefined
  const bloqueados = useMemo(() => new Set(lidosBloqueios?.map((b) => b.perfilId) ?? []), [lidosBloqueios])
  const carregando = [topico, situacao, bloqueios].some((leitura) => leitura.estado.fase === 'carregando')
  const falha = [topico, situacao, bloqueios].find((leitura) => leitura.estado.fase === 'erro')

  return (
    <Quadro
      voltar={espaco ? `/app/comunidade/${espaco.slug}` : '/app/comunidade'}
      ocupado={carregando}
      titulo={<TituloDaTela>{lido ? lido.topico.titulo : LISTA.titulo}</TituloDaTela>}
      cabeca={
        <>
          <Pilha vao="pilha">
            <AvisoDeSaude />
            <Status mensagem={status} refStatus={refStatus} />
          </Pilha>
          {topico.esqueleto ? <Esqueleto linhas={2} /> : null}
          {topico.estado.fase === 'erro' ? (
            <div className="max-w-[40rem]">
              <ErroDeLeitura erro={topico.estado.erro} aoTentarDeNovo={() => void topico.recarregar()} />
            </div>
          ) : null}
          {falha && falha !== topico && falha.estado.fase === 'erro' ? (
            <div className="max-w-[40rem]">
              <ErroDeLeitura
                erro={falha.estado.erro}
                aoTentarDeNovo={() => void (falha === situacao ? situacao.recarregar() : bloqueios.recarregar())}
              />
            </div>
          ) : null}
          {topico.estado.fase === 'pronto' && lido === null ? <NaoEncontrado /> : null}
        </>
      }
    >
      {lido && lidaSituacao && lidosBloqueios ? (
        <Conteudo
          key={lido.topico.id}
          topico={lido.topico}
          autor={lido.autor}
          situacao={lidaSituacao}
          bloqueados={bloqueados}
          relerTopicoEBloqueios={async () => {
            await Promise.all([topico.reler(), bloqueios.reler()])
          }}
          definirStatus={setStatus}
          pedirFoco={pedirFoco}
          refStatus={refStatus}
        />
      ) : null}
    </Quadro>
  )
}

// C3, /app/comunidade/topico/:id: um id que não é UUID é "não encontrado", sem chamar o banco.
export function Topico() {
  const { id } = useParams()
  if (!ehUuid(id)) {
    return (
      <Quadro voltar="/app/comunidade" titulo={<TituloDaTela>{LISTA.titulo}</TituloDaTela>} cabeca={<NaoEncontrado />} />
    )
  }
  return <TopicoLido key={id} id={id} />
}
