import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { CampoAcesso } from '../../componentes/conta/CampoAcesso.tsx'
import { destinoDepoisDeEntrar, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { fusoDoAparelho } from '../../componentes/conta/fusos.ts'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import {
  BlocoDoFormulario,
  BotaoEnvio,
  ItemAvisoDeDemonstracao,
  ItemEtiquetaPrototipo,
  LinhasDeExplicacao,
  RegiaoStatusAcesso,
  ResumoErroAcesso,
} from '../../componentes/conta/PartesAcesso.tsx'
import { SeletorFusoAcesso } from '../../componentes/conta/SeletorFusoAcesso.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { Etiqueta } from '../../componentes/base/Etiqueta.tsx'
import { COMECAR, COMUM, TITULOS, textoDaPassagem, textoDoErro } from '../../conteudo/conta.ts'

// /app/comecar, passo "Seu nome" (RF-14): só com conta incompleta. "Salvar" cria a conta e segue
// para o destino do RF-10. Com a conta completa, a rota leva ao destino, que nunca é o próprio
// Começar (na 37a). A mensagem de passagem que chegar (`senha_trocada`) aparece no status. Sem
// "Sair" aqui: ele é só da Conta.
export function Comecar() {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
  const [parametros] = useSearchParams()
  const volta = voltaValida(parametros.get('volta'))

  const [nome, setNome] = useState(() => (sessao.usuario?.nomeMetadados ?? '').trim())
  const [fuso, setFuso] = useState(fusoDoAparelho)
  const [erroNome, setErroNome] = useState<string | null>(null)
  const nomeRef = useRef<HTMLInputElement>(null)
  const fusoRef = useRef<HTMLSelectElement>(null)
  const { estado, enviar, tentarDeNovo, enviando } = useEnvio()

  const erroDoEnvio = estado.fase === 'erro' ? estado.erro : null
  const campoDoErro = erroDoEnvio?.chave === 'nome_vazio' ? 'nome' : erroDoEnvio?.chave === 'fuso_invalido' ? 'fuso' : null
  const resumo = useFocoNoResumo(estado.fase === 'erro' && !campoDoErro && erroDoEnvio?.chave !== 'parametro_obrigatorio' ? estado : null)

  useEffect(() => {
    if (estado.fase !== 'erro') return
    // Sem campo preenchido, o foco vai ao primeiro campo vazio.
    if (campoDoErro === 'nome' || erroDoEnvio?.chave === 'parametro_obrigatorio') nomeRef.current?.focus()
    if (campoDoErro === 'fuso') fusoRef.current?.focus()
  }, [estado, campoDoErro, erroDoEnvio])

  if (sessao.conta) return <Navigate to={destinoDepoisDeEntrar(volta, true)} replace />

  function aoSalvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      setErroNome(COMUM.escrevaNome)
      return nomeRef.current?.focus()
    }
    setErroNome(null)
    void enviar({
      escrever: () => dados.criarMinhaConta(nomeLimpo, fuso),
      conferir: async () => {
        const lida = await dados.minhaConta()
        return lida.ok ? { ok: true, valor: lida.valor !== null } : lida
      },
      // Com a conta lida, esta tela vira o redirecionamento do destino.
      aoSucesso: () => sessao.recarregarConta(),
    })
  }

  return (
    <MolduraPublica
      titulo={TITULOS.comecar}
      subtitulo={COMECAR.frase}
      lateral={
        <>
          <li>
            <Etiqueta>{COMECAR.passo}</Etiqueta>
          </li>
          <ItemEtiquetaPrototipo />
          <ItemAvisoDeDemonstracao />
        </>
      }
    >
      <BlocoDoFormulario>
        <RegiaoStatusAcesso mensagem={textoDaPassagem(location.state)} />
        <form onSubmit={aoSalvar} noValidate>
          {erroDoEnvio && !campoDoErro ? (
            <ResumoErroAcesso
              erro={erroDoEnvio}
              repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
              aoTentarDeNovo={() => void tentarDeNovo()}
              refResumo={resumo}
            />
          ) : null}
          <div className="sb-acesso-campos conta-campos-compactos">
            <CampoAcesso
              rotulo={COMUM.rotuloNome}
              ajuda={COMUM.ajudaNome}
              autoComplete="name"
              valor={nome}
              aoMudar={(valor) => {
                setNome(valor)
                setErroNome(null)
              }}
              erro={erroNome ?? (campoDoErro === 'nome' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
              refEntrada={nomeRef}
            />
            <SeletorFusoAcesso
              rotulo={COMECAR.fuso}
              ajuda={COMECAR.ajudaFuso}
              valor={fuso}
              aoMudar={setFuso}
              erro={campoDoErro === 'fuso' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null}
              refEntrada={fusoRef}
            />
          </div>
          <div className="sb-acesso-acao">
            <BotaoEnvio enviando={enviando}>{enviando ? COMUM.salvando : COMECAR.botao}</BotaoEnvio>
          </div>
        </form>
      </BlocoDoFormulario>

      <LinhasDeExplicacao tema={COMECAR.explicacao.tema} linhas={COMECAR.explicacao.linhas} />
    </MolduraPublica>
  )
}
