import { describe, expect, it } from 'vitest'
import { frasesSoltas } from './frasesSoltas.ts'

const frase = 'Este texto precisa ir para o conteúdo'
const classes = 'text-corpo min-[900px]:text-abertura'

describe('MAT-44 A3: detector de texto de interface', () => {
  it.each([
    `const C = '${classes}'; const A = <p className={C} />`,
    `const A = <p className={ok ? '${classes}' : 'text-corpo'} />`,
    `const A = <p className={\`flex \${ok ? '${classes}' : ''}\`} />`,
    `const montar = (c: string) => <p className={c} />; montar('${classes}')`,
    `import { CartaoDaSessao as Cartao } from './hoje/CartaoDaSessao.tsx'; const montar = (c: string) => <Cartao classe={c} />; montar('${classes}')`,
    `<p className="${classes}" aria-label="Seções da página" />`,
  ])('não confunde uma classe com texto: %s', (texto) => {
    expect(frasesSoltas(texto)).toEqual([])
  })

  it.each([
    `const LEGENDA = '${frase}'`,
    `<p>{'${frase}'}</p>`,
    `const montar = (c: string) => <p>{c}</p>; montar('${frase}')`,
    `const C = '${frase}'; const A = <p className={C}>{C}</p>`,
    `const C = '${frase}'; function f(C: string) { return <p className={C} /> }`,
    `const montar = (c: string, t: string) => <p className={c}>{t}</p>; montar('${classes}', '${frase}')`,
    `const montar = (c: string) => <OutroCartao classe={c} />; montar('${frase}')`,
  ])('continua achando texto de interface: %s', (texto) => {
    expect(frasesSoltas(texto)).toEqual([frase])
  })
})
