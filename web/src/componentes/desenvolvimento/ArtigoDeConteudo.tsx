import { useId, type Ref } from 'react'
import { Link } from 'react-router'
import { T } from '../../conteudo/desenvolvimento/textosLogada.ts'
import { LINK_ALVO } from '../conta/Partes.tsx'
import type { BlocoDoCorpo, ItemDeConteudo } from './itens.ts'

interface Props {
  item: ItemDeConteudo
  /** `pagina`: o título é o `h1` e os subtítulos e "Fontes" são `h2`. `secao`: `h3`, `h4` e `h4` (DES-06, item 2). */
  nivel: 'pagina' | 'secao'
  /** O `h1` da rota recebe o foco por programa quando a tela muda. */
  refDoTitulo?: Ref<HTMLHeadingElement>
}

const MEDIDA = 'max-w-[65ch]'

/** O aviso de saúde T-62: texto, acima do corpo, em todo item visível. */
function AvisoDeSaudeDoItem() {
  return (
    <p
      role="note"
      className={`${MEDIDA} rounded-campo border border-[var(--cor-fio-suave)] bg-[var(--cor-papel-fundo)] px-4 py-3 text-[15px] leading-[22px]`}
      data-aviso-de-saude=""
    >
      {T.avisoDeSaude}
    </p>
  )
}

/** A tabela do item 1: sempre uma `<table>`, dentro de uma região rolável com nome (T-61). */
function TabelaDoCorpo({ colunas, linhas }: { colunas: readonly string[]; linhas: ReadonlyArray<readonly string[]> }) {
  return (
    <div
      role="region"
      aria-label={T.tabela}
      // Região rolável com foco do teclado: quem não tem mouse precisa poder rolar a tabela.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="alvo-foco max-w-full overflow-x-auto rounded-campo border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]"
    >
      <table className="w-full min-w-[34rem] border-collapse text-left text-[15px] leading-[22px]">
        <thead>
          <tr className="border-b border-[var(--cor-fio-suave)]">
            {colunas.map((coluna) => (
              <th key={coluna} scope="col" className="px-4 py-3 font-semibold">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map(([cabeca, ...celulas]) => (
            <tr key={cabeca} className="border-b border-[var(--cor-fio-suave)] align-top last:border-b-0">
              <th scope="row" className="px-4 py-3 font-medium">
                {cabeca}
              </th>
              {celulas.map((celula, indice) => (
                <td key={colunas[indice + 1]} className="px-4 py-3">
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Corpo({ item, nivel }: { item: ItemDeConteudo; nivel: Props['nivel'] }) {
  const Subtitulo = nivel === 'pagina' ? 'h2' : 'h4'
  return (
    <div data-corpo-conteudo={item.id} className="flex flex-col gap-4">
      {item.corpo.map((bloco: BlocoDoCorpo, indice) => {
        if (bloco.tipo === 'subtitulo') {
          return (
            <Subtitulo key={indice} className="cm-h4 mt-4 first:mt-0">
              {bloco.texto}
            </Subtitulo>
          )
        }
        if (bloco.tipo === 'paragrafo') {
          return (
            <p key={indice} className={MEDIDA}>
              {bloco.texto}
            </p>
          )
        }
        if (bloco.tipo === 'lista') {
          return (
            <ul key={indice} className={`${MEDIDA} m-0 flex list-disc flex-col gap-3 pl-6`}>
              {bloco.itens.map((linha) => (
                <li key={linha}>{linha}</li>
              ))}
            </ul>
          )
        }
        return <TabelaDoCorpo key={indice} colunas={bloco.colunas} linhas={bloco.linhas} />
      })}
    </div>
  )
}

/** As fontes do item: o título como link para a página da fonte (em aba nova) e a data da consulta. */
function Fontes({ item, nivel }: { item: ItemDeConteudo; nivel: Props['nivel'] }) {
  const titulo = useId()
  const Titulo = nivel === 'pagina' ? 'h2' : 'h4'
  // Na página principal há uma "Fontes" por item: um `<section>` nomeado repetido seria um marco repetido
  // (axe `landmark-unique`). Dentro da seção de ideias, a lista vira um grupo com nome; na rota do item,
  // que tem uma só, segue como seção.
  const Raiz = nivel === 'pagina' ? 'section' : 'div'
  return (
    <Raiz
      aria-labelledby={titulo}
      role={nivel === 'pagina' ? undefined : 'group'}
      data-fontes=""
      className="flex flex-col gap-2"
    >
      <Titulo id={titulo} className="cm-h4">
        {T.fontes}
      </Titulo>
      <ol className={`${MEDIDA} m-0 flex list-none flex-col gap-1 p-0`}>
        {item.fontes.map((fonte, indice) => (
          <li key={fonte.url} id={`${item.id}-fonte-${indice + 1}`} className="flex flex-col">
            <a href={fonte.url} target="_blank" rel="noopener noreferrer" className={`${LINK_ALVO} wrap-anywhere`}>
              {fonte.nome}
            </a>
            <span className="cm-pequeno cm-texto-2">{T.consultadaEm}</span>
          </li>
        ))}
      </ol>
    </Raiz>
  )
}

/**
 * Um item de conteúdo inteiro (DES-06): título, aviso de saúde T-62, metadados T-34, o corpo marcado com
 * `data-corpo-conteudo`, as fontes e o canal de contato T-35. Serve à rota do item e à página principal.
 */
export function ArtigoDeConteudo({ item, nivel, refDoTitulo }: Props) {
  const idDoTitulo = useId()
  const [antes, depois] = T.erroNoConteudo
  return (
    <article
      aria-labelledby={idDoTitulo}
      data-item={item.id}
      className="flex flex-col gap-5 text-[17px] leading-[25px]"
    >
      {nivel === 'pagina' ? (
        <h1 id={idDoTitulo} ref={refDoTitulo} tabIndex={-1} className="cm-h2 alvo-foco wrap-anywhere">
          {item.titulo}
        </h1>
      ) : (
        <h3 id={idDoTitulo} className="cm-h3 wrap-anywhere">
          {item.titulo}
        </h3>
      )}
      <AvisoDeSaudeDoItem />
      <p className="cm-pequeno cm-texto-2 max-w-[65ch]" data-metadados="">
        {T.metadados}
      </p>
      <Corpo item={item} nivel={nivel} />
      <Fontes item={item} nivel={nivel} />
      <p className="flex flex-wrap items-center text-[15px] leading-[22px]">
        <span className="mr-1">{antes}</span>
        <Link to="/contato" className={LINK_ALVO}>
          {T.contato}
        </Link>
        <span>{depois}</span>
      </p>
    </article>
  )
}
