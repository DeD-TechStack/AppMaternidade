import { Link } from 'react-router'
import { MolduraPublica } from '../../componentes/conta/MolduraPublica.tsx'
import { BOTAO_PRINCIPAL, LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { CONTA_EXCLUIDA, MANCHETES, TITULOS } from '../../conteudo/conta.ts'

// /conta-excluida (RF-12): tela estática, sem dados. Uma só ação principal (o botão cheio para o Início) e,
// abaixo dela, o link de texto.
export function ContaExcluida() {
  return (
    <MolduraPublica
      titulo={TITULOS.contaExcluida}
      manchete={MANCHETES.contaExcluida}
      frase={CONTA_EXCLUIDA.frase}
      ligacoes={
        <div className="flex w-full flex-col items-start gap-esp-pilha">
          <Link to="/" className={BOTAO_PRINCIPAL}>
            {CONTA_EXCLUIDA.inicio}
          </Link>
          <Link to="/criar-conta" className={LINK_ALVO}>
            {CONTA_EXCLUIDA.criarConta}
          </Link>
        </div>
      }
    />
  )
}
