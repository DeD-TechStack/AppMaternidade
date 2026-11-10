import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { AreaDoLoginSocial } from '../../componentes/conta/AreaDoLoginSocial.tsx'
import { CampoAcesso } from '../../componentes/conta/CampoAcesso.tsx'
import { caminhoComVolta, destinoDepoisDeEntrar, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import {
  BlocoDoFormulario,
  BotaoEnvio,
  CarregandoAcesso,
  ItemAvisoDeDemonstracao,
  ItemEtiquetaPrototipo,
  ItemLinkDaAbertura,
  LinhasDeExplicacao,
  LinkAcesso,
  RegiaoStatusAcesso,
  ResumoErroAcesso,
} from '../../componentes/conta/PartesAcesso.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMUM, ENTRAR, TITULOS, textoDaPassagem } from '../../conteudo/conta.ts'

// /entrar (RF-12): e-mail e senha. Campo vazio dá erro no próprio campo, sem chamar o banco. Erro
// do catálogo aparece no topo do formulário, e o foco vai para ele. Quem já tem sessão vai ao
// destino do RF-10.
export function Entrar() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
  const [parametros] = useSearchParams()
  const volta = voltaValida(parametros.get('volta'))

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const senhaRef = useRef<HTMLInputElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()
  const resumo = useFocoNoResumo(estado.fase === 'erro' ? estado : null)

  // A saída já mostrou o motivo aqui; ele não vale para a próxima rota logada.
  const { consumirMotivoSaida } = sessao
  useEffect(() => {
    consumirMotivoSaida()
  }, [consumirMotivoSaida])

  if (sessao.estado === 'com_sessao') {
    return <Navigate to={destinoDepoisDeEntrar(volta, sessao.conta !== null)} replace />
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const novos: { email?: string; senha?: string } = {}
    if (!email.trim()) novos.email = COMUM.escrevaEmail
    if (!senha) novos.senha = COMUM.escrevaSenha
    setErros(novos)
    if (novos.email) return emailRef.current?.focus()
    if (novos.senha) return senhaRef.current?.focus()

    void enviar({
      escrever: () => dados.entrar(email.trim(), senha),
      // Com a sessão lida, esta tela vira o redirecionamento do destino.
      aoSucesso: () => sessao.recarregarConta(),
    })
  }

  const carregando = sessao.estado === 'carregando'

  return (
    <MolduraPublica
      titulo={TITULOS.entrar}
      subtitulo={ENTRAR.frase}
      ocupado={carregando}
      lateral={
        <>
          <ItemEtiquetaPrototipo />
          <ItemAvisoDeDemonstracao />
          <ItemLinkDaAbertura para={caminhoComVolta('/criar-conta', volta)}>{ENTRAR.criarConta}</ItemLinkDaAbertura>
        </>
      }
    >
      <BlocoDoFormulario>
        <RegiaoStatusAcesso mensagem={textoDaPassagem(location.state)} />
        <AreaDoLoginSocial />
        {carregando ? (
          <CarregandoAcesso />
        ) : sessao.estado === 'erro' && sessao.erro ? (
          <ResumoErroAcesso erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
        ) : (
          <form onSubmit={aoEnviar} noValidate>
            {estado.fase === 'erro' ? (
              <ResumoErroAcesso
                erro={estado.erro}
                repetivel={estado.tentarDeNovo}
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
                  setErros((antes) => ({ ...antes, email: undefined }))
                }}
                erro={erros.email}
                refEntrada={emailRef}
              />
              <CampoAcesso
                rotulo={COMUM.rotuloSenha}
                tipo="password"
                mostrarSenha
                autoComplete="current-password"
                valor={senha}
                aoMudar={(valor) => {
                  setSenha(valor)
                  setErros((antes) => ({ ...antes, senha: undefined }))
                }}
                erro={erros.senha}
                refEntrada={senhaRef}
              />
            </div>
            <div className="sb-acesso-acao">
              <BotaoEnvio enviando={enviando}>{enviando ? COMUM.entrando : ENTRAR.botao}</BotaoEnvio>
              <LinkAcesso para={caminhoComVolta('/recuperar-acesso', volta)}>{ENTRAR.esqueci}</LinkAcesso>
            </div>
          </form>
        )}
      </BlocoDoFormulario>

      <LinhasDeExplicacao tema={ENTRAR.explicacao.tema} linhas={ENTRAR.explicacao.linhas} />
    </MolduraPublica>
  )
}
