import { useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router'
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { ALVO_APP } from '../../componentes/app/alvo.ts'
import { Avatar } from '../../componentes/app/Avatar.tsx'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Cartao, Pilha } from '../../componentes/base/layout/index.ts'
import { AvisoDeErro } from '../../componentes/rotina/AvisoDeErro.tsx'
import { AvisoDeLista } from '../../componentes/rotina/AvisoDeLista.tsx'
import { FormularioNota } from '../../componentes/rotina/FormularioNota.tsx'
import { LinkDaRotina } from '../../componentes/rotina/LinkDaRotina.tsx'
import { SecaoDoHoje } from '../../componentes/rotina/SecaoDoHoje.tsx'
import { textoDoPapel } from '../../componentes/rotina/textoDoPapel.ts'
import { TelaRotina } from '../../componentes/rotina/TelaRotina.tsx'
import { useRotina, type BebeAtivo } from '../../componentes/rotina/contexto.ts'
import { dataEHora } from '../../componentes/rotina/datasDaRotina.ts'
import { ORIGEM_HOJE, ORIGEM_NOTAS, origemDoEstado } from '../../componentes/rotina/origemDasNotas.ts'
import { useAcoesDaRotina } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { useTelaDaRotina } from '../../componentes/rotina/useTelaDaRotina.ts'
import { COMUM, ESTADOS, FORMATOS, NOTAS, TITULOS } from '../../conteudo/rotina.ts'
import type { Resultado } from '../../dados/comum.ts'
import { LIMITES, podeEscrever, type Lista, type Nota } from '../../dados/rotina.tipos.ts'
import { ehUuid } from '../../dados/rotina.uuid.ts'
import { useAgora } from '../../prototipo/useAgora.ts'

const UM_MINUTO = 60_000
const TAMANHO_DO_RESUMO = 40

/** O começo do texto da nota, para o nome acessível dos botões da lista. */
const resumoDaNota = (texto: string) =>
  texto.length > TAMANHO_DO_RESUMO ? `${texto.slice(0, TAMANHO_DO_RESUMO).trimEnd()}${FORMATOS.reticencias}` : texto

const maisNovaPrimeiro = (a: Nota, b: Nota) => Date.parse(b.criadaEm) - Date.parse(a.criadaEm) || (a.id < b.id ? -1 : 1)

function VoltarDasNotas({ origem }: { origem: typeof ORIGEM_NOTAS | typeof ORIGEM_HOJE }) {
  return (
    <LinkDaRotina
      to={origem}
      className="-ml-1 inline-flex items-center gap-1.5 self-start no-underline hover:underline"
      icone={<ChevronLeft className="size-5" strokeWidth={2} />}
    >
      {origem === ORIGEM_HOJE ? NOTAS.voltarParaHoje : NOTAS.voltarParaNotas}
    </LinkDaRotina>
  )
}

// ---- /app/notas -------------------------------------------------------------------------------------------

export function Notas() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <ListaDeNotas ativo={ativo} />
}

function ListaDeNotas({ ativo }: { ativo: BebeAtivo }) {
  const { dados, atualizar, podeAlterar, mostrarConfirmacao } = useRotina()
  const acoes = useAcoesDaRotina()
  const { principal, acionar, focarTitulo } = useTelaDaRotina()
  const agora = useAgora(UM_MINUTO)
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const familiaId = ativo.familia.id
  const notas = useSecao(ativo.bebe.id, (bebe) => dados.notas(familiaId, bebe))
  const podeCriar = podeEscrever(ativo.papel)
  // A origem que a lista recebeu (Hoje, via state) segue para o formulário; sem state, o formulário volta à lista.
  const origem = origemDoEstado(useLocation().state)

  /** Exclui a nota (sem lixeira, DR-15). Falha: a frase e, se incerta, `Tentar de novo` com o mesmo id. */
  async function excluir(nota: Nota) {
    if (ocupada) return
    setOcupada(nota.id)
    const resultado = await dados.excluirNota(nota.id)
    setOcupada(null)
    setExcluindo(null)
    focarTitulo()
    if (!resultado.ok) {
      acoes.mostrarErro(resultado.erro, () => void excluir(nota))
      return
    }
    atualizar()
    mostrarConfirmacao({ texto: NOTAS.excluida, acoes: [{ chave: 'fechar', rotulo: COMUM.fechar, executar: () => undefined }] })
  }

  const nomeDoSobre = (nota: Nota) =>
    nota.bebeId === null ? NOTAS.sobreAFamiliaToda : NOTAS.sobre(ativo.familia.bebes.find((bebe) => bebe.id === nota.bebeId)?.nome ?? COMUM.semNomeDoBebe)

  return (
    <TelaRotina
      tela="notas"
      principal={principal}
      acionar={acionar}
      titulo={TITULOS.notas}
      linha={ativo.bebe.nome}
      ocupada={notas.estado === 'carregando'}
      antes={<VoltarDasNotas origem={ORIGEM_HOJE} />}
    >
      <Pilha vao="bloco" className="max-w-leitura">
        {podeCriar ? (
          <div>
            <LinkDaRotina to="/app/notas/nova" state={{ origem }} variante="contorno" icone={<Plus />}>
              {NOTAS.nova}
            </LinkDaRotina>
          </div>
        ) : (
          <p className="font-medium" data-sem-permissao="">
            {textoDoPapel(ativo)}
          </p>
        )}
        <SecaoDoHoje secao={notas} titulo={NOTAS.lista} papel={ativo.papel}>
          {(lista: Lista<Nota>) => {
            const itens = [...lista.itens].sort(maisNovaPrimeiro)
            return (
              <Pilha as="section" vao="pilha" aria-labelledby="notas-lista" data-notas-da-familia="">
                <h2 id="notas-lista" className="text-titulo-4 font-titulo font-semibold">
                  {NOTAS.lista}
                </h2>
                {lista.incompleta ? <AvisoDeLista limite={LIMITES.notas} dado="notas" /> : null}
                {itens.length === 0 ? (
                  <p className="border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2)">{NOTAS.vazia}</p>
                ) : (
                  <ul className="border-y border-(--cor-fio-suave)">
                    {itens.map((nota) => {
                      const autor = acoes.nomeDoAutor(nota.criadoPor, nota.familiaId)
                      const resumo = resumoDaNota(nota.texto)
                      const emDestaque = nota.destaqueAte !== null && Date.parse(nota.destaqueAte) > agora
                      return (
                        <li key={nota.id} data-nota={nota.id} className="flex flex-col gap-3 border-t border-(--cor-fio-suave) py-4 first:border-t-0">
                          <div className="flex items-start gap-3">
                            <Avatar nome={autor} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium wrap-anywhere whitespace-pre-line">{nota.texto}</p>
                              <p className="text-pequeno text-(--cor-texto-2)">{nomeDoSobre(nota)}</p>
                              <p className="text-pequeno text-(--cor-texto-2) wrap-anywhere">
                                {NOTAS.autorEm(autor, dataEHora(Date.parse(nota.criadaEm)))}
                              </p>
                              {emDestaque && nota.destaqueAte ? (
                                <p className="text-pequeno text-(--cor-texto-2)">{NOTAS.emDestaqueAte(dataEHora(Date.parse(nota.destaqueAte)))}</p>
                              ) : null}
                            </div>
                          </div>
                          {podeAlterar(nota) ? (
                            excluindo === nota.id ? (
                              <Cartao role="group" aria-label={NOTAS.grupoDaExclusao} className="bg-(--cor-papel-fundo)" data-confirmar-exclusao="">
                                <Pilha vao="pilha">
                                  <p className="font-medium">{NOTAS.confirmarExclusao}</p>
                                  <div className="flex flex-wrap gap-3">
                                    <Botao tamanho="app" className={ALVO_APP} desativado={ocupada === nota.id} onClick={() => void excluir(nota)}>
                                      {NOTAS.excluir}
                                    </Botao>
                                    <Botao variante="contorno" tamanho="app" className={ALVO_APP} onClick={() => setExcluindo(null)}>
                                      {NOTAS.manter}
                                    </Botao>
                                  </div>
                                </Pilha>
                              </Cartao>
                            ) : (
                              <div className="flex flex-wrap gap-3">
                                <LinkDaRotina
                                  to={`/app/notas/${nota.id}/editar`}
                                  state={{ origem }}
                                  variante="contorno"
                                  icone={<Pencil />}
                                  aria-label={NOTAS.editarNota(resumo)}
                                >
                                  {NOTAS.editar}
                                </LinkDaRotina>
                                <Botao
                                  variante="contorno"
                                  tamanho="app"
                                  className={ALVO_APP}
                                  icone={<Trash2 />}
                                  aria-label={NOTAS.excluirNota(resumo)}
                                  onClick={() => setExcluindo(nota.id)}
                                >
                                  {NOTAS.excluir}
                                </Botao>
                              </div>
                            )
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Pilha>
            )
          }}
        </SecaoDoHoje>
      </Pilha>
    </TelaRotina>
  )
}

// ---- /app/notas/nova -----------------------------------------------------------------------------------------

export function NotaNova() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <NovaNota ativo={ativo} />
}

function NovaNota({ ativo }: { ativo: BebeAtivo }) {
  const { principal, acionar } = useTelaDaRotina()
  const location = useLocation()
  const origem = origemDoEstado(location.state)
  // Observador não cria; o bebê arquivado cria, só para a família toda (R38-24).
  const liberado = podeEscrever(ativo.papel)
  return (
    <TelaRotina tela="nota-nova" principal={principal} acionar={acionar} titulo={TITULOS.notaNova} linha={ativo.bebe.nome} antes={<VoltarDasNotas origem={origem} />}>
      {liberado ? (
        <FormularioNota key={ativo.bebe.id} modo="nova" ativo={ativo} origem={origem} />
      ) : (
        <p className="font-medium" data-sem-permissao="">
          {textoDoPapel(ativo)}
        </p>
      )}
    </TelaRotina>
  )
}

// ---- /app/notas/:id/editar ------------------------------------------------------------------------------------

export function NotaEditar() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <EdicaoDaNota ativo={ativo} />
}

function EdicaoDaNota({ ativo }: { ativo: BebeAtivo }) {
  const { dados, podeAlterar } = useRotina()
  const { principal, acionar } = useTelaDaRotina()
  const location = useLocation()
  const { id } = useParams()
  const origem = origemDoEstado(location.state)
  const invalido = !ehUuid(id)
  const familiaId = ativo.familia.id
  const leitura = useSecao<{ nota: Nota | null }>(invalido ? null : `${ativo.bebe.id}|${id}`, async (chave): Promise<Resultado<{ nota: Nota | null }>> => {
    const [bebe, idDaNota] = chave.split('|')
    const lidas = await dados.notas(familiaId, bebe)
    return lidas.ok ? { ok: true, valor: { nota: lidas.valor.itens.find((candidata) => candidata.id === idDaNota) ?? null } } : lidas
  })
  const nota = leitura.dados?.nota ?? null
  const tela = (conteudo: ReactNode, ocupada = false) => (
    <TelaRotina
      tela="nota-editar"
      principal={principal}
      acionar={acionar}
      titulo={TITULOS.notaEditar}
      linha={ativo.bebe.nome}
      antes={<VoltarDasNotas origem={origem} />}
      ocupada={ocupada}
    >
      {conteudo}
    </TelaRotina>
  )

  if (invalido || (leitura.estado === 'pronto' && nota === null)) {
    return tela(
      <p className="font-medium" data-nao-encontrado="">
        {ESTADOS.naoEncontradaNota}
      </p>,
    )
  }
  if (leitura.estado === 'erro' && leitura.dados === null && leitura.erro) {
    return tela(
      <div className="max-w-md">
        <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
      </div>,
    )
  }
  if (nota === null) return tela(<p aria-busy="true">{COMUM.carregando}</p>, true)
  return tela(
    <>
      {/* Uma releitura que falhou com a nota já na tela: o aviso e `Tentar de novo` ficam junto do formulário, que
          não é desmontado e não perde o rascunho (R38-11/12). */}
      {leitura.erro ? (
        <div className="max-w-md" data-releitura-falhou="">
          <AvisoDeErro erro={leitura.erro} papel={ativo.papel} aoTentarDeNovo={leitura.recarregar} />
        </div>
      ) : null}
      {podeAlterar(nota) ? (
        <FormularioNota key={nota.id} modo="editar" ativo={ativo} nota={nota} origem={origem} />
      ) : (
        <p className="font-medium" data-sem-permissao="">
          {textoDoPapel(ativo)}
        </p>
      )}
    </>,
  )
}
