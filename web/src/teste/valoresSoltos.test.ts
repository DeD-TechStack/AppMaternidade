import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ESLint, type Linter } from 'eslint'
import stylelint from 'stylelint'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// H3:RF-03 da SPEC_H3 (cartão H-3g): as duas ferramentas de lint da harmonia são bloqueantes. Este arquivo
//  1. varre web/src atrás de `style={{ margin|padding|gap|fontSize|lineHeight }}` em .tsx de produto;
//  2. dá a prova vermelha de cada ferramenta (ESLint Node API e stylelint.lint), com controles negativos;
//  3. prova o mecanismo das exceções com listas EM MEMÓRIA (nunca o arquivo real);
//  4. confere o arquivo real harmonia-excecoes.json (no máximo 30 entradas, todas com arquivo, alvo e motivo).
// Nenhum teste de lint aqui depende de a árvore de produto estar limpa: eles lintam texto.
// O Vitest roda em web/ (o mesmo cwd dos dois arquivos de config).
vi.setConfig({ testTimeout: 60_000 })

const pastaWeb = process.cwd()
const pastaSrc = join(pastaWeb, 'src')

interface Excecao {
  arquivo: string
  alvo: string
  motivo: string
}

// ---------- 1. style={{}} ----------

const CHAVE_DE_ESPACO_OU_TIPO = /^(?:(?:margin|padding)[\w-]*|gap|rowGap|columnGap|row-gap|column-gap|fontSize|font-size|lineHeight|line-height)$/

// O objeto de `style={...}` sem parênteses, `as` e `satisfies`, ou `null` se a expressão não é um objeto literal.
function objetoDoStyle(expressao: ts.Expression): ts.ObjectLiteralExpression | null {
  let atual = expressao
  while (ts.isParenthesizedExpression(atual) || ts.isAsExpression(atual) || ts.isSatisfiesExpression(atual)) atual = atual.expression
  return ts.isObjectLiteralExpression(atual) ? atual : null
}

function nomeDaChave(nome: ts.PropertyName): string | null {
  if (ts.isIdentifier(nome) || ts.isStringLiteral(nome) || ts.isNoSubstitutionTemplateLiteral(nome)) return nome.text
  if (ts.isComputedPropertyName(nome)) {
    const dentro = nome.expression
    return ts.isStringLiteral(dentro) || ts.isNoSubstitutionTemplateLiteral(dentro) ? dentro.text : null
  }
  return null
}

// Cada `style={{ ... }}` com uma propriedade margin*, padding*, gap, fontSize ou lineHeight: a linha (1-based) da primeira.
// Lê o texto com o compilador do TypeScript: espaço e quebra de linha no JSX, texto e comentário não enganam.
function estilosSoltos(texto: string): number[] {
  const arvore = ts.createSourceFile('exemplo.tsx', texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const linhas: number[] = []
  const visitar = (no: ts.Node): void => {
    if (ts.isJsxAttribute(no) && ts.isIdentifier(no.name) && no.name.text === 'style' && no.initializer && ts.isJsxExpression(no.initializer)) {
      const objeto = no.initializer.expression ? objetoDoStyle(no.initializer.expression) : null
      for (const propriedade of objeto?.properties ?? []) {
        if (!propriedade.name) continue
        const nome = nomeDaChave(propriedade.name)
        if (nome !== null && CHAVE_DE_ESPACO_OU_TIPO.test(nome)) {
          linhas.push(arvore.getLineAndCharacterOfPosition(propriedade.getStart(arvore)).line + 1)
          break
        }
      }
    }
    ts.forEachChild(no, visitar)
  }
  visitar(arvore)
  return linhas
}

const ehTesteOuApoio = (relativo: string) => /\.test\.tsx$/.test(relativo) || /^teste[\\/]/.test(relativo)

describe('harmonia: style={{}} (H3:RF-03)', () => {
  it('a varredura acha espaço e tipo no style e ignora o resto', () => {
    expect(estilosSoltos('<div style={{ marginTop: 8 }} />')).toEqual([1])
    expect(estilosSoltos('<a>\n<b\n style={{ opacity, paddingInline: 4 }} />')).toEqual([3])
    expect(estilosSoltos("<p style={{ 'row-gap': 4 }} />")).toEqual([1])
    expect(estilosSoltos('<p style={{ fontSize: `${x}px`, lineHeight: 1 }} />')).toEqual([1])
    expect(estilosSoltos('<p style={{ opacity, width: `${largura}%`, display: "block" }} />')).toEqual([])
    expect(estilosSoltos('<p style={{ backgroundColor: `var(--color-${papel.token})` }} />')).toEqual([])
  })

  it('a varredura não depende da formatação do JSX e ignora texto e comentário', () => {
    expect(estilosSoltos('<div style = {{ marginTop: 37 }} />')).toEqual([1])
    expect(estilosSoltos('<div\n  style=\n  {{ marginTop: 37 }} />')).toEqual([3])
    expect(estilosSoltos('<div style={\n{\n  opacity: 1,\n  marginTop: 37,\n}\n} />')).toEqual([4])
    expect(estilosSoltos('<main>\n<section>\n<div style={{ padding: 4 }} />\n</section>\n</main>')).toEqual([3])
    expect(estilosSoltos('<div style={({ marginTop: 37 })} />')).toEqual([1])
    expect(estilosSoltos('<div style={{ marginTop: 37 } as CSSProperties} />')).toEqual([1])
    expect(estilosSoltos('<div style={{ marginTop: 37 } satisfies CSSProperties} />')).toEqual([1])
    expect(estilosSoltos('<div style={{ "padding-inline": 4 }} />')).toEqual([1])
    expect(estilosSoltos('<div style={{ ["row-gap"]: 4 }} />')).toEqual([1])
    expect(estilosSoltos('<div style={{ opacity: 1, width: "10%" }} />')).toEqual([])
    expect(estilosSoltos('<div style={{ backgroundColor: "var(--x)" }} />')).toEqual([])
    expect(estilosSoltos('const t = "<div style={{ marginTop: 1 }} />"')).toEqual([])
    expect(estilosSoltos("const t = '<div style={{ marginTop: 1 }} />'")).toEqual([])
    expect(estilosSoltos('// <div style={{ marginTop: 1 }} />\n/* <p style={{ gap: 2 }} /> */\nconst a = 1')).toEqual([])
  })

  it('nenhum .tsx de produto de src/ traz style={{}} com margin*, padding*, gap, fontSize ou lineHeight', () => {
    const achados: string[] = []
    for (const relativo of readdirSync(pastaSrc, { recursive: true, encoding: 'utf8' })) {
      if (!relativo.endsWith('.tsx') || ehTesteOuApoio(relativo)) continue
      const texto = readFileSync(join(pastaSrc, relativo), 'utf8')
      for (const linha of estilosSoltos(texto)) achados.push(`src/${relativo.replaceAll('\\', '/')}:${linha}`)
    }
    expect(achados, 'troque o style por um papel do web/DESIGN.md (classe esp-* ou text-<nível>)').toEqual([])
  })
})

// ---------- 2 e 3. ESLint: classes ----------

const REGRA_DE_CLASSES = 'harmonia/classes-soltas'

async function lintarClasses(codigo: string, opcoes: { excecoes?: Excecao[]; arquivo?: string } = {}): Promise<string[]> {
  const overrideConfig: Linter.Config[] = opcoes.excecoes
    ? [{ rules: { [REGRA_DE_CLASSES]: ['error', { excecoes: opcoes.excecoes }] } }]
    : []
  const eslint = new ESLint({ cwd: pastaWeb, overrideConfig })
  const [resultado] = await eslint.lintText(codigo, { filePath: opcoes.arquivo ?? 'src/exemplo.tsx' })
  return resultado.messages.filter((m) => m.ruleId === REGRA_DE_CLASSES).map((m) => m.message)
}
const jsx = (classes: string) => `export const A = () => <div className="${classes}" />\n`

describe('harmonia: ESLint de classes (H3:RF-03, parte 1)', () => {
  it('RED: `mt-[37px]` é acusado e a mensagem nomeia o papel mais próximo (espaco-grupo)', async () => {
    const mensagens = await lintarClasses('<div className="mt-[37px]" />')
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('espaco-grupo')
    expect(mensagens[0]).toContain('mt-esp-grupo')
  })

  it('o papel mais próximo vem do valor de 1440 px, e no empate vale o menor', async () => {
    const nome = async (classe: string) => (await lintarClasses(jsx(classe)))[0]
    expect(await nome('p-[3px]')).toContain('espaco-junto')
    expect(await nome('mt-[40px]')).toContain('espaco-grupo')
    expect(await nome('-mt-[70px]')).toContain('-mt-esp-midia')
    expect(await nome('gap-[200px]')).toContain('espaco-secao-ampla')
  })

  it('forma que não é px inteiro ganha a mensagem genérica com a lista de papéis', async () => {
    for (const classe of ['gap-[2rem]', 'p-[10.5px]', 'mt-10', 'py-20', 'pl-14', 'p-3.5']) {
      const [mensagem] = await lintarClasses(jsx(classe))
      expect(mensagem, classe).toContain(`"${classe}"`)
      expect(mensagem, classe).toContain('esp-<papel>')
      expect(mensagem, classe).toContain('secao-ampla')
    }
  })

  it('acusa valor solto, passo acima de 8, tamanho e entrelinha soltos e os text-xs a text-9xl', async () => {
    const proibidas = [
      'mt-[37px]', 'p-[2rem]', 'gap-[10px]', '-mt-[5px]', 'space-y-[7px]', 'px-[calc(1rem+2px)]', 'md:py-20', 'gap-12', 'pl-14',
      'mt-10', 'p-3.5', '-mb-9', 'space-x-16', 'gap-x-11', '!mt-10', 'hover:lg:p-[3px]', 'text-[17px]', 'text-[clamp(28px,12.5cqi,52px)]',
      'leading-[20px]', 'leading-[1.2]', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-9xl', 'lg:text-sm',
    ]
    for (const classe of proibidas) expect(await lintarClasses(jsx(classe)), classe).toHaveLength(1)
  })

  it('negativos: token, passo da escala, var(), larguras e alturas passam', async () => {
    const permitidas = [
      'mt-4', '-mt-8', 'p-0', 'p-px', 'gap-0.5', 'gap-1.5', 'p-2.5', 'py-3', 'pl-5', 'mr-6', 'mb-7', 'ps-4', 'me-2', 'mx-auto', 'space-y-8',
      'gap-esp-bloco', 'mt-esp-grupo', '-mt-esp-pilha', 'px-esp-quadro-calha', 'py-esp-secao-ampla', 'p-[var(--x)]', 'mt-[calc(var(--a)*2)]',
      'p-(--x)', 'max-w-[640px]', 'max-w-leitura', 'w-[37px]', 'h-10', 'size-[7rem]', 'min-[800px]:flex', 'max-[767px]:hidden',
      'text-corpo', 'text-titulo-1', 'text-center', 'text-[color:var(--x)]', 'text-[var(--cor)]', 'text-[#fff]', 'leading-none', 'leading-[var(--e)]',
      'flex', 'inset-3', 'top-10', 'translate-y-10',
    ]
    for (const classe of permitidas) expect(await lintarClasses(jsx(classe)), classe).toEqual([])
    expect(await lintarClasses(jsx('mt-4 text-corpo gap-esp-bloco'))).toEqual([])
  })

  it('cobre cn/clsx/twMerge/cva, template, ?:, &&, array, chave de objeto e constantes ...Classe/Classes/CLASSE', async () => {
    const codigo = [
      'const a = cn("flex mt-10", cond && "gap-12", { "py-20": ativo }, ["pl-14", cond ? "p-3.5" : "p-4"])',
      'const b = clsx(`flex text-xs ${x}`, twMerge("mb-9"))',
      'const c = cva("p-[3px]", { variants: { t: { g: "text-lg" } } })',
      'const botaoClasse = "mt-11"',
      'const LISTA_CLASSES = ["pt-13"]',
      'const ESTILO_CLASSE = `pb-15 ${x}`',
      'const className = "gap-x-14"',
      'export const A = () => <div className={`flex ${y} -mt-17`} class={cn("ml-18")} />',
    ].join('\n')
    const mensagens = (await lintarClasses(codigo)).map((m) => /"([^"]+)"/.exec(m)?.[1])
    expect(mensagens.sort()).toEqual(
      ['mt-10', 'gap-12', 'py-20', 'pl-14', 'p-3.5', 'text-xs', 'mb-9', 'p-[3px]', 'text-lg', 'mt-11', 'pt-13', 'pb-15', 'gap-x-14', '-mt-17', 'ml-18'].sort(),
    )
  })

  it('alias: constante usada como classe é resolvida (literal, membro de objeto, template, cn) e acusada na definição', async () => {
    const alvo = async (codigo: string) => (await lintarClasses(codigo)).map((m) => /"([^"]+)"/.exec(m)?.[1])
    const literal = await lintarClasses('const T = "mt-[37px]"; export const A = () => <div className={T} />')
    expect(literal).toHaveLength(1)
    expect(literal[0]).toContain('espaco-grupo')
    const membro = await lintarClasses('const M = { a: "gap-12" }; export const A = () => <div className={M.a} />')
    expect(membro).toHaveLength(1)
    expect(membro[0]).toContain('"gap-12"')
    expect(await alvo('const M = { a: "gap-12" }; export const A = () => <div className={M["a"]} />')).toEqual(['gap-12'])
    const modelo = await lintarClasses('const T = "p-[3px]"; export const A = () => <div className={`flex ${T}`} />')
    expect(modelo).toHaveLength(1)
    expect(modelo[0]).toContain('espaco-junto')
    const chamada = await lintarClasses('const T = "mt-[37px]"; export const A = () => <div className={cn(T)} />')
    expect(chamada).toHaveLength(1)
    expect(chamada[0]).toContain('espaco-grupo')
    expect(await alvo('const T = "mt-[37px]"; export const A = () => <div class={T} />')).toEqual(['mt-[37px]'])
  })

  it('alias: usado em dois lugares é acusado uma vez só, e a cadeia de aliases e o objeto inteiro são seguidos', async () => {
    const alvo = async (codigo: string) => (await lintarClasses(codigo)).map((m) => /"([^"]+)"/.exec(m)?.[1])
    expect(await alvo('const T = "mt-[37px]"; export const A = () => <><div className={T} /><p className={cn(T, "flex")} /></>')).toEqual(['mt-[37px]'])
    expect(await alvo('const T = "mt-[37px]"; const U = T; export const A = () => <div className={U} />')).toEqual(['mt-[37px]'])
    expect(await alvo('const M = { a: "gap-12", b: "p-10" }; export const A = () => <div className={cn(M)} />')).toEqual(['gap-12', 'p-10'])
  })

  it('alias: sem consumidor de classe, escala permitida, import, parâmetro, chamada e ciclo não geram diagnóstico', async () => {
    expect(await lintarClasses('const n = "mt-[37px]"; console.log(n)')).toEqual([])
    expect(await lintarClasses('const T = "mt-4"; export const A = () => <div className={T} />')).toEqual([])
    expect(await lintarClasses('import { T } from "./t"; export const A = () => <div className={T} />')).toEqual([])
    expect(await lintarClasses('export const A = ({ t }: { t: string }) => <div className={t} />')).toEqual([])
    expect(await lintarClasses('const T = f("mt-[37px]"); export const A = () => <div className={T} />')).toEqual([])
    expect(await lintarClasses('const M = { a: "gap-12" }; export const A = () => <div className={M.b} />')).toEqual([])
    expect(await lintarClasses('let T = T; export const A = () => <div className={T} />')).toEqual([])
    expect(await lintarClasses('const A = B; const B = A; export const C = () => <div className={A} />')).toEqual([])
  })

  it('alias: exceção por (arquivo, alvo) dispensa a classe da constante', async () => {
    const codigo = 'const T = "mt-[37px] p-10"; export const A = () => <div className={T} />'
    expect(await lintarClasses(codigo)).toHaveLength(2)
    const excecao: Excecao = { arquivo: 'src/exemplo.tsx', alvo: 'mt-[37px]', motivo: 'teste do mecanismo' }
    const com = await lintarClasses(codigo, { excecoes: [excecao] })
    expect(com).toHaveLength(1)
    expect(com[0]).toContain('"p-10"')
    expect(await lintarClasses(codigo, { excecoes: [{ ...excecao, arquivo: 'src/outro.tsx' }] })).toHaveLength(2)
  })

  it('exceção com lista: um `alvo` com várias classes separadas por espaço dispensa cada uma delas naquele arquivo', async () => {
    const codigo = 'const T = "mt-[37px] p-[3px]"; export const A = () => <div className={T} />'
    const lista: Excecao = { arquivo: 'src/exemplo.tsx', alvo: 'mt-[37px] p-[3px]', motivo: 'teste do mecanismo' }
    expect(await lintarClasses(codigo)).toHaveLength(2)
    // (a) a lista inteira dispensa as duas classes.
    expect(await lintarClasses(codigo, { excecoes: [lista] })).toEqual([])
    // (b) a lista só com `mt-[37px]` deixa `p-[3px]` de fora: ainda é acusada.
    const parcial = await lintarClasses(codigo, { excecoes: [{ ...lista, alvo: 'mt-[37px]' }] })
    expect(parcial).toHaveLength(1)
    expect(parcial[0]).toContain('"p-[3px]"')
    // (c) outro arquivo não dispensa nada.
    expect(await lintarClasses(codigo, { excecoes: [{ ...lista, arquivo: 'src/outro.tsx' }] })).toHaveLength(2)
    // alvo sem espaço continua sendo o caso antigo (uma classe só); classe fora da lista continua acusada.
    expect(await lintarClasses(codigo, { excecoes: [{ ...lista, alvo: 'p-[3px]' }] })).toHaveLength(1)
    expect(await lintarClasses(`${codigo}\nconst U = "gap-12"; export const B = () => <p className={U} />`, { excecoes: [lista] })).toHaveLength(1)
  })

  it('pedaço de template colado a ${} não vira classe falsa', async () => {
    expect(await lintarClasses('const a = cn(`mt-${x}`, `p-1${y} ${z}text-xs`, `${w}-10`)')).toEqual([])
  })

  it('o relatório traz a linha e a coluna da classe, não só a do atributo', async () => {
    const eslint = new ESLint({ cwd: pastaWeb })
    const [resultado] = await eslint.lintText('export const A = () => (\n  <div\n    className="flex\n      mt-10"\n  />\n)\n', {
      filePath: 'src/exemplo.tsx',
    })
    const achado = resultado.messages.find((m) => m.ruleId === REGRA_DE_CLASSES)
    expect([achado?.line, achado?.column]).toEqual([4, 7])
  })

  it('só vale em src/: o mesmo texto fora de src/ não é acusado', async () => {
    expect(await lintarClasses(jsx('mt-10'), { arquivo: 'scripts/exemplo.tsx' })).toEqual([])
  })

  it('exceção (lista em memória): dispensa só o par (arquivo, alvo) igual', async () => {
    const codigo = '<div className="mt-[37px] p-10 md:mt-[37px]" />'
    const excecao: Excecao = { arquivo: 'src/exemplo.tsx', alvo: 'mt-[37px]', motivo: 'teste do mecanismo' }
    const sem = await lintarClasses(codigo)
    expect(sem).toHaveLength(3)
    const com = await lintarClasses(codigo, { excecoes: [excecao] })
    // `md:mt-[37px]` é outra classe (o alvo é a classe inteira, com a variante) e `p-10` não está na lista.
    expect(com).toHaveLength(2)
    expect(com.join(' ')).toContain('"p-10"')
    expect(com.join(' ')).toContain('"md:mt-[37px]"')
    expect(com.join(' ')).not.toContain('"mt-[37px]"')
    const outroArquivo = await lintarClasses(codigo, { excecoes: [{ ...excecao, arquivo: 'src/outro.tsx' }] })
    expect(outroArquivo).toHaveLength(3)
    const todas = await lintarClasses(codigo, {
      excecoes: ['mt-[37px]', 'p-10', 'md:mt-[37px]'].map((alvo) => ({ arquivo: 'src/exemplo.tsx', alvo, motivo: 'teste do mecanismo' })),
    })
    expect(todas).toEqual([])
  })
})

// ---------- 2 e 3. stylelint: CSS ----------

const NOME_CSS = 'harmonia/valores-soltos'

async function lintarCss(codigo: string, opcoes: { excecoes?: Excecao[]; arquivo?: string } = {}): Promise<string[]> {
  const arquivo = join(pastaWeb, opcoes.arquivo ?? 'src/exemplo.css')
  const config = join(pastaWeb, 'stylelint.config.mjs')
  const resultado = await stylelint.lint({
    code: codigo,
    codeFilename: arquivo,
    ...(opcoes.excecoes
      ? { config: { extends: [config], rules: { [NOME_CSS]: [true, { excecoes: opcoes.excecoes }] } } }
      : { configFile: config }),
  })
  return resultado.results.flatMap((r) => r.warnings.map((w) => w.text))
}
const regraCss = (declaracao: string) => `.x { ${declaracao} }`

describe('harmonia: stylelint de CSS (H3:RF-03, parte 2)', () => {
  it('RED: `margin-top: 37px` é acusado e a mensagem nomeia o papel mais próximo (espaco-grupo)', async () => {
    const mensagens = await lintarCss('.x { margin-top: 37px; }')
    expect(mensagens).toHaveLength(1)
    expect(mensagens[0]).toContain('espaco-grupo')
    expect(mensagens[0]).toContain('Valor solto "37px" em "margin-top"')
  })

  it('acusa rem, px acima de 32, px abaixo de 1, função com número solto e tipo fora dos tokens', async () => {
    const proibidas = [
      'margin-top: 37px', 'margin: 0 2rem', 'padding: 33px', 'padding-block: 0.5px', 'margin-inline: -40px', 'gap: 1rem', 'row-gap: 12vw',
      'column-gap: calc(10px + var(--espaco-pilha))', 'margin-block: -0.59375rem', 'padding: clamp(8px, 2vw, 40px)', 'margin-top: calc(100% - 20px)',
      'padding-left: calc(var(--espaco-bloco) * 1.5rem)', 'padding: calc(2rem / var(--n))',
      'font-size: 1rem', 'font-size: 15px', 'font-size: clamp(40px, 2.286vw + 31.086px, 64px)', 'font-size: var(--outra)',
      'font-size: calc(100cqi / 7.966)', 'line-height: 1.5', 'line-height: 22px', 'line-height: normal', 'line-height: var(--l)',
    ]
    for (const declaracao of proibidas) expect(await lintarCss(regraCss(`${declaracao};`)), declaracao).toHaveLength(1)
  })

  it('a mensagem de forma que não é px diz os papéis e o que passa', async () => {
    const [mensagem] = await lintarCss('.x { padding: 2rem; }')
    expect(mensagem).toContain('Valor solto "2rem" em "padding"')
    expect(mensagem).toContain('--espaco-<papel>')
    expect(mensagem).toContain('secao-ampla')
    const [tipo] = await lintarCss('.x { font-size: 1rem; }')
    expect(tipo).toContain('--texto-<nível>-tamanho')
  })

  it('negativos: token, px de 1 a 32, %, em, 0, auto e conta derivada de var() passam; max-width está fora', async () => {
    const permitidas = [
      'margin-top: 16px', 'margin: 0 auto', 'margin: 0', 'margin: auto', 'padding: var(--espaco-painel)', 'gap: var(--espaco-pilha) var(--quadro-calha)',
      'padding: 2em', 'margin-left: 50%', 'margin: -8px', 'padding: 10.5px', 'padding: 1px', 'padding: 32px', 'margin: 0px', 'gap: normal',
      'margin-inline: inherit', 'padding-block-start: var(--espaco-junto)', 'row-gap: 8px', 'column-gap: 0',
      'margin-bottom: calc(-1 * var(--espaco-painel) - var(--espaco-grupo))', 'margin-top: calc(var(--espaco-bloco) / 2)', 'margin-top: calc(var(--espaco-bloco) * -1)', 'padding-top: calc(var(--espaco-secao) + 1px)',
      'padding-inline: max(var(--quadro-calha), env(safe-area-inset-left))', 'margin: calc(100% - var(--espaco-bloco))', 'padding: min(var(--a), 2%)',
      'font-size: var(--texto-corpo-tamanho)', 'line-height: var(--texto-corpo-entrelinha)', 'font-size: inherit', 'line-height: inherit',
      'font-size: calc(var(--texto-titulo-1-tamanho) * 2)', 'font-size: var(--texto-pequeno-tamanho, 1rem)',
      'max-width: 30rem', 'max-width: 880px', 'max-width: 68ch', 'max-width: none', 'width: 37px', 'min-height: 3rem',
      '--meu-espaco: 37px', 'font-family: Outfit', 'font-weight: 500',
    ]
    for (const declaracao of permitidas) expect(await lintarCss(regraCss(`${declaracao};`)), declaracao).toEqual([])
    expect(await lintarCss(regraCss('font-size: var(--texto-corpo-tamanho);'))).toEqual([])
  })

  it('o tokens.css e o tema gerado ficam fora da regra', async () => {
    expect(await lintarCss('.x { margin: 37px; }', { arquivo: 'src/styles/tokens.css' })).toEqual([])
    expect(await lintarCss('.x { margin: 37px; }', { arquivo: 'src/styles/harmonia.gerado.css' })).toEqual([])
  })

  it('exceção (lista em memória): dispensa só o par (arquivo, alvo) com o seletor exato', async () => {
    const css = '.a .b,\n.c { margin-top: 37px; }\n.d { padding: 2rem; }\n@media (min-width: 40em) { .a .b, .c { gap: 40px; } }'
    const sem = await lintarCss(css)
    expect(sem).toHaveLength(3)
    const excecao: Excecao = { arquivo: 'src/exemplo.css', alvo: '.a .b, .c', motivo: 'teste do mecanismo' }
    // As duas regras de seletor `.a .b, .c` (a de cima e a do @media) são dispensadas; a `.d` não.
    const com = await lintarCss(css, { excecoes: [excecao] })
    expect(com).toHaveLength(1)
    expect(com[0]).toContain('"2rem" em "padding"')
    expect(await lintarCss(css, { excecoes: [{ ...excecao, arquivo: 'src/outro.css' }] })).toHaveLength(3)
    expect(await lintarCss(css, { excecoes: [{ ...excecao, alvo: '.a' }] })).toHaveLength(3)
    expect(await lintarCss(css, { excecoes: [excecao, { ...excecao, alvo: '.d' }] })).toEqual([])
  })
})

// ---------- 4. o arquivo real de exceções e o script de lint ----------

describe('harmonia: exceções fechadas e script de lint (H3:RF-03)', () => {
  const arquivo = JSON.parse(readFileSync(join(pastaWeb, 'harmonia-excecoes.json'), 'utf8')) as { versao: number; excecoes: Partial<Excecao>[] }

  it('harmonia-excecoes.json tem versao 1 e no máximo 30 entradas, cada uma com arquivo, alvo e motivo', () => {
    expect(arquivo.versao).toBe(1)
    expect(Array.isArray(arquivo.excecoes)).toBe(true)
    expect(arquivo.excecoes.length).toBeLessThanOrEqual(30)
    for (const entrada of arquivo.excecoes) {
      for (const campo of ['arquivo', 'alvo', 'motivo'] as const) {
        expect(typeof entrada[campo], JSON.stringify(entrada)).toBe('string')
        expect(entrada[campo]?.trim().length, `${campo} de ${JSON.stringify(entrada)}`).toBeGreaterThan(0)
      }
    }
  })

  it('uma entrada é um par (arquivo, alvo): sem repetição', () => {
    const pares = arquivo.excecoes.map((e) => `${e.arquivo}\u0000${e.alvo}`)
    expect(new Set(pares).size).toBe(pares.length)
  })

  it('o script `lint` do package.json roda o ESLint e o stylelint, os dois bloqueantes', () => {
    const pacote = JSON.parse(readFileSync(join(pastaWeb, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    expect(pacote.scripts.lint).toBe('eslint . --max-warnings 0 && stylelint "src/**/*.css"')
  })
})
