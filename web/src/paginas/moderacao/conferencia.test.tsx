import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMUM_COMUNIDADE, TEXTOS_ERRO_COMUNIDADE, TX as TX_COMUNIDADE } from '../../conteudo/comunidade.ts'
import {
  ACAO_NO_CONTEUDO,
  COMUM_MODERACAO,
  DECISAO,
  NOMES_DAS_TELAS,
  PAPEIS,
  TEXTOS_ERRO_MODERACAO,
  TX,
} from '../../conteudo/moderacao.ts'
import { CONTEUDO, ELENCO, criarElenco, type PessoaDoElenco } from '../../dados/comunidade.elenco.ts'
import { criarDadosComunidadeMemoria, type EstadoComunidade } from '../../dados/comunidade.memoria.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { erroDaChaveModeracao } from '../../dados/moderacao.erros.ts'
import { criarDadosModeracaoMemoria, simularFalhaModeracao } from '../../dados/moderacao.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { fixtureDeContasDoElenco, renderizarModeracao } from './apoio.tsx'

process.env.DEBUG_PRINT_LIMIT = '300'

// MAT-40b, correções da rodada 1 de revisão:
// R1 (RF-10): a conferência de um envio incerto passa pela mesma guarda do painel que as leituras
//   (situação da conta antes e, com resultado vazio, depois da leitura); sem papel, a tela vai a TX-12.
// R2 (RF-15): uma releitura que falha por erro passageiro, depois de uma ação recusada, mantém a caixa
//   aberta com o motivo e a frase da recusa; perder o papel continua fechando o acesso.

const fetchProibido = vi.fn()

beforeEach(() => {
  fetchProibido.mockClear()
  vi.stubGlobal('fetch', (...argumentos: unknown[]) => {
    fetchProibido(...argumentos)
    throw new Error('o teste chamou a rede')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  expect(fetchProibido).not.toHaveBeenCalled()
})

const ID_DA_DENUNCIA = 'd0000000-0000-4000-8000-000000000501'

function cena(pessoa: PessoaDoElenco, caminho: string, ajustar?: (estado: EstadoComunidade) => void) {
  const estado = criarElenco()
  ajustar?.(estado)
  const comunidade = criarDadosComunidadeMemoria(estado, ELENCO[pessoa].conta)
  const moderacao = criarDadosModeracaoMemoria(estado, ELENCO[pessoa].conta)
  const contas = criarDadosContaMemoria(fixtureDeContasDoElenco(criarFixtureDeTeste(Date.now())))
  contas.sessaoParaTeste(ELENCO[pessoa].email)
  const tela = renderizarModeracao(caminho, { contas, comunidade, moderacao })
  return { ...tela, estado, comunidade, moderacao }
}

const comDenuncia = (estado: EstadoComunidade) => {
  estado.denuncias.push({
    id: ID_DA_DENUNCIA,
    denuncianteId: ELENCO.outro.conta,
    topicoId: CONTEUDO.topicoDoAutor,
    respostaId: null,
    perfilId: null,
    motivo: 'outro',
    texto: null,
    estado: 'aberta',
    decididaPor: null,
    decididaEm: null,
    criadaEm: new Date(Date.now() - 60_000).toISOString(),
  })
}

const perderPapel = (estado: EstadoComunidade, conta: string) => {
  estado.papeis = estado.papeis.filter((p) => p.contaId !== conta)
}

const rede = () => ({ ok: false as const, erro: erroDaChaveModeracao('rede') })

const botao = (nome: string | RegExp) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const semCarregando = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())

async function aguardarH1(nome?: string | RegExp) {
  const titulo = await screen.findByRole('heading', { level: 1, ...(nome ? { name: nome } : {}) })
  await semCarregando()
  return titulo
}

const statusDiz = (texto: string) =>
  waitFor(() => expect(screen.getAllByRole('status').some((s) => s.textContent === texto)).toBe(true))

async function abrirCaixa(rotuloDoBotao: string, titulo: string) {
  fireEvent.click(await screen.findByRole('button', { name: rotuloDoBotao }))
  return await screen.findByRole('dialog', { name: titulo })
}

const digitarMotivo = (caixa: HTMLElement, motivo: string) =>
  fireEvent.change(within(caixa).getByLabelText(/^Motivo/), { target: { value: motivo } })

function confirmarNaCaixa(caixa: HTMLElement, motivo: string, rotuloDoBotao: string) {
  digitarMotivo(caixa, motivo)
  fireEvent.click(within(caixa).getByRole('button', { name: rotuloDoBotao }))
}

/** O painel foi a TX-12: sem a navegação, sem caixa e sem o formulário. */
async function esperarSemPermissao() {
  expect(await screen.findByText(TX.tx12)).toBeTruthy()
  expect(screen.queryByRole('navigation', { name: COMUM_MODERACAO.painel })).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
}

describe('R1: a conferência do envio incerto passa pela guarda do painel (MAT-40:RF-10)', () => {
  describe('conteúdo (M3)', () => {
    async function ate() {
      const tela = cena('moderador', `/moderacao/conteudo/topico/${CONTEUDO.topicoDoAutor}`)
      await aguardarH1(NOMES_DAS_TELAS.conteudo)
      const caixa = await abrirCaixa(ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.oculto.titulo)
      return { ...tela, caixa }
    }

    it('o papel some entre a escrita e a conferência: a situação é relida antes, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade, caixa } = await ate()
      vi.spyOn(moderacao, 'moderarConteudo').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.moderador.conta)
        return rede()
      })
      const lerConteudo = vi.spyOn(moderacao, 'lerConteudo')
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      confirmarNaCaixa(caixa, 'Ocultar mesmo', ACAO_NO_CONTEUDO.oculto.confirmar)
      await esperarSemPermissao()
      expect(situacao).toHaveBeenCalled()
      expect(lerConteudo).not.toHaveBeenCalled()
    })

    it('o resultado vem vazio (não encontrado) e o papel some durante a leitura: a situação é relida, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'moderarConteudo', 'rede')
      vi.spyOn(moderacao, 'lerConteudo').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.moderador.conta)
        return { ok: true, valor: null }
      })
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      confirmarNaCaixa(caixa, 'Ocultar mesmo', ACAO_NO_CONTEUDO.oculto.confirmar)
      await esperarSemPermissao()
      expect(situacao.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('a conferência devolve sem_permissao: a tela vai a TX-12', async () => {
      const { moderacao, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'moderarConteudo', 'rede')
      simularFalhaModeracao(moderacao, 'lerConteudo', 'sem_permissao')
      confirmarNaCaixa(caixa, 'Ocultar mesmo', ACAO_NO_CONTEUDO.oculto.confirmar)
      await esperarSemPermissao()
    })

    it('o botão "Conferir" também passa pela guarda: o papel some antes de repetir a conferência', async () => {
      const { estado, moderacao, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'moderarConteudo', 'rede')
      simularFalhaModeracao(moderacao, 'lerConteudo', 'rede')
      confirmarNaCaixa(caixa, 'Ocultar mesmo', ACAO_NO_CONTEUDO.oculto.confirmar)
      const alerta = await within(caixa).findByRole('alert')
      expect(alerta.textContent).toContain(TX_COMUNIDADE.tx24)
      perderPapel(estado, ELENCO.moderador.conta)
      fireEvent.click(within(alerta).getByRole('button', { name: COMUM_COMUNIDADE.conferir }))
      await esperarSemPermissao()
    })

    it('com o papel vigente, a conferência continua decidindo igual: achou, TX-32, sem repetir a escrita', async () => {
      const { estado, moderacao, caixa } = await ate()
      const escrever = moderacao.moderarConteudo.bind(moderacao)
      const moderar = vi.spyOn(moderacao, 'moderarConteudo').mockImplementationOnce(async (...args) => {
        await escrever(...args)
        return rede()
      })
      confirmarNaCaixa(caixa, 'Ocultar mesmo', ACAO_NO_CONTEUDO.oculto.confirmar)
      await statusDiz(TX.tx32)
      expect(moderar).toHaveBeenCalledTimes(1)
      expect(estado.auditoria).toHaveLength(1)
    })
  })

  describe('decisão (M2)', () => {
    async function ate() {
      const tela = cena('moderador', `/moderacao/denuncia/${ID_DA_DENUNCIA}`, comDenuncia)
      await aguardarH1(NOMES_DAS_TELAS.denuncia)
      const caixa = await abrirCaixa(DECISAO.improcedente.botao, DECISAO.improcedente.titulo)
      return { ...tela, caixa }
    }

    it('o papel some entre a escrita e a conferência: a situação é relida antes, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade, caixa } = await ate()
      vi.spyOn(moderacao, 'decidirDenuncia').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.moderador.conta)
        return rede()
      })
      const lerDenuncia = vi.spyOn(moderacao, 'lerDenuncia')
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      confirmarNaCaixa(caixa, 'Sem fundamento', DECISAO.improcedente.confirmar)
      await esperarSemPermissao()
      expect(situacao).toHaveBeenCalled()
      expect(lerDenuncia).not.toHaveBeenCalled()
    })

    it('o resultado vem vazio (não encontrado) e o papel some durante a leitura: a situação é relida, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'decidirDenuncia', 'rede')
      vi.spyOn(moderacao, 'lerDenuncia').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.moderador.conta)
        return { ok: true, valor: null }
      })
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      confirmarNaCaixa(caixa, 'Sem fundamento', DECISAO.improcedente.confirmar)
      await esperarSemPermissao()
      expect(situacao.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('a conferência devolve sem_permissao: a tela vai a TX-12', async () => {
      const { moderacao, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'decidirDenuncia', 'rede')
      simularFalhaModeracao(moderacao, 'lerDenuncia', 'sem_permissao')
      confirmarNaCaixa(caixa, 'Sem fundamento', DECISAO.improcedente.confirmar)
      await esperarSemPermissao()
    })
  })

  describe('conceder e renovar (M5)', () => {
    async function ate() {
      const tela = cena('admin', '/moderacao/papeis')
      await aguardarH1(NOMES_DAS_TELAS.papeis)
      await screen.findByRole('region', { name: PAPEIS.lista })
      await semCarregando()
      return tela
    }

    const preencher = (conta: string) => {
      fireEvent.change(screen.getByLabelText(PAPEIS.campoConta), { target: { value: conta } })
      fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: 'Entra na equipe' } })
      fireEvent.click(botao(PAPEIS.conceder))
    }

    it('o papel some entre a escrita e a conferência: a situação é relida antes, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade } = await ate()
      vi.spyOn(moderacao, 'concederPapel').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.admin.conta)
        return rede()
      })
      const papeis = vi.spyOn(moderacao, 'papeis')
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      preencher(ELENCO.outro.conta)
      await esperarSemPermissao()
      expect(situacao).toHaveBeenCalled()
      expect(papeis).not.toHaveBeenCalled()
      expect(screen.queryByLabelText(PAPEIS.campoConta)).toBeNull()
    })

    it('renovar: o papel some entre a escrita e a conferência, e a tela vai a TX-12', async () => {
      const { estado, moderacao } = await ate()
      const doVencido = (await screen.findByText(ELENCO.vencido.conta)).closest('li')!
      fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.renovar }))
      vi.spyOn(moderacao, 'concederPapel').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.admin.conta)
        return rede()
      })
      const papeis = vi.spyOn(moderacao, 'papeis')
      fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: 'Volta à equipe' } })
      fireEvent.click(botao(PAPEIS.conceder))
      await esperarSemPermissao()
      expect(papeis).not.toHaveBeenCalled()
    })

    it('a lista volta vazia (linha não encontrada) e o papel some durante a leitura: a situação é relida, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade } = await ate()
      simularFalhaModeracao(moderacao, 'concederPapel', 'rede')
      vi.spyOn(moderacao, 'papeis').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.admin.conta)
        return { ok: true, valor: [] }
      })
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      preencher(ELENCO.outro.conta)
      await esperarSemPermissao()
      expect(situacao.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('a conferência devolve sem_permissao: a tela vai a TX-12', async () => {
      const { moderacao } = await ate()
      simularFalhaModeracao(moderacao, 'concederPapel', 'rede')
      simularFalhaModeracao(moderacao, 'papeis', 'sem_permissao')
      preencher(ELENCO.outro.conta)
      await esperarSemPermissao()
    })
  })

  describe('revogar (M5)', () => {
    async function ate() {
      const tela = cena('admin', '/moderacao/papeis')
      await aguardarH1(NOMES_DAS_TELAS.papeis)
      const doVencido = (await screen.findByText(ELENCO.vencido.conta)).closest('li')!
      fireEvent.click(within(doVencido).getByRole('button', { name: PAPEIS.revogar }))
      const caixa = await screen.findByRole('dialog', { name: PAPEIS.revogarTitulo })
      return { ...tela, caixa }
    }

    it('o papel some entre a escrita e a conferência: a situação é relida antes, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade, caixa } = await ate()
      vi.spyOn(moderacao, 'revogarPapel').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.admin.conta)
        return rede()
      })
      const papeis = vi.spyOn(moderacao, 'papeis')
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      confirmarNaCaixa(caixa, 'Saiu da equipe', PAPEIS.revogarConfirmar)
      await esperarSemPermissao()
      expect(situacao).toHaveBeenCalled()
      expect(papeis).not.toHaveBeenCalled()
    })

    it('a lista volta sem a linha (parece revogado) e o papel some durante a leitura: a situação é relida, e a tela vai a TX-12', async () => {
      const { estado, moderacao, comunidade, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'revogarPapel', 'rede')
      vi.spyOn(moderacao, 'papeis').mockImplementationOnce(async () => {
        perderPapel(estado, ELENCO.admin.conta)
        return { ok: true, valor: [] }
      })
      const situacao = vi.spyOn(comunidade, 'situacaoDaConta')
      confirmarNaCaixa(caixa, 'Saiu da equipe', PAPEIS.revogarConfirmar)
      await esperarSemPermissao()
      expect(situacao.mock.calls.length).toBeGreaterThanOrEqual(2)
      expect(screen.queryByText(TX.tx32)).toBeNull()
    })

    it('a conferência devolve sem_permissao: a tela vai a TX-12', async () => {
      const { moderacao, caixa } = await ate()
      simularFalhaModeracao(moderacao, 'revogarPapel', 'rede')
      simularFalhaModeracao(moderacao, 'papeis', 'sem_permissao')
      confirmarNaCaixa(caixa, 'Saiu da equipe', PAPEIS.revogarConfirmar)
      await esperarSemPermissao()
    })
  })
})

describe('R2: a releitura que falha por erro passageiro mantém a caixa, o motivo e a recusa (MAT-40:RF-15)', () => {
  const TEXTO_REDE = TEXTOS_ERRO_COMUNIDADE.rede

  async function ateAsAcoes(tela: 'M3' | 'M2') {
    const resultado =
      tela === 'M3'
        ? cena('moderador', `/moderacao/conteudo/topico/${CONTEUDO.topicoDoAutor}`)
        : cena('moderador', `/moderacao/denuncia/${ID_DA_DENUNCIA}`, comDenuncia)
    await aguardarH1(tela === 'M3' ? NOMES_DAS_TELAS.conteudo : NOMES_DAS_TELAS.denuncia)
    const caixa =
      tela === 'M3'
        ? await abrirCaixa(ACAO_NO_CONTEUDO.oculto.botao, ACAO_NO_CONTEUDO.oculto.titulo)
        : await abrirCaixa(DECISAO.improcedente.botao, DECISAO.improcedente.titulo)
    const confirmar = tela === 'M3' ? ACAO_NO_CONTEUDO.oculto.confirmar : DECISAO.improcedente.confirmar
    const escrita = tela === 'M3' ? 'moderarConteudo' : 'decidirDenuncia'
    const leitura = tela === 'M3' ? 'lerConteudo' : 'lerDenuncia'
    return { ...resultado, caixa, confirmar, escrita, leitura } as const
  }

  for (const tela of ['M3', 'M2'] as const) {
    describe(tela, () => {
      it('ação recusada + releitura com rede: a caixa continua aberta com o motivo, a frase da recusa e a leitura com "Tentar de novo"', async () => {
        const { moderacao, caixa, confirmar, escrita, leitura } = await ateAsAcoes(tela)
        simularFalhaModeracao(moderacao, escrita, 'estado_igual')
        simularFalhaModeracao(moderacao, leitura, 'rede')
        confirmarNaCaixa(caixa, 'Meu motivo digitado', confirmar)

        await within(caixa).findByText(TEXTOS_ERRO_MODERACAO.estado_igual)
        await within(caixa).findByText(TEXTO_REDE)
        expect(screen.getByRole('dialog')).toBe(caixa)
        expect((within(caixa).getByLabelText(/^Motivo/) as HTMLTextAreaElement).value).toBe('Meu motivo digitado')
        expect(within(caixa).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo })).toBeTruthy()
      })

      it('"Tentar de novo" com sucesso: a leitura volta, a caixa fica com o motivo, e agir de novo segue normal', async () => {
        const { estado, moderacao, caixa, confirmar, escrita, leitura } = await ateAsAcoes(tela)
        simularFalhaModeracao(moderacao, escrita, 'estado_igual')
        simularFalhaModeracao(moderacao, leitura, 'rede')
        confirmarNaCaixa(caixa, 'Meu motivo digitado', confirmar)
        await within(caixa).findByText(TEXTO_REDE)

        fireEvent.click(within(caixa).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
        await waitFor(() => expect(within(caixa).queryByText(TEXTO_REDE)).toBeNull())
        expect(screen.getByRole('dialog')).toBe(caixa)
        expect((within(caixa).getByLabelText(/^Motivo/) as HTMLTextAreaElement).value).toBe('Meu motivo digitado')
        expect(screen.queryByText(TEXTO_REDE)).toBeNull()

        fireEvent.click(within(caixa).getByRole('button', { name: confirmar }))
        await statusDiz(TX.tx14)
        expect(estado.auditoria).toHaveLength(1)
        expect(screen.queryByRole('dialog')).toBeNull()
      })

      it('"Tentar de novo" que falha de novo: a caixa continua, e o erro volta', async () => {
        const { moderacao, caixa, confirmar, escrita, leitura } = await ateAsAcoes(tela)
        simularFalhaModeracao(moderacao, escrita, 'estado_igual')
        simularFalhaModeracao(moderacao, leitura, 'rede')
        simularFalhaModeracao(moderacao, leitura, 'rede')
        confirmarNaCaixa(caixa, 'Meu motivo digitado', confirmar)
        await within(caixa).findByText(TEXTO_REDE)

        fireEvent.click(within(caixa).getByRole('button', { name: COMUM_COMUNIDADE.tentarDeNovo }))
        await within(caixa).findByText(TEXTO_REDE)
        expect(screen.getByRole('dialog')).toBe(caixa)
        expect((within(caixa).getByLabelText(/^Motivo/) as HTMLTextAreaElement).value).toBe('Meu motivo digitado')
      })

      it('perder o papel durante a releitura continua fechando o acesso: TX-12, sem caixa', async () => {
        const { estado, moderacao, caixa, confirmar, escrita } = await ateAsAcoes(tela)
        // A escrita é a de `ocultar` (M3) ou a decisão (M2): as duas devolvem a recusa depois de o papel sumir.
        const espiao = vi.spyOn(moderacao, escrita) as unknown as { mockImplementationOnce: (corpo: () => Promise<unknown>) => void }
        espiao.mockImplementationOnce(async () => {
          perderPapel(estado, ELENCO.moderador.conta)
          return { ok: false, erro: erroDaChaveModeracao('estado_igual') }
        })
        confirmarNaCaixa(caixa, 'Meu motivo digitado', confirmar)
        await esperarSemPermissao()
      })

      it('a releitura devolve sem_permissao: TX-12, sem caixa', async () => {
        const { moderacao, caixa, confirmar, escrita, leitura } = await ateAsAcoes(tela)
        simularFalhaModeracao(moderacao, escrita, 'estado_igual')
        simularFalhaModeracao(moderacao, leitura, 'sem_permissao')
        confirmarNaCaixa(caixa, 'Meu motivo digitado', confirmar)
        await esperarSemPermissao()
      })
    })
  }
})
