import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { HOJE, SELETOR } from '../../conteudo/rotina.ts'
import { diaDaFamilia, formatarIdade } from '../../dados/rotina.dia.ts'
import { ALVO_APP } from '../app/alvo.ts'
import type { BebeAtivo } from './contexto.ts'

interface Props {
  ativo: BebeAtivo
  bebes: readonly BebeAtivo[]
  /** O instante atual: a idade se conta no fuso da família dele. */
  agora: number
  /** Escolher fecha a lista, troca o bebê e leva o foco ao `h1` (a tela faz o foco). */
  aoEscolher: (id: string) => void
}

const idadeDe = (item: BebeAtivo, agora: number) => formatarIdade(item.bebe.nascimento, diaDaFamilia(agora, item.familia.fuso))
const linhaDe = (item: BebeAtivo, agora: number) => HOJE.linhaDoBebe(item.bebe.nome, idadeDe(item, agora))

/**
 * O bebê ativo quando a conta tem mais de um (R38-03): o texto `<nome>, <idade>` vira um botão que abre uma
 * lista de escolha de um toque. Cada item mostra `<nome>, <idade>` e, se a conta está em mais de uma
 * família, o nome da família. Os arquivados ficam num grupo depois dos ativos. Esc fecha e o foco volta ao
 * botão. A releitura nunca fecha a lista aberta.
 */
export function SeletorBebe({ ativo, bebes, agora, aoEscolher }: Props) {
  const [aberto, setAberto] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLDivElement>(null)
  const idLista = useId()
  const emVariasFamilias = new Set(bebes.map((item) => item.familia.id)).size > 1
  const ativos = bebes.filter((item) => !item.arquivado)
  const arquivados = bebes.filter((item) => item.arquivado)

  useEffect(() => {
    if (!aberto) return
    lista.current?.querySelector('button')?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setAberto(false)
      botao.current?.focus()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto])

  function escolher(id: string) {
    setAberto(false)
    aoEscolher(id)
  }

  const item = (candidato: BebeAtivo) => (
    <li key={candidato.bebe.id}>
      <button
        type="button"
        aria-current={candidato.bebe.id === ativo.bebe.id ? 'true' : undefined}
        className={`alvo-toque flex w-full items-center rounded-campo px-3 text-left text-[17px] leading-[25px] font-medium not-italic hover:bg-(--cor-papel-fundo) ${ALVO_APP}`}
        onClick={() => escolher(candidato.bebe.id)}
      >
        {emVariasFamilias
          ? `${linhaDe(candidato, agora)}${SELETOR.daFamilia(candidato.familia.nome)}`
          : linhaDe(candidato, agora)}
      </button>
    </li>
  )

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls={aberto ? idLista : undefined}
        className="alvo-toque inline-flex items-center gap-2 underline decoration-[1.5px] underline-offset-4 hover:decoration-2"
        onClick={() => setAberto(!aberto)}
      >
        <span>{linhaDe(ativo, agora)}</span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
      </button>
      {aberto ? (
        <div
          ref={lista}
          id={idLista}
          role="group"
          aria-label={SELETOR.rotulo}
          className="mt-2 max-w-[28rem] rounded-cartao border border-(--cor-fio-suave) bg-(--cor-cartao) p-2 not-italic [box-shadow:var(--sombra-flutuante)]"
        >
          <ul>{ativos.map(item)}</ul>
          {arquivados.length > 0 ? (
            <>
              <p className="px-3 pt-3 pb-1 text-[15px] leading-[22px] font-medium text-(--cor-texto-2)">{SELETOR.arquivados}</p>
              <ul>{arquivados.map(item)}</ul>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
