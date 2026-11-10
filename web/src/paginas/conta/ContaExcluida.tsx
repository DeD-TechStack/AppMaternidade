import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import {
  ItemAvisoDeDemonstracao,
  ItemEtiquetaPrototipo,
  ItemLinkDaAbertura,
} from '../../componentes/conta/PartesAcesso.tsx'
import { CONTA_EXCLUIDA, TITULOS } from '../../conteudo/conta.ts'

// /conta-excluida (RF-12): tela estática, sem dados. A abertura traz a frase e, na coluna lateral, os
// links para o Início e para Criar conta.
export function ContaExcluida() {
  return (
    <MolduraPublica
      titulo={TITULOS.contaExcluida}
      subtitulo={CONTA_EXCLUIDA.frase}
      lateral={
        <>
          <ItemEtiquetaPrototipo />
          <ItemAvisoDeDemonstracao />
          <ItemLinkDaAbertura para="/">{CONTA_EXCLUIDA.inicio}</ItemLinkDaAbertura>
          <ItemLinkDaAbertura para="/criar-conta">{CONTA_EXCLUIDA.criarConta}</ItemLinkDaAbertura>
        </>
      }
    >
      {null}
    </MolduraPublica>
  )
}
