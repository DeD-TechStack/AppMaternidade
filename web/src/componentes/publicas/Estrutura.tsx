import type { ReactNode } from 'react'
import type { Secao } from '../../conteudo/publicas.ts'

// As peças de estrutura das 9 páginas novas. O <main> é o contêiner "publica" (consultas em rem da
// largura da página, não da janela): as colunas seguem a largura dele, também com a fonte ampliada.
// O cabeçalho e o rodapé têm contêiner próprio e não usam o contêiner "pagina" do Início.

/** O <main> de uma página nova. Só tem <section> como filhos diretos. */
export function PaginaPublica({ leitura = false, children }: { leitura?: boolean; children: ReactNode }) {
  const base = '@container/publica px-4 pb-16 md:px-[2%]'
  if (leitura) {
    // Texto jurídico: coluna de leitura de 44 rem (704 px), centrada, com a margem lateral de sempre.
    return (
      <main data-leitura="" className={`${base} mx-auto w-full max-w-[44rem]`}>
        {children}
      </main>
    )
  }
  return <main className={base}>{children}</main>
}

/**
 * O título de uma seção. Tem id (`secao-<slug>`) para os links-âncora e tabindex="-1" para a
 * navegação levar o foco até ele; o contorno extra de foco por código fica de fora.
 */
export function Titulo2({ secao, className = '' }: { secao: Secao; className?: string }) {
  return (
    <h2 id={secao.id} tabIndex={-1} className={`titulo-secao focus:outline-none ${className}`}>
      {secao.titulo}
    </h2>
  )
}

interface PropsDaAbertura {
  titulo: string
  /** O que vai logo abaixo do h1, na mesma coluna. */
  abaixoDoTitulo?: ReactNode
  /** A coluna da direita (no desktop): avisos e o parágrafo de apresentação. */
  children: ReactNode
}

/**
 * A primeira seção: o h1 grande à esquerda e, à direita, o que o apresenta. Em página estreita
 * tudo vai em uma coluna, na ordem do DOM. Sem nenhum h2.
 */
export function Abertura({ titulo, abaixoDoTitulo, children }: PropsDaAbertura) {
  return (
    <section className="entrada grid grid-cols-1 gap-x-6 gap-y-8 pb-10 pt-8 @min-[46rem]/publica:grid-cols-12 @min-[46rem]/publica:pb-14 @min-[46rem]/publica:pt-12">
      <div className="@min-[46rem]/publica:col-span-8 @min-[46rem]/publica:self-end">
        <h1
          tabIndex={-1}
          className="promessa [font-size:clamp(2.25rem,6vw,4rem)] focus:outline-none"
        >
          {titulo}
        </h1>
        {abaixoDoTitulo}
      </div>
      <div className="flex flex-col gap-4 @min-[46rem]/publica:col-span-4 @min-[46rem]/publica:self-end">
        {children}
      </div>
    </section>
  )
}

interface PropsDaSecaoDePapel {
  secao: Secao
  /** Bloco de linhas: o título à esquerda e o texto à direita (no desktop). Sem ele, o título vai acima. */
  bloco?: boolean
  /** Classes do contêiner do texto. */
  corpo?: string
  children: ReactNode
}

/** Uma faixa de papel: o texto longo mora aqui. */
export function SecaoDePapel({ secao, bloco = true, corpo = 'flex flex-col gap-4', children }: PropsDaSecaoDePapel) {
  if (!bloco) {
    return (
      <section className="secao-papel entrada py-10 @min-[46rem]/publica:py-12">
        <Titulo2 secao={secao} />
        <div className={`mt-5 ${corpo}`}>{children}</div>
      </section>
    )
  }
  return (
    <section className="secao-papel entrada py-10 @min-[46rem]/publica:py-14">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 @min-[46rem]/publica:grid-cols-12">
        <Titulo2 secao={secao} className="@min-[46rem]/publica:col-span-4" />
        <div className={`${corpo} min-w-0 @min-[46rem]/publica:col-span-8 @min-[46rem]/publica:border-l @min-[46rem]/publica:pl-6`}>
          {children}
        </div>
      </div>
    </section>
  )
}

type Campo = 'accent' | 'field-1' | 'field-2'

/**
 * Um campo de cor: só frases curtas e imagem. O texto longo fica no papel. Em computador (a partir de
 * 64 rem de página) o campo tem altura mínima de 30 rem, perto de metade da janela de 900 px, como o
 * DESIGN.md pede (entre 1/2 e 1 vez a altura da janela), e o conteúdo fica no meio da altura, com
 * respiro generoso. Em página estreita a altura é a do conteúdo.
 */
export function CampoDeCor({ campo, className = '', children }: { campo: Campo; className?: string; children: ReactNode }) {
  return (
    <section
      data-campo={campo}
      className={`entrada mt-4 px-6 py-10 @min-[46rem]/publica:px-12 @min-[46rem]/publica:py-14 @min-[64rem]/publica:flex @min-[64rem]/publica:min-h-[30rem] @min-[64rem]/publica:flex-col @min-[64rem]/publica:justify-center @min-[64rem]/publica:py-16 ${className}`}
    >
      {children}
    </section>
  )
}

interface PropsDoCampoComIlustracao {
  campo: Campo
  secao: Secao
  /** A ilustração, em escala pequena em relação ao campo (largura em rem, cerca de metade da altura). */
  ilustracao: ReactNode
  /** A figura à esquerda e o texto à direita (em computador); sem isso, o texto à esquerda. */
  figuraAEsquerda?: boolean
  /** O que vai abaixo do h2, na coluna do texto. */
  children: ReactNode
}

/**
 * Campo de cor com uma ilustração: duas colunas assimétricas (texto de um lado, figura do outro) e,
 * em página estreita, o texto e depois a figura. O h2 abre a coluna do texto, que é alinhada à esquerda.
 */
export function CampoComIlustracao({ campo, secao, ilustracao, figuraAEsquerda = false, children }: PropsDoCampoComIlustracao) {
  const colunaDoTexto = figuraAEsquerda
    ? '@min-[46rem]/publica:col-span-6 @min-[46rem]/publica:col-start-7 @min-[46rem]/publica:row-start-1'
    : '@min-[46rem]/publica:col-span-6'
  const colunaDaFigura = figuraAEsquerda
    ? '@min-[46rem]/publica:col-span-6 @min-[46rem]/publica:col-start-1 @min-[46rem]/publica:row-start-1'
    : '@min-[46rem]/publica:col-span-6'
  return (
    <CampoDeCor campo={campo}>
      <div className="grid grid-cols-1 items-center gap-10 @min-[46rem]/publica:grid-cols-12 @min-[46rem]/publica:gap-x-6">
        <div className={`flex flex-col gap-5 ${colunaDoTexto}`}>
          <Titulo2 secao={secao} className="[font-size:clamp(2rem,4vw,3rem)]" />
          {children}
        </div>
        <div className={`flex justify-center ${colunaDaFigura}`}>{ilustracao}</div>
      </div>
    </CampoDeCor>
  )
}

interface PropsDoCampoComAparelho {
  campo: Campo
  secao: Secao
  /** O aparelho (celular ou notebook) em miniatura. */
  aparelho: ReactNode
  /** O parágrafo que diz o que ele mostra. */
  children: ReactNode
}

/**
 * Campo com uma composição de aparelho: o h2 em cima e, abaixo dele, o aparelho e o parágrafo.
 * Em página estreita o parágrafo vem abaixo do aparelho. A partir de 64 rem o grupo (título,
 * aparelho e texto) tem a largura do que contém e fica centrado no campo; o parágrafo fica à direita
 * do aparelho, numa coluna estreita de 22 rem colada a ele e alinhada ao topo dele, sem vazio no meio.
 * O aparelho cresce nesse tamanho de página (ver .palco em index.css).
 */
export function CampoComAparelho({ campo, secao, aparelho, children }: PropsDoCampoComAparelho) {
  return (
    <CampoDeCor campo={campo}>
      <div className="mx-auto w-full @min-[64rem]/publica:w-fit">
        <Titulo2 secao={secao} className="[font-size:clamp(2rem,4vw,3rem)]" />
        <div className="mt-10 flex flex-col items-center gap-10 @min-[64rem]/publica:flex-row @min-[64rem]/publica:items-start @min-[64rem]/publica:gap-10">
          <div className="flex-none">{aparelho}</div>
          <div className="flex w-full max-w-[65ch] min-w-0 flex-col gap-4 @min-[64rem]/publica:w-[22rem] @min-[64rem]/publica:flex-none">
            {children}
          </div>
        </div>
      </div>
    </CampoDeCor>
  )
}
