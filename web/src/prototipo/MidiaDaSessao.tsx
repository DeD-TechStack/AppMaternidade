import { Coluna } from '../componentes/base/layout/index.ts'
import { Ilustracao } from '../componentes/campo/Ilustracao.tsx'
import { DESCRICAO_DA_MIDIA } from './textosSessao.ts'

/**
 * O desenho da Sessão vazia: o traço da noite sobre um campo de mel (nos dois temas: o traço preto nunca
 * vai sobre o cacau da madrugada), com a descrição do berço.
 */
export function MidiaDaSessao({ className }: { className?: string }) {
  return (
    <Coluna
      data-midia=""
      className={`flex aspect-[3/2] items-center justify-center rounded-cartao bg-mel p-esp-painel ${className ?? ''}`}
    >
      <Ilustracao nome="mae-noite" alt={DESCRICAO_DA_MIDIA.vazio} className="h-full w-auto max-w-full object-contain" />
    </Coluna>
  )
}
