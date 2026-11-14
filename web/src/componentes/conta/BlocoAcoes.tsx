import { useRef, useState } from 'react'
import { FAMILIA } from '../../conteudo/conta.ts'
import type { DetalheFamilia } from '../../dados/conta.ts'
import { Cartao, Pilha } from '../base/layout/index.ts'
import type { AcoesDaFamilia } from './acoesFamilia.ts'
import { FormularioFamilia } from './FormularioFamilia.tsx'
import { BOTAO_SECUNDARIO } from './Partes.tsx'
import { useDadosConta } from './sessao.tsx'

interface Props {
  detalhe: DetalheFamilia
  responsavel: boolean
  acoes: AcoesDaFamilia
}

// O bloco de ações da família (RF-15, item 5): "Editar família" e "Excluir família" só do
// responsável; "Sair da família" de qualquer papel. Sair e excluir pedem confirmação numa caixa.
export function BlocoAcoes({ detalhe, responsavel, acoes }: Props) {
  const dados = useDadosConta()
  const [editando, setEditando] = useState(false)
  const botaoEditar = useRef<HTMLButtonElement>(null)
  const { familia } = detalhe

  return (
    <Pilha as="section" aria-labelledby="acoes-da-familia" vao="pilha">
      <h2 id="acoes-da-familia" className="cm-h4">
        {FAMILIA.acoes.titulo}
      </h2>

      {responsavel && editando ? (
        <Cartao className="max-w-[32rem] border border-[var(--cor-fio-suave)]">
          <FormularioFamilia
            nome={familia.nome}
            fuso={familia.fuso}
            rotuloNome={FAMILIA.acoes.nome}
            rotuloFuso={FAMILIA.acoes.fuso}
            rotuloSalvar={FAMILIA.acoes.salvar}
            rotuloSecundario={FAMILIA.acoes.cancelar}
            aoSecundario={() => {
              setEditando(false)
              botaoEditar.current?.focus()
            }}
            escrever={(nome, fuso) => dados.atualizarFamilia(familia.id, nome, fuso)}
            conferir={async (nome, fuso) => {
              const lida = await dados.detalheFamilia(familia.id)
              if (!lida.ok) return lida
              return { ok: true, valor: lida.valor.familia.nome === nome && lida.valor.familia.fuso === fuso }
            }}
            aoFalharNaFamilia={(erro) => void acoes.aposFalha(erro)}
            aoSucesso={async () => {
              setEditando(false)
              await acoes.aposAcao(FAMILIA.acoes.salva)
            }}
          />
        </Cartao>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {responsavel && !editando ? (
          <button
            ref={botaoEditar}
            type="button"
            className={BOTAO_SECUNDARIO}
            data-tamanho="app"
            onClick={() => setEditando(true)}
          >
            {FAMILIA.acoes.editar}
          </button>
        ) : null}
        <button
          id="sair-da-familia"
          type="button"
          className={BOTAO_SECUNDARIO}
          data-tamanho="app"
          onClick={(evento) => acoes.abrirDialogo({ tipo: 'sair' }, evento.currentTarget)}
        >
          {FAMILIA.acoes.sair}
        </button>
        {responsavel ? (
          <button
            type="button"
            className={BOTAO_SECUNDARIO}
            data-tamanho="app"
            onClick={(evento) => acoes.abrirDialogo({ tipo: 'excluir' }, evento.currentTarget)}
          >
            {FAMILIA.acoes.excluir}
          </button>
        ) : null}
      </div>
    </Pilha>
  )
}
