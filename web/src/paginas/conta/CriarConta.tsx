import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Info } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { AreaDoLoginSocial } from '../../componentes/conta/AreaDoLoginSocial.tsx'
import { Campo, CampoSenha } from '../../componentes/conta/Campos.tsx'
import { caminhoComVolta, destinoDepoisDeEntrar, urlDoSite, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { fusoDoAparelho } from '../../componentes/conta/fusos.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { BOTAO_PRINCIPAL, Carregando, LINK_ALVO, RegiaoStatus, ResumoErro } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { erroDoEmail } from '../../componentes/conta/validarEmail.ts'
import { AVISO_BANCO_DEMONSTRACAO, COMUM, CRIAR_CONTA, MANCHETES, TITULOS, textoDoErro } from '../../conteudo/conta.ts'
import { modoDados } from '../../dados/comum.ts'

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
    const erroDoFormato = erroDoEmail(email)
    if (erroDoFormato) novos.email = erroDoFormato
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
  const comBanco = modoDados() === 'supabase'

  return (
    <MolduraPublica
      titulo={TITULOS.criarConta}
      manchete={MANCHETES.criarConta}
      frase={CRIAR_CONTA.frase}
      ocupado={carregando}
      ilustracao="maos-celular"
      ligacoes={
        <>
          <span>{CRIAR_CONTA.jaTemConta}</span>
          <Link to={caminhoComVolta('/entrar', volta)} className={LINK_ALVO}>
            {CRIAR_CONTA.entrar}
          </Link>
        </>
      }
    >
      {comBanco ? (
        <p
          data-aviso="banco-de-demonstracao"
          className="cm-pequeno flex items-start gap-3 rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3"
        >
          <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{AVISO_BANCO_DEMONSTRACAO}</span>
        </p>
      ) : null}
      <RegiaoStatus mensagem={confirmacao} />
      <AreaDoLoginSocial />
      {carregando ? (
        <Carregando />
      ) : sessao.estado === 'erro' && sessao.erro ? (
        <ResumoErro erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
      ) : (
        <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
          {erroDoEnvio && !campoDoErro ? (
            <ResumoErro
              erro={erroDoEnvio}
              repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
              aoTentarDeNovo={() => void tentarDeNovo()}
              refResumo={resumo}
            >
              {erroDoEnvio.chave === 'email_em_uso' ? (
                <div className="flex flex-wrap gap-x-4 text-[var(--cor-texto)]">
                  <Link to={caminhoComVolta('/entrar', volta)} className={LINK_ALVO}>
                    {TITULOS.entrar}
                  </Link>
                  <Link to={caminhoComVolta('/recuperar-acesso', volta)} className={LINK_ALVO}>
                    {TITULOS.recuperarAcesso}
                  </Link>
                </div>
              ) : null}
            </ResumoErro>
          ) : null}
          <Campo
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
            obrigatorio
          />
          <Campo
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
            obrigatorio
          />
          <CampoSenha
            rotulo={COMUM.rotuloSenha}
            ajuda={COMUM.ajudaSenha}
            autoComplete="new-password"
            valor={senha}
            aoMudar={(valor) => {
              setSenha(valor)
              setErros((antes) => ({ ...antes, senha: undefined }))
            }}
            erro={erros.senha ?? (campoDoErro === 'senha' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
            refEntrada={senhaRef}
            obrigatorio
          />
          <div>
            <p className="cm-pequeno text-[var(--cor-texto-2)]">{CRIAR_CONTA.termos.frase}</p>
            <ul className="m-0 flex list-none flex-wrap gap-x-5 p-0">
              <li>
                <Link to="/termos" className={`${LINK_ALVO} cm-pequeno`}>
                  {CRIAR_CONTA.termos.termos}
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className={`${LINK_ALVO} cm-pequeno`}>
                  {CRIAR_CONTA.termos.privacidade}
                </Link>
              </li>
            </ul>
          </div>
          <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? COMUM.criandoConta : CRIAR_CONTA.botao}
          </button>
        </form>
      )}
    </MolduraPublica>
  )
}
