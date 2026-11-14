import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Trash2 } from 'lucide-react'
import { ALVO_APP } from '../../componentes/app/alvo.ts'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Pilha } from '../../componentes/base/layout/index.ts'
import { AvisoDeFuso } from '../../componentes/rotina/AvisoDeFuso.tsx'
import { AvisoDeLista } from '../../componentes/rotina/AvisoDeLista.tsx'
import { AvisoDoPapel } from '../../componentes/rotina/AvisoDoPapel.tsx'
import { FiltrosDoHistorico } from '../../componentes/rotina/FiltrosDoHistorico.tsx'
import { LinhaDoDia } from '../../componentes/rotina/LinhaDoDia.tsx'
import { LinkDaRotina } from '../../componentes/rotina/LinkDaRotina.tsx'
import { SecaoDoHoje } from '../../componentes/rotina/SecaoDoHoje.tsx'
import { SemanaDoHistorico } from '../../componentes/rotina/SemanaDoHistorico.tsx'
import { SeletorDeDia } from '../../componentes/rotina/SeletorDeDia.tsx'
import { TelaRotina } from '../../componentes/rotina/TelaRotina.tsx'
import { TotaisDoDia } from '../../componentes/rotina/TotaisDoDia.tsx'
import { useRotina, type BebeAtivo } from '../../componentes/rotina/contexto.ts'
import { diaPorExtenso, seteDiasAte, somarDias } from '../../componentes/rotina/diasDoHistorico.ts'
import { CHAVES_DO_FILTRO, lerParametros, urlDoHistorico, type Vista } from '../../componentes/rotina/parametrosHistorico.ts'
import { temAlgoParaSomar, totaisDoPeriodo, type DiaDaSemana } from '../../componentes/rotina/totaisHistorico.ts'
import { textoDoPapel } from '../../componentes/rotina/textoDoPapel.ts'
import { useAcoesDaRotina } from '../../componentes/rotina/useAcoesDaRotina.ts'
import { useSecao } from '../../componentes/rotina/useSecao.ts'
import { useTelaDaRotina } from '../../componentes/rotina/useTelaDaRotina.ts'
import { ESTADOS, HISTORICO, TITULOS } from '../../conteudo/rotina.ts'
import type { Resultado } from '../../dados/comum.ts'
import { diaDaFamilia, janelaDoDia, lerAparelho } from '../../dados/rotina.dia.ts'
import { LIMITES, type Lista, type Registro, type TipoRegistro } from '../../dados/rotina.tipos.ts'
import { useAgora } from '../../prototipo/useAgora.ts'

const UM_MINUTO = 60_000
const SEPARADOR = '|'

interface DoDia {
  registros: Lista<Registro>
  sessoes: Lista<Registro>
}

const porInicio = (a: Registro, b: Registro) => Date.parse(a.inicio) - Date.parse(b.inicio) || (a.id < b.id ? -1 : 1)

/** `05/11`: o dia e o mês de um `AAAA-MM-DD`. */
const diaEMes = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

export function Historico() {
  const { ativo } = useRotina()
  if (!ativo) return null
  return <HistoricoDoBebe ativo={ativo} />
}

function HistoricoDoBebe({ ativo }: { ativo: BebeAtivo }) {
  const { dados } = useRotina()
  const acoes = useAcoesDaRotina()
  const { principal, acionar } = useTelaDaRotina()
  const navigate = useNavigate()
  const location = useLocation()
  const agora = useAgora(UM_MINUTO)

  const bebeId = ativo.bebe.id
  const fuso = ativo.familia.fuso
  const hoje = diaDaFamilia(agora, fuso)
  const aparelho = lerAparelho(agora).fuso
  // Quem só vê (observador) ou lê um bebê arquivado recebe o texto do papel; ninguém grava neste histórico.
  const somenteLeitura = ativo.arquivado || ativo.papel === 'observador'
  const { dia, tipos, vista, canonica } = lerParametros(location.search, hoje)

  // Qualquer parâmetro que não vale vira o padrão, e a URL é trocada pela forma canônica (substitui a entrada).
  useEffect(() => {
    if (location.search !== canonica) void navigate(`/app/historico${canonica}`, { replace: true })
  }, [location.search, canonica, navigate])

  // A chave composta refaz a leitura quando o dia ou a vista mudam (e recomeça a seção vazia).
  const chaveDoDia = vista === 'dia' ? [bebeId, 'dia', dia].join(SEPARADOR) : null
  const chaveDaSemana = vista === 'semana' ? [bebeId, 'semana', dia].join(SEPARADOR) : null

  const doDia = useSecao<DoDia>(chaveDoDia, async (chave): Promise<Resultado<DoDia>> => {
    const [bebe, , diaLido] = chave.split(SEPARADOR)
    const { de, ate } = janelaDoDia(diaLido, fuso)
    const [registros, sessoes] = await Promise.all([dados.doDia(bebe, diaLido), dados.sessoesDaJanela(bebe, de, ate)])
    if (!registros.ok) return registros
    if (!sessoes.ok) return sessoes
    return { ok: true, valor: { registros: registros.valor, sessoes: sessoes.valor } }
  })

  const daSemana = useSecao<DoDia>(chaveDaSemana, async (chave): Promise<Resultado<DoDia>> => {
    const [bebe, , fimLido] = chave.split(SEPARADOR)
    const dias = seteDiasAte(fimLido)
    const de = janelaDoDia(dias[0], fuso).de
    const ate = janelaDoDia(dias[6], fuso).ate
    const [registros, sessoes] = await Promise.all([dados.doIntervalo(bebe, de, ate), dados.sessoesDaJanela(bebe, de, ate)])
    if (!registros.ok) return registros
    if (!sessoes.ok) return sessoes
    return { ok: true, valor: { registros: registros.valor, sessoes: sessoes.valor } }
  })

  const ir = (escolha: { dia?: string; tipos?: readonly TipoRegistro[]; vista?: Vista }, substituir = false) =>
    void navigate(urlDoHistorico({ dia: escolha.dia ?? dia, tipos: escolha.tipos ?? tipos, vista: escolha.vista ?? vista }), {
      replace: substituir,
    })

  const relativo = dia === hoje ? 'hoje' : dia === somarDias(hoje, -1) ? 'ontem' : null
  const semana = seteDiasAte(dia)
  const linha =
    vista === 'dia'
      ? HISTORICO.linhaDoBebe(ativo.bebe.nome, HISTORICO.diaPorExtenso(diaPorExtenso(dia), relativo))
      : HISTORICO.linhaDaSemana(ativo.bebe.nome, diaEMes(semana[0]), diaEMes(semana[6]))
  const secaoAtual = vista === 'dia' ? doDia : daSemana
  const autorDe = (registro: Registro) => acoes.nomeDoAutor(registro.criadoPor, registro.familiaId)

  function conteudoDoDia(lido: DoDia) {
    const { de, ate } = janelaDoDia(dia, fuso)
    const visiveis = lido.registros.itens.filter((registro) => tipos.includes(registro.tipo)).sort(porInicio)
    const incompleta = lido.registros.incompleta || lido.sessoes.incompleta
    const totais = totaisDoPeriodo(lido.registros.itens, lido.sessoes.itens, Date.parse(de), Date.parse(ate), tipos)
    return (
      <Pilha vao="bloco">
        {lido.registros.incompleta ? <AvisoDeLista limite={LIMITES.doDia} dado="doDia" /> : null}
        {lido.sessoes.incompleta ? <AvisoDeLista limite={LIMITES.sessoesDaJanela} dado="sessoes" /> : null}
        {incompleta ? (
          <Pilha as="section" vao="pilha" aria-labelledby="historico-resumo" data-resumo-do-dia="">
            <h2 id="historico-resumo" className="cm-h4">
              {HISTORICO.resumoDoDia}
            </h2>
            <p className="text-(--cor-texto-2)">{ESTADOS.demaisParaSomar}</p>
          </Pilha>
        ) : temAlgoParaSomar(totais) ? (
          <TotaisDoDia totais={totais} />
        ) : null}
        <Pilha as="section" vao="pilha" aria-labelledby="historico-registros" data-registros-do-dia="">
          <h2 id="historico-registros" className="cm-h4">
            {HISTORICO.registrosDoDia}
          </h2>
          {visiveis.length === 0 ? (
            <p className="border-y border-(--cor-fio-suave) py-4 text-(--cor-texto-2)">{HISTORICO.semRegistros}</p>
          ) : (
            <ul className="border-y border-(--cor-fio-suave)">
              {visiveis.map((registro) => (
                <LinhaDoDia key={registro.id} registro={registro} fuso={fuso} autor={autorDe(registro)} para={`/app/registro/${registro.id}`} />
              ))}
            </ul>
          )}
        </Pilha>
      </Pilha>
    )
  }

  function conteudoDaSemana(lido: DoDia) {
    const incompleta = lido.registros.incompleta || lido.sessoes.incompleta
    const dias: DiaDaSemana[] = semana.map((diaDaLinha) => {
      const janela = janelaDoDia(diaDaLinha, fuso)
      const doDiaDaLinha = lido.registros.itens.filter((registro) => diaDaFamilia(Date.parse(registro.inicio), fuso) === diaDaLinha)
      return { dia: diaDaLinha, totais: totaisDoPeriodo(doDiaDaLinha, lido.sessoes.itens, Date.parse(janela.de), Date.parse(janela.ate), CHAVES_DO_FILTRO) }
    })
    const vazia = lido.registros.itens.length === 0 && lido.sessoes.itens.length === 0
    return (
      <Pilha vao="pilha">
        {lido.registros.incompleta ? <AvisoDeLista limite={LIMITES.doIntervalo} dado="semana" /> : null}
        {lido.sessoes.incompleta ? <AvisoDeLista limite={LIMITES.sessoesDaJanela} dado="sessoes" /> : null}
        {incompleta ? (
          <p className="text-(--cor-texto-2)">{ESTADOS.demaisParaSomar}</p>
        ) : (
          <>
            {vazia ? <p className="text-(--cor-texto-2)">{HISTORICO.semRegistrosNaSemana}</p> : null}
            <SemanaDoHistorico dias={dias} urlDoDia={(diaDaLinha) => urlDoHistorico({ dia: diaDaLinha, tipos, vista: 'dia' })} />
          </>
        )}
      </Pilha>
    )
  }

  return (
    <TelaRotina
      tela="historico"
      principal={principal}
      acionar={acionar}
      titulo={TITULOS.historico}
      linha={linha}
      ocupada={secaoAtual.estado === 'carregando'}
      lateral={
        <div className="pb-2">
          <LinkDaRotina to="/app/lixeira" variante="contorno" icone={<Trash2 />}>
            {HISTORICO.lixeira}
          </LinkDaRotina>
        </div>
      }
    >
      <Pilha vao="bloco">
        {somenteLeitura || aparelho !== fuso ? (
          <Pilha vao="pilha">
            {somenteLeitura ? <AvisoDoPapel texto={textoDoPapel(ativo)} /> : null}
            {aparelho !== fuso ? <AvisoDeFuso aparelho={aparelho} familia={fuso} /> : null}
          </Pilha>
        ) : null}
        <Pilha vao="pilha">
          <div role="group" aria-label={HISTORICO.vistas} className="flex flex-wrap gap-2" data-vistas="">
            <Botao variante={vista === 'dia' ? 'primario' : 'contorno'} tamanho="app" className={ALVO_APP} aria-pressed={vista === 'dia'} onClick={() => ir({ vista: 'dia' })}>
              {HISTORICO.dia}
            </Botao>
            <Botao
              variante={vista === 'semana' ? 'primario' : 'contorno'}
              tamanho="app"
              className={ALVO_APP}
              aria-pressed={vista === 'semana'}
              onClick={() => ir({ vista: 'semana' })}
            >
              {HISTORICO.semana}
            </Botao>
          </div>
          <SeletorDeDia dia={dia} hoje={hoje} aoEscolher={(novo) => ir({ dia: novo })} />
          {vista === 'dia' ? <FiltrosDoHistorico tipos={tipos} aoMudar={(novos) => ir({ tipos: novos }, true)} /> : null}
        </Pilha>
        {vista === 'dia' ? (
          <SecaoDoHoje secao={doDia} titulo={HISTORICO.registrosDoDia} papel={ativo.papel}>
            {conteudoDoDia}
          </SecaoDoHoje>
        ) : (
          <SecaoDoHoje secao={daSemana} titulo={HISTORICO.resumoDaSemana} papel={ativo.papel}>
            {conteudoDaSemana}
          </SecaoDoHoje>
        )}
      </Pilha>
    </TelaRotina>
  )
}
