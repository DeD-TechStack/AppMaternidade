import { useId, useState } from 'react'
import { COMUM_COMUNIDADE, ROTULO_FAIXA } from '../../conteudo/comunidade.ts'
import { contarCaracteres, conferirLimite, FAIXAS, type FaixaBebe } from '../../dados/comunidade.regras.ts'

// Os campos de texto da Comunidade: rótulo visível, contador "x de N" sempre à vista e a mensagem do
// campo quando o texto sai do limite. O visual é o dos campos do "Campo de mel" (`cm-campo-*`).

interface CampoProps {
  /** O `id` do controle: a tela o usa para levar o foco ao campo com erro. */
  id: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  limite: { min: number; max: number }
  /** O que o campo diz quando o texto está fora do limite. */
  mensagemDoLimite: string
  /** O erro que veio do banco (por exemplo, apelido em uso). */
  erro?: string | null
  ajuda?: string
  linhas?: number
  /** A tela já tentou enviar: o mínimo vale mesmo com o campo ainda vazio. */
  tentou?: boolean
  autoComplete?: string
  /**
   * Campo obrigatório (A11Y-008): o rótulo ganha "(obrigatório)" e o controle `aria-required="true"`, sem o
   * `required` nativo (a tela confere e diz o que falta).
   */
  obrigatorio?: boolean
}

/** Um campo de uma linha ou, com `linhas`, uma caixa de texto. */
export function CampoComContador({
  id,
  rotulo,
  valor,
  aoMudar,
  limite,
  mensagemDoLimite,
  erro,
  ajuda,
  linhas,
  tentou = false,
  autoComplete,
  obrigatorio = false,
}: CampoProps) {
  const [tocou, setTocou] = useState(false)
  const situacao = conferirLimite(valor, limite)
  // O que passa do máximo avisa na hora; o que falta do mínimo avisa depois de a pessoa sair do campo.
  const fora = situacao === 'longo' || (situacao === 'curto' && (tocou || tentou || valor !== ''))
  const mensagem = erro ?? (fora ? mensagemDoLimite : null)
  const ligados = [mensagem ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null, `${id}-contador`].filter(Boolean).join(' ')
  const comum = {
    id,
    value: valor,
    onChange: (evento: { target: { value: string } }) => aoMudar(evento.target.value),
    onBlur: () => setTocou(true),
    'aria-required': obrigatorio ? (true as const) : undefined,
    'aria-invalid': mensagem ? (true as const) : undefined,
    'aria-describedby': ligados,
  }

  return (
    <div className="cm-campo max-w-[40rem]">
      <label htmlFor={id} className="cm-campo-rotulo">
        {obrigatorio ? `${rotulo} ${COMUM_COMUNIDADE.obrigatorio}` : rotulo}
      </label>
      <div className="cm-campo-controle">
        {linhas ? (
          <textarea {...comum} rows={linhas} className="cm-campo-entrada alvo-toque resize-y py-3 leading-6" />
        ) : (
          <input {...comum} type="text" autoComplete={autoComplete} className="cm-campo-entrada alvo-toque" />
        )}
      </div>
      {mensagem ? (
        <p id={`${id}-erro`} className="cm-campo-mensagem cm-campo-erro cm-pequeno">
          {mensagem}
        </p>
      ) : null}
      {ajuda ? (
        <p id={`${id}-ajuda`} className="cm-campo-mensagem cm-pequeno text-[var(--cor-texto-2)]">
          {ajuda}
        </p>
      ) : null}
      <p id={`${id}-contador`} className="cm-campo-mensagem cm-pequeno tabular text-[var(--cor-texto-2)]">
        {COMUM_COMUNIDADE.contador(contarCaracteres(valor), limite.max)}
      </p>
    </div>
  )
}

interface FaixaProps {
  rotulo: string
  valor: FaixaBebe | null
  aoMudar: (valor: FaixaBebe | null) => void
}

const OPCOES: Array<FaixaBebe | null> = [null, ...FAIXAS]

/** A faixa do bebê é escolhida pela pessoa: sem faixa, ou uma das três. */
export function EscolhaDeFaixa({ rotulo, valor, aoMudar }: FaixaProps) {
  const nome = useId()
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="cm-campo-rotulo mb-1 p-0">{rotulo}</legend>
      <div className="flex flex-wrap gap-x-6">
        {OPCOES.map((opcao) => (
          <label key={opcao ?? 'nenhuma'} className="alvo-toque flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={nome}
              checked={valor === opcao}
              onChange={() => aoMudar(opcao)}
              className="size-5 accent-[var(--cor-texto)]"
            />
            <span>{opcao === null ? COMUM_COMUNIDADE.semFaixa : ROTULO_FAIXA[opcao]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
