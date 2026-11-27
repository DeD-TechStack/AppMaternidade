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

  const consulta = '(min-width: 69em) and (min-aspect-ratio: 1/1)'
  const medidas = '(min-width: 69em) 360px, 300px'
  const costura = 'calc(50% + 310px)'
  const telefone = `import { Telefone as Fone } from '../componentes/inicio-composicao/pecas.tsx';`
  const faixa = `import { FaixaInteira as Faixa } from '../componentes/secoes/FaixaInteira.tsx';`

  it.each([
    `${telefone} const M = '${consulta}'; <><source media={M} /><Fone sizes={\`\${M} 360px, 64vw\`} /></>`,
    `<source sizes="${medidas}" />`,
    `import { Telefone } from '../../componentes/inicio-composicao/pecas.tsx'; <Telefone sizes="${medidas}" />`,
    `${faixa} <Faixa costuraX="${costura}" />`,
    `const C = '${classes}' + ' outra'; <p className={C} />`,
  ])('reconhece valores usados só para apresentação: %s', (texto) => {
    expect(frasesSoltas(texto)).toEqual([])
  })

  it.each([
    [`const M = '${consulta}'; <><source media={M} /><p>{M}</p></>`, consulta],
    [`const C = '${classes}' + ' outra'; <p className={C}>{C}</p>`, classes],
    [`${telefone} <Fone alt="${medidas}" />`, medidas],
    [`${faixa} <Faixa>{'${costura}'}</Faixa>`, costura],
    [`import { Telefone } from './outrasPecas.tsx'; <Telefone sizes="${frase}" />`, frase],
    [`function FaixaInteira() {} <FaixaInteira costuraX="${frase}" />`, frase],
    [`const M = '${frase}'; <source media={M} />; mostrar({ M })`, frase],
    [`const M = '${frase}'; <source media={M} />; export { M }`, frase],
  ])('não dispensa texto pelo formato, pelo nome da prop ou por ter uso misto: %s', (texto, esperado) => {
    expect(frasesSoltas(texto)).toEqual([esperado])
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
