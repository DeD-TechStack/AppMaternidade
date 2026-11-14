import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { MFA, textoDoErroModeracao } from '../../conteudo/moderacao.ts'
import type { ErroDados } from '../../dados/comum.ts'
import type { FatorNovo } from '../../dados/moderacao.ts'
import { FORMATO_DO_CODIGO } from '../../dados/moderacao.regras.ts'
import { Pilha } from '../base/layout/Pilha.tsx'
import { ResumoDeErro, Esqueleto } from '../comunidade/Avisos.tsx'
import { Faixa } from '../comunidade/Faixa.tsx'
import { useLeitura } from '../comunidade/useLeitura.ts'
import { useFocoNoResumo } from '../conta/foco.ts'
import { ErroDeLeituraNoPainel } from './Avisos.tsx'
import { TextoCopiavel } from './Copiar.tsx'
import { useDadosModeracao } from './dados.ts'
import { BOTAO_PRINCIPAL_QUEBRA, BOTAO_SECUNDARIO_QUEBRA } from './estilos.ts'

const ID_DO_CODIGO = 'mfa-codigo'

interface Props {
  /** A sessão passou a `aal2`: o painel carrega. */
  aoVerificar: () => void
}

// A verificação em duas etapas do painel (MAT-40:RF-20), só com o interruptor ligado: cadastra o app
// autenticador (TOTP) quando a conta ainda não tem fator verificado e confere o código de 6 dígitos.
export function VerificacaoEmDuasEtapas({ aoVerificar }: Props) {
  const dados = useDadosModeracao()
  const fatores = useLeitura(() => dados.fatores(), 'fatores')
  const [novo, setNovo] = useState<FatorNovo | null>(null)
  const [cadastrando, setCadastrando] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null)
  const [erro, setErro] = useState<{ erro: ErroDados; texto: string; acao: 'cadastrar' | 'confirmar' } | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [focarCampo, setFocarCampo] = useState(0)
  const resumo = useFocoNoResumo(erro)

  useEffect(() => {
    if (focarCampo > 0) campo.current?.focus()
  }, [focarCampo])

  const verificado = fatores.estado.fase === 'pronto' ? fatores.estado.valor.find((fator) => fator.verificado) : undefined
  const fatorId = novo?.id ?? verificado?.id ?? null

  async function cadastrar() {
    if (cadastrando) return
    setCadastrando(true)
    setErro(null)
    const feito = await dados.cadastrarFator()
    setCadastrando(false)
    if (!feito.ok) return setErro({ erro: feito.erro, texto: textoDoErroModeracao(feito.erro), acao: 'cadastrar' })
    setNovo(feito.valor)
  }

  async function confirmar(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault()
    if (confirmando || fatorId === null) return
    if (!FORMATO_DO_CODIGO.test(codigo)) {
      setErroDoCampo(MFA.erroFormato)
      return setFocarCampo((n) => n + 1)
    }
    setErroDoCampo(null)
    setErro(null)
    setConfirmando(true)
    const feita = await dados.confirmarCodigo(fatorId, codigo)
    setConfirmando(false)
    if (feita.ok) return aoVerificar()
    if (feita.erro.chave === 'codigo_invalido') {
      setCodigo('')
      setErroDoCampo(textoDoErroModeracao(feita.erro))
      return setFocarCampo((n) => n + 1)
    }
    setErro({ erro: feita.erro, texto: textoDoErroModeracao(feita.erro), acao: 'confirmar' })
  }

  function tentarDeNovo() {
    if (erro?.acao === 'cadastrar') void cadastrar()
    else void confirmar()
  }

  const repetivel = erro?.erro.classe === 'rede'
  const pedeCadastro = fatores.estado.fase === 'pronto' && !verificado && novo === null
  const pedeCodigo = fatores.estado.fase === 'pronto' && fatorId !== null

  return (
    <Faixa aria-labelledby="mfa-titulo" aria-busy={fatores.estado.fase === 'carregando' || undefined}>
      <Pilha vao="grupo" className="max-w-leitura">
        <Pilha vao="pilha">
          <h2 id="mfa-titulo" className="cm-h4 text-titulo-4">
            {MFA.titulo}
          </h2>
          <p>{MFA.frase}</p>
        </Pilha>

        {fatores.esqueleto ? <Esqueleto linhas={1} /> : null}
        {fatores.estado.fase === 'erro' ? (
          <ErroDeLeituraNoPainel erro={fatores.estado.erro} aoTentarDeNovo={() => void fatores.recarregar()} />
        ) : null}
        {erro ? (
          <ResumoDeErro
            texto={erro.texto}
            rotuloDaAcao={repetivel ? COMUM_COMUNIDADE.tentarDeNovo : undefined}
            aoAgir={tentarDeNovo}
            refResumo={resumo}
          />
        ) : null}

        {pedeCadastro ? (
          <div>
            <button type="button" disabled={cadastrando} className={BOTAO_SECUNDARIO_QUEBRA} data-tamanho="app" onClick={() => void cadastrar()}>
              {cadastrando ? MFA.cadastrando : MFA.cadastrar}
            </button>
          </div>
        ) : null}

        {novo ? (
          <Pilha vao="pilha" className="items-start">
            <img src={novo.qr} alt={MFA.altDoQr} width={192} height={192} className="size-48 rounded-campo border border-[var(--cor-fio-suave)] bg-white" />
            <p>{MFA.ouDigite}</p>
            <TextoCopiavel texto={novo.chave} rotulo={MFA.copiarChave} mensagemOk={MFA.chaveCopiada} mensagemFalha={MFA.copieAChave} />
          </Pilha>
        ) : null}

        {pedeCodigo ? (
          <form noValidate onSubmit={(evento) => void confirmar(evento)} className="flex flex-col gap-esp-pilha">
            <div className="cm-campo grid-cols-[minmax(0,1fr)] min-w-0 max-w-[40ch]">
            <label htmlFor={ID_DO_CODIGO} className="cm-campo-rotulo">
              {MFA.campoCodigo}
            </label>
            <div className="cm-campo-controle">
              <input
                ref={campo}
                id={ID_DO_CODIGO}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                aria-invalid={erroDoCampo ? true : undefined}
                aria-describedby={erroDoCampo ? `${ID_DO_CODIGO}-erro` : undefined}
                onChange={(evento) => {
                  setCodigo(evento.target.value)
                  setErroDoCampo(null)
                }}
                className="cm-campo-entrada alvo-toque min-w-0 tabular"
              />
            </div>
            {erroDoCampo ? (
              <p id={`${ID_DO_CODIGO}-erro`} className="cm-campo-mensagem cm-campo-erro cm-pequeno wrap-anywhere">
                {erroDoCampo}
              </p>
            ) : null}
          </div>
          <div className="max-w-[40ch]">
            <button type="submit" disabled={confirmando} className={BOTAO_PRINCIPAL_QUEBRA}>
              {confirmando ? MFA.verificando : MFA.confirmar}
            </button>
          </div>
        </form>
      ) : null}
      </Pilha>
    </Faixa>
  )
}
