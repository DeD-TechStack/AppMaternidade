import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import { ENTRAR_NA_COMUNIDADE, TOPICO, TX } from '../../conteudo/comunidade.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, simularFalha } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarComunidade } from './apoio.tsx'

// MAT-40, teste 9: axe-core em cada tela, em cada estado, nos dois temas e com os diálogos abertos, com as
// regras do `acessibilidade.test.tsx` da base (o contraste fica de fora: o jsdom não calcula cor).

process.env.DEBUG_PRINT_LIMIT = '300'

async function violacoes(container: HTMLElement): Promise<string[]> {
  const resultado = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  return resultado.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 160)).join(' | ')})`)
}

const CLASSE_DE_ALVO = /(^|\s)(alvo-toque|botao|nav-item)(\s|$)/

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

function cena(pessoa: PessoaDoElenco, caminho: string, tema: 'claro' | 'madrugada', ajustar?: (estado: ReturnType<typeof criarElenco>) => void) {
  const estado = criarElenco()
  ajustar?.(estado)
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  return { ...renderizarComunidade(caminho, { contas, comunidade, madrugada: tema === 'madrugada' }), comunidade, estado }
}

const semOcupado = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const campo = (rotulo: string | RegExp) => screen.getByLabelText(rotulo) as HTMLInputElement | HTMLTextAreaElement
const digitar = (rotulo: string | RegExp, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })

type Ajuste = (estado: ReturnType<typeof criarElenco>) => void
interface Montagem {
  nome: string
  pessoa: PessoaDoElenco
  caminho: string
  ajustar?: Ajuste
  /** Leva a tela ao estado a conferir, depois de ela abrir. */
  levar?: () => Promise<void> | void
}

const montagens: Montagem[] = [
  { nome: 'C1 (escritor)', pessoa: 'outro', caminho: '/app/comunidade' },
  { nome: 'C1 (quem ainda não entrou, com o bloco da C5)', pessoa: 'semAceite', caminho: '/app/comunidade' },
  { nome: 'C1 (moderação, com o painel)', pessoa: 'moderador', caminho: '/app/comunidade' },
  { nome: 'C2 (com tópicos)', pessoa: 'outro', caminho: '/app/comunidade/sono' },
  { nome: 'C2 (vazio)', pessoa: 'outro', caminho: '/app/comunidade/tummy-time' },
  { nome: 'C2 (espaço que não existe)', pessoa: 'outro', caminho: '/app/comunidade/inexistente' },
  { nome: 'C3 (respostas, filha e oculta)', pessoa: 'autor', caminho: `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}` },
  { nome: 'C3 (quem ainda não entrou)', pessoa: 'semAceite', caminho: `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}` },
  { nome: 'C3 (moderação, tópico removido)', pessoa: 'moderador', caminho: `/app/comunidade/topico/${CONTEUDO.topicoRemovido}` },
  { nome: 'C3 (não encontrado)', pessoa: 'outro', caminho: `/app/comunidade/topico/${CONTEUDO.topicoOculto}` },
  { nome: 'C3 (id que não é UUID)', pessoa: 'outro', caminho: '/app/comunidade/topico/xyz' },
  { nome: 'C4 (novo tópico)', pessoa: 'outro', caminho: '/app/comunidade/sono/novo' },
  { nome: 'C4 (editar)', pessoa: 'autor', caminho: `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}/editar` },
  { nome: 'C5 (passo dos termos)', pessoa: 'nova', caminho: '/app/comunidade/entrar' },
  { nome: 'C5 (passo do perfil)', pessoa: 'semPerfil', caminho: '/app/comunidade/entrar' },
  { nome: 'C6 (escritor)', pessoa: 'autor', caminho: '/app/comunidade/perfil' },
  { nome: 'C6 (sem perfil)', pessoa: 'semPerfil', caminho: '/app/comunidade/perfil' },
  { nome: 'C6 (sem aceite)', pessoa: 'semAceite', caminho: '/app/comunidade/perfil' },
  { nome: 'C7 (vazio)', pessoa: 'autor', caminho: '/app/comunidade/denuncias' },
  {
    nome: 'C7 (com denúncias)',
    pessoa: 'autor',
    caminho: '/app/comunidade/denuncias',
    ajustar: (estado) => {
      estado.denuncias.push({ id: 'a1000000-0000-4000-8000-000000000001', denuncianteId: ELENCO.autor.conta, topicoId: CONTEUDO.topicoDoOutro, respostaId: null, perfilId: null, motivo: 'outro', texto: 'Texto', estado: 'aberta', decididaPor: null, decididaEm: null, criadaEm: new Date().toISOString() })
    },
  },
]

for (const tema of ['claro', 'madrugada'] as const) {
  describe(`axe-core, tela por tela (${tema})`, () => {
    for (const { nome, pessoa, caminho, ajustar } of montagens) {
      it(`${nome}: sem violações, com nome nos controles e alvos de 44 px`, async () => {
        const { container } = cena(pessoa, caminho, tema, ajustar)
        await screen.findByRole('heading', { level: 1 })
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

    it('os estados de erro: rede, desconhecido e sem permissão, sem violações', async () => {
      for (const chave of ['rede', 'sem_permissao'] as const) {
        const falha = cena('outro', '/app/comunidade/sono', tema)
        // A leitura só começa depois da sessão (promessas): a falha armada agora vale para ela.
        simularFalha(falha.comunidade, 'listarEspacos', chave)
        await screen.findByRole('alert')
        expect(await violacoes(falha.container)).toEqual([])
        expect(controlesSemNome(falha.container)).toEqual([])
        falha.unmount()
      }
      const desconhecido = cena('outro', '/app/comunidade/sono', tema)
      simularFalha(desconhecido.comunidade, 'listarTopicos', { classe: 'desconhecido', chave: 'desconhecido', codigo: '22P02', mensagemOriginal: 'x' })
      await screen.findByRole('alert')
      expect(await violacoes(desconhecido.container)).toEqual([])
    })

    it('o formulário de tópico: com erro de limite e com a prévia, sem violações', async () => {
      const { container } = cena('outro', '/app/comunidade/sono/novo', tema)
      await screen.findByLabelText('Título')
      digitar('Título', 'ab')
      digitar('Texto do tópico', 'x')
      expect(await violacoes(container)).toEqual([])
      digitar('Título', 'Um título bom')
      fireEvent.click(botao('Ver prévia'))
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(container)).toEqual([])
    })

    it('a C5 com o erro da marca e com o erro do apelido, sem violações', async () => {
      const termos = cena('nova', '/app/comunidade/entrar', tema)
      fireEvent.click(await screen.findByRole('button', { name: ENTRAR_NA_COMUNIDADE.aceitar }))
      expect(await violacoes(termos.container)).toEqual([])
      termos.unmount()

      const perfil = cena('semPerfil', '/app/comunidade/entrar', tema)
      await screen.findByRole('heading', { name: ENTRAR_NA_COMUNIDADE.perfilTitulo })
      digitar(ENTRAR_NA_COMUNIDADE.apelido, 'ab')
      fireEvent.click(botao(ENTRAR_NA_COMUNIDADE.criarPerfil))
      expect(await violacoes(perfil.container)).toEqual([])
    })

    it('a C3 com o formulário de resposta, com a prévia e com a citação marcada, sem violações', async () => {
      const { container } = cena('outro', `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`, tema)
      await screen.findByLabelText(TOPICO.campoResposta)
      await semOcupado()
      fireEvent.click(within(document.getElementById(`resposta-${CONTEUDO.respostaDoAutor}`)!).getByRole('button', { name: /^Responder a/ }))
      digitar(TOPICO.campoResposta, 'Uma resposta')
      expect(await violacoes(container)).toEqual([])
      fireEvent.click(botao(TOPICO.verPrevia))
      expect(await violacoes(container)).toEqual([])
    })
  })
}

describe('os diálogos abertos (nos dois temas)', () => {
  for (const tema of ['claro', 'madrugada'] as const) {
    async function abrirDialogo(rotulo: string) {
      const aberta = cena('outro', `/app/comunidade/topico/${CONTEUDO.topicoDoAutor}`, tema)
      await screen.findByLabelText(TOPICO.campoResposta)
      await semOcupado()
      const origem = within(document.getElementById(`resposta-${CONTEUDO.respostaDoAutor}`)!).getByRole('button', { name: rotulo })
      fireEvent.click(origem)
      return { ...aberta, origem, dialogo: screen.getByRole('dialog') }
    }

    it(`denunciar (${tema}): sem violações, com o bloco de crise e depois do envio`, async () => {
      const { container, dialogo, origem } = await abrirDialogo(TOPICO.denunciar)
      expect(await violacoes(container)).toEqual([])
      expect(semAlvoDe44(dialogo)).toEqual([])
      fireEvent.click(within(dialogo).getByRole('radio', { name: 'Risco de autolesão' }))
      expect(within(dialogo).getByText(TX.tx08)).toBeTruthy()
      expect(await violacoes(container)).toEqual([])
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar denúncia' }))
      await within(dialogo).findByText(TX.tx09)
      expect(await violacoes(container)).toEqual([])
      expect(controlesSemNome(dialogo)).toEqual([])
      // Esc fecha e o foco volta ao botão que abriu.
      fireEvent.keyDown(within(dialogo).getByRole('button', { name: 'Fechar' }), { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(origem)
    })

    it(`bloquear (${tema}): sem violações, com TX-10 e o foco preso`, async () => {
      const { container, dialogo } = await abrirDialogo('Bloquear autor_do_forum')
      expect(within(dialogo).getByText(TX.tx10)).toBeTruthy()
      expect(await violacoes(container)).toEqual([])
      expect(controlesSemNome(dialogo)).toEqual([])
      const confirmar = within(dialogo).getByRole('button', { name: 'Bloquear' })
      confirmar.focus()
      fireEvent.keyDown(confirmar, { key: 'Tab' })
      expect(dialogo.contains(document.activeElement)).toBe(true)
    })
  }
})
