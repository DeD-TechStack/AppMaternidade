import { useState } from 'react'
import { Link } from 'react-router'
import { Etiqueta } from '../../componentes/base/Etiqueta.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { usePaginas } from '../../componentes/comunidade/useLeitura.ts'
import { ErroDeLeituraNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { usePainel } from '../../componentes/moderacao/contexto.ts'
import { useDadosModeracao } from '../../componentes/moderacao/dados.ts'
import { Escolha } from '../../componentes/moderacao/Escolha.tsx'
import { BOTAO_SECUNDARIO_QUEBRA, ETIQUETAS_QUEBRAM } from '../../componentes/moderacao/estilos.ts'
import { Painel } from '../../componentes/moderacao/Painel.tsx'
import { ROTULO_ESTADO_DENUNCIA, ROTULO_MOTIVO, COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { COMUM_MODERACAO, FILA, NOMES_DAS_TELAS, TX } from '../../conteudo/moderacao.ts'
import { formatarDataHora } from '../../dados/comunidade.ts'
import { ESTADOS_DENUNCIA, MOTIVOS, type EstadoDenuncia, type MotivoDenuncia } from '../../dados/comunidade.regras.ts'
import type { Denuncia } from '../../dados/moderacao.ts'
import { ESTADOS_PADRAO_DA_FILA, prioridadeDoMotivo } from '../../dados/moderacao.regras.ts'

// O link é a caixa inteira (a área clicável e o anel de foco); o `Cartao` dentro dele dá o padding e o raio.
const LINK_DO_CARTAO = 'alvo-toque group block rounded-cartao no-underline'
const CARTAO =
  'flex flex-col gap-2 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] group-hover:border-[var(--cor-texto)]'

const LIMITE_DO_TRECHO = 120

const trecho = (texto: string | null): string => {
  if (texto === null || texto.trim() === '') return COMUM_MODERACAO.semTexto
  return texto.length > LIMITE_DO_TRECHO ? `${texto.slice(0, LIMITE_DO_TRECHO)}…` : texto
}

const tipoDoAlvo = (d: Denuncia): string =>
  d.topicoId !== null
    ? COMUM_MODERACAO.tipoDoAlvo.topico
    : d.respostaId !== null
      ? COMUM_MODERACAO.tipoDoAlvo.resposta
      : d.perfilId !== null
        ? COMUM_MODERACAO.tipoDoAlvo.perfil
        : COMUM_MODERACAO.tipoDoAlvo.excluido

function ListaDaFila() {
  const painel = usePainel()
  const dados = useDadosModeracao()
  const [estados, setEstados] = useState<EstadoDenuncia[]>([...ESTADOS_PADRAO_DA_FILA])
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null)

  // Mudar um filtro relê a primeira página; nenhuma caixa marcada equivale às quatro (a camada de dados).
  const chave = `${[...estados].sort().join(',')}|${motivo ?? ''}`
  const fila = usePaginas<Denuncia>(
    (pagina) =>
      painel.ler(
        () => dados.filaDeDenuncias({ estados, motivo }, pagina),
        (lida) => pagina === 0 && lida.itens.length === 0,
      ),
    chave,
  )
  const lista = fila.estado.fase === 'pronto' ? fila.estado : null

  function alternar(estado: EstadoDenuncia) {
    setEstados((atuais) => (atuais.includes(estado) ? atuais.filter((e) => e !== estado) : [...atuais, estado]))
  }

  return (
    <>
      <Faixa>
        <Pilha vao="pilha">
          <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="cm-campo-rotulo mb-1 p-0">{FILA.filtroEstados}</legend>
            <div className="flex flex-wrap gap-x-6">
              {ESTADOS_DENUNCIA.map((estado) => (
                <Escolha
                  key={estado}
                  tipo="checkbox"
                  rotulo={ROTULO_ESTADO_DENUNCIA[estado]}
                  marcado={estados.includes(estado)}
                  aoMudar={() => alternar(estado)}
                />
              ))}
            </div>
          </fieldset>
          <div className="cm-campo grid-cols-[minmax(0,1fr)] min-w-0 max-w-[24rem]">
            <label htmlFor="filtro-motivo" className="cm-campo-rotulo">
              {FILA.filtroMotivo}
            </label>
            <div className="cm-campo-controle">
              <select
                id="filtro-motivo"
                value={motivo ?? ''}
                onChange={(evento) => setMotivo(evento.target.value === '' ? null : (evento.target.value as MotivoDenuncia))}
                className="cm-campo-entrada alvo-toque min-w-0"
              >
                <option value="">{FILA.todosOsMotivos}</option>
                {MOTIVOS.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {ROTULO_MOTIVO[opcao]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Pilha>
      </Faixa>

      <Faixa aria-label={FILA.lista} aria-busy={fila.estado.fase === 'carregando' || undefined}>
        <Pilha vao="grupo">
        {fila.esqueleto ? <Esqueleto /> : null}
        {fila.estado.fase === 'erro' ? (
          <ErroDeLeituraNoPainel erro={fila.estado.erro} aoTentarDeNovo={() => void fila.recarregar()} />
        ) : null}
        {/* O anúncio do resultado (A11Y-016): sempre montada, fora dos filtros, vazia enquanto lê. Sem resultado, o
            parágrafo da TX-13 mora dentro dela (uma só vez); com itens, ela só fala (sr-only). */}
        <div role="status" className={lista && lista.itens.length === 0 ? undefined : 'sr-only'}>
          {lista && lista.itens.length === 0 ? (
            <p>{TX.tx13}</p>
          ) : lista ? (
            FILA.contagem(lista.itens.length, lista.haMais && !lista.erroDaPagina)
          ) : null}
        </div>
        {lista && lista.itens.length > 0 ? (
          <Pilha as="ul" vao="grupo" className="m-0 list-none p-0">
            {lista.itens.map((denuncia) => (
              <li key={denuncia.id}>
                <Link to={`/moderacao/denuncia/${denuncia.id}`} className={LINK_DO_CARTAO}>
                  <Cartao className={CARTAO}>
                    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${ETIQUETAS_QUEBRAM}`}>
                      <Etiqueta>{FILA.prioridade(prioridadeDoMotivo(denuncia.motivo))}</Etiqueta>
                      <span className="font-semibold">{ROTULO_MOTIVO[denuncia.motivo]}</span>
                      <span className="cm-pequeno text-[var(--cor-texto-2)]">{tipoDoAlvo(denuncia)}</span>
                    </span>
                    <span className="wrap-anywhere">{trecho(denuncia.texto)}</span>
                    <span className="cm-pequeno flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--cor-texto-2)]">
                      <span>{ROTULO_ESTADO_DENUNCIA[denuncia.estado]}</span>
                      <time dateTime={denuncia.criadaEm} className="tabular">
                        {formatarDataHora(denuncia.criadaEm)}
                      </time>
                    </span>
                  </Cartao>
                </Link>
              </li>
            ))}
          </Pilha>
        ) : null}
        {lista?.erroDaPagina ? (
          <ErroDeLeituraNoPainel erro={lista.erroDaPagina} aoTentarDeNovo={() => void fila.carregarMais()} />
        ) : null}
        {lista && lista.haMais && !lista.erroDaPagina ? (
          <div>
            <button
              type="button"
              disabled={lista.maisEmCurso}
              className={BOTAO_SECUNDARIO_QUEBRA}
              data-tamanho="app"
              onClick={() => void fila.carregarMais()}
            >
              {lista.maisEmCurso ? COMUM_COMUNIDADE.carregando : FILA.carregarMais}
            </button>
          </div>
        ) : null}
        </Pilha>
      </Faixa>
    </>
  )
}

// M1, /moderacao: a fila de denúncias, por grupo de prioridade, da mais antiga à mais nova.
export function FilaDeDenuncias() {
  return (
    <Painel titulo={NOMES_DAS_TELAS.fila} comVoltar={false}>
      <ListaDaFila />
    </Painel>
  )
}
