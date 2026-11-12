import { Esqueleto } from '../../componentes/comunidade/Avisos.tsx'
import { usePaginas } from '../../componentes/comunidade/useLeitura.ts'
import { ErroDeLeituraNoPainel } from '../../componentes/moderacao/Avisos.tsx'
import { usePainel } from '../../componentes/moderacao/contexto.ts'
import { useDadosModeracao } from '../../componentes/moderacao/dados.ts'
import { BOTAO_SECUNDARIO_QUEBRA } from '../../componentes/moderacao/estilos.ts'
import { LinhaDaAuditoria } from '../../componentes/moderacao/LinhaDaAuditoria.tsx'
import { Painel } from '../../componentes/moderacao/Painel.tsx'
import { COMUM_COMUNIDADE } from '../../conteudo/comunidade.ts'
import { AUDITORIA, NOMES_DAS_TELAS, TX } from '../../conteudo/moderacao.ts'
import type { LinhaDeAuditoria } from '../../dados/moderacao.ts'

function ListaDaAuditoria() {
  const painel = usePainel()
  const dados = useDadosModeracao()
  const lista = usePaginas<LinhaDeAuditoria>(
    (pagina) =>
      painel.ler(
        () => dados.auditoria(pagina),
        (lida) => pagina === 0 && lida.itens.length === 0,
      ),
    'auditoria',
  )
  const lidas = lista.estado.fase === 'pronto' ? lista.estado : null

  return (
    <section aria-label={AUDITORIA.lista} aria-busy={lista.estado.fase === 'carregando' || undefined} className="flex flex-col gap-3">
      {lista.esqueleto ? <Esqueleto /> : null}
      {lista.estado.fase === 'erro' ? (
        <ErroDeLeituraNoPainel erro={lista.estado.erro} aoTentarDeNovo={() => void lista.recarregar()} />
      ) : null}
      {lidas && lidas.itens.length === 0 ? <p>{TX.tx20}</p> : null}
      {lidas && lidas.itens.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {lidas.itens.map((linha) => (
            <LinhaDaAuditoria key={linha.id} linha={linha} contaId={painel.contaId} />
          ))}
        </ul>
      ) : null}
      {lidas?.erroDaPagina ? (
        <ErroDeLeituraNoPainel erro={lidas.erroDaPagina} aoTentarDeNovo={() => void lista.carregarMais()} />
      ) : null}
      {lidas && lidas.haMais && !lidas.erroDaPagina ? (
        <div>
          <button
            type="button"
            disabled={lidas.maisEmCurso}
            className={BOTAO_SECUNDARIO_QUEBRA}
            data-tamanho="app"
            onClick={() => void lista.carregarMais()}
          >
            {lidas.maisEmCurso ? COMUM_COMUNIDADE.carregando : AUDITORIA.carregarMais}
          </button>
        </div>
      ) : null}
    </section>
  )
}

// M4, /moderacao/auditoria: as ações da moderação, da mais nova à mais antiga, em páginas de 50.
export function AuditoriaDoPainel() {
  return (
    <Painel titulo={NOMES_DAS_TELAS.auditoria}>
      <ListaDaAuditoria />
    </Painel>
  )
}
