import { useState, type FormEvent, type RefObject } from 'react'
import { Link } from 'react-router'
import { AVISO_AUTORREBAIXAMENTO, COMUM, FAMILIA, PAPEIS } from '../../conteudo/conta.ts'
import type { Papel, Resultado } from '../../dados/comum.ts'
import type { DetalheFamilia } from '../../dados/conta.ts'
import { familiaMudou, useAoFalharNaFamilia, type AcoesDaFamilia, type DialogoAberto } from './acoesFamilia.ts'
import { Campo } from './Campos.tsx'
import { DialogoDeAcao } from './DialogoDeAcao.tsx'
import { EscolhaDePapel } from './EscolhaDePapel.tsx'
import { useEnvio } from './envio.ts'
import { useFocoNoResumo } from './foco.ts'
import { LINK_ALVO, ResumoErro } from './Partes.tsx'
import { useDadosConta } from './sessao.tsx'

interface Props {
  dialogo: DialogoAberto
  detalhe: DetalheFamilia
  acoes: AcoesDaFamilia
  aoFechar: () => void
  retorno: RefObject<HTMLElement | null>
}

interface Plano {
  escrever: () => Promise<Resultado<unknown>>
  conferir: () => Promise<Resultado<boolean>>
  mensagem: string
  /** Quem sai da família ou a exclui sabe que perdeu o acesso: a tela não avisa "encerrado". */
  voluntaria?: boolean
}

// As seis caixas de diálogo da Família (RN-03), uma de cada vez: remover acesso, mudar papel, sair,
// excluir a família, cancelar convite e arquivar bebê. Cada uma confere o efeito pedido por releitura
// quando a repetição de uma escrita falha (RF-17, "rede numa escrita").
export function DialogoDaFamilia({ dialogo, detalhe, acoes, aoFechar, retorno }: Props) {
  const dados = useDadosConta()
  const envio = useEnvio()
  const [papel, setPapel] = useState<Papel>(dialogo.tipo === 'papel' ? dialogo.membro.papel : 'cuidador')
  const [nomeDigitado, setNomeDigitado] = useState('')
  const { familia } = detalhe

  const erro = envio.estado.fase === 'erro' ? envio.estado.erro : null
  const resumoRef = useFocoNoResumo(erro && !familiaMudou(erro) ? envio.estado : null)
  useAoFalharNaFamilia(erro, acoes.aposFalha)

  const semAEntrada = async (id: string) => {
    const lida = await dados.minhasFamilias()
    return lida.ok ? ({ ok: true, valor: !lida.valor.some((item) => item.id === id) } as const) : lida
  }
  const detalheDe = async <T,>(conferir: (lido: DetalheFamilia) => T): Promise<Resultado<T>> => {
    const lida = await dados.detalheFamilia(familia.id)
    return lida.ok ? { ok: true, valor: conferir(lida.valor) } : lida
  }

  function planejar(): Plano {
    switch (dialogo.tipo) {
      case 'remover': {
        const { membro } = dialogo
        return {
          escrever: () => dados.revogarVinculo(membro.vinculoId),
          conferir: () => detalheDe((lido) => !lido.membros.some((item) => item.vinculoId === membro.vinculoId)),
          mensagem: FAMILIA.membros.acessoRemovido(membro.nome),
        }
      }
      case 'papel': {
        const { membro } = dialogo
        return {
          escrever: () => dados.mudarPapel(membro.vinculoId, papel),
          // No autorrebaixamento já gravado a repetição dá `sem_permissao`; a releitura mostra o vínculo com o papel.
          conferir: () => detalheDe((lido) => lido.membros.find((item) => item.vinculoId === membro.vinculoId)?.papel === papel),
          mensagem: FAMILIA.membros.papelMudado(membro.souEu ? 'Você' : membro.nome, PAPEIS[papel].minusculo),
        }
      }
      case 'sair':
        return {
          escrever: () => dados.sairDaFamilia(familia.id),
          conferir: () => semAEntrada(familia.id),
          mensagem: FAMILIA.acoes.saiu(familia.nome),
          voluntaria: true,
        }
      case 'excluir':
        return {
          escrever: () => dados.excluirFamilia(familia.id),
          conferir: () => semAEntrada(familia.id),
          mensagem: FAMILIA.acoes.excluida(familia.nome),
          voluntaria: true,
        }
      case 'cancelarConvite': {
        const { convite } = dialogo
        return {
          escrever: () => dados.revogarConvite(convite.id),
          // Sem a lista de convites (a pessoa deixou de ser responsável), nada se confirma.
          conferir: () => detalheDe((lido) => lido.convites !== null && !lido.convites.some((item) => item.id === convite.id)),
          mensagem: FAMILIA.convites.cancelado,
        }
      }
      case 'arquivar': {
        const { bebe } = dialogo
        return {
          escrever: () => dados.arquivarBebe(bebe.id, true),
          conferir: () => detalheDe((lido) => lido.bebes.find((item) => item.id === bebe.id)?.estado === 'arquivado'),
          mensagem: FAMILIA.bebes.arquivado(bebe.nome),
        }
      }
    }
  }

  function aoConfirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const plano = planejar()
    void envio.enviar({
      escrever: plano.escrever,
      conferir: plano.conferir,
      aoSucesso: async () => {
        aoFechar()
        await acoes.aposAcao(plano.mensagem, plano.voluntaria)
      },
    })
  }

  const resumo =
    erro && !familiaMudou(erro) ? (
      <ResumoErro
        erro={erro}
        repetivel={envio.estado.fase === 'erro' && envio.estado.tentarDeNovo}
        aoTentarDeNovo={() => void envio.tentarDeNovo()}
        refResumo={resumoRef}
      />
    ) : null

  const comum = { resumo, enviando: envio.enviando, aoConfirmar, aoCancelar: aoFechar, retorno }
  const dialogos = FAMILIA.dialogos

  switch (dialogo.tipo) {
    case 'remover':
      return (
        <DialogoDeAcao
          {...comum}
          titulo={dialogos.removerAcesso.titulo(dialogo.membro.nome)}
          texto={<p>{dialogos.removerAcesso.texto}</p>}
          confirmar={dialogos.removerAcesso.confirmar}
          rotuloEnviando={COMUM.enviando}
          cancelar={dialogos.cancelar}
        />
      )
    case 'papel':
      return (
        <DialogoDeAcao
          {...comum}
          titulo={dialogo.membro.souEu ? dialogos.mudarPapel.tituloProprio : dialogos.mudarPapel.titulo(dialogo.membro.nome)}
          confirmar={dialogos.mudarPapel.confirmar}
          rotuloEnviando={COMUM.salvando}
          cancelar={dialogos.cancelar}
        >
          <EscolhaDePapel legenda={dialogos.mudarPapel.legenda} valor={papel} aoMudar={setPapel} />
          {dialogo.membro.souEu ? (
            <p data-aviso="autorrebaixamento" className="rounded-campo border-[1.5px] border-[var(--cor-texto)] p-3 font-medium">
              {AVISO_AUTORREBAIXAMENTO}
            </p>
          ) : null}
        </DialogoDeAcao>
      )
    case 'sair':
      return (
        <DialogoDeAcao
          {...comum}
          titulo={dialogos.sair.titulo(familia.nome)}
          texto={<p>{dialogos.sair.texto}</p>}
          confirmar={dialogos.sair.confirmar}
          rotuloEnviando={COMUM.enviando}
          cancelar={dialogos.cancelar}
        />
      )
    case 'excluir':
      return (
        <DialogoDeAcao
          {...comum}
          titulo={dialogos.excluirFamilia.titulo(familia.nome)}
          texto={
            <>
              <p>{dialogos.excluirFamilia.texto}</p>
              <Link to="/app/conta#exportar" className={LINK_ALVO}>
                {dialogos.excluirFamilia.baixar}
              </Link>
            </>
          }
          confirmar={dialogos.excluirFamilia.confirmar}
          rotuloEnviando={COMUM.excluindo}
          cancelar={dialogos.cancelar}
          confirmarDesativado={nomeDigitado !== familia.nome}
        >
          <Campo
            rotulo={dialogos.excluirFamilia.campo}
            tamanho="app"
            valor={nomeDigitado}
            aoMudar={setNomeDigitado}
          />
        </DialogoDeAcao>
      )
    case 'cancelarConvite':
      return (
        <DialogoDeAcao
          {...comum}
          titulo={dialogos.cancelarConvite.titulo}
          texto={<p>{dialogos.cancelarConvite.texto}</p>}
          confirmar={dialogos.cancelarConvite.confirmar}
          rotuloEnviando={COMUM.enviando}
          cancelar={dialogos.cancelarConvite.manter}
        />
      )
    case 'arquivar':
      return (
        <DialogoDeAcao
          {...comum}
          titulo={dialogos.arquivarBebe.titulo(dialogo.bebe.nome)}
          texto={<p>{dialogos.arquivarBebe.texto}</p>}
          confirmar={dialogos.arquivarBebe.confirmar}
          rotuloEnviando={COMUM.enviando}
          cancelar={dialogos.cancelar}
        />
      )
  }
}
