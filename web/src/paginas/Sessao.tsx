import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ChevronLeft, Info } from 'lucide-react'
import { AvisoDaTela } from '../componentes/app/AvisoDaTela.tsx'
import { CronometroSessao } from '../componentes/app/CronometroSessao.tsx'
import { SessoesAnteriores } from '../componentes/app/SessoesAnteriores.tsx'
import { TituloDaTela } from '../componentes/app/TituloDaTela.tsx'
import { ATIVIDADE_TUMMY } from '../conteudo/textos.ts'
import { MidiaDaSessao } from '../prototipo/MidiaDaSessao.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
import { focoDoEstado } from '../prototipo/foco.ts'
import { NOME_BEBE, ROTULO_SESSAO, ehTipoSessao, type SessaoAnterior, type TipoSessao } from '../prototipo/estado.ts'
import { formatarCronometro, formatarHora } from '../prototipo/formatar.ts'
import { SUBTITULO_SEM_SESSAO, TITULO_SEM_SESSAO } from '../prototipo/textosSessao.ts'
import { useAgora } from '../prototipo/useAgora.ts'
import { useTituloDaTela } from '../prototipo/useTituloDaTela.ts'

// O caminho de volta, acima do título: leva ao Hoje com o foco no h1 dele.
const VOLTAR_PARA_HOJE = (
  <Link
    to="/app/hoje"
    state={{ foco: 'titulo' }}
    className="alvo-toque -ml-1 mb-3 inline-flex items-center gap-1.5 rounded-pilula px-1 text-[17px] leading-[25px] font-medium no-underline underline-offset-4 hover:underline"
    data-voltar=""
  >
    <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
    <span>Voltar para Hoje</span>
  </Link>
)

// Com sessão: o cronômetro conta a partir do início (`agora - inicio`, nunca um contador).
function SessaoEmAndamento({
  tipo,
  inicio,
  pessoa,
  avisar,
  anteriores,
  aoEncerrar,
  aoDescartar,
}: {
  tipo: TipoSessao
  inicio: number
  pessoa: string
  avisar: boolean
  anteriores: readonly SessaoAnterior[]
  aoEncerrar: (comNota: boolean) => void
  aoDescartar: () => void
}) {
  const agora = useAgora(1000)
  const rotulo = ROTULO_SESSAO[tipo]

  return (
    <>
      <TituloDaTela
        antes={VOLTAR_PARA_HOJE}
        titulo={`${rotulo} de ${NOME_BEBE}`}
        linha={`Iniciado às ${formatarHora(inicio)} por ${pessoa}`}
      />

      {avisar ? (
        <div className="cm-area mt-5">
          <p className="inline-flex items-start gap-2.5 rounded-campo bg-(--cor-papel-fundo) px-4 py-3 font-medium">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
            {`Já há uma sessão de ${rotulo} em andamento.`}
          </p>
        </div>
      ) : null}

      <div className="cm-area mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-8">
        <CronometroSessao
          className="lg:col-span-7"
          cronometro={formatarCronometro(agora - inicio)}
          atividade={tipo === 'tummy' ? ATIVIDADE_TUMMY : undefined}
          aoEncerrar={aoEncerrar}
          aoDescartar={aoDescartar}
        />
        <SessoesAnteriores className="lg:col-span-5" tipo={tipo} itens={anteriores} />
      </div>
    </>
  )
}

/**
 * A Sessão (DESIGN.md 4, telas do app): o link de volta, o título "<Sessão> de Heloísa" com a segunda
 * linha em itálico, o cartão do cronômetro (o mesmo sistema do cartão do Hoje, nos dois temas) e as
 * sessões anteriores do mesmo tipo ao lado. Sem sessão: o título do estado vazio e o desenho da noite.
 */
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

  // Encerrar, salvar e descartar tiram esta tela do ar: o foco vai ao cartão da sessão do Hoje.
  function encerrar(comNota: boolean) {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota })
    void navigate('/app/hoje', { state: { foco: 'cartao' } })
  }

  function descartar() {
    dispatch({ tipo: 'descartar' })
    void navigate('/app/hoje', { state: { foco: 'cartao' } })
  }

  return (
    <>
      <main ref={principal} className="pb-16 text-[17px] leading-[25px]" data-tela="sessao">
        {sessao ? (
          <SessaoEmAndamento
            tipo={sessao.tipo}
            inicio={sessao.inicio}
            pessoa={sessao.pessoa}
            avisar={avisar}
            anteriores={estado.anteriores[sessao.tipo]}
            aoEncerrar={encerrar}
            aoDescartar={descartar}
          />
        ) : iniciandoPelaUrl ? null : (
          <>
            <TituloDaTela antes={VOLTAR_PARA_HOJE} titulo={TITULO_SEM_SESSAO} linha={SUBTITULO_SEM_SESSAO} />
            <div className="cm-area mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-8">
              <MidiaDaSessao className="lg:col-span-7" />
              <SessoesAnteriores className="lg:col-span-5" tipo="sono" itens={estado.anteriores.sono} />
            </div>
          </>
        )}
      </main>

      {/* O aviso honesto de demonstração: fora do <main> e dos cartões, o único da página. */}
      <AvisoDaTela />
    </>
  )
}
