import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { DuasColunas } from '../../componentes/acesso/DuasColunas.tsx'
import { Manchete } from '../../componentes/acesso/Manchete.tsx'
import { Campo, SeletorFuso } from '../../componentes/conta/Campos.tsx'
import { destinoDepoisDeEntrar, voltaValida } from '../../componentes/conta/destino.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo, useFocoNoTitulo } from '../../componentes/conta/foco.ts'
import { fusoDoAparelho } from '../../componentes/conta/fusos.ts'
import { MolduraLogada } from '../../componentes/conta/MolduraLogada.tsx'
import { BOTAO_PRINCIPAL, RegiaoStatus, ResumoErro } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { COMECAR, COMUM, MANCHETES, textoDaPassagem, textoDoErro } from '../../conteudo/conta.ts'
import { EscolhaDeFamilia } from './EscolhaDeFamilia.tsx'

// /app/comecar (RF-14). Com conta incompleta, o passo "Seu nome": "Salvar" cria a conta e segue para
// o destino do RF-10. Com a conta completa, a escolha entre criar uma família e usar um convite; um
// `volta` válido (que só chega depois do passo "Seu nome") leva direto ao destino.
export function Comecar() {
  const sessao = useSessao()
  const [parametros] = useSearchParams()
  const volta = voltaValida(parametros.get('volta'))
  // O passo "Seu nome" acabou de salvar: o RF-10 vale de novo, já com a conta completa.
  const [salvouNome, setSalvouNome] = useState(false)

  if (sessao.conta) {
    if (salvouNome || volta) return <Navigate to={destinoDepoisDeEntrar(volta, true)} replace />
    return <EscolhaDeFamilia conta={sessao.conta} />
  }
  return <PassoSeuNome aoSalvar={() => setSalvouNome(true)} />
}

// O passo "Seu nome" (só com conta incompleta): nome (preenchido com o dos metadados) e fuso.
// A mensagem de passagem que chegar (`senha_trocada`) aparece no status.
function PassoSeuNome({ aoSalvar }: { aoSalvar: () => void }) {
  const sessao = useSessao()
  const dados = useDadosConta()
  const location = useLocation()
  const titulo = useFocoNoTitulo()

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

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
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
      // Com a conta lida, o `Comecar` vira o redirecionamento do destino.
      aoSucesso: async () => {
        aoSalvar()
        await sessao.recarregarConta()
      },
    })
  }

  return (
    <MolduraLogada>
      <DuasColunas ilustracao="tummy-time">
        <Manchete linhas={MANCHETES.comecar} refTitulo={titulo} />
        <RegiaoStatus mensagem={textoDaPassagem(location.state)} />
        <section
          aria-labelledby="titulo-seu-nome"
          className="mt-2 flex max-w-[32rem] flex-col gap-4 rounded-cartao lg:mt-6 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-6 lg:p-8"
        >
          <h2 id="titulo-seu-nome" className="cm-h4">
            {COMECAR.titulo}
          </h2>
          <p>{COMECAR.frase}</p>
          <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-5">
            {erroDoEnvio && !campoDoErro ? (
              <ResumoErro
                erro={erroDoEnvio}
                repetivel={estado.fase === 'erro' && estado.tentarDeNovo}
                aoTentarDeNovo={() => void tentarDeNovo()}
                refResumo={resumo}
              />
            ) : null}
            <Campo
              rotulo={COMUM.rotuloNome}
              ajuda={COMUM.ajudaNome}
              autoComplete="name"
              tamanho="app"
              valor={nome}
              aoMudar={(valor) => {
                setNome(valor)
                setErroNome(null)
              }}
              erro={erroNome ?? (campoDoErro === 'nome' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null)}
              refEntrada={nomeRef}
            />
            <SeletorFuso
              rotulo={COMECAR.fuso}
              ajuda={COMECAR.ajudaFuso}
              tamanho="app"
              valor={fuso}
              aoMudar={setFuso}
              erro={campoDoErro === 'fuso' && erroDoEnvio ? textoDoErro(erroDoEnvio) : null}
              refEntrada={fusoRef}
            />
            <button type="submit" disabled={enviando} className={BOTAO_PRINCIPAL}>
              {enviando ? COMUM.salvando : COMECAR.botao}
            </button>
          </form>
        </section>
      </DuasColunas>
    </MolduraLogada>
  )
}
