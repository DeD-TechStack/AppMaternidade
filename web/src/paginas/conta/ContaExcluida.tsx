import { Link } from 'react-router'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { CONTA_EXCLUIDA, MANCHETES, TITULOS } from '../../conteudo/conta.ts'

// /conta-excluida (RF-12): tela estática, sem dados.
export function ContaExcluida() {
  return (
    <MolduraPublica
      titulo={TITULOS.contaExcluida}
      manchete={MANCHETES.contaExcluida}
      frase={CONTA_EXCLUIDA.frase}
      ligacoes={
        <>
          <Link to="/" className={LINK_ALVO}>
            {CONTA_EXCLUIDA.inicio}
          </Link>
          <Link to="/criar-conta" className={LINK_ALVO}>
            {CONTA_EXCLUIDA.criarConta}
          </Link>
        </>
      }
    />
  )
}
