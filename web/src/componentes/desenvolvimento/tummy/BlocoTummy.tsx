import { useId, useRef } from 'react'
import { Link } from 'react-router'
import { T, bebeArquivado } from '../../../conteudo/desenvolvimento/textosLogada.ts'
import { TT, iniciarDe } from '../../../conteudo/desenvolvimento/textosTummy.ts'
import type { Papel } from '../../../dados/comum.ts'
import type { Bebe, FamiliaResumo } from '../../../dados/conta.ts'
import { podeAlterarItem } from '../../../dados/rotina.tipos.ts'
import { ALVO_APP } from '../../app/alvo.ts'
import { Botao } from '../../base/Botao.tsx'
import { useConteudo } from '../conteudo.tsx'
import { ID_TUMMY_TIME, rotaDoItem } from '../itens.ts'
import { CHAVE } from './foco.ts'
import { Historico } from './Historico.tsx'
import { AvisoDeListaAntiga, EnvioEmCurso, ErroDeEscrita, FaixaDeConfirmacao } from './Mensagens.tsx'
import { PainelDeRegistro } from './PainelDeRegistro.tsx'
import { autorDe } from './regras.ts'
import { SessaoEmAndamento } from './SessaoEmAndamento.tsx'
import { useBlocoTummy } from './useBlocoTummy.ts'

interface Props {
  bebe: Bebe
  familia: FamiliaResumo
  /** O papel que a página leu; o bloco o troca pelo da releitura quando ele mudou com a página aberta. */
  papel: Papel
  /** O vínculo com a família acabou com a página aberta: a página relê o contexto do bebê e tira o bloco. */
  aoPerderAcesso?: () => void
}

const FAIXA_DE_ESTADO = 'm-0 max-w-[65ch] rounded-campo bg-[var(--cor-papel-fundo)] px-4 py-3 font-medium wrap-anywhere'

/**
 * O bloco "Tummy time" da página logada Desenvolvimento (MAT-39b, DES-03 e DES-04): iniciar e encerrar a sessão
 * com cronômetro, "Fizemos agora", outro horário e o histórico de 7 dias. Os dados vêm da `DadosRotina` pela
 * camada da área; nada é guardado no aparelho. O texto de segurança e o aviso de saúde ficam sempre à vista.
 */
export function BlocoTummy({ bebe, familia, papel, aoPerderAcesso }: Props) {
  const raiz = useRef<HTMLElement>(null)
  const bloco = useBlocoTummy({ bebe, familia, papel, raiz, aoPerderAcesso })
  const conteudo = useConteudo()
  const idTitulo = useId()
  const { acoes } = bloco

  const erroEm = (onde: typeof bloco.ondeDoErro) =>
    bloco.erro && bloco.ondeDoErro === onde ? (
      <ErroDeEscrita erro={bloco.erro} aoTentarDeNovo={acoes.tentarDeNovo} aoFechar={acoes.fecharErro} />
    ) : null

  const pendenteNaZonaGeral = bloco.ondePendente === 'iniciar' || bloco.ondePendente === 'confirmacao'

  return (
    <section
      ref={raiz}
      data-tummy=""
      aria-labelledby={idTitulo}
      aria-busy={bloco.leitura === 'carregando' ? 'true' : undefined}
      className="flex flex-col items-start gap-6"
    >
      <h2 id={idTitulo} tabIndex={-1} data-foco={CHAVE.titulo} className="cm-h3 alvo-foco">
        {TT.titulo}
      </h2>

      <div className="flex max-w-[65ch] flex-col items-start gap-2">
        <p className="m-0 font-medium">{TT.seguranca}</p>
        <p className="cm-pequeno cm-texto-2 m-0">{T.avisoDeSaude}</p>
        {conteudo.visivel(ID_TUMMY_TIME) ? (
          <Link
            to={rotaDoItem(ID_TUMMY_TIME)}
            className="alvo-toque inline-flex items-center font-medium text-[var(--cor-link)] underline decoration-[1.5px] underline-offset-4 hover:decoration-2"
          >
            {TT.fontes}
          </Link>
        ) : null}
      </div>

      {bloco.noticia === 'observador' ? (
        <p role="status" data-aviso-estado="observador" className={FAIXA_DE_ESTADO}>
          {T.soVer}
        </p>
      ) : null}
      {bloco.noticia === 'arquivado' ? (
        <p role="status" data-aviso-estado="arquivado" className={FAIXA_DE_ESTADO}>
          {bebeArquivado(bebe.nome)}
        </p>
      ) : null}
      {bloco.acessoPerdido && !bloco.erro ? (
        <p role="status" data-acesso-perdido="" className={FAIXA_DE_ESTADO}>
          {TT.naoEncontrado}
        </p>
      ) : null}

      {bloco.leitura === 'carregando' ? (
        <p role="status" data-carregando="" className={FAIXA_DE_ESTADO}>
          {T.carregando}
        </p>
      ) : null}
      {bloco.leitura === 'falha' ? (
        <div data-leitura-falhou="" className="flex flex-col items-start gap-3">
          <p role="alert" className="m-0 max-w-[65ch] rounded-campo border-2 border-[var(--cor-erro,var(--cor-texto))] bg-[var(--cor-cartao)] px-4 py-3 font-medium wrap-anywhere">
            {T.falhaDeLeitura}
          </p>
          <Botao variante="contorno" tamanho="app" className={ALVO_APP} onClick={acoes.tentarLeituraDeNovo}>
            {T.tentarDeNovo}
          </Botao>
        </div>
      ) : null}

      {bloco.emAndamento.length > 0 ? (
        <div className="flex w-full flex-col gap-4">
          {bloco.emAndamento.map((sessao) => (
            <SessaoEmAndamento
              key={sessao.id}
              sessao={sessao}
              nomeDoBebe={bebe.nome}
              autor={autorDe(sessao.criadoPor, bloco.membros)}
              podeEncerrar={bloco.escreve}
              podeDescartar={bloco.escreve && podeAlterarItem(bloco.papel, sessao.criadoPor, bloco.contaId)}
              podeAgir={bloco.podeAgir}
              ondePendente={bloco.ondePendente}
              erro={erroEm(`sessao:${sessao.id}`)}
              aoEncerrar={() => acoes.encerrar(sessao)}
              aoDescartar={() => acoes.descartar(sessao)}
            />
          ))}
        </div>
      ) : null}

      {bloco.escreve ? (
        <div className="flex flex-wrap items-center gap-3">
          {bloco.emAndamento.length === 0 ? (
            <Botao
              tamanho="app"
              className={ALVO_APP}
              aria-label={iniciarDe(bebe.nome)}
              data-foco={CHAVE.iniciar}
              desativado={!bloco.podeAgir}
              onClick={acoes.iniciar}
            >
              {TT.iniciar}
            </Botao>
          ) : null}
          <Botao
            variante="contorno"
            tamanho="app"
            className={ALVO_APP}
            data-foco={CHAVE.abrirAgora}
            desativado={!bloco.podeAgir}
            onClick={() => acoes.abrirPainel('agora')}
          >
            {TT.fizemosAgora}
          </Botao>
          <Botao
            variante="contorno"
            tamanho="app"
            className={ALVO_APP}
            data-foco={CHAVE.abrirHorario}
            desativado={!bloco.podeAgir}
            onClick={() => acoes.abrirPainel('horario')}
          >
            {TT.outroHorario}
          </Botao>
        </div>
      ) : null}

      <EnvioEmCurso ativo={pendenteNaZonaGeral} />
      {erroEm('geral')}

      {bloco.confirmacao ? (
        <FaixaDeConfirmacao
          texto={bloco.confirmacao.texto}
          comDesfazer={bloco.confirmacao.desfazer !== null}
          aoDesfazer={acoes.desfazer}
          aoFechar={acoes.fecharConfirmacao}
        />
      ) : null}
      {bloco.salvoSemAtualizar ? <AvisoDeListaAntiga aoAtualizar={acoes.atualizar} /> : null}

      {bloco.painel && bloco.escreve ? (
        <PainelDeRegistro
          key={bloco.painel.id}
          painel={bloco.painel}
          fusoDaFamilia={familia.fuso}
          somenteLeitura={bloco.somenteLeitura}
          salvando={bloco.ondePendente === 'painel'}
          bloqueado={bloco.erro?.bloqueia === true && bloco.erro.onde === 'painel'}
          podeAgir={bloco.podeAgir}
          passo={bloco.passo}
          erroDeCampo={bloco.erroDeCampo}
          erro={erroEm('painel')}
          aoSalvar={acoes.salvarPainel}
          aoConfirmar={acoes.confirmarPasso}
          aoVoltar={acoes.voltarDoPasso}
          aoFechar={acoes.fecharPainel}
          aoEditar={acoes.editarCampo}
        />
      ) : null}

      {bloco.comDados ? (
        <Historico
          encerradas={bloco.encerradas}
          incompleta={bloco.incompleta}
          vazio={bloco.vazio}
          fusoDaFamilia={familia.fuso}
          agoraDaLeitura={bloco.agoraDaLeitura}
          membros={bloco.membros}
          indiceDoDia={bloco.indiceDoDia}
          aoEscolherODia={acoes.escolherDia}
        />
      ) : null}
    </section>
  )
}
