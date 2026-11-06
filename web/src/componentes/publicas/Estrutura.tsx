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

/** Um campo de cor: só frases curtas e imagem. O texto longo fica no papel. */
export function CampoDeCor({ campo, className = '', children }: { campo: Campo; className?: string; children: ReactNode }) {
  return (
    <section
      data-campo={campo}
      className={`entrada mt-4 px-6 py-10 @min-[46rem]/publica:px-12 @min-[46rem]/publica:py-14 ${className}`}
    >
      {children}
    </section>
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
 * Em página estreita o parágrafo vem abaixo do aparelho; a partir de 64 rem fica à direita dele.
 */
export function CampoComAparelho({ campo, secao, aparelho, children }: PropsDoCampoComAparelho) {
  return (
    <CampoDeCor campo={campo}>
      <Titulo2 secao={secao} />
      <div className="mt-10 flex flex-col items-center gap-10 @min-[64rem]/publica:flex-row @min-[64rem]/publica:gap-16">
        <div className="flex-none">{aparelho}</div>
        <div className="flex w-full max-w-[65ch] min-w-0 flex-col gap-4 @min-[64rem]/publica:flex-1">{children}</div>
      </div>
    </CampoDeCor>
  )
}
