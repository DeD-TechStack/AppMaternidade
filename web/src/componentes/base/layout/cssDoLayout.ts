// Apoio dos testes das primitivas de layout. O jsdom não calcula CSS de arquivo, então, como os testes da
// casca (teste/casca.test.tsx), os testes leem `layout.css` (o texto do arquivo) e conferem as regras no
// texto, com a conta feita no teste. Só os testes importam este arquivo. A leitura usa o módulo `node:fs`
// pelo `process` (o tsconfig do app não tem os tipos do Node) e não o `?raw` do Vite, que o plugin do
// Tailwind transforma e devolve vazio no Vitest.

interface RegraDeCss {
  seletor: string
  corpo: string
}

interface ProcessoComFs {
  cwd(): string
  getBuiltinModule(id: 'node:fs'): { readFileSync(caminho: string, codificacao: 'utf8'): string }
}

const SEM_COMENTARIOS = /\/\*[\s\S]*?\*\//g

const processo = (globalThis as unknown as { process: ProcessoComFs }).process

export const cssDoLayout = processo
  .getBuiltinModule('node:fs')
  .readFileSync(`${processo.cwd()}/src/componentes/base/layout/layout.css`, 'utf8')
  .replace(SEM_COMENTARIOS, '')

const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ')

/** As regras de nível mais baixo (sem bloco dentro) de um trecho de CSS. */
export function regrasDe(texto: string): RegraDeCss[] {
  return [...texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ seletor: normalizar(m[1]), corpo: m[2] }))
}

/** O que há dentro das chaves do primeiro bloco que começa em `abertura` (por exemplo `@media (min-width: 1024px)`). */
export function blocoDe(texto: string, abertura: string): string | null {
  const inicio = texto.indexOf(abertura)
  if (inicio < 0) return null
  const primeiraChave = texto.indexOf('{', inicio)
  let fundo = 1
  for (let i = primeiraChave + 1; i < texto.length; i += 1) {
    if (texto[i] === '{') fundo += 1
    if (texto[i] === '}') fundo -= 1
    if (fundo === 0) return texto.slice(primeiraChave + 1, i)
  }
  return null
}

/** Os corpos das regras cujo seletor (um dos separados por vírgula) é exatamente `seletor`, juntos. */
export function corpoDe(seletor: string, texto: string = cssDoLayout): string {
  return regrasDe(texto)
    .filter((regra) => regra.seletor.split(',').some((parte) => normalizar(parte) === seletor))
    .map((regra) => regra.corpo)
    .join('\n')
}

/** Todas as condições `@media (...)` do arquivo, sem a palavra `@media`. */
export function condicoesDeMedia(texto: string = cssDoLayout): string[] {
  return [...texto.matchAll(/@media\s*([^{]+)\{/g)].map((m) => normalizar(m[1]))
}

/** Diz se o corpo declara `propriedade: valor` (espaços ignorados). */
export function declara(corpo: string, propriedade: string, valor: string): boolean {
  const declaracoes = corpo
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':')
      return [d.slice(0, i).trim(), normalizar(d.slice(i + 1))] as const
    })
  return declaracoes.some(([p, v]) => p === propriedade && v === valor)
}
