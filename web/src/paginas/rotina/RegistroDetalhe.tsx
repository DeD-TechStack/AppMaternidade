import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ChevronLeft, Pencil, Trash2, Undo2 } from 'lucide-react'
import { ALVO_APP } from '../../componentes/app/alvo.ts'
import { Botao } from '../../componentes/base/Botao.tsx'
import { AvisoDeErro } from '../../componentes/rotina/AvisoDeErro.tsx'
import { AvisoDeLista } from '../../componentes/rotina/AvisoDeLista.tsx'
import { AvisoDoPapel } from '../../componentes/rotina/AvisoDoPapel.tsx'
import { ItemRegistro } from '../../componentes/rotina/ItemRegistro.tsx'
import { LinkDaRotina } from '../../componentes/rotina/LinkDaRotina.tsx'
import { SecaoDoHoje } from '../../componentes/rotina/SecaoDoHoje.tsx'
import { TelaRotina } from '../../componentes/rotina/TelaRotina.tsx'
import { camposMudados } from '../../componentes/rotina/alteracoesDoRegistro.ts'
import { useRotina } from '../../componentes/rotina/contexto.ts'
import { dataEHora, ehRestauravel } from '../../componentes/rotina/datasDaRotina.ts'
import { camposDoDetalhe } from '../../componentes/rotina/detalhesDoRegistro.ts'
import { urlDoHistoricoDoDia } from '../../componentes/rotina/parametrosHistorico.ts'
import { textoDoPapel } from '../../componentes/rotina/textoDoPapel.ts'
import { useAcoesDaRotina } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useBebeDoRegistro } from '../../componentes/rotina/useBebeDoRegistro.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { useTelaDaRotina } from '../../componentes/rotina/useTelaDaRotina.ts'
import { COMUM, DETALHE, ESTADOS, ROTULO_TIPO, TITULOS } from '../../conteudo/rotina.ts'
import type { Resultado } from '../../dados/comum.ts'
import { ehTipoDeSessao, LIMITES, podeEscrever, type Alteracao, type Lista, type Registro } from '../../dados/rotina.tipos.ts'
import { ehUuid } from '../../dados/rotina.uuid.ts'
import { useAgora } from '../../prototipo/useAgora.ts'

const PREFIXO = 'registro:'
const PREFIXO_ALTERACOES = 'alteracoes:'
const UM_MINUTO = 60_000

interface Leitura {
  registro: Registro | null
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-(--cor-fio-suave) py-3 first:border-t-0 sm:flex-row sm:gap-6">
      <dt className="text-(--cor-texto-2) sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="min-w-0 font-medium wrap-anywhere">{children}</dd>
    </div>
  )
}

export function RegistroDetalhe() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <DetalheDoRegistro />
}

function DetalheDoRegistro() {
  const rotina = useRotina()
  const { dados, ativo, podeAlterar, nomeDoAutor } = rotina
  const acoes = useAcoesDaRotina()
  const { principal, acionar, focarTitulo } = useTelaDaRotina()
  const navigate = useNavigate()
  const { id } = useParams()
  const agora = useAgora(UM_MINUTO)
  const [ocupado, setOcupado] = useState(false)
  const invalido = !ehUuid(id)

  const leitura = useSecao<Leitura>(invalido ? null : `${PREFIXO}${id}`, async (chave): Promise<Resultado<Leitura>> => {
    const lido = await dados.registro(chave.slice(PREFIXO.length))
    return lido.ok ? { ok: true, valor: { registro: lido.valor } } : lido
  })
  const registro = leitura.dados?.registro ?? null
  const dono = useBebeDoRegistro(registro)

  const veAlteracoes = registro !== null && dono !== null && podeEscrever(dono.papel)
  const alteracoes = useSecao<Lista<Alteracao>>(veAlteracoes ? `${PREFIXO_ALTERACOES}${registro.id}` : null, (chave) =>
    dados.alteracoes(chave.slice(PREFIXO_ALTERACOES.length)),
  )

  if (!ativo || !dono) return null
  const titulo = TITULOS.registro
  const voltar = (dia: string | null) => (
    <LinkDaRotina
      to={dia === null ? '/app/historico' : urlDoHistoricoDoDia(dia)}
      className="-ml-1 mb-3 inline-flex items-center gap-1.5 no-underline hover:underline"
      data-voltar=""
      icone={<ChevronLeft className="size-5" strokeWidth={2} />}
    >
      {DETALHE.voltarParaHistorico}
    </LinkDaRotina>
  )

  if (invalido || (leitura.estado === 'pronto' && registro === null)) {
    return (
      <TelaRotina tela="registro-detalhe" principal={principal} acionar={acionar} titulo={titulo} linha={ativo.bebe.nome} antes={voltar(null)}>
        <p className="font-medium" data-nao-encontrado="">
          {ESTADOS.naoEncontrado}
        </p>
      </TelaRotina>
    )
  }
  if (leitura.estado === 'erro' && leitura.dados === null && leitura.erro) {
    return (
      <TelaRotina tela="registro-detalhe" principal={principal} acionar={acionar} titulo={titulo} linha={ativo.bebe.nome} antes={voltar(null)}>
        <div className="max-w-[28rem]">
          <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
        </div>
      </TelaRotina>
    )
  }
  if (registro === null) {
    return (
      <TelaRotina tela="registro-detalhe" principal={principal} acionar={acionar} titulo={titulo} linha={ativo.bebe.nome} antes={voltar(null)} ocupada>
        <p aria-busy="true">{COMUM.carregando}</p>
      </TelaRotina>
    )
  }

  const fuso = dono.familia.fuso
  const autorDe = (autor: string | null) => nomeDoAutor(autor, registro.familiaId)
  const sessao = ehTipoDeSessao(registro.tipo)
  const excluido = registro.excluidoEm !== null
  const alteravel = podeAlterar(registro)
  const dia = acoes.diaDoRegistro(registro)
  const campos = camposDoDetalhe(registro)

  async function excluir() {
    if (!registro || ocupado) return
    setOcupado(true)
    focarTitulo()
    await acoes.excluirDoDetalhe(registro, () => void navigate(urlDoHistoricoDoDia(dia), { state: { foco: 'titulo' } }))
    setOcupado(false)
  }

  async function restaurar() {
    if (!registro || ocupado) return
    setOcupado(true)
    focarTitulo()
    await acoes.restaurar(registro, { confirmar: true })
    setOcupado(false)
  }

  return (
    <TelaRotina
      tela="registro-detalhe"
      principal={principal}
      acionar={acionar}
      titulo={titulo}
      linha={`${ROTULO_TIPO[registro.tipo]}, ${dono.bebe.nome}`}
      antes={voltar(dia)}
    >
      <div className="flex max-w-[40rem] flex-col gap-8">
        {leitura.erro ? (
          <div data-releitura-falhou="">
            <AvisoDeErro erro={leitura.erro} papel={dono.papel} aoTentarDeNovo={leitura.recarregar} />
          </div>
        ) : null}

        <ul data-cabecalho-do-registro="">
          <ItemRegistro registro={registro} fuso={fuso} autor={autorDe(registro.criadoPor)} />
        </ul>

        {excluido ? (
          <div className="flex flex-col items-start gap-3" data-registro-na-lixeira="">
            <p className="font-medium">{DETALHE.naLixeira}</p>
            {alteravel && ehRestauravel(registro.excluidoEm, agora) ? (
              <Botao variante="contorno" tamanho="app" className={ALVO_APP} icone={<Undo2 />} desativado={ocupado} onClick={() => void restaurar()}>
                {DETALHE.restaurar}
              </Botao>
            ) : null}
          </div>
        ) : null}

        <dl data-detalhes-do-registro="" className="border-y border-(--cor-fio-suave)">
          {campos.map((campo) => (
            <Campo key={campo.rotulo} rotulo={campo.rotulo}>
              {campo.valor}
            </Campo>
          ))}
          <Campo rotulo={DETALHE.origem}>{registro.origem === 'ao_vivo' ? DETALHE.origemAoVivo : DETALHE.origemRetroativo}</Campo>
        </dl>

        <ul data-autoria="" className="flex flex-col gap-1 text-[15px] leading-[22px] text-(--cor-texto-2)">
          <li>{sessao ? DETALHE.iniciadoPor(autorDe(registro.criadoPor)) : DETALHE.registradoPor(autorDe(registro.criadoPor))}</li>
          {sessao && registro.fim !== null ? <li>{DETALHE.encerradoPor(autorDe(registro.encerradoPor))}</li> : null}
        </ul>

        {/* Uma frase só, pelo papel, pelo item (cuidador em registro de outra pessoa) ou pelo bebê arquivado; as ações
            proibidas ficam ocultas (R38-11). */}
        {!alteravel || dono.arquivado ? <AvisoDoPapel texto={textoDoPapel(dono)} /> : null}

        {!excluido && alteravel ? (
          <div className="flex flex-wrap gap-3" data-acoes-do-registro="">
            <LinkDaRotina
              to={`/app/registro/${registro.id}/editar`}
              state={{ de: 'detalhe' }}
              variante="contorno"
              icone={<Pencil />}
              aria-label={DETALHE.acaoSobre(DETALHE.editar, ROTULO_TIPO[registro.tipo])}
            >
              {DETALHE.editar}
            </LinkDaRotina>
            <Botao variante="contorno" tamanho="app" className={ALVO_APP} icone={<Trash2 />} desativado={ocupado} onClick={() => void excluir()}>
              {DETALHE.excluir}
            </Botao>
          </div>
        ) : null}

        {veAlteracoes ? (
          <SecaoDoHoje secao={alteracoes} titulo={DETALHE.historicoDeAlteracoes} papel={dono.papel}>
            {(lista) => {
              const ordenadas = [...lista.itens].sort((a, b) => a.versao - b.versao || (a.recebidaEm < b.recebidaEm ? -1 : 1))
              return (
                <section aria-labelledby="detalhe-alteracoes" data-historico-de-alteracoes="">
                  <h2 id="detalhe-alteracoes" className="cm-h4">
                    {DETALHE.historicoDeAlteracoes}
                  </h2>
                  {lista.incompleta ? <AvisoDeLista limite={LIMITES.alteracoes} dado="alteracoes" className="mt-3" /> : null}
                  {ordenadas.length === 0 ? (
                    <p className="mt-3 text-(--cor-texto-2)">{DETALHE.semAlteracoes}</p>
                  ) : (
                    <ol className="mt-3 border-y border-(--cor-fio-suave)">
                      {ordenadas.map((alteracao) => (
                        <li key={alteracao.id} className="border-t border-(--cor-fio-suave) py-3 first:border-t-0">
                          <p className="font-medium wrap-anywhere">
                            {DETALHE.linhaDaAlteracao(DETALHE.operacoes[alteracao.operacao], autorDe(alteracao.autor), dataEHora(Date.parse(alteracao.recebidaEm)))}
                          </p>
                          {camposMudados(alteracao).map((mudado) => (
                            <p key={mudado.campo} className="text-[15px] leading-[22px] text-(--cor-texto-2) wrap-anywhere">
                              {DETALHE.mudou(mudado.campo, mudado.antes, mudado.depois)}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              )
            }}
          </SecaoDoHoje>
        ) : null}
      </div>
    </TelaRotina>
  )
}
