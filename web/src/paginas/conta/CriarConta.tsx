import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { AreaDoLoginSocial } from '../../componentes/conta/AreaDoLoginSocial.tsx'
import { CampoAcesso } from '../../componentes/conta/CampoAcesso.tsx'
import { caminhoComVolta, destinoDepoisDeEntrar, urlDoSite, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { fusoDoAparelho } from '../../componentes/conta/fusos.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import {
  BlocoDoFormulario,
  BotaoEnvio,
  CarregandoAcesso,
  ItemAvisoDeDemonstracao,
  ItemLinkDaAbertura,
  LinhasDeExplicacao,
  LinkAcesso,
  RegiaoStatusAcesso,
  ResumoErroAcesso,
} from '../../componentes/conta/PartesAcesso.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMUM, CRIAR_CONTA, TITULOS, textoDoErro } from '../../conteudo/conta.ts'

// /criar-conta (RF-12). Cria o usuário no Auth com o nome nos metadados; com sessão devolvida,
// cria a conta com o nome e o fuso do aparelho e segue para o destino do RF-10. Sem sessão
// (Confirm email ligado), avisa na região de status e não cria a conta. Se a conta falhar depois
// do usuário, a pessoa fica com sessão e conta incompleta e o RF-10 a leva ao passo "Seu nome".
export function CriarConta() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const [parametros] = useSearchParams()
  const volta = voltaValida(parametros.get('volta'))

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<{ nome?: string; email?: string; senha?: string }>({})
  const [confirmacao, setConfirmacao] = useState<string | null>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const senhaRef = useRef<HTMLInputElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erroDoEnvio = estado.fase === 'erro' ? estado.erro : null
  const campoDoErro = erroDoEnvio?.chave === 'senha_fraca' ? 'senha' : erroDoEnvio?.chave === 'email_invalido' ? 'email' : null
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !campoDoErro ? estado : null)

  useEffect(() => {
    if (estado.fase !== 'erro') return
    if (campoDoErro === 'senha') senhaRef.current?.focus()
    if (campoDoErro === 'email') emailRef.current?.focus()
  }, [estado, campoDoErro])

  if (sessao.estado === 'com_sessao') {
    return <Navigate to={destinoDepoisDeEntrar(volta, sessao.conta !== null)} replace />
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const novos: { nome?: string; email?: string; senha?: string } = {}
    if (!nome.trim()) novos.nome = COMUM.escrevaNome
    if (!email.trim()) novos.email = COMUM.escrevaEmail
    if (!senha) novos.senha = COMUM.escrevaSenha
    setErros(novos)
    if (novos.nome) return nomeRef.current?.focus()
    if (novos.email) return emailRef.current?.focus()
    if (novos.senha) return senhaRef.current?.focus()

    const nomeLimpo = nome.trim()
    const emailLimpo = email.trim()
    const retorno = urlDoSite(caminhoComVolta('entrar', volta))
    setConfirmacao(null)
    void enviar({
      escrever: () => dados.criarUsuario(emailLimpo, senha, nomeLimpo, retorno),
      aoSucesso: async (criado) => {
        if (!criado) return
        if (!criado.comSessao) {
          setConfirmacao(CRIAR_CONTA.confirmacao(emailLimpo))
          return
        }
        // Qualquer falha aqui deixa a conta incompleta: o passo "Seu nome" a refaz.
        await dados.criarMinhaConta(nomeLimpo, fusoDoAparelho())
        await sessao.recarregarConta()
      },
    })
  }

  const carregando = sessao.estado === 'carregando'

  return (
    <MolduraPublica
      titulo={TITULOS.criarConta}
      subtitulo={CRIAR_CONTA.frase}
      ocupado={carregando}
      lateral={
        <>
          <ItemAvisoDeDemonstracao doBanco />
          <ItemLinkDaAbertura para={caminhoComVolta('/entrar', volta)}>{CRIAR_CONTA.entrar}</ItemLinkDaAbertura>
        </>
      }
    >
      <BlocoDoFormulario>
        <RegiaoStatusAcesso mensagem={confirmacao} />
        <AreaDoLoginSocial />
        {carregando ? (
          <CarregandoAcesso />
        ) : sessao.estado === 'erro' && sessao.erro ? (
          <ResumoErroAcesso erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
        ) : (
          <form onSubmit={aoEnviar} noValidate>
            {erroDoEnvio && !campoDoErro ? (
              <ResumoErroAcesso
                erro={erroDoEnvio}
                repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
                aoTentarDeNovo={() => void tentarDeNovo()}
                refResumo={resumo}
              >
                {erroDoEnvio.chave === 'email_em_uso' ? (
                  <div className="sb-acesso-links">
                    <LinkAcesso para={caminhoComVolta('/entrar', volta)}>{TITULOS.entrar}</LinkAcesso>
                    <LinkAcesso para={caminhoComVolta('/recuperar-acesso', volta)}>{TITULOS.recuperarAcesso}</LinkAcesso>
                  </div>
                ) : null}
              </ResumoErroAcesso>
            ) : null}
            <div className="sb-acesso-campos">
              <CampoAcesso
                rotulo={COMUM.rotuloNome}
                ajuda={COMUM.ajudaNome}
                autoComplete="name"
                valor={nome}
                aoMudar={(valor) => {
                  setNome(valor)
                  setErros((antes) => ({ ...antes, nome: undefined }))
                }}
                erro={erros.nome}
                refEntrada={nomeRef}
              />
              <CampoAcesso
                rotulo={COMUM.rotuloEmail}
                tipo="email"
                autoComplete="email"
                valor={email}
                aoMudar={(valor) => {
                  setEmail(valor)
                  setErros((antes) => ({ ...antes, email: undefined }))
                }}
                erro={erros.email ?? (campoDoErro === 'email' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
                refEntrada={emailRef}
              />
              <CampoAcesso
                rotulo={COMUM.rotuloSenha}
                tipo="password"
                mostrarSenha
                ajuda={COMUM.ajudaSenha}
                autoComplete="new-password"
                valor={senha}
                aoMudar={(valor) => {
                  setSenha(valor)
                  setErros((antes) => ({ ...antes, senha: undefined }))
                }}
                erro={erros.senha ?? (campoDoErro === 'senha' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
                refEntrada={senhaRef}
              />
            </div>
            <p className="sb-acesso-aceite t-corpo-p">
              {CRIAR_CONTA.termos.antes}
              <Link to="/termos">{CRIAR_CONTA.termos.termos}</Link>
              {CRIAR_CONTA.termos.meio}
              <Link to="/privacidade">{CRIAR_CONTA.termos.privacidade}</Link>
              {CRIAR_CONTA.termos.depois}
            </p>
            <div className="sb-acesso-acao">
              <BotaoEnvio enviando={enviando}>{enviando ? COMUM.criandoConta : CRIAR_CONTA.botao}</BotaoEnvio>
            </div>
          </form>
        )}
      </BlocoDoFormulario>

      <LinhasDeExplicacao tema={CRIAR_CONTA.explicacao.tema} linhas={CRIAR_CONTA.explicacao.linhas} />
    </MolduraPublica>
  )
}
