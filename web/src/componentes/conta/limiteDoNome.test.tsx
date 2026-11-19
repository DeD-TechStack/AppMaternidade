import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { COMECAR_FAMILIA } from '../../conteudo/conta.ts'
import { criarDadosContaMemoria } from '../../dados/conta.memoria.ts'
import { criarFixtureDeTeste } from '../../teste/renderizarComDados.tsx'
import { Campo } from './Campos.tsx'
import { FormularioBebe } from './FormularioBebe.tsx'
import { FormularioFamilia } from './FormularioFamilia.tsx'
import { NOME_DA_CONTA_MAX, NOME_DA_FAMILIA_MAX, NOME_DO_BEBE_MAX } from './limitesDeNome.ts'
import { ProvedorDadosConta } from './sessao.tsx'

// QH-03 (SEC-05): os campos de nome levam o `maxLength` nativo igual ao limite do banco
// (nome_privado 80, familias.nome 80, bebes.nome 60). Nada mais muda: sem mensagem, sem contador.

const semEfeito = () => undefined

describe('os limites de nome (SEC-05)', () => {
  it('são os mesmos dos CHECKs do banco: conta 80, família 80, bebê 60', () => {
    expect(NOME_DA_CONTA_MAX).toBe(80)
    expect(NOME_DA_FAMILIA_MAX).toBe(80)
    expect(NOME_DO_BEBE_MAX).toBe(60)
  })
})

describe('Campo: maxLength', () => {
  it('passa o maxLength recebido ao <input>', () => {
    render(<Campo rotulo="Seu nome" valor="" aoMudar={semEfeito} maxLength={80} />)

    expect((screen.getByLabelText('Seu nome') as HTMLInputElement).maxLength).toBe(80)
  })

  it('sem a propriedade, o <input> não tem limite (o e-mail, por exemplo)', () => {
    render(<Campo rotulo="E-mail" tipo="email" valor="" aoMudar={semEfeito} />)

    const entrada = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(entrada.hasAttribute('maxlength')).toBe(false)
    expect(entrada.maxLength).toBe(-1)
  })
})

describe('os formulários da família e do bebê', () => {
  it('FormularioFamilia: o campo de nome tem maxLength 80', () => {
    render(
      <FormularioFamilia
        fuso="America/Sao_Paulo"
        rotuloNome="Nome da família"
        rotuloFuso="Fuso da família"
        rotuloSalvar="Salvar"
        rotuloSecundario="Cancelar"
        aoSecundario={semEfeito}
        escrever={async () => ({ ok: true, valor: undefined })}
        aoSucesso={semEfeito}
      />,
    )

    expect((screen.getByLabelText('Nome da família') as HTMLInputElement).maxLength).toBe(NOME_DA_FAMILIA_MAX)
  })

  it('FormularioBebe: o campo de nome tem maxLength 60 e o de nascimento não tem limite', () => {
    const dados = criarDadosContaMemoria(criarFixtureDeTeste(Date.now()))
    render(
      <ProvedorDadosConta dados={dados}>
        <FormularioBebe
          familiaId="familia-teste"
          fuso="America/Sao_Paulo"
          rotuloSalvar="Salvar"
          rotuloSecundario="Cancelar"
          aoSecundario={semEfeito}
          aoSalvo={semEfeito}
        />
      </ProvedorDadosConta>,
    )

    expect((screen.getByLabelText(COMECAR_FAMILIA.bebe.nome) as HTMLInputElement).maxLength).toBe(NOME_DO_BEBE_MAX)
    expect(screen.getByLabelText(COMECAR_FAMILIA.bebe.nascimento).hasAttribute('maxlength')).toBe(false)
  })
})
