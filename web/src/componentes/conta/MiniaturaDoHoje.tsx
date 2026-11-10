import { Aparelho } from '../Aparelho.tsx'
import { MINIATURAS } from '../../conteudo/textos.ts'
import { BotoesRapidos } from '../../prototipo/BotoesRapidos.tsx'
import { CartaoEmAndamento } from '../../prototipo/CartaoEmAndamento.tsx'

const semAcao = () => undefined

// A escala da miniatura: o celular mede 24 rem por 37,3 rem no tamanho natural (index.css), e a
// caixa de fora tem o tamanho dele já reduzido, porque a escala não muda o espaço que o elemento
// ocupa. 0,58 × 24 = 13,9 rem; 0,58 × 37,33 = 21,7 rem.

/**
 * O Hoje do celular em miniatura, para o painel de Entrar: os mesmos componentes do Hoje e do
 * Início, com os dados fixos de `textos.ts` (família fictícia). A moldura é inerte e escondida do
 * leitor de tela; os botões são desativados e fora da ordem do Tab. Só vitrine: nada se faz aqui.
 */
export function MiniaturaDoHoje() {
  const { hoje } = MINIATURAS
  return (
    <div className="relative h-[21.7rem] w-[13.9rem]">
      <Aparelho tipo="celular" tela="hoje" className="absolute left-0 top-0 origin-top-left scale-[0.58]">
        <div>
          <p className="titulo-linha">{hoje.titulo}</p>
          <p className="mt-1">{hoje.bebe}</p>
          <div className="mt-4">
            <CartaoEmAndamento miniatura sessao={hoje.sessao} />
          </div>
          <div className="mt-4">
            <BotoesRapidos
              desativado
              semIcones
              aoIniciarSessao={semAcao}
              aoRegistrarFralda={semAcao}
              aoRegistrarMais={semAcao}
            />
          </div>
        </div>
      </Aparelho>
    </div>
  )
}
