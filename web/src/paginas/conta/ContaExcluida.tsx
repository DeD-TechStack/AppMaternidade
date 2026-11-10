import { Link } from 'react-router'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { CONTA_EXCLUIDA, TITULOS } from '../../conteudo/conta.ts'

// /conta-excluida (RF-12): tela estática, sem dados.
export function ContaExcluida() {
  return (
    <MolduraPublica
      titulo={TITULOS.contaExcluida}
      frase={CONTA_EXCLUIDA.frase}
      ligacoes={
        <p className="flex flex-wrap gap-x-4">
          <Link to="/" className={LINK_ALVO}>
            {CONTA_EXCLUIDA.inicio}
          </Link>
          <Link to="/criar-conta" className={LINK_ALVO}>
            {CONTA_EXCLUIDA.criarConta}
          </Link>
        </p>
      }
    >
      {null}
    </MolduraPublica>
  )
}
