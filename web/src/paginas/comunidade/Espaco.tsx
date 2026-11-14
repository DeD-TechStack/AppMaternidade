import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { BOTAO_SECUNDARIO, LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { AvisoDeSaude, ErroDeLeitura, Esqueleto, NaoEncontrado } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { EtiquetaDeEstado, Meta } from '../../componentes/comunidade/Itens.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura, usePaginas } from '../../componentes/comunidade/useLeitura.ts'
import { caminhoDeEntrada } from '../../componentes/comunidade/volta.ts'
import { COMUM_COMUNIDADE, ESPACO, LISTA, ROTULO_FAIXA, TX, textoDaPassagemComunidade } from '../../conteudo/comunidade.ts'
import type { Espaco as EspacoLido } from '../../dados/comunidade.ts'
import { FAIXAS, type FaixaBebe } from '../../dados/comunidade.regras.ts'

const CARTAO = 'flex flex-col gap-2 border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]'

interface ListaProps {
  espaco: EspacoLido
  escritor: boolean
}

// A lista de tópicos de um espaço: 20 por página, com o filtro de faixa e o "Carregar mais".
function ListaDoEspaco({ espaco, escritor }: ListaProps) {
  const dados = useDadosComunidade()
  const [faixa, setFaixa] = useState<FaixaBebe | null>(null)
  const paginas = usePaginas((pagina) => dados.listarTopicos(espaco.id, pagina, faixa), `${espaco.id}|${faixa ?? ''}`)
  const novo = `/app/comunidade/${espaco.slug}/novo`
  const { estado } = paginas

  return (
    <Faixa aria-labelledby="topicos" aria-busy={estado.fase === 'carregando' || undefined}>
      <Pilha vao="bloco">
        <Pilha vao="pilha" className="items-start">
          <div role="group" aria-label={ESPACO.filtro} className="flex flex-wrap gap-2">
            {[null, ...FAIXAS].map((opcao) => (
              <button
                key={opcao ?? 'todas'}
                type="button"
                aria-pressed={faixa === opcao}
                className={BOTAO_SECUNDARIO}
                data-tamanho="app"
                onClick={() => setFaixa(opcao)}
              >
                {opcao === null ? ESPACO.todas : ROTULO_FAIXA[opcao]}
              </button>
            ))}
          </div>
          <Botao to={escritor ? novo : caminhoDeEntrada(novo)} tamanho="app">
            {ESPACO.novoTopico}
          </Botao>
        </Pilha>

        <Pilha vao="grupo">
          <h2 id="topicos" className="cm-h4 text-titulo-4">
            {ESPACO.topicos}
          </h2>
          {paginas.esqueleto ? <Esqueleto /> : null}
          {estado.fase === 'erro' ? (
            <ErroDeLeitura erro={estado.erro} aoTentarDeNovo={() => void paginas.recarregar()} />
          ) : null}
          {estado.fase === 'pronto' && estado.itens.length === 0 ? <p>{TX.tx16}</p> : null}
          {estado.fase === 'pronto' && estado.itens.length > 0 ? (
            <Pilha as="ul" vao="grupo" className="m-0 list-none p-0">
              {estado.itens.map((topico) => (
                <li key={topico.id}>
                  <Cartao as="article" aria-labelledby={`topico-${topico.id}`} className={CARTAO}>
                    <h3 id={`topico-${topico.id}`} className="cm-h4 text-titulo-4 wrap-anywhere">
                      <Link to={`/app/comunidade/topico/${topico.id}`} className={LINK_ALVO}>
                        {topico.titulo}
                      </Link>
                    </h3>
                    <Meta
                      apelido={topico.autor?.apelido ?? null}
                      criadoEm={topico.criadoEm}
                      editadoEm={topico.editadoEm}
                      faixa={topico.faixa}
                    >
                      <span>{COMUM_COMUNIDADE.respostas(topico.respostas)}</span>
                    </Meta>
                    <EtiquetaDeEstado estado={topico.estado} motivo={topico.motivoModeracao} />
                  </Cartao>
                </li>
              ))}
            </Pilha>
          ) : null}
          {estado.fase === 'pronto' && estado.erroDaPagina ? (
            <ErroDeLeitura erro={estado.erroDaPagina} aoTentarDeNovo={() => void paginas.carregarMais()} />
          ) : null}
          {estado.fase === 'pronto' && estado.haMais && !estado.erroDaPagina ? (
            <div>
              <button
                type="button"
                disabled={estado.maisEmCurso}
                className={BOTAO_SECUNDARIO}
                data-tamanho="app"
                onClick={() => void paginas.carregarMais()}
              >
                {estado.maisEmCurso ? COMUM_COMUNIDADE.carregando : ESPACO.carregarMais}
              </button>
            </div>
          ) : null}
        </Pilha>
      </Pilha>
    </Faixa>
  )
}

// C2, /app/comunidade/:slug: o nome do espaço, o aviso de saúde, o filtro de faixa, os tópicos e o
// "Novo tópico". Um `slug` que não está entre os 7 é "não encontrado".
export function Espaco() {
  const { slug } = useParams()
  const location = useLocation()
  const dados = useDadosComunidade()
  const situacao = useSituacao()
  const espacos = useLeitura(() => dados.listarEspacos(), 'espacos')
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null
  const espaco = espacos.estado.fase === 'pronto' ? espacos.estado.valor.find((e) => e.slug === slug) : undefined

  return (
    <Quadro
      voltar="/app/comunidade"
      ocupado={espacos.estado.fase === 'carregando' || situacao.estado.fase === 'carregando'}
      titulo={<TituloDaTela>{espaco?.nome ?? LISTA.titulo}</TituloDaTela>}
      cabeca={
        <>
          <Pilha vao="pilha">
            <AvisoDeSaude />
            <Status mensagem={textoDaPassagemComunidade(location.state)} />
          </Pilha>
          {espacos.esqueleto ? <Esqueleto /> : null}
          {espacos.estado.fase === 'erro' ? (
            <div className="max-w-leitura">
              <ErroDeLeitura erro={espacos.estado.erro} aoTentarDeNovo={() => void espacos.recarregar()} />
            </div>
          ) : null}
          {situacao.estado.fase === 'erro' ? (
            <div className="max-w-leitura">
              <ErroDeLeitura erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
            </div>
          ) : null}
          {espacos.estado.fase === 'pronto' && !espaco ? <NaoEncontrado /> : null}
        </>
      }
    >
      {espaco && lida ? <ListaDoEspaco key={espaco.id} espaco={espaco} escritor={ehEscritor(lida)} /> : null}
    </Quadro>
  )
}
