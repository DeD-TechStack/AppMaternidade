import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { FAMILIAS_DEMONSTRACAO } from '../../dados/conta.demonstracao.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste, renderizarComDados } from '../../teste/renderizarComDados.tsx'
import { hojeNoFuso, somarDias } from './datas.ts'
import { NOME_DA_CONTA_MAX, NOME_DA_FAMILIA_MAX, NOME_DO_BEBE_MAX } from './limitesDeNome.ts'

// QH-03 (SEC-05): os campos de nome levam o `maxLength` nativo igual ao limite do banco
// (nome_privado 80, familias.nome 80, bebes.nome 60). Nada mais muda: sem mensagem, sem contador.
// Cada fluxo real é exercido pela página roteada: o campo tem o limite e um nome com exatamente o
// limite é salvo inteiro. O jsdom só aplica o `maxLength` à digitação do usuário, por isso o corte
// em si não é verificado com `fireEvent.change`.

const EXEMPLO = FAMILIAS_DEMONSTRACAO.exemplo
const FUSO = 'America/Sao_Paulo'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

const novaMemoria = () => criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
const campo = (rotulo: string) => screen.getByLabelText(rotulo, { selector: 'input, select' }) as HTMLInputElement
const digitar = (rotulo: string, texto: string) => fireEvent.change(campo(rotulo), { target: { value: texto } })
const botao = (nome: string) => screen.getByRole('button', { name: nome }) as HTMLButtonElement
const nascimentoRecente = () => somarDias(hojeNoFuso(FUSO), -15)

async function memoriaSemConta() {
  const dados = novaMemoria()
  await dados.criarUsuario('nova@exemplo.invalid', 'senha-nova', 'Nova', 'http://localhost/entrar')
  return dados
}

async function nomeDaMinhaConta(dados: ReturnType<typeof novaMemoria>) {
  const conta = await dados.minhaConta()
  if (!conta.ok || !conta.valor) throw new Error('conta não lida')
  return conta.valor.nome
}

async function nomesDasFamilias(dados: ReturnType<typeof novaMemoria>) {
  const familias = await dados.minhasFamilias()
  if (!familias.ok) throw new Error('famílias não lidas')
  return familias.valor.map((familia) => familia.nome)
}

async function nomesDosBebes(dados: ReturnType<typeof novaMemoria>, familiaId: string) {
  const detalhe = await dados.detalheFamilia(familiaId)
  if (!detalhe.ok) throw new Error('detalhe não lido')
  return detalhe.valor.bebes.map((bebe) => bebe.nome)
}

describe('os limites de nome (SEC-05)', () => {
  it('são os mesmos dos CHECKs do banco: conta 80, família 80, bebê 60', () => {
    expect(NOME_DA_CONTA_MAX).toBe(80)
    expect(NOME_DA_FAMILIA_MAX).toBe(80)
    expect(NOME_DO_BEBE_MAX).toBe(60)
  })
})

describe('o nome da conta (80)', () => {
  it('/app/comecar, passo "Seu nome": o campo limita a 80 e um nome de 80 é salvo inteiro', async () => {
    const dados = await memoriaSemConta()
    renderizarComDados('/app/comecar', { dados })
    await screen.findByRole('heading', { level: 2, name: 'Seu nome' })

    expect(campo('Seu nome').maxLength).toBe(NOME_DA_CONTA_MAX)
    const nome = 'a'.repeat(NOME_DA_CONTA_MAX)
    digitar('Seu nome', nome)
    fireEvent.click(botao('Salvar'))

    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    const salvo = await nomeDaMinhaConta(dados)
    expect(salvo).toBe(nome)
    expect(salvo.length).toBe(NOME_DA_CONTA_MAX)
  })

  it('/app/conta, perfil: o campo limita a 80 e um nome de 80 é salvo inteiro', async () => {
    const dados = novaMemoria()
    renderizarComDados('/app/conta', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 1, name: 'Conta' })

    expect(campo('Seu nome').maxLength).toBe(NOME_DA_CONTA_MAX)
    const nome = 'b'.repeat(NOME_DA_CONTA_MAX)
    digitar('Seu nome', nome)
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Dados salvos.'))
    const salvo = await nomeDaMinhaConta(dados)
    expect(salvo).toBe(nome)
    expect(salvo.length).toBe(NOME_DA_CONTA_MAX)
  })
})

describe('o nome da família (80)', () => {
  it('criar, em /app/comecar: o campo limita a 80 e um nome de 80 é salvo inteiro', async () => {
    const dados = novaMemoria()
    renderizarComDados('/app/comecar', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    fireEvent.click(botao('Criar uma família'))

    expect(campo('Nome da família').maxLength).toBe(NOME_DA_FAMILIA_MAX)
    const nome = 'c'.repeat(NOME_DA_FAMILIA_MAX)
    digitar('Nome da família', nome)
    fireEvent.click(botao('Criar família'))

    await screen.findByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })
    const nomes = await nomesDasFamilias(dados)
    expect(nomes).toEqual([nome])
    expect(nomes[0].length).toBe(NOME_DA_FAMILIA_MAX)
  })

  it('editar, em /app/familia: o campo limita a 80 e um nome de 80 é salvo inteiro', async () => {
    const dados = novaMemoria()
    renderizarComDados('/app/familia', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
    fireEvent.click(botao('Editar família'))

    expect(campo('Nome da família').maxLength).toBe(NOME_DA_FAMILIA_MAX)
    const nome = 'd'.repeat(NOME_DA_FAMILIA_MAX)
    digitar('Nome da família', nome)
    fireEvent.click(botao('Salvar'))

    await screen.findByRole('heading', { level: 2, name: nome })
    const nomes = await nomesDasFamilias(dados)
    expect(nomes).toContain(nome)
    expect(nomes.find((n) => n === nome)!.length).toBe(NOME_DA_FAMILIA_MAX)
  })
})

describe('o nome do bebê (60)', () => {
  it('criar, em /app/comecar (passo do primeiro bebê): o campo limita a 60 e um nome de 60 é salvo inteiro', async () => {
    const dados = novaMemoria()
    renderizarComDados('/app/comecar', { dados, sessao: 'davi' })
    await screen.findByRole('heading', { level: 2, name: 'Como você quer começar?' })
    fireEvent.click(botao('Criar uma família'))
    digitar('Nome da família', 'Casa Nova')
    fireEvent.click(botao('Criar família'))
    await screen.findByRole('heading', { level: 2, name: 'Agora, o primeiro bebê' })

    expect(campo('Nome ou apelido').maxLength).toBe(NOME_DO_BEBE_MAX)
    const nome = 'e'.repeat(NOME_DO_BEBE_MAX)
    digitar('Nome ou apelido', nome)
    digitar('Data de nascimento', nascimentoRecente())
    fireEvent.click(botao('Salvar bebê'))

    await screen.findByRole('heading', { level: 1, name: 'Família' })
    const familias = await dados.minhasFamilias()
    if (!familias.ok) throw new Error('famílias não lidas')
    const nomes = await nomesDosBebes(dados, familias.valor[0].id)
    expect(nomes).toEqual([nome])
    expect(nomes[0].length).toBe(NOME_DO_BEBE_MAX)
  })

  it('criar, em /app/familia ("Adicionar bebê"): o campo limita a 60 e um nome de 60 é salvo inteiro', async () => {
    const dados = novaMemoria()
    renderizarComDados('/app/familia', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
    fireEvent.click(botao('Adicionar bebê'))

    expect(campo('Nome ou apelido').maxLength).toBe(NOME_DO_BEBE_MAX)
    const nome = 'f'.repeat(NOME_DO_BEBE_MAX)
    digitar('Nome ou apelido', nome)
    digitar('Data de nascimento', nascimentoRecente())
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`Bebê adicionado: ${nome}.`))
    const nomes = await nomesDosBebes(dados, EXEMPLO)
    expect(nomes).toContain(nome)
    expect(nomes.find((n) => n === nome)!.length).toBe(NOME_DO_BEBE_MAX)
  })

  it('editar, em /app/familia ("Editar Heloísa"): o campo limita a 60 e um nome de 60 é salvo inteiro', async () => {
    const dados = novaMemoria()
    renderizarComDados('/app/familia', { dados, sessao: 'juliana' })
    await screen.findByRole('heading', { level: 2, name: 'Bebês' })
    fireEvent.click(botao('Editar Heloísa'))

    expect(campo('Nome ou apelido').maxLength).toBe(NOME_DO_BEBE_MAX)
    const nome = 'g'.repeat(NOME_DO_BEBE_MAX)
    digitar('Nome ou apelido', nome)
    fireEvent.click(botao('Salvar'))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`Dados de ${nome} salvos.`))
    const nomes = await nomesDosBebes(dados, EXEMPLO)
    expect(nomes).toEqual([nome])
    expect(nomes[0].length).toBe(NOME_DO_BEBE_MAX)
  })
})

describe('/criar-conta', () => {
  it('o nome tem maxLength 80; o e-mail e a senha ficam sem o atributo maxlength', async () => {
    renderizarComDados('/criar-conta', { dados: novaMemoria() })
    // Nesta tela os rótulos levam o sufixo " (obrigatório)".
    const entrada = async (rotulo: string) =>
      (await screen.findByLabelText(`${rotulo} (obrigatório)`, { selector: 'input' })) as HTMLInputElement

    expect((await entrada('Seu nome')).maxLength).toBe(NOME_DA_CONTA_MAX)
    expect((await entrada('E-mail')).hasAttribute('maxlength')).toBe(false)
    expect((await entrada('Senha')).hasAttribute('maxlength')).toBe(false)
  })
})
