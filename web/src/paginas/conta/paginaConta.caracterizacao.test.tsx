import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { CHAVE_CONVITE, CHAVE_FAMILIA_ATUAL, CHAVE_RECUPERACAO } from '../../componentes/conta/armazenamento.ts'
import { COMUM, CONTA, TEXTOS_ERRO } from '../../conteudo/conta.ts'
import { SENHA_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { erroDaChave } from '../../dados/conta.erros.ts'
import { criarDadosContaMemoria, simularFalha } from '../../dados/conta.memoria.ts'
import { PESSOAS, criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'

const AGORA = Date.parse('2026-11-06T12:00:00.000Z')
const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(AGORA), { agora: () => AGORA })
const botao = (nome: string) => screen.getByRole('button', { name: nome })
const status = () => screen.getByRole('status')
const dialogo = () => screen.getByRole('dialog', { name: 'Excluir a sua conta?' })
const senha = () => within(dialogo()).getByLabelText('Senha atual', { selector: 'input' })

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.spyOn(Date, 'now').mockReturnValue(AGORA)
})

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

async function abrir(dados = novaMemoria()) {
  const tela = renderizarComDados('/app/conta', { dados, sessao: 'davi' })
  await screen.findByRole('heading', { level: 1, name: 'Conta' })
  await waitFor(() => expect(botao('Excluir minha conta')).toHaveProperty('disabled', false))
  return { ...tela, dados }
}

function confirmar(valor: string) {
  fireEvent.change(senha(), { target: { value: valor } })
  fireEvent.click(within(dialogo()).getByRole('button', { name: 'Excluir conta' }))
}

describe('Q-7: comportamento da Conta antes e depois da extração', () => {
  it('salva perfil e conserva o estado das outras seções no recarregamento da conta', async () => {
    const { dados } = await abrir()
    const atualizar = vi.spyOn(dados, 'atualizarMinhaConta')
    simularFalha(dados, 'exportarDados', 'rede')
    fireEvent.click(botao('Baixar meus dados'))
    const erroExportar = await screen.findByRole('alert')

    fireEvent.change(screen.getByLabelText('Seu nome', { selector: 'input' }), { target: { value: '  Davi Silva  ' } })
    fireEvent.change(screen.getByLabelText('Seu fuso horário', { selector: 'select' }), { target: { value: 'America/Manaus' } })
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(status().textContent).toBe('Dados salvos.'))
    expect(atualizar).toHaveBeenCalledExactlyOnceWith('Davi Silva', 'America/Manaus')
    expect(screen.getByText(`Davi Silva · ${PESSOAS.davi.email}`)).toBeTruthy()
    expect(screen.getByRole('alert')).toBe(erroExportar)
    expect(screen.getByRole('heading', { name: 'Avisos de outros cuidadores' })).toBeTruthy()
  })

  it('copia o ID e mantém a seleção manual quando a área de transferência recusa', async () => {
    const escrever = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('negada'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: escrever } })
    await abrir()
    fireEvent.click(botao('Copiar ID'))
    await waitFor(() => expect(status().textContent).toBe('ID copiado.'))
    expect(escrever).toHaveBeenCalledWith(PESSOAS.davi.id)
    fireEvent.click(botao('Copiar ID'))
    await waitFor(() => expect(status().textContent).toBe('Copie manualmente.'))
    expect(window.getSelection()?.toString()).toBe(PESSOAS.davi.id)
  })

  it('exporta um único arquivo com o fuso da conta e anuncia a conclusão no status compartilhado', async () => {
    const arquivos: Blob[] = []
    const nomes: string[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (arquivo: Blob) => { arquivos.push(arquivo); return 'blob:caracterizacao' },
    })
    const revogar = vi.fn()
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revogar })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nomes.push(this.download)
    })
    const { dados } = await abrir()
    const exportar = vi.spyOn(dados, 'exportarDados')
    const baixar = botao('Baixar meus dados')
    fireEvent.click(baixar)
    expect(baixar).toHaveProperty('disabled', true)
    expect(baixar.textContent).toBe(COMUM.preparandoArquivo)
    fireEvent.click(baixar)
    await waitFor(() => expect(status().textContent).toBe(CONTA.exportar.sucesso))
    expect(exportar).toHaveBeenCalledTimes(1)
    expect(nomes).toEqual(['appmaternidade-dados-2026-11-06.json'])
    expect(arquivos).toHaveLength(1)
    expect(arquivos[0].type).toBe('application/json')
    expect(revogar).toHaveBeenCalledExactlyOnceWith('blob:caracterizacao')
    expect(document.querySelector('a[download]')).toBeNull()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('repete exportação com erro sem mover o foco para o status de sucesso', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:caracterizacao' })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const { dados } = await abrir()
    simularFalha(dados, 'exportarDados', 'rede')
    fireEvent.click(botao('Baixar meus dados'))
    const alerta = await screen.findByRole('alert')
    await waitFor(() => expect(document.activeElement).toBe(alerta))
    expect(alerta.textContent).toContain(TEXTOS_ERRO.rede)
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(status().textContent).toBe('Arquivo baixado.'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.activeElement).not.toBe(status())
  })

  it('preserva o local do diálogo, o foco inicial e o retorno ao cancelar ou usar Escape', async () => {
    await abrir()
    const origem = botao('Excluir minha conta')
    for (const fechar of ['cancelar', 'escape']) {
      fireEvent.click(origem)
      expect(document.activeElement).toBe(senha())
      // O diálogo é irmão do quadro, não um item da pilha de seções.
      expect(dialogo().previousElementSibling?.querySelector('#perfil')).toBeTruthy()
      expect(dialogo().parentElement?.getAttribute('data-h')).toBe('secao')
      if (fechar === 'cancelar') fireEvent.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }))
      else fireEvent.keyDown(dialogo(), { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(origem)
    }
  })

  it('recusa senha vazia ou incorreta sem excluir a conta', async () => {
    const { dados } = await abrir()
    const entrar = vi.spyOn(dados, 'entrar')
    const excluir = vi.spyOn(dados, 'excluirConta')
    fireEvent.click(botao('Excluir minha conta'))
    confirmar('')
    expect(entrar).not.toHaveBeenCalled()
    expect(excluir).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(senha())
    confirmar('senha incorreta')
    await within(dialogo()).findByText('A senha não confere.')
    expect(entrar).toHaveBeenCalledExactlyOnceWith(PESSOAS.davi.email, 'senha incorreta')
    expect(excluir).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(senha()))
  })

  for (const prova of ['conta_inexistente', 'sessao_encerrada'] as const) {
    it(`na repetição, ${prova} prova o sucesso sem reconferir a senha; só sai depois de desmontar`, async () => {
      const dados = novaMemoria()
      const entrar = vi.spyOn(dados, 'entrar')
      const excluir = vi.spyOn(dados, 'excluirConta')
        .mockResolvedValueOnce({ ok: false, erro: erroDaChave('rede') })
        .mockResolvedValueOnce({ ok: false, erro: erroDaChave(prova) })
      const sairOriginal = dados.sair.bind(dados)
      const tela = await abrir(dados)
      const sair = vi.spyOn(dados, 'sair').mockImplementation(async () => {
        expect(screen.queryByRole('heading', { level: 1, name: 'Conta' })).toBeNull()
        expect(screen.queryByRole('dialog')).toBeNull()
        expect(tela.roteador.state.location.pathname).toBe('/conta-excluida')
        return sairOriginal()
      })
      localStorage.setItem(CHAVE_FAMILIA_ATUAL, JSON.stringify({ pessoa: PESSOAS.davi.id, familia: 'familia-ficticia' }))
      sessionStorage.setItem(CHAVE_CONVITE, 'convite-ficticio')
      sessionStorage.setItem(CHAVE_RECUPERACAO, PESSOAS.davi.id)
      fireEvent.click(botao('Excluir minha conta'))
      confirmar(SENHA_DEMONSTRACAO)
      const alerta = await within(dialogo()).findByRole('alert')
      await waitFor(() => expect(document.activeElement).toBe(alerta))
      expect(entrar).toHaveBeenCalledExactlyOnceWith(PESSOAS.davi.email, SENHA_DEMONSTRACAO)
      expect(sair).not.toHaveBeenCalled()
      fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
      await screen.findByText('Sua conta foi excluída.')
      await waitFor(() => expect(sair).toHaveBeenCalledTimes(1))
      expect(entrar).toHaveBeenCalledTimes(1)
      expect(excluir).toHaveBeenCalledTimes(2)
      expect(localStorage.getItem(CHAVE_FAMILIA_ATUAL)).toBeNull()
      expect(sessionStorage.getItem(CHAVE_CONVITE)).toBeNull()
      expect(sessionStorage.getItem(CHAVE_RECUPERACAO)).toBeNull()
    })
  }
})
