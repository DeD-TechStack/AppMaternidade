import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROTULO_MOTIVO } from '../../conteudo/comunidade.ts'
import { ACAO_NO_CONTEUDO, DECISAO, MFA, PAPEIS } from '../../conteudo/moderacao.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, type EstadoComunidade } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarDadosModeracaoMemoria, simularFalhaModeracao } from '../../dados/moderacao.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarModeracao } from './apoio.tsx'

// MAT-40b, teste 9: axe-core em cada tela do painel, em cada estado, nos dois temas e com as caixas abertas,
// com as regras do `acessibilidade.test.tsx` da base (o contraste fica de fora: o jsdom não calcula cor).

process.env.DEBUG_PRINT_LIMIT = '300'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('o teste chamou a rede')
    }),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 160)).join(' | ')})`)
}

const CLASSE_DE_ALVO = /(^|\s)(alvo-toque|cm-botao|botao|nav-item)(\s|$)/

/** Os controles do conteúdo sem a classe que garante 44 × 44 px (um rótulo com a classe vale para o controle dentro dele). */
function semAlvoDe44(container: HTMLElement): string[] {
  const principal = container.querySelector('main') ?? container
  return [...principal.querySelectorAll<HTMLElement>('a, button, input, select, textarea')]
    .filter((elemento) => !CLASSE_DE_ALVO.test(elemento.className))
    .filter((elemento) => !elemento.closest('label.alvo-toque'))
    .map((elemento) => elemento.outerHTML.slice(0, 140))
}

/** Todo controle tem nome acessível, e o nome contém o texto visível. */
function controlesSemNome(container: HTMLElement): string[] {
  const falhas: string[] = []
  for (const controle of container.querySelectorAll<HTMLElement>('main a, main button, main input, main select, main textarea')) {
    const rotulo = controle.getAttribute('aria-label')
    const visivel = (controle.tagName === 'A' || controle.tagName === 'BUTTON' ? controle.textContent : '')!.trim()
    const doCampo = (controle as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''
    const nome = rotulo ?? (visivel || doCampo)
    if (!nome) falhas.push(`sem nome: ${controle.outerHTML.slice(0, 100)}`)
    else if (visivel && rotulo && !rotulo.includes(visivel)) falhas.push(`o nome não contém o texto visível: ${controle.outerHTML.slice(0, 100)}`)
  }
  return falhas
}

const DENUNCIA_FIXA = 'd0000000-0000-4000-8000-000000000001'
const DENUNCIA_FINAL = 'd0000000-0000-4000-8000-000000000002'

function comDenuncias(estado: EstadoComunidade) {
  const base = {
    denuncianteId: ELENCO.outro.conta,
    respostaId: null,
    perfilId: null,
    decididaPor: null,
    topicoId: CONTEUDO.topicoDoAutor,
  }
  estado.denuncias.push(
    { ...base, id: DENUNCIA_FIXA, motivo: 'ataque_assedio', texto: 'Texto da denúncia', estado: 'aberta', decididaEm: null, criadaEm: new Date(Date.now() - 3_600_000).toISOString() },
    { ...base, id: DENUNCIA_FINAL, motivo: 'spam_venda', texto: null, estado: 'procedente', decididaEm: new Date().toISOString(), criadaEm: new Date(Date.now() - 7_200_000).toISOString(), decididaPor: ELENCO.moderador.conta },
  )
}

function comAuditoria(estado: EstadoComunidade) {
  comDenuncias(estado)
  estado.auditoria.push({
    id: 'a0000000-0000-4000-8000-000000000001',
    atorId: ELENCO.moderador.conta,
    acao: 'ocultar',
    alvoTipo: 'topico',
    alvoId: CONTEUDO.topicoDoAutor,
    estadoAnterior: 'visivel',
    estadoNovo: 'oculto',
    motivo: 'Motivo da linha',
    denunciaId: DENUNCIA_FIXA,
    conteudo: 'Texto no momento da ação',
    validoAte: null,
    criadoEm: new Date().toISOString(),
  })
}

function cena(pessoa: PessoaDoElenco, caminho: string, tema: 'claro' | 'madrugada', ajustar?: (estado: EstadoComunidade) => void) {
  const estado = criarElenco()
  ajustar?.(estado)
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  const moderacao = criarDadosModeracaoMemoria(estado, ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return { ...renderizarModeracao(caminho, { contas, comunidade, moderacao, madrugada: tema === 'madrugada' }), comunidade, moderacao, estado }
}

const semOcupado = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement

interface Montagem {
  nome: string
  pessoa: PessoaDoElenco
  caminho: string
  ajustar?: (estado: EstadoComunidade) => void
}

const montagens: Montagem[] = [
  { nome: 'M1 (fila com denúncias)', pessoa: 'moderador', caminho: '/moderacao', ajustar: comDenuncias },
  { nome: 'M1 (fila vazia, TX-13)', pessoa: 'moderador', caminho: '/moderacao' },
  { nome: 'M2 (denúncia aberta)', pessoa: 'moderador', caminho: `/moderacao/denuncia/${DENUNCIA_FIXA}`, ajustar: comDenuncias },
  { nome: 'M2 (denúncia decidida)', pessoa: 'moderador', caminho: `/moderacao/denuncia/${DENUNCIA_FINAL}`, ajustar: comDenuncias },
  {
    nome: 'M2 (alvo excluído, TX-28)',
    pessoa: 'moderador',
    caminho: `/moderacao/denuncia/${DENUNCIA_FIXA}`,
    ajustar: (estado) => {
      comDenuncias(estado)
      estado.denuncias[0].topicoId = null
    },
  },
  { nome: 'M2 (id que não é UUID)', pessoa: 'moderador', caminho: '/moderacao/denuncia/xyz' },
  { nome: 'M3 (tópico oculto)', pessoa: 'moderador', caminho: `/moderacao/conteudo/topico/${CONTEUDO.topicoOculto}` },
  { nome: 'M3 (resposta, com histórico)', pessoa: 'moderador', caminho: `/moderacao/conteudo/resposta/${CONTEUDO.respostaDoOutro}`, ajustar: comAuditoria },
  { nome: 'M3 (conteúdo do próprio moderador, conflito)', pessoa: 'moderador', caminho: `/moderacao/conteudo/topico/${CONTEUDO.topicoDoModerador}` },
  { nome: 'M4 (auditoria com linhas)', pessoa: 'admin', caminho: '/moderacao/auditoria', ajustar: comAuditoria },
  { nome: 'M4 (auditoria vazia, TX-20)', pessoa: 'moderador', caminho: '/moderacao/auditoria' },
  { nome: 'M5 (papéis, admin)', pessoa: 'admin', caminho: '/moderacao/papeis' },
  { nome: 'M5 (o moderador, sem permissão)', pessoa: 'moderador', caminho: '/moderacao/papeis' },
  { nome: 'M1 (quem não é da equipe, TX-12)', pessoa: 'outro', caminho: '/moderacao' },
  { nome: 'M1 (papel vencido, TX-12)', pessoa: 'vencido', caminho: '/moderacao' },
]

for (const tema of ['claro', 'madrugada'] as const) {
  describe(`axe-core, tela por tela (${tema})`, () => {
    for (const { nome, pessoa, caminho, ajustar } of montagens) {
      it(`${nome}: sem violações, com nome nos controles e alvos de 44 px`, async () => {
        const { container } = cena(pessoa, caminho, tema, ajustar)
        await screen.findByRole('heading', { level: 1 })
        await semOcupado()
        // As telas lidas pela moderação só estão prontas quando a leitura dela acaba.
        await new Promise((resolver) => setTimeout(resolver, 0))
        await semOcupado()

        expect(document.documentElement.hasAttribute('data-tema')).toBe(tema === 'madrugada')
        expect(container.querySelectorAll('main')).toHaveLength(1)
        expect(container.querySelectorAll('h1')).toHaveLength(1)
        expect(await violacoes(container)).toEqual([])
        expect(semAlvoDe44(container)).toEqual([])
        expect(controlesSemNome(container)).toEqual([])
        expect(container.textContent).not.toContain('­')
      })
    }

    it('os estados de erro de leitura: rede, desconhecido e sem permissão, sem violações', async () => {
      for (const chave of ['rede', 'sem_permissao'] as const) {
        const falha = cena('moderador', '/moderacao', tema)
        // A leitura só começa depois da sessão (promessas): a falha armada agora vale para ela.
        simularFalhaModeracao(falha.moderacao, 'filaDeDenuncias', chave)
        if (chave === 'rede') await screen.findByRole('alert')
        else await screen.findByRole('link', { name: 'Ir para a Comunidade' })
        expect(await violacoes(falha.container)).toEqual([])
        expect(controlesSemNome(falha.container)).toEqual([])
        falha.unmount()
      }
      const desconhecido = cena('moderador', '/moderacao', tema)
      simularFalhaModeracao(desconhecido.moderacao, 'filaDeDenuncias', { classe: 'desconhecido', chave: 'desconhecido', codigo: '22P02', mensagemOriginal: 'x' })
      await screen.findByRole('alert')
      expect(await violacoes(desconhecido.container)).toEqual([])
    })

    it('a M5: o formulário de conceder com os erros de campo, sem violações', async () => {
      const { container } = cena('admin', '/moderacao/papeis', tema)
      await screen.findByLabelText(PAPEIS.campoConta)
      await semOcupado()
      fireEvent.change(screen.getByLabelText(PAPEIS.campoConta), { target: { value: 'abc' } })
      fireEvent.change(screen.getByLabelText(PAPEIS.campoValidade), { target: { value: '2020-01-01T10:00' } })
      fireEvent.click(botao(PAPEIS.conceder))
      expect(await screen.findByText(PAPEIS.erroConta)).toBeTruthy()
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(container)).toEqual([])
    })

    it('a fila com os filtros mexidos, sem violações', async () => {
      const { container } = cena('moderador', '/moderacao', tema, comDenuncias)
      await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.ataque_assedio) })
      fireEvent.click(screen.getByLabelText('Procedente'))
      fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'spam_venda' } })
      await screen.findByRole('link', { name: new RegExp(ROTULO_MOTIVO.spam_venda) })
      expect(await violacoes(container)).toEqual([])
    })
  })
}

describe('as caixas abertas (nos dois temas)', () => {
  for (const tema of ['claro', 'madrugada'] as const) {
    it(`ocultar e decidir (${tema}): sem violações, com o motivo vazio e depois com o erro do campo`, async () => {
      const { container } = cena('moderador', `/moderacao/denuncia/${DENUNCIA_FIXA}`, tema, comDenuncias)
      await screen.findByRole('button', { name: ACAO_NO_CONTEUDO.oculto.botao })
      await semOcupado()

      const origem = botao(ACAO_NO_CONTEUDO.oculto.botao)
      fireEvent.click(origem)
      const caixa = screen.getByRole('dialog', { name: ACAO_NO_CONTEUDO.oculto.titulo })
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(caixa)).toEqual([])
      fireEvent.click(within(caixa).getByRole('button', { name: ACAO_NO_CONTEUDO.oculto.confirmar }))
      expect(await violacoes(container)).toEqual([])
      expect(controlesSemNome(caixa)).toEqual([])

      // O foco preso dentro da caixa, e Esc fecha e devolve o foco ao botão de origem.
      const confirmar = within(caixa).getByRole('button', { name: ACAO_NO_CONTEUDO.oculto.confirmar })
      confirmar.focus()
      fireEvent.keyDown(confirmar, { key: 'Tab' })
      expect(caixa.contains(document.activeElement)).toBe(true)
      fireEvent.keyDown(confirmar, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(origem)

      fireEvent.click(botao(DECISAO.procedente.botao))
      const decisao = screen.getByRole('dialog', { name: DECISAO.procedente.titulo })
      expect(await violacoes(container)).toEqual([])
      expect(controlesSemNome(decisao)).toEqual([])
    })

    it(`revogar um papel (${tema}): sem violações, com TX-15 dentro da caixa`, async () => {
      const { container } = cena('admin', '/moderacao/papeis', tema)
      const doVencido = (await screen.findByText(ELENCO.vencido.conta)).closest('li')!
      await semOcupado()
      fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.revogar }))
      const caixa = screen.getByRole('dialog', { name: PAPEIS.revogarTitulo })
      expect(within(caixa).getByRole('note')).toBeTruthy()
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(caixa)).toEqual([])
      expect(controlesSemNome(caixa)).toEqual([])
    })
  }
})

describe('a verificação em duas etapas (nos dois temas)', () => {
  for (const tema of ['claro', 'madrugada'] as const) {
    it(`cadastro, código e erro do código (${tema}): sem violações`, async () => {
      vi.stubEnv('VITE_MODERACAO_MFA', 'ligado')
      const { container } = cena('moderador', '/moderacao', tema)
      fireEvent.click(await screen.findByRole('button', { name: MFA.cadastrar }))
      await screen.findByAltText(MFA.altDoQr)
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(container)).toEqual([])
      expect(controlesSemNome(container)).toEqual([])

      fireEvent.change(screen.getByLabelText(MFA.campoCodigo), { target: { value: '12' } })
      fireEvent.click(botao(MFA.confirmar))
      expect(await screen.findByText(MFA.erroFormato)).toBeTruthy()
      expect(await violacoes(container)).toEqual([])
    })
  }
})
