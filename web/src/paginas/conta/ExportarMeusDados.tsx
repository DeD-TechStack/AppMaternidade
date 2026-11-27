import { baixarJson, EXPORTACAO_INCOMPLETA, nomeDoArquivoDeDados, validarExportacao } from '../../componentes/conta/arquivo.ts'
import { useEnvio } from '../../componentes/conta/envio.ts'
import { useFocoNoResumo } from '../../componentes/conta/foco.ts'
import { BOTAO_SECUNDARIO } from '../../componentes/conta/Partes.tsx'
import { useDadosConta, useSessao } from '../../componentes/conta/sessao.tsx'
import { Colunas, Pilha } from '../../componentes/base/layout/index.ts'
import { ErroDaConta } from '../../componentes/estado/ErroDaConta.tsx'
import { COMUM, CONTA } from '../../conteudo/conta.ts'

const QUEBRA_DO_BOTAO = 'max-w-full whitespace-normal wrap-anywhere'
const SECAO = 'border-t border-[var(--cor-fio-suave)] pt-esp-bloco'

export function ExportarMeusDados({ aoStatus }: { aoStatus: (mensagem: string | null) => void }) {
  const dados = useDadosConta()
  const { conta } = useSessao()
  const exportacao = useEnvio()
  const resumoDaExportacao = useFocoNoResumo(exportacao.estado.fase === 'erro' ? exportacao.estado : null)

  function baixarDados() {
    if (!conta) return
    void exportacao.enviar({
      aoComecar: () => aoStatus(null),
      escrever: async () => validarExportacao(await dados.exportarDados()),
      aoSucesso: (conteudo) => {
        baixarJson(conteudo, nomeDoArquivoDeDados(conta.fuso))
        aoStatus(CONTA.exportar.sucesso)
      },
    })
  }

  return (
    <section aria-labelledby="exportar" className={SECAO}>
      <Colunas fracoes="5fr 7fr" vao="bloco" aPartirDe={1024}>
        <Pilha dataH="coluna" vao="pilha" className="wrap-anywhere">
          <h2 id="exportar" tabIndex={-1} className="cm-h4 alvo-foco">
            {CONTA.exportar.titulo}
          </h2>
          <p className="cm-medida">{CONTA.exportar.frase}</p>
        </Pilha>
        <Pilha dataH="coluna" vao="pilha" className="items-start">
          {exportacao.estado.fase === 'erro' ? (
            <ErroDaConta
              erro={exportacao.estado.erro}
              texto={exportacao.estado.erro === EXPORTACAO_INCOMPLETA.erro ? EXPORTACAO_INCOMPLETA.texto : undefined}
              repetivel={exportacao.estado.tentarDeNovo}
              aoTentarDeNovo={() => void exportacao.tentarDeNovo()}
              refResumo={resumoDaExportacao}
            />
          ) : null}
          <button type="button" disabled={exportacao.enviando} className={`${BOTAO_SECUNDARIO} ${QUEBRA_DO_BOTAO}`} data-tamanho="app" onClick={baixarDados}>
            {exportacao.enviando ? COMUM.preparandoArquivo : CONTA.exportar.botao}
          </button>
        </Pilha>
      </Colunas>
    </section>
  )
}
