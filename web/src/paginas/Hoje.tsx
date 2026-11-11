import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AvisoDaTela } from '../componentes/app/AvisoDaTela.tsx'
import { BotaoIniciarMamada } from '../componentes/app/BotaoIniciarMamada.tsx'
import { Etiqueta } from '../componentes/base/Etiqueta.tsx'
import { CartaoSessao } from '../componentes/app/CartaoSessao.tsx'
import { DesdeQueVoceSaiu, type ItemDesde } from '../componentes/app/DesdeQueVoceSaiu.tsx'
import { ResumoDoDia } from '../componentes/app/ResumoDoDia.tsx'
import { TituloDaTela } from '../componentes/app/TituloDaTela.tsx'
import { Ultimos } from '../componentes/app/Ultimos.tsx'
import { BarraRegistrar } from '../componentes/registro/BarraRegistrar.tsx'
import { usePrototipo } from '../prototipo/contexto.ts'
import {
  IDADE_BEBE,
  NOME_BEBE,
  PAPEL_NA_FAMILIA,
  ROTULO_SESSAO,
  TEXTO_FRALDA,
  textoDaFralda,
  type EscolhaFralda,
  type EstadoPrototipo,
  type ItemMais,
  type TipoSessao,
} from '../prototipo/estado.ts'
import { focoDoEstado } from '../prototipo/foco.ts'
import { formatarDuracao, formatarHora, formatarUltimo } from '../prototipo/formatar.ts'
import { useAgora } from '../prototipo/useAgora.ts'
import { useTituloDaTela } from '../prototipo/useTituloDaTela.ts'

const SEM_REGISTRO = { valor: '—', legenda: '—' }

const comPapel = (pessoa: string) => (PAPEL_NA_FAMILIA[pessoa] ? `${pessoa}, ${PAPEL_NA_FAMILIA[pessoa]}` : pessoa)

// "Quarta-feira, 11 de novembro": a data do dia, ao lado do título em telas largas.
function dataPorExtenso(instante: number): string {
  const texto = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(instante)
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLocaleLowerCase('pt-BR') + texto.slice(1)
}

// A lista "Desde que você saiu": a sessão em andamento e os registros da família, do mais novo ao mais
// antigo, e o recado da avó no fim.
function itensDesde(estado: EstadoPrototipo, agora: number): ItemDesde[] {
  const comHora: Array<{ instante: number; item: ItemDesde }> = estado.eventos.map((evento) => ({
    instante: evento.quando,
    item: {
      chave: evento.chave,
      pessoa: evento.pessoa,
      texto: evento.texto,
      detalhe: comPapel(evento.pessoa),
      quando: formatarHora(evento.quando),
      hora: formatarHora(evento.quando),
    },
  }))
  const sessao = estado.sessao
  if (sessao) {
    comHora.push({
      instante: sessao.inicio,
      item: {
        chave: 'sessao',
        pessoa: sessao.pessoa,
        texto: `${ROTULO_SESSAO[sessao.tipo]} em andamento`,
        detalhe: `${sessao.pessoa}, desde ${formatarHora(sessao.inicio)}`,
        quando: formatarDuracao(agora - sessao.inicio),
        hora: formatarHora(sessao.inicio),
        emAndamento: true,
      },
    })
  }
  const ordenados = comHora.sort((a, b) => b.instante - a.instante).map(({ item }) => item)
  const { nota } = estado
  return [
    ...ordenados,
    {
      chave: 'nota',
      pessoa: nota.autor,
      texto: `Nota: ${minusculaInicial(nota.texto)}`,
      detalhe: comPapel(nota.autor),
      quando: nota.hora,
      hora: nota.hora,
    },
  ]
}

function formatarSono(minutos: number): string {
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')}`
}

// A última mamada (hora e quem deu), para a linha sob o botão da madrugada.
function textoDaUltimaMamada(estado: EstadoPrototipo): string | undefined {
  const mamada = estado.anteriores.mamada[0]
  return mamada ? `Última mamada às ${formatarHora(mamada.inicio)}, com ${mamada.pessoa}` : undefined
}

/**
 * O Hoje (DESIGN.md 4, telas do app): o título com "Heloísa, 3 meses" em itálico, o cartão de mel da
 * sessão em andamento, os números do dia, "Desde que você saiu" e "Últimos"; a barra Registrar fica fora
 * do <main>, fixa embaixo. Na madrugada, um botão redondo de mel "Iniciar mamada" entra logo depois do
 * cartão (menor quando outra sessão está em andamento) e o histórico vem antes dos números.
 */
export function Hoje() {
  const { estado, dispatch } = usePrototipo()
  const navigate = useNavigate()
  const location = useLocation()
  const agora = useAgora(1000)
  const { principal, focarTitulo } = useTituloDaTela()
  const cartao = useRef<HTMLElement>(null)
  const primeiroBotao = useRef<HTMLButtonElement>(null)

  // Chegando por navegação interna, o foco vai ao alvo que a origem pediu; pela URL, não se move.
  const foco = focoDoEstado(location.state)
  useEffect(() => {
    if (foco === 'cartao') cartao.current?.focus()
    else if (foco === 'titulo') focarTitulo()
  }, [foco, location.key, focarTitulo])

  function iniciarSessao(tipo: TipoSessao) {
    if (estado.sessao) {
      // Já há uma sessão: abre a que existe e deixa a Sessão mostrar o aviso.
      void navigate('/app/sessao', { state: { jaEmAndamento: true, foco: 'titulo' } })
      return
    }
    dispatch({ tipo: 'iniciar', sessao: tipo, agora: Date.now() })
    void navigate('/app/sessao', { state: { foco: 'titulo' } })
  }

  // Encerrar tira o botão da tela: o foco vai ao próprio cartão, que passa a dizer "Nenhuma sessão".
  function encerrar() {
    dispatch({ tipo: 'encerrar', agora: Date.now(), comNota: false })
    cartao.current?.focus()
  }

  // "Desfazer" e "Fechar" somem com a confirmação; o foco vai ao primeiro botão da barra (Sono), que
  // continua na tela. A confirmação nunca recebe o foco.
  function desfazer() {
    dispatch({ tipo: 'desfazer' })
    primeiroBotao.current?.focus()
  }

  function fecharConfirmacao() {
    dispatch({ tipo: 'fecharConfirmacao' })
    primeiroBotao.current?.focus()
  }

  // Um toque, um registro (E5): o registro não leva o tipo. O tipo é opcional e só ajusta o texto da
  // confirmação já na tela.
  function registrarFralda() {
    dispatch({ tipo: 'registrar', chave: 'fralda', rotulo: 'Fralda', confirmacao: TEXTO_FRALDA })
  }

  function ajustarFralda(escolha: EscolhaFralda) {
    dispatch({ tipo: 'ajustarConfirmacao', texto: textoDaFralda(escolha) })
  }

  function registrarMais(item: ItemMais) {
    dispatch({ tipo: 'registrar', chave: item.chave, rotulo: item.rotulo, confirmacao: `${item.rotulo} registrada` })
  }

  // Três linhas sempre: os 3 primeiros registros, e o travessão nas que faltam.
  const registros = estado.ultimos.map((item) => formatarUltimo(item.rotulo, item.quando))
  const linha = (posicao: number) => registros[posicao] ?? SEM_REGISTRO
  const ultimos = [linha(0), linha(1), linha(2)]

  const numeros = [
    { rotulo: 'Mamadas', valor: String(estado.resumo.mamadas) },
    { rotulo: 'Fraldas', valor: String(estado.resumo.fraldas) },
    { rotulo: 'Sono', valor: formatarSono(estado.resumo.sonoMin) },
  ]

  // Na madrugada, sem mamada em andamento, o botão redondo entra logo depois do cartão. Com outra sessão
  // em andamento (o sono), a sessão é o destaque: o círculo encolhe e vai para baixo dela.
  const madrugada = estado.madrugada
  const noite = madrugada && estado.sessao?.tipo !== 'mamada'
  const comSessao = estado.sessao !== null

  const blocoCartao = (className: string) => (
    <CartaoSessao ref={cartao} sessao={estado.sessao} agora={agora} aoEncerrar={encerrar} className={className} />
  )
  const blocoDesde = (className?: string) => <DesdeQueVoceSaiu itens={itensDesde(estado, agora)} className={className} />
  const blocoResumo = (className?: string) => <ResumoDoDia itens={numeros} className={className} />
  const blocoUltimos = (className?: string) => <Ultimos itens={ultimos} className={className} />

  // A grade das duas versões: de dia, o cartão à esquerda e a área da lista à direita, que abre com os
  // números do dia em Literata grande e segue com o histórico; "Últimos" fica embaixo do cartão. Tudo em
  // linhas com fio fino, sem cartões brancos.
  const dia = (
    <div className="cm-area mt-6 grid grid-cols-1 gap-10 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12">
      {blocoCartao('lg:col-span-6 lg:col-start-1 lg:row-start-1')}
      <div data-area-lista="" className="flex flex-col gap-10 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">
        {blocoResumo()}
        {blocoDesde()}
      </div>
      {blocoUltimos('lg:col-span-6 lg:col-start-1 lg:row-start-2')}
    </div>
  )

  // Madrugada: o histórico sobe para logo depois do botão (no celular, a primeira linha aparece antes da
  // dobra), e os números vêm depois dele.
  const madrugadaComSessao = (
    <div className="cm-area mt-6 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12">
      {blocoCartao('lg:col-span-8 lg:col-start-1 lg:row-start-1')}
      {noite ? (
        <BotaoIniciarMamada
          compacto
          aoIniciar={() => iniciarSessao('mamada')}
          ultima={textoDaUltimaMamada(estado)}
          className="lg:col-span-4 lg:col-start-9 lg:row-start-2"
        />
      ) : null}
      {blocoDesde('lg:col-span-8 lg:col-start-1 lg:row-start-2')}
      {blocoResumo('lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:self-center')}
      {blocoUltimos('lg:col-span-8 lg:col-start-1 lg:row-start-3')}
    </div>
  )

  const madrugadaSemSessao = (
    <div className="cm-area mt-6 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-12">
      {blocoCartao('lg:col-span-7 lg:col-start-1 lg:row-start-1')}
      <BotaoIniciarMamada
        aoIniciar={() => iniciarSessao('mamada')}
        ultima={textoDaUltimaMamada(estado)}
        className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:self-center"
      />
      {blocoDesde('lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-2')}
      {blocoResumo('lg:col-span-5 lg:col-start-8 lg:row-start-2')}
      {blocoUltimos('lg:col-span-5 lg:col-start-8 lg:row-start-3')}
    </div>
  )

  return (
    <>
      <main ref={principal} className="pb-12 text-[17px] leading-[25px]" data-tela="hoje">
        <TituloDaTela
          titulo="Hoje"
          linha={`${NOME_BEBE}, ${IDADE_BEBE}`}
          lateral={
            <p className="hidden pb-2 lg:block" data-data-do-dia="">
              <Etiqueta>{dataPorExtenso(agora)}</Etiqueta>
            </p>
          }
        />

        {!madrugada ? dia : noite && !comSessao ? madrugadaSemSessao : madrugadaComSessao}
      </main>

      <BarraRegistrar
        refSono={primeiroBotao}
        sessaoAtiva={estado.sessao?.tipo ?? null}
        aoIniciarSessao={iniciarSessao}
        aoRegistrarFralda={registrarFralda}
        aoAjustarFralda={ajustarFralda}
        aoRegistrarMais={registrarMais}
        texto={estado.confirmacao?.texto ?? null}
        aoDesfazer={desfazer}
        aoFechar={fecharConfirmacao}
      />

      {/* O aviso honesto de demonstração: depois do conteúdo, fora do <main> e dos cartões, o único da página. */}
      <AvisoDaTela />
    </>
  )
}
