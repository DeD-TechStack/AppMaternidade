import { useEffect, useState } from 'react'
import { CONTA } from '../../conteudo/conta.ts'

/** Cada entrada: o `id` do título da seção (a âncora) e o texto do link. */
type SecaoDoIndice = readonly [id: string, rotulo: string]

/**
 * O índice das seções da Conta, sem sublinhado. A partir de 64 rem é um painel de mel preso (`sticky`)
 * na coluna da esquerda, com a seção que está à vista marcada em cacau; abaixo disso é uma fileira de
 * abas em pílula, que rola de lado dentro dela mesma. A seção da vez leva `aria-current="true"`.
 */
export function IndiceDaConta({ secoes }: { secoes: readonly SecaoDoIndice[] }) {
  const [ativa, setAtiva] = useState<string>(secoes[0][0])

  // A seção que cruza uma faixa perto do alto da janela é a da vez. Sem `IntersectionObserver` (o jsdom),
  // fica a primeira.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue
          const titulo = entrada.target.getAttribute('aria-labelledby')
          if (titulo) setAtiva(titulo)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const [id] of secoes) {
      const secao = document.getElementById(id)?.closest('section')
      if (secao) observador.observe(secao)
    }
    return () => observador.disconnect()
  }, [secoes])

  return (
    <nav
      aria-label={CONTA.indice}
      className="lg:sticky lg:top-[calc(var(--cm-cabecalho)+16px)] lg:self-start lg:rounded-painel lg:bg-[var(--color-mel)] lg:p-4 lg:text-[var(--color-cacau)]"
    >
      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {secoes.map(([id, rotulo]) => {
          const daVez = id === ativa
          return (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                aria-current={daVez ? 'true' : undefined}
                className={
                  'alvo-toque inline-flex w-full items-center rounded-pilula px-4 font-medium no-underline whitespace-nowrap ' +
                  'border-[1.5px] focus-visible:outline-[var(--color-cacau)] ' +
                  (daVez
                    ? 'border-[var(--cor-texto)] bg-[var(--cor-texto)] text-[var(--cor-fundo)] lg:border-[var(--color-cacau)] lg:bg-[var(--color-cacau)] lg:text-[var(--color-papel)]'
                    : 'border-[var(--cor-fio-suave)] lg:border-transparent lg:hover:border-[var(--color-cacau)]')
                }
              >
                {rotulo}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
