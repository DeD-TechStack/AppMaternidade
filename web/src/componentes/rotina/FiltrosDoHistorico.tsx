import { HISTORICO, ROTULO_TIPO } from '../../conteudo/rotina.ts'
import type { TipoRegistro } from '../../dados/rotina.tipos.ts'
import { Botao } from '../base/Botao.tsx'
import { ALVO_APP } from '../app/alvo.ts'
import { IconeDoTipo } from './IconeDoTipo.tsx'
import { CHAVES_DO_FILTRO } from './parametrosHistorico.ts'

interface Props {
  /** Os tipos ligados: nunca vazio. */
  tipos: readonly TipoRegistro[]
  aoMudar: (tipos: TipoRegistro[]) => void
}

/**
 * Os filtros do dia (R38-20): um botão alternável por tipo (`aria-pressed`) e `Todos`. `Todos` liga todos. Com todos
 * ligados, o primeiro toque num tipo deixa só ele (QA-05); com a seleção parcial, tocar liga ou desliga a pertença, e
 * desligar o último ligado volta a `Todos` (nunca há zero tipos).
 */
export function FiltrosDoHistorico({ tipos, aoMudar }: Props) {
  const todos = tipos.length === CHAVES_DO_FILTRO.length

  function alternar(tipo: TipoRegistro) {
    if (todos) {
      aoMudar([tipo])
      return
    }
    const ligado = tipos.includes(tipo)
    const proximos = ligado ? tipos.filter((candidato) => candidato !== tipo) : [...tipos, tipo]
    aoMudar(proximos.length === 0 ? [...CHAVES_DO_FILTRO] : CHAVES_DO_FILTRO.filter((chave) => proximos.includes(chave)))
  }

  return (
    <div role="group" aria-label={HISTORICO.filtros} className="flex flex-wrap gap-2" data-filtros="">
      <Botao
        variante={todos ? 'primario' : 'contorno'}
        tamanho="app"
        className={ALVO_APP}
        aria-pressed={todos}
        onClick={() => aoMudar([...CHAVES_DO_FILTRO])}
      >
        {HISTORICO.todos}
      </Botao>
      {CHAVES_DO_FILTRO.map((tipo) => {
        const ligado = tipos.includes(tipo)
        return (
          <Botao
            key={tipo}
            variante={ligado ? 'primario' : 'contorno'}
            tamanho="app"
            className={ALVO_APP}
            aria-pressed={ligado}
            icone={<IconeDoTipo tipo={tipo} className="size-5" />}
            onClick={() => alternar(tipo)}
          >
            {ROTULO_TIPO[tipo]}
          </Botao>
        )
      })}
    </div>
  )
}
