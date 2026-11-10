import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { apagarChave, CHAVE_RECUPERACAO, lerChave } from '../../componentes/conta/armazenamento.ts'
import { Campo, CampoSenha } from '../../componentes/conta/Campos.tsx'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { BOTAO_PRINCIPAL, Carregando, LINK_ALVO, ResumoErro } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMUM, REDEFINIR, TEXTOS_ERRO, TITULOS, textoDoErro } from '../../conteudo/conta.ts'

// /redefinir-senha (RF-12). O formulário só aparece com a marca de recuperação: o provedor de
// sessão grava no `sessionStorage` o id do usuário da sessão do evento `recuperacao`, e a marca
// vale só enquanto o id da sessão é igual ao guardado. Assim recarregar mantém o formulário, e
// estar entrada sem o link nunca permite trocar a senha por aqui.
export function RedefinirSenha() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const navigate = useNavigate()
  const { hash, search } = useLocation()

  const [nova, setNova] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erros, setErros] = useState<{ nova?: string; repetida?: string }>({})
  const novaRef = useRef<HTMLInputElement>(null)
  const repetidaRef = useRef<HTMLInputElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erroDoEnvio = estado.fase === 'erro' ? estado.erro : null
  const noCampo = erroDoEnvio?.chave === 'senha_igual' || erroDoEnvio?.chave === 'senha_fraca'
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !noCampo ? estado : null)

  useEffect(() => {
    if (noCampo) novaRef.current?.focus()
  }, [estado, noCampo])

  const usuarioId = sessao.usuario?.id ?? null
  const marca = lerChave('sessao', CHAVE_RECUPERACAO)
  const linkVencidoNaUrl = /error_code=otp_expired/.test(hash) || /error_code=otp_expired/.test(search)
  const marcaValida = sessao.estado === 'com_sessao' && usuarioId !== null && marca === usuarioId

  // Uma marca com o id de outra pessoa não vale mais.
  const marcaDeOutro = marca !== null && usuarioId !== null && marca !== usuarioId
  useEffect(() => {
    if (marcaDeOutro) apagarChave('sessao', CHAVE_RECUPERACAO)
  }, [marcaDeOutro])

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const novos: { nova?: string; repetida?: string } = {}
    if (!nova) novos.nova = COMUM.escrevaSenha
    if (!repetida) novos.repetida = COMUM.repitaSenha
    else if (nova && repetida !== nova) novos.repetida = COMUM.senhasDiferentes
    setErros(novos)
    if (novos.nova) return novaRef.current?.focus()
    if (novos.repetida) return repetidaRef.current?.focus()

    void enviar({
      escrever: () => dados.trocarSenha(nova),
      // Se a resposta se perdeu depois de gravar, a repetição responde `senha_igual`: a senha já é a nova.
      provaSucesso: (erro) => erro.chave === 'senha_igual',
      aoSucesso: async () => {
        // A marca só cai depois de a tela sair do ar, para o formulário não piscar como "link vencido".
        await navigate('/app/conta', { state: { mensagem: 'senha_trocada' } })
        apagarChave('sessao', CHAVE_RECUPERACAO)
      },
    })
  }

  const carregando = sessao.estado === 'carregando'
  const vencido = !carregando && (linkVencidoNaUrl || !marcaValida)

  return (
    <MolduraPublica titulo={TITULOS.redefinirSenha} frase={REDEFINIR.frase} ocupado={carregando}>
      {carregando ? (
        <Carregando />
      ) : vencido ? (
        <div className="flex flex-col items-start gap-3">
          <p className="font-semibold">{TEXTOS_ERRO.link_vencido}</p>
          <Link to="/recuperar-acesso" className={LINK_ALVO}>
            {REDEFINIR.pedirOutroLink}
          </Link>
        </div>
      ) : (
        <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
          {erroDoEnvio && !noCampo ? (
            <ResumoErro
              erro={erroDoEnvio}
              repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
              aoTentarDeNovo={() => void tentarDeNovo()}
              refResumo={resumo}
            />
          ) : null}
          <CampoSenha
            rotulo={REDEFINIR.novaSenha}
            ajuda={COMUM.ajudaSenha}
            autoComplete="new-password"
            valor={nova}
            aoMudar={(valor) => {
              setNova(valor)
              setErros((antes) => ({ ...antes, nova: undefined }))
            }}
            erro={erros.nova ?? (noCampo && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
            refEntrada={novaRef}
          />
          <Campo
            rotulo={REDEFINIR.repetirSenha}
            tipo="password"
            autoComplete="new-password"
            valor={repetida}
            aoMudar={(valor) => {
              setRepetida(valor)
              setErros((antes) => ({ ...antes, repetida: undefined }))
            }}
            erro={erros.repetida}
            refEntrada={repetidaRef}
          />
          <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
            {enviando ? COMUM.salvando : REDEFINIR.botao}
          </button>
        </form>
      )}
    </MolduraPublica>
  )
}
