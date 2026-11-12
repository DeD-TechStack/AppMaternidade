import { Link, useLocation } from 'react-router'
import { PainelCampo } from '../../componentes/campo/PainelCampo.tsx'
import { Botao } from '../../componentes/base/Botao.tsx'
import { LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { AvisoDeSaude, ErroDeLeitura, Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { useDadosComunidade } from '../../componentes/comunidade/dados.ts'
import { Quadro, TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { ehDaModeracao, ehEscritor, useSituacao } from '../../componentes/comunidade/situacao.ts'
import { Status } from '../../componentes/comunidade/Status.tsx'
import { useLeitura } from '../../componentes/comunidade/useLeitura.ts'
import { caminhoDeEntrada } from '../../componentes/comunidade/volta.ts'
import { LISTA, TX, textoDaPassagemComunidade } from '../../conteudo/comunidade.ts'

const CARTAO =
  'alvo-toque flex min-h-24 items-end rounded-cartao border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)] p-5 ' +
  'no-underline hover:border-[var(--cor-texto)]'

// C1, /app/comunidade: o selo, o aviso de saúde, os 7 espaços em ordem e as entradas para o perfil
// público, as denúncias e, só para a moderação, o painel. Quem não é escritor habilitado vê o bloco que
// leva à entrada na comunidade (C5).
export function Comunidade() {
  const dados = useDadosComunidade()
  const location = useLocation()
  const situacao = useSituacao()
  const espacos = useLeitura(() => dados.listarEspacos(), 'espacos')
  const lida = situacao.estado.fase === 'pronto' ? situacao.estado.valor : null

  return (
    <Quadro ocupado={situacao.estado.fase === 'carregando' || espacos.estado.fase === 'carregando'}>
      <TituloDaTela linhas={LISTA.manchete} />
      <p className="cm-lide mt-3 max-w-[40rem] text-[var(--cor-texto-2)]">{LISTA.lide}</p>
      <div className="mt-6 flex flex-col gap-4">
        <AvisoDeSaude />
        <Status mensagem={textoDaPassagemComunidade(location.state)} />
      </div>

      {situacao.estado.fase === 'erro' ? (
        <div className="mt-8 max-w-[40rem]">
          <ErroDeLeitura erro={situacao.estado.erro} aoTentarDeNovo={() => void situacao.recarregar()} />
        </div>
      ) : null}

      {lida && !ehEscritor(lida) ? (
        <PainelCampo como="section" aria-labelledby="para-publicar" largura="celula" className="mt-8">
          <div className="flex max-w-[34rem] flex-col items-start gap-4">
            <h2 id="para-publicar" className="cm-h3">
              {LISTA.paraPublicarTitulo}
            </h2>
            <p>{LISTA.paraPublicarFrase}</p>
            <Botao to={caminhoDeEntrada('/app/comunidade')} tamanho="app">
              {LISTA.entrar}
            </Botao>
          </div>
        </PainelCampo>
      ) : null}

      <section aria-labelledby="espacos" className="mt-10">
        <h2 id="espacos" className="cm-h4">
          {LISTA.espacos}
        </h2>
        <div className="mt-4">
          {espacos.esqueleto ? <Esqueleto linhas={4} /> : null}
          {espacos.estado.fase === 'erro' ? (
            <ErroDeLeitura erro={espacos.estado.erro} aoTentarDeNovo={() => void espacos.recarregar()} />
          ) : null}
          {espacos.estado.fase === 'pronto' && espacos.estado.valor.length === 0 ? (
            <p>{TX.tx30}</p>
          ) : null}
          {espacos.estado.fase === 'pronto' && espacos.estado.valor.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[40rem]:grid-cols-2 lg:grid-cols-3">
              {espacos.estado.valor.map((espaco) => (
                <li key={espaco.id}>
                  <Link to={`/app/comunidade/${espaco.slug}`} className={CARTAO}>
                    <span className="cm-h4">{espaco.nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {lida ? (
        <nav aria-label={LISTA.linksDaPessoa} className="mt-10 border-t border-[var(--cor-fio-suave)] pt-6">
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
      ) : null}
    </Quadro>
  )
}
