import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { CampoAcesso } from '../../componentes/conta/CampoAcesso.tsx'
import { caminhoComVolta, urlDoSite, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import {
  BlocoDoFormulario,
  BotaoEnvio,
  ItemAvisoDeDemonstracao,
  ItemEtiquetaPrototipo,
  ItemLinkDaAbertura,
  LinhasDeExplicacao,
  ResumoErroAcesso,
} from '../../componentes/conta/PartesAcesso.tsx'
import { useDadosConta } from '../../componentes/conta/sessao.tsx'
import { COMUM, RECUPERAR, TITULOS, textoDoErro } from '../../conteudo/conta.ts'
import type { Resultado } from '../../dados/comum.ts'

// /recuperar-acesso (RF-12). Nenhum resultado depende de a conta existir, então nenhum a revela:
// `ok` e qualquer erro de negócio (fora `muitas_tentativas` e `email_invalido`) dão a mesma
// mensagem; rede, "tente de novo" e desconhecido pedem "Tentar de novo". A mensagem de resultado é a
// região de status da tela e fica na linha do campo (R-3): a linha tem sempre 112 px.
export function RecuperarAcesso() {
  const dados = useDadosConta()
  const [parametros] = useSearchParams()
  const volta = voltaValida(parametros.get('volta'))

  const [email, setEmail] = useState('')
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erroDoEnvio = estado.fase === 'erro' ? estado.erro : null
  const noCampo = erroDoEnvio?.chave === 'email_invalido'
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !noCampo ? estado : null)

  useEffect(() => {
    if (noCampo) emailRef.current?.focus()
  }, [estado, noCampo])

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!email.trim()) {
      setErroLocal(COMUM.escrevaEmail)
      return emailRef.current?.focus()
    }
    setErroLocal(null)
    setMensagem(null)
    const endereco = email.trim()
    void enviar({
      escrever: async (): Promise<Resultado<null>> => {
        // A troca de senha tem destino fixo: o `volta` não vai no link.
        const enviado = await dados.pedirRecuperacao(endereco, urlDoSite('redefinir-senha'))
        const igual =
          !enviado.ok &&
          enviado.erro.classe === 'negocio' &&
          enviado.erro.chave !== 'muitas_tentativas' &&
          enviado.erro.chave !== 'email_invalido'
        return igual ? { ok: true, valor: null } : enviado
      },
      aoSucesso: () => setMensagem(RECUPERAR.resultado),
    })
  }

  return (
    <MolduraPublica
      titulo={TITULOS.recuperarAcesso}
      subtitulo={RECUPERAR.frase}
      lateral={
        <>
          <ItemEtiquetaPrototipo />
          <ItemAvisoDeDemonstracao />
          <ItemLinkDaAbertura para={caminhoComVolta('/entrar', volta)}>{RECUPERAR.entrar}</ItemLinkDaAbertura>
          <ItemLinkDaAbertura para={caminhoComVolta('/criar-conta', volta)}>{RECUPERAR.criarConta}</ItemLinkDaAbertura>
        </>
      }
    >
      <BlocoDoFormulario>
        <form onSubmit={aoEnviar} noValidate>
          {erroDoEnvio && !noCampo ? (
            <ResumoErroAcesso
              erro={erroDoEnvio}
              repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
              aoTentarDeNovo={() => void tentarDeNovo()}
              refResumo={resumo}
            />
          ) : null}
          <div className="sb-acesso-campos">
            <CampoAcesso
              rotulo={COMUM.rotuloEmail}
              tipo="email"
              autoComplete="email"
              valor={email}
              aoMudar={(valor) => {
                setEmail(valor)
                setErroLocal(null)
              }}
              erro={erroLocal ?? (noCampo && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
              status={mensagem}
              refEntrada={emailRef}
            />
          </div>
          <div className="sb-acesso-acao">
            <BotaoEnvio enviando={enviando}>{enviando ? COMUM.enviando : RECUPERAR.botao}</BotaoEnvio>
          </div>
        </form>
      </BlocoDoFormulario>

      <LinhasDeExplicacao tema={RECUPERAR.explicacao.tema} linhas={RECUPERAR.explicacao.linhas} />
    </MolduraPublica>
  )
}
