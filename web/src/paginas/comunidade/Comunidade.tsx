import { Link, useLocation } from 'react-router'
import { Botao } from '../../componentes/base/Botao.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Coluna, Colunas } from '../../componentes/base/layout/Colunas.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { Secao } from '../../componentes/base/layout/Secao.tsx'
import { LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { AvisoDeSaude, ErroDeLeitura, Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehDaModeracao, ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { caminhoDeEntrada } from '../../componentes/comunidade/volta.ts'
import { LISTA, TX, textoDaPassagemComunidade } from '../../conteudo/comunidade.ts'
import './comunidade.css'

// O link é a caixa inteira (a área clicável e o anel de foco); o `Cartao` dentro dele dá o padding e o raio.
const LINK_DO_CARTAO = 'alvo-toque group block h-full rounded-cartao no-underline'
const CARTAO =
  'flex h-full min-h-24 items-end border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] ' +
  'group-hover:border-[var(--cor-texto)]'

// C1, /app/comunidade: o selo, o aviso de saúde, os 7 espaços em ordem e as entradas para o perfil
// público, as denúncias e, só para a moderação, o painel. Quem não é escritor habilitado vê o bloco que
// leva à entrada na comunidade (C5).
// As seções são filhas diretas do `<main>`: o cabeçalho, o painel "para publicar", os espaços e os links.
// As colunas dos espaços: uma até 639 px, duas de 640 a 1023 (`comunidade.css`) e três a partir de 1024.
export function Comunidade() {
  const dados = useDadosComunidade()
  const location = useLocation()
  const situacao = useSituacao()
  const espacos = useLeitura(() => dados.listarEspacos(), 'espacos')
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null

  return (
    <Quadro
      ocupado={situacao.estado.fase === 'carregando' || espacos.estado.fase === 'carregando'}
      titulo={<TituloDaTela linhas={LISTA.manchete} />}
      lide={LISTA.lide}
      cabeca={
        <>
          <Pilha vao="pilha">
            <AvisoDeSaude />
            <Status mensagem={textoDaPassagemComunidade(location.state)} />
          </Pilha>
          {situacao.estado.fase === 'erro' ? (
            <div className="max-w-[40rem]">
              <ErroDeLeitura erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
            </div>
          ) : null}
        </>
      }
    >
      {lida && !ehEscritor(lida) ? (
        <Secao variante="painel" painel="mel" classeCaixa="max-w-full" aria-labelledby="para-publicar">
          <Pilha vao="grupo" className="items-start">
            <Pilha vao="pilha" className="max-w-[34rem]">
              <h2 id="para-publicar" className="cm-h3 text-titulo-3">
                {LISTA.paraPublicarTitulo}
              </h2>
              <p>{LISTA.paraPublicarFrase}</p>
            </Pilha>
            <Botao to={caminhoDeEntrada('/app/comunidade')} tamanho="app">
              {LISTA.entrar}
            </Botao>
          </Pilha>
        </Secao>
      ) : null}

      <Faixa aria-labelledby="espacos">
        <Pilha vao="grupo">
          <h2 id="espacos" className="cm-h4 text-titulo-4">
            {LISTA.espacos}
          </h2>
          {espacos.esqueleto ? <Esqueleto linhas={4} /> : null}
          {espacos.estado.fase === 'erro' ? (
            <ErroDeLeitura erro={espacos.estado.erro} aoTentarDeNovo={() => void espacos.recarregar()} />
          ) : null}
          {espacos.estado.fase === 'pronto' && espacos.estado.valor.length === 0 ? <p>{TX.tx30}</p> : null}
          {espacos.estado.fase === 'pronto' && espacos.estado.valor.length > 0 ? (
            <Colunas role="list" fracoes="1fr 1fr 1fr" aPartirDe={1024} className="comunidade-espacos">
              {espacos.estado.valor.map((espaco) => (
                <Coluna as="li" key={espaco.id} className="list-none">
                  <Link to={`/app/comunidade/${espaco.slug}`} className={LINK_DO_CARTAO}>
                    <Cartao className={CARTAO}>
                      <span className="cm-h4 text-titulo-4">{espaco.nome}</span>
                    </Cartao>
                  </Link>
                </Coluna>
              ))}
            </Colunas>
          ) : null}
        </Pilha>
      </Faixa>

      {lida ? (
        <Faixa>
          <nav
            aria-label={LISTA.linksDaPessoa}
            className="border-t border-[var(--cor-fio-suave)] pt-esp-grupo"
          >
            <ul className="m-0 flex list-none flex-wrap gap-x-8 gap-y-1 p-0">
              <li>
                <Link to="/app/comunidade/perfil" className={LINK_ALVO}>
                  {LISTA.meuPerfil}
                </Link>
              </li>
              <li>
                <Link to="/app/comunidade/denuncias" className={LINK_ALVO}>
                  {LISTA.minhasDenuncias}
                </Link>
              </li>
              {ehDaModeracao(lida) ? (
                <li>
                  <Link to="/moderacao" className={LINK_ALVO}>
                    {LISTA.painel}
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </Faixa>
      ) : null}
    </Quadro>
  )
}
