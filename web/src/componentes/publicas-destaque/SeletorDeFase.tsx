import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { IDEIAS } from '../../conteudo/desenvolvimento/itens.ts'
import type { Fase } from '../../conteudo/desenvolvimento/tipos.ts'
import { Pilha } from '../base/layout/index.ts'
import { FontesDoItem } from './FontesDoItem.tsx'
import './publicas-destaque.css'

/**
 * As ideias para brincar, uma fase por aba (padrão de abas do ARIA): as setas, Home e End trocam a
 * fase e levam o foco junto. Todos os painéis ficam no documento (os de fora, `hidden`), cada um com
 * as atividades, as fontes e a data da consulta. No largo, as abas ficam numa coluna à esquerda, com
 * o `lateral` (o que vale para todas as fases) logo abaixo delas; no celular, as abas vão em cima e o
 * lateral depois da fase.
 */
export function SeletorDeFase({ fases, lateral }: { fases: readonly Fase[]; lateral?: ReactNode }) {
  const [ativa, setAtiva] = useState(0)
  const base = useId()
  const abas = useRef<Array<HTMLButtonElement | null>>([])

  function escolher(indice: number) {
    setAtiva(indice)
    abas.current[indice]?.focus()
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultima = fases.length - 1
    const destino =
      evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
        ? (indice + 1) % fases.length
        : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp'
          ? (indice - 1 + fases.length) % fases.length
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? ultima
              : null
    if (destino === null) return
    evento.preventDefault()
    escolher(destino)
  }

  return (
    <div className="pd-seletor">
      <div role="tablist" aria-label={IDEIAS.rotuloSeletor} className="pd-abas">
        {fases.map((fase, i) => (
          <button
            key={fase.id}
            ref={(no) => {
              abas.current[i] = no
            }}
            type="button"
            role="tab"
            id={`${base}-aba-${i}`}
            aria-selected={i === ativa}
            aria-controls={`${base}-fase-${i}`}
            tabIndex={i === ativa ? 0 : -1}
            className="pd-aba"
            onClick={() => setAtiva(i)}
            onKeyDown={(evento) => aoTeclar(evento, i)}
          >
            {fase.faixa}
          </button>
        ))}
      </div>
      {fases.map((fase, i) => (
        <div
          key={fase.id}
          role="tabpanel"
          id={`${base}-fase-${i}`}
          aria-labelledby={`${base}-aba-${i}`}
          hidden={i !== ativa}
          tabIndex={0}
          className="pd-fase"
          data-h="coluna"
          data-fase={fase.id}
        >
          <Pilha vao="grupo">
            <h3 className="cm-h3">{fase.titulo}</h3>
            <ul className="pd-lista cm-corpo">
              {fase.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <FontesDoItem fontes={fase.fontes} consultadoEm={fase.consultadoEm} />
          </Pilha>
        </div>
      ))}
      {lateral ? (
        <Pilha vao="pilha" dataH="coluna" className="pd-seletor-lateral">
          {lateral}
        </Pilha>
      ) : null}
    </div>
  )
}
