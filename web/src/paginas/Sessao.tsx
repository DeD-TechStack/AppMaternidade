import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Abertura } from '../componentes/base/Abertura.tsx'
import { ATIVIDADE_TUMMY } from '../conteudo/textos.ts'
import { BlocoCronometro } from '../prototipo/BlocoCronometro.tsx'
import { ItemAvisoDaAbertura } from '../prototipo/ItemAvisoDaAbertura.tsx'
import { MidiaDaSessao } from '../prototipo/MidiaDaSessao.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
import { focoDoEstado } from '../prototipo/foco.ts'
import { NOME_BEBE, ROTULO_SESSAO, ehTipoSessao, type TipoSessao } from '../prototipo/estado.ts'
import { formatarCronometro, formatarHora } from '../prototipo/formatar.ts'
import { SUBTITULO_SEM_SESSAO, TITULO_SEM_SESSAO } from '../prototipo/textosSessao.ts'
import { useAgora } from '../prototipo/useAgora.ts'
import { useTituloDaTela } from '../prototipo/useTituloDaTela.ts'

// O link de volta, na coluna lateral da abertura. O `li` guarda 44 px de layout e o link tem 56 de
// alvo nos dois temas (ver `.ha-li-link` no CSS), para a abertura não mudar de altura com o tema.
const VOLTAR_PARA_HOJE = (
  <li key="voltar" className="ha-li-link">
    <Link to="/app/hoje" state={{ foco: 'titulo' }} className="sb-abertura-link t-corpo alvo-toque">
      Voltar para Hoje
    </Link>
  </li>
)

// Com sessão: o cronômetro conta a partir do início (`agora - inicio`, nunca um contador).
function SessaoEmAndamento({
  tipo,
  inicio,
  pessoa,
  avisar,
  aoEncerrar,
  aoDescartar,
}: {
  tipo: TipoSessao
  inicio: number
  pessoa: string
  avisar: boolean
  aoEncerrar: (comNota: boolean) => void
  aoDescartar: () => void
}) {
  const agora = useAgora(1000)
  const rotulo = ROTULO_SESSAO[tipo]

  return (
    <>
      <Abertura
        titulo={`${rotulo} de ${NOME_BEBE}`}
        subtitulo={`Iniciado às ${formatarHora(inicio)} por ${pessoa}`}
        lateral={[
          <ItemAvisoDaAbertura key="aviso" />,
          avisar ? (
            <li key="ja">
              <p className="t-ui">{`Já há uma sessão de ${rotulo} em andamento.`}</p>
            </li>
          ) : null,
          VOLTAR_PARA_HOJE,
        ]}
      />

      <BlocoCronometro
        cronometro={formatarCronometro(agora - inicio)}
        atividade={tipo === 'tummy' ? ATIVIDADE_TUMMY : undefined}
        aoEncerrar={aoEncerrar}
        aoDescartar={aoDescartar}
      />

      <div className="sb-area sb-mt-par-numeros">
        <MidiaDaSessao tipo={tipo} />
      </div>
    </>
  )
}

export function Sessao() {
  const { estado, dispatch } = usePrototipo()
  const navigate = useNavigate()
  const [parametros] = useSearchParams()
  const tipoBruto = parametros.get('tipo')
  const tipoDaUrl: TipoSessao | null = ehTipoSessao(tipoBruto) ? tipoBruto : null
  const sessao = estado.sessao
  const semSessao = sessao === null
  const location = useLocation()
  const { principal, focarTitulo } = useTituloDaTela()

  // Chegando por navegação interna (atalhos, "Ver sessão"), o foco vai ao h1 da tela, que é o
  // da sessão ou o do estado vazio. Pela URL (inclusive com ?tipo=), o foco não se move.
  const foco = focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])

  // `?tipo=` só vale uma vez, e só quando não há sessão. Depois de começar, sai da URL e a
  // guarda impede que, ao encerrar, a página comece outra sessão sozinha. O reducer ignora
  // o segundo "iniciar" que o StrictMode provoca.
  const jaIniciouPelaUrl = useRef(false)
  useEffect(() => {
    if (jaIniciouPelaUrl.current || !semSessao || !tipoDaUrl) return
    jaIniciouPelaUrl.current = true
    dispatch({ tipo: 'iniciar', sessao: tipoDaUrl, agora: Date.now() })
    void navigate('/app/sessao', { replace: true })
  }, [semSessao, tipoDaUrl, dispatch, navigate])

  const iniciandoPelaUrl = semSessao && tipoDaUrl !== null
  const avisar = (location.state as { jaEmAndamento?: boolean } | null)?.jaEmAndamento === true

  // Encerrar, salvar e descartar tiram esta tela do ar: o foco vai ao bloco "Em andamento" do Hoje.
  function encerrar(comNota: boolean) {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota })
    void navigate('/app/hoje', { state: { foco: 'cartao' } })
  }

  function descartar() {
    dispatch({ tipo: 'descartar' })
    void navigate('/app/hoje', { state: { foco: 'cartao' } })
  }

  return (
    <main ref={principal} className="ha-tela ha-sessao">
      {sessao ? (
        <SessaoEmAndamento
          tipo={sessao.tipo}
          inicio={sessao.inicio}
          pessoa={sessao.pessoa}
          avisar={avisar}
          aoEncerrar={encerrar}
          aoDescartar={descartar}
        />
      ) : iniciandoPelaUrl ? null : (
        <>
          <Abertura
            titulo={TITULO_SEM_SESSAO}
            subtitulo={SUBTITULO_SEM_SESSAO}
            lateral={[<ItemAvisoDaAbertura key="aviso" />, VOLTAR_PARA_HOJE]}
          />
          <div className="sb-area sb-mt-fio-bloco">
            <MidiaDaSessao tipo={null} />
          </div>
        </>
      )}
    </main>
  )
}
