import { useState } from 'react'
import { ChevronLeft, Undo2 } from 'lucide-react'
import { ALVO_APP } from '../../componentes/app/alvo.ts'
import { Botao } from '../../componentes/base/Botao.tsx'
import { AvisoDeLista } from '../../componentes/rotina/AvisoDeLista.tsx'
import { IconeDoTipo } from '../../componentes/rotina/IconeDoTipo.tsx'
import { LinkDaRotina } from '../../componentes/rotina/LinkDaRotina.tsx'
import { SecaoDoHoje } from '../../componentes/rotina/SecaoDoHoje.tsx'
import { TelaRotina } from '../../componentes/rotina/TelaRotina.tsx'
import { useRotina, type BebeAtivo } from '../../componentes/rotina/contexto.ts'
import { dataEHora, prazoDaRestauracao } from '../../componentes/rotina/datasDaRotina.ts'
import { resumoDoRegistro } from '../../componentes/rotina/formatos.ts'
import { useAcoesDaRotina } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { useTelaDaRotina } from '../../componentes/rotina/useTelaDaRotina.ts'
import { HOJE, LIXEIRA, ROTULO_TIPO, TITULOS } from '../../conteudo/rotina.ts'
import { LIMITES, type Registro } from '../../dados/rotina.tipos.ts'

/** Mais recente primeiro (46-N1); o empate cai no id, para a ordem não depender do banco. */
const maisRecenteDaExclusao = (a: Registro, b: Registro) =>
  Date.parse(b.excluidoEm ?? '') - Date.parse(a.excluidoEm ?? '') || (a.id < b.id ? -1 : 1)

export function Lixeira() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <LixeiraDoBebe ativo={ativo} />
}

function LixeiraDoBebe({ ativo }: { ativo: BebeAtivo }) {
  const { dados, podeAlterar } = useRotina()
  const acoes = useAcoesDaRotina()
  const { principal, acionar, focarTitulo } = useTelaDaRotina()
  const [ocupados, setOcupados] = useState<ReadonlySet<string>>(new Set())
  const lixeira = useSecao(ativo.bebe.id, (bebe) => dados.lixeira(bebe))

  async function restaurar(registro: Registro) {
    if (ocupados.has(registro.id)) return
    setOcupados((anteriores) => new Set(anteriores).add(registro.id))
    focarTitulo()
    await acoes.restaurar(registro, { confirmar: true })
    setOcupados((anteriores) => {
      const proximos = new Set(anteriores)
      proximos.delete(registro.id)
      return proximos
    })
  }

  return (
    <TelaRotina
      tela="lixeira"
      principal={principal}
      acionar={acionar}
      titulo={TITULOS.lixeira}
      linha={ativo.bebe.nome}
      ocupada={lixeira.estado === 'carregando'}
      antes={
        <LinkDaRotina
          to="/app/historico"
          className="-ml-1 mb-3 inline-flex items-center gap-1.5 no-underline hover:underline"
          icone={<ChevronLeft className="size-5" strokeWidth={2} />}
        >
          {LIXEIRA.voltarParaHistorico}
        </LinkDaRotina>
      }
    >
      <div className="flex max-w-[40rem] flex-col gap-6">
        <p>{LIXEIRA.intro}</p>
        <SecaoDoHoje secao={lixeira} titulo={LIXEIRA.lista} papel={ativo.papel}>
          {(lista) => {
            const itens = [...lista.itens].sort(maisRecenteDaExclusao)
            return (
              <section aria-labelledby="lixeira-lista" data-lixeira="">
                <h2 id="lixeira-lista" className="cm-h4">
                  {LIXEIRA.lista}
                </h2>
                {lista.incompleta ? <AvisoDeLista limite={LIMITES.lixeira} dado="lixeira" className="mt-3" /> : null}
                {itens.length === 0 ? (
                  <p className="mt-3 border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2)">{LIXEIRA.vazia}</p>
                ) : (
                  <ul className="mt-3 border-y border-(--cor-fio-suave)">
                    {itens.map((registro) => {
                      const excluidoEm = Date.parse(registro.excluidoEm ?? '')
                      const resumo = resumoDoRegistro(registro, ativo.familia.fuso)
                      const rotulo = resumo ? HOJE.rotuloEResumo(ROTULO_TIPO[registro.tipo], resumo) : ROTULO_TIPO[registro.tipo]
                      return (
                        <li
                          key={registro.id}
                          data-registro={registro.id}
                          className="flex flex-col gap-3 border-t border-(--cor-fio-suave) py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <IconeDoTipo tipo={registro.tipo} className="mt-0.5 size-5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium wrap-anywhere">
                                {rotulo}, <span className="tabular-nums">{dataEHora(Date.parse(registro.inicio))}</span>
                              </p>
                              <p className="text-[15px] leading-[22px] text-(--cor-texto-2) wrap-anywhere">
                                {LIXEIRA.excluidoPor(acoes.nomeDoAutor(registro.excluidoPor, registro.familiaId), dataEHora(excluidoEm))}
                              </p>
                              <p className="text-[15px] leading-[22px] text-(--cor-texto-2)">
                                {LIXEIRA.podeSerRestauradoAte(dataEHora(prazoDaRestauracao(registro.excluidoEm ?? '')))}
                              </p>
                            </div>
                          </div>
                          {podeAlterar(registro) ? (
                            <Botao
                              variante="contorno"
                              tamanho="app"
                              className={`${ALVO_APP} shrink-0`}
                              icone={<Undo2 />}
                              desativado={ocupados.has(registro.id)}
                              aria-label={LIXEIRA.restaurarItem(ROTULO_TIPO[registro.tipo], dataEHora(Date.parse(registro.inicio)))}
                              onClick={() => void restaurar(registro)}
                            >
                              {LIXEIRA.restaurar}
                            </Botao>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          }}
        </SecaoDoHoje>
      </div>
    </TelaRotina>
  )
}
