import { useRef, useState, type ReactNode } from 'react'
import { COMUM, FAMILIA } from '../../conteudo/conta.ts'
import type { Bebe, DetalheFamilia } from '../../dados/conta.ts'
import { familiaMudou, useAoFalharNaFamilia, type AcoesDaFamilia } from './acoesFamilia.ts'
import { formatarNascimento } from './datas.ts'
import { useEnvio } from './envio.ts'
import { FormularioBebe } from './FormularioBebe.tsx'
import { BOTAO_SECUNDARIO, ResumoErro } from './Partes.tsx'
import { useDadosConta } from './sessao.tsx'
import { useFocoNoResumo } from './foco.ts'

interface Props {
  detalhe: DetalheFamilia
  responsavel: boolean
  acoes: AcoesDaFamilia
}

const LINHA = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--cor-fio-suave)] py-3'

function LinhaDoBebe({ bebe, filhos }: { bebe: Bebe; filhos?: ReactNode }) {
  return (
    <>
      <div className="min-w-0">
        <p className="font-medium wrap-anywhere">{bebe.nome}</p>
        <p className="cm-pequeno tabular text-[var(--cor-texto-2)]">
          {FAMILIA.bebes.nasceuEm(formatarNascimento(bebe.nascimento))}
        </p>
      </div>
      {filhos}
    </>
  )
}

// O bloco Bebês (RF-15, item 2): os ativos com nome e nascimento; o responsável adiciona, edita e
// arquiva, e vê os arquivados num bloco fechado por padrão, com "Desarquivar".
export function BlocoBebes({ detalhe, responsavel, acoes }: Props) {
  const dados = useDadosConta()
  const [adicionandoPedido, setAdicionando] = useState(false)
  const [editandoPedido, setEditando] = useState<string | null>(null)
  // Sem o papel de responsável (relido depois de uma ação), nenhum formulário de escrita fica aberto.
  if (!responsavel && (adicionandoPedido || editandoPedido !== null)) {
    setAdicionando(false)
    setEditando(null)
  }
  const adicionando = responsavel && adicionandoPedido
  const editando = responsavel ? editandoPedido : null
  const ativos = detalhe.bebes.filter((bebe) => bebe.estado === 'ativo')
  const arquivados = detalhe.bebes.filter((bebe) => bebe.estado === 'arquivado')
  const botaoAdicionar = useRef<HTMLButtonElement>(null)

  const desarquivo = useEnvio()
  const erroDoDesarquivo = desarquivo.estado.fase === 'erro' ? desarquivo.estado.erro : null
  const resumoDoDesarquivo = useFocoNoResumo(erroDoDesarquivo)
  useAoFalharNaFamilia(erroDoDesarquivo, acoes.aposFalha)

  function desarquivar(bebe: Bebe) {
    void desarquivo.enviar({
      escrever: () => dados.arquivarBebe(bebe.id, false),
      conferir: async () => {
        const lida = await dados.detalheFamilia(detalhe.familia.id)
        if (!lida.ok) return lida
        return { ok: true, valor: lida.valor.bebes.find((item) => item.id === bebe.id)?.estado === 'ativo' }
      },
      aoSucesso: () => acoes.aposAcao(FAMILIA.bebes.desarquivado(bebe.nome)),
    })
  }

  return (
    <section aria-labelledby="bebes" className="flex flex-col gap-4">
      <h2 id="bebes" className="cm-h4">
        {FAMILIA.bebes.titulo}
      </h2>

      {ativos.length === 0 ? (
        <p>{FAMILIA.bebes.vazio}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {ativos.map((bebe) =>
            editando === bebe.id ? (
              <li key={bebe.id} className="border-t border-[var(--cor-fio-suave)] py-4">
                <FormularioBebe
                  familiaId={detalhe.familia.id}
                  fuso={detalhe.familia.fuso}
                  bebe={bebe}
                  rotuloSalvar={FAMILIA.bebes.salvar}
                  rotuloSecundario={FAMILIA.bebes.cancelar}
                  aoSecundario={() => setEditando(null)}
                  aoFalharNaFamilia={(erro) => void acoes.aposFalha(erro)}
                  aoSalvo={async (_salvo, nome) => {
                    setEditando(null)
                    await acoes.aposAcao(FAMILIA.bebes.editado(nome))
                  }}
                />
              </li>
            ) : (
              <li key={bebe.id} className={LINHA}>
                <LinhaDoBebe
                  bebe={bebe}
                  filhos={
                    responsavel ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={BOTAO_SECUNDARIO}
                          data-tamanho="app"
                          aria-label={`${FAMILIA.bebes.editar} ${bebe.nome}`}
                          onClick={() => setEditando(bebe.id)}
                        >
                          {FAMILIA.bebes.editar}
                        </button>
                        <button
                          type="button"
                          className={BOTAO_SECUNDARIO}
                          data-tamanho="app"
                          aria-label={`${FAMILIA.bebes.arquivar} ${bebe.nome}`}
                          onClick={(evento) => acoes.abrirDialogo({ tipo: 'arquivar', bebe }, evento.currentTarget)}
                        >
                          {FAMILIA.bebes.arquivar}
                        </button>
                      </div>
                    ) : null
                  }
                />
              </li>
            ),
          )}
        </ul>
      )}

      {responsavel && adicionando ? (
        <div className="max-w-[32rem] rounded-cartao border border-[var(--cor-fio-suave)] p-5">
          <FormularioBebe
            familiaId={detalhe.familia.id}
            fuso={detalhe.familia.fuso}
            rotuloSalvar={FAMILIA.bebes.salvar}
            rotuloSecundario={FAMILIA.bebes.cancelar}
            aoSecundario={() => {
              setAdicionando(false)
              botaoAdicionar.current?.focus()
            }}
            aoPerderResposta={acoes.relerDetalhe}
            aoFalharNaFamilia={(erro) => void acoes.aposFalha(erro)}
            aoSalvo={async (_salvo, nome) => {
              setAdicionando(false)
              await acoes.aposAcao(FAMILIA.bebes.adicionado(nome))
            }}
            comAviso
          />
        </div>
      ) : null}

      {responsavel && !adicionando ? (
        <div>
          <button
            ref={botaoAdicionar}
            type="button"
            className={BOTAO_SECUNDARIO}
            data-tamanho="app"
            onClick={() => setAdicionando(true)}
          >
            {FAMILIA.bebes.adicionar}
          </button>
        </div>
      ) : null}

      {responsavel && arquivados.length > 0 ? (
        <details className="border-t border-[var(--cor-fio-suave)] pt-3">
          <summary className="alvo-toque flex cursor-pointer items-center font-medium">{FAMILIA.bebes.arquivados}</summary>
          {erroDoDesarquivo && !familiaMudou(erroDoDesarquivo) ? (
            <div className="my-3 max-w-[32rem]">
              <ResumoErro
                erro={erroDoDesarquivo}
                repetivel={desarquivo.estado.fase === 'erro' && desarquivo.estado.tentarDeNovo}
                aoTentarDeNovo={() => void desarquivo.tentarDeNovo()}
                refResumo={resumoDoDesarquivo}
              />
            </div>
          ) : null}
          <ul className="m-0 list-none p-0">
            {arquivados.map((bebe) => (
              <li key={bebe.id} className={LINHA}>
                <LinhaDoBebe
                  bebe={bebe}
                  filhos={
                    <button
                      type="button"
                      disabled={desarquivo.enviando}
                      className={BOTAO_SECUNDARIO}
                      data-tamanho="app"
                      aria-label={`${FAMILIA.bebes.desarquivar} ${bebe.nome}`}
                      onClick={() => desarquivar(bebe)}
                    >
                      {desarquivo.enviando ? COMUM.salvando : FAMILIA.bebes.desarquivar}
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
