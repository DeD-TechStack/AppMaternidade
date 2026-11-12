import { Link } from 'react-router'
import { T } from '../../conteudo/desenvolvimento/textosLogada.ts'
import { Etiqueta } from '../base/Etiqueta.tsx'
import { ArtigoDeConteudo } from './ArtigoDeConteudo.tsx'
import { ABERTURA_DAS_IDEIAS, rotaDoItem, type ItemDeConteudo } from './itens.ts'

const CARTAO =
  'alvo-toque flex flex-col gap-1 rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-5 no-underline ' +
  'hover:border-[var(--cor-texto)]'

const SEM_FASE_ATUAL: ReadonlySet<string> = new Set()

/**
 * Uma seção esvaziada pela publicação (DES-06, item 5) não some: mantém o `h2` e diz, uma vez, que o conteúdo
 * está em revisão (T-50).
 */
function EmRevisao() {
  return (
    <p data-em-revisao="" className="m-0 max-w-[65ch] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium">
      {T.emRevisao}
    </p>
  )
}

/**
 * "Todas as fases" (T-04): um link para cada fase publicada, na ordem do rascunho. A fase de hoje leva a
 * etiqueta "nesta fase" (T-37), em texto: o destaque nunca é só cor. Sem bebê, nenhuma fase é a de hoje.
 */
export function TodasAsFases({
  fases,
  atuais = SEM_FASE_ATUAL,
}: {
  fases: readonly ItemDeConteudo[]
  atuais?: ReadonlySet<string>
}) {
  return (
    <section aria-labelledby="desenv-todas-as-fases" data-todas-as-fases="" className="flex flex-col gap-3">
      <h2 id="desenv-todas-as-fases" className="cm-h4">
        {T.todasAsFases}
      </h2>
      {fases.length === 0 ? (
        <EmRevisao />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {fases.map((fase) => (
            <li key={fase.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Link
                to={rotaDoItem(fase.id)}
                aria-current={atuais.has(fase.id) ? 'true' : undefined}
                className="alvo-toque inline-flex items-center font-medium text-[var(--cor-link)] underline decoration-[1.5px] underline-offset-4 hover:decoration-2"
              >
                {fase.titulo}
              </Link>
              {atuais.has(fase.id) ? <Etiqueta>{T.nestaFase}</Etiqueta> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * "Ideias para brincar nesta fase" (T-03): a seção fica sempre, com o `h2`. Com itens, a frase de abertura e
 * cada um inteiro, com título em `h3`. Sem itens (tudo recolhido), só T-50. Com o nascimento depois de hoje,
 * T-66 ocupa o lugar dos itens por fase e ficam só as ideias que valem para todas.
 */
export function IdeiasDaFase({ itens, nascimentoDepoisDeHoje = false }: { itens: readonly ItemDeConteudo[]; nascimentoDepoisDeHoje?: boolean }) {
  return (
    <section id="ideias" aria-labelledby="desenv-ideias" data-ideias="" className="scroll-mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="desenv-ideias" className="cm-h3">
          {T.ideias}
        </h2>
        {itens.length > 0 ? <p className="m-0 max-w-[65ch] text-[var(--cor-texto-2)]">{ABERTURA_DAS_IDEIAS}</p> : null}
      </div>
      {nascimentoDepoisDeHoje ? (
        <p
          role="status"
          data-aviso-estado="nascimento-futuro"
          className="m-0 max-w-[65ch] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere"
        >
          {T.nascimentoDepoisDeHoje}
        </p>
      ) : null}
      {itens.length === 0 ? (
        <EmRevisao />
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-x-12">
          {itens.map((item) => (
            <ArtigoDeConteudo key={item.id} item={item} nivel="secao" />
          ))}
        </div>
      )}
    </section>
  )
}

/** "Para ler" (T-02): os artigos (tummy time e marcos), um cartão de link com o resumo de cada um. */
export function ParaLer({ artigos }: { artigos: readonly ItemDeConteudo[] }) {
  return (
    <section aria-labelledby="desenv-para-ler" data-para-ler="" className="flex flex-col gap-4">
      <h2 id="desenv-para-ler" className="cm-h3">
        {T.paraLer}
      </h2>
      {artigos.length === 0 ? (
        <EmRevisao />
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
          {artigos.map((artigo) => (
            <li key={artigo.id}>
              <Link to={rotaDoItem(artigo.id)} className={`${CARTAO} h-full`}>
                <span className="cm-h4">{artigo.titulo}</span>
                {artigo.resumo ? <span className="text-[var(--cor-texto-2)]">{artigo.resumo}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
