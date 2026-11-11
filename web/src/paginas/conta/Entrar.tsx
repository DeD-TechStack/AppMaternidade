import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import { AreaDoLoginSocial } from '../../componentes/conta/AreaDoLoginSocial.tsx'
import { CampoSenha, Campo } from '../../componentes/conta/Campos.tsx'
import { caminhoComVolta, destinoDepoisDeEntrar, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { BOTAO_PRINCIPAL, Carregando, LINK_ALVO, RegiaoStatus, ResumoErro } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMUM, ENTRAR, MANCHETES, TITULOS, textoDaPassagem } from '../../conteudo/conta.ts'

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
      manchete={MANCHETES.entrar}
      frase={ENTRAR.frase}
      ocupado={carregando}
      ligacoes={
        <>
          <span>{ENTRAR.semConta}</span>
          <Link to={caminhoComVolta('/criar-conta', volta)} className={LINK_ALVO}>
            {ENTRAR.criarConta}
          </Link>
        </>
      }
    >
      <RegiaoStatus mensagem={textoDaPassagem(location.state)} />
      <AreaDoLoginSocial />
      {carregando ? (
        <Carregando />
      ) : sessao.estado === 'erro' && sessao.erro ? (
        <ResumoErro erro={sessao.erro} repetivel aoTentarDeNovo={() => void sessao.recarregarConta()} />
      ) : (
        <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
          {estado.fase === 'erro' ? (
            <ResumoErro
              erro={estado.erro}
              repetivel={estado.tentarDeNovo}
              aoTentarDeNovo={() => void tentarDeNovo()}
              refResumo={resumo}
            />
          ) : null}
          <Campo
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
          <div className="flex flex-col gap-1">
            <CampoSenha
              rotulo={COMUM.rotuloSenha}
              autoComplete="current-password"
              valor={senha}
              aoMudar={(valor) => {
                setSenha(valor)
                setErros((antes) => ({ ...antes, senha: undefined }))
              }}
              erro={erros.senha}
              refEntrada={senhaRef}
            />
            <Link to={caminhoComVolta('/recuperar-acesso', volta)} className={`${LINK_ALVO} self-start`}>
              {ENTRAR.esqueci}
            </Link>
          </div>
          <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? COMUM.entrando : ENTRAR.botao}
          </button>
        </form>
      )}
    </MolduraPublica>
  )
}
