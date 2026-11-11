import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import * as CONTEUDO from '../../conteudo/conta.ts'
import { MANCHETES } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

// MAT-37r, correção da revisão. Sem folha de estilo no jsdom, as medidas se conferem pelas classes:
// a classe `alvo-toque` do index.css (min-height de 44 px) vence o `cm-botao` e o `cm-campo-entrada`
// de site.css (56 px), então nenhum botão nem campo das telas pode levá-la; o tamanho vem do sistema.
// Primário: 56 px (site e app). Campo: 56 px nas telas públicas e 48 px (`min-h-12`) nas do app.
// O h1 de toda tela é `cm-h1` (84/88 em 1440, 42/46 em 390). O aviso de demonstração das telas
// logadas é um só e some com o banco.

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

interface Tela {
  nome: string
  app: boolean
  montar: () => Promise<{ container: HTMLElement; unmount: () => void }>
}

const esperar = () => waitFor(() => expect(screen.queryByText(/Carregando…|Conferindo as suas famílias…/)).toBeNull())

const TELAS: Tela[] = [
  { nome: '/entrar', app: false, montar: async () => renderizarComDados('/entrar') },
  { nome: '/criar-conta', app: false, montar: async () => renderizarComDados('/criar-conta') },
  { nome: '/recuperar-acesso', app: false, montar: async () => renderizarComDados('/recuperar-acesso') },
  {
    nome: '/redefinir-senha (formulário)',
    app: false,
    montar: async () => {
      sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.juliana.id)
      return renderizarComDados('/redefinir-senha', { sessao: 'juliana' })
    },
  },
  { nome: '/conta-excluida', app: false, montar: async () => renderizarComDados('/conta-excluida') },
  {
    nome: '/app/comecar',
    app: true,
    montar: async () => {
      const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
      await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'x')
      return renderizarComDados('/app/comecar', { dados })
    },
  },
  { nome: '/app/conta', app: true, montar: async () => renderizarComDados('/app/conta', { sessao: 'juliana' }) },
  {
    nome: '/app/conta (caixa de excluir aberta)',
    app: true,
    montar: async () => {
      const aberto = renderizarComDados('/app/conta', { sessao: 'davi' })
      await screen.findByRole('heading', { level: 1, name: 'Conta' })
      await esperar()
      fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }))
      return aberto
    },
  },
]

async function abrir(tela: Tela) {
  const aberto = await tela.montar()
  await screen.findByRole('heading', { level: 1 })
  await esperar()
  return aberto
}

describe('botões: o tamanho vem do sistema (cm-botao), não de alvo-toque', () => {
  it('nenhum botão das telas leva alvo-toque, e o primário não encolhe para a variante do app', async () => {
    const achados: string[] = []
    for (const tela of TELAS) {
      const { container, unmount } = await abrir(tela)
      for (const botao of container.querySelectorAll<HTMLElement>('main button.cm-botao, nav[aria-label="Conta"] button.cm-botao, dialog button.cm-botao')) {
        if (botao.classList.contains('alvo-toque')) achados.push(`${tela.nome}: alvo-toque em ${botao.textContent}`)
        if (botao.classList.contains('cm-botao-primario') && botao.hasAttribute('data-tamanho')) {
          achados.push(`${tela.nome}: primário com data-tamanho em ${botao.textContent}`)
        }
      }
      unmount()
    }
    expect(achados).toEqual([])
  })

  it('todo botão de ação (submit e secundário) é um cm-botao', async () => {
    const achados: string[] = []
    for (const tela of TELAS) {
      const { container, unmount } = await abrir(tela)
      for (const botao of container.querySelectorAll<HTMLElement>('main button, nav[aria-label="Conta"] button, dialog button')) {
        if (botao.classList.contains('cm-campo-olho')) continue
        if (!botao.classList.contains('cm-botao')) achados.push(`${tela.nome}: ${botao.textContent}`)
      }
      unmount()
    }
    expect(achados).toEqual([])
  })
})

describe('campos: 56 px nas telas públicas e 48 px nas do app', () => {
  it('nenhum campo leva alvo-toque; o do app leva min-h-12 e o público não', async () => {
    const achados: string[] = []
    let total = 0
    for (const tela of TELAS) {
      const { container, unmount } = await abrir(tela)
      for (const campo of container.querySelectorAll<HTMLElement>('.cm-campo-entrada')) {
        total += 1
        if (campo.classList.contains('alvo-toque')) achados.push(`${tela.nome}: alvo-toque em ${campo.id}`)
        const baixo = campo.classList.contains('min-h-12')
        if (tela.app && !baixo) achados.push(`${tela.nome}: falta min-h-12 (48 px) em ${campo.id}`)
        if (!tela.app && baixo) achados.push(`${tela.nome}: min-h-12 numa tela pública em ${campo.id}`)
      }
      unmount()
    }
    expect(total).toBeGreaterThan(8)
    expect(achados).toEqual([])
  })
})

describe('h1 na escala do DESIGN.md (cm-h1)', () => {
  it('todo h1 de acesso e de conta leva cm-h1, e o das manchetes tem a segunda linha em itálico', async () => {
    for (const tela of TELAS) {
      const { container, unmount } = await abrir(tela)
      const titulo = container.querySelector('h1')!
      expect(titulo.classList.contains('cm-h1'), tela.nome).toBe(true)
      expect(titulo.classList.contains('cm-h2'), tela.nome).toBe(false)
      if (tela.nome !== '/app/conta' && !tela.nome.startsWith('/app/conta ')) {
        expect(titulo.querySelector('.cm-segunda-linha'), tela.nome).not.toBeNull()
      }
      unmount()
    }
  })

  it('cada linha das manchetes cabe numa linha em 390 a 42 px (até 17 caracteres)', () => {
    for (const linhas of Object.values(MANCHETES)) {
      for (const linha of linhas) expect(linha.length, linha).toBeLessThanOrEqual(17)
    }
  })
})

describe('texto de interface sem sigla em caixa alta', () => {
  it('nenhuma frase de conteudo/conta.ts tem palavra toda em maiúsculas de 2+ letras fora RN, SBP, LGPD e OMS', () => {
    const permitidas = new Set(['RN', 'SBP', 'LGPD', 'OMS'])
    const frases: string[] = []
    const coletar = (valor: unknown) => {
      if (typeof valor === 'string') frases.push(valor)
      else if (valor && typeof valor === 'object') Object.values(valor).forEach(coletar)
    }
    coletar(CONTEUDO)
    // As frases com argumento (resumo, confirmação, fuso atual) entram com um exemplo.
    frases.push(CONTEUDO.CONTA.resumo('Ana', 'ana@exemplo.invalid'), CONTEUDO.CRIAR_CONTA.confirmacao('ana@exemplo.invalid'))
    const achados = frases.flatMap((frase) => (frase.match(/\b[A-ZÀ-Ý]{2,}\b/g) ?? []).filter((p) => !permitidas.has(p)).map((p) => `${p}: ${frase}`))
    expect(achados).toEqual([])
  })
})

describe('aviso de demonstração nas telas logadas', () => {
  const AVISO = '[data-aviso="demonstracao"]'

  it('em modo memória, Começar e Conta mostram exatamente um aviso, fora do <main>', async () => {
    for (const tela of TELAS.filter((t) => t.app)) {
      const { container, unmount } = await abrir(tela)
      expect(container.querySelectorAll(AVISO), tela.nome).toHaveLength(1)
      expect(container.querySelectorAll(`main ${AVISO}`), tela.nome).toHaveLength(0)
      unmount()
    }
  })

  it('nos estados de espera e de erro da guarda, também um só aviso, fora do <main>', async () => {
    const espera = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    espera.sessaoParaTeste('juliana@exemplo.invalid')
    vi.spyOn(espera, 'sessaoAtual').mockReturnValue(new Promise(() => undefined))
    const carregando = renderizarComDados('/app/conta', { dados: espera })
    expect(carregando.container.querySelector('main')!.getAttribute('aria-busy')).toBe('true')
    expect(carregando.container.querySelectorAll(AVISO)).toHaveLength(1)
    expect(carregando.container.querySelectorAll(`main ${AVISO}`)).toHaveLength(0)
    carregando.unmount()

    const falha = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    falha.sessaoParaTeste('juliana@exemplo.invalid')
    simularFalha(falha, 'sessaoAtual', 'rede')
    const comErro = renderizarComDados('/app/conta', { dados: falha })
    await screen.findByRole('alert')
    expect(comErro.container.querySelectorAll(AVISO)).toHaveLength(1)
    expect(comErro.container.querySelectorAll(`main ${AVISO}`)).toHaveLength(0)
  })

  it('com o banco (as duas variáveis), nenhuma tela logada mostra o aviso', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-ficticia')
    for (const tela of TELAS.filter((t) => t.app)) {
      const { container, unmount } = await abrir(tela)
      expect(container.querySelectorAll(AVISO), tela.nome).toHaveLength(0)
      unmount()
    }
  })
})
