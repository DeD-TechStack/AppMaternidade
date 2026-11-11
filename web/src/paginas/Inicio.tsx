import { useEffect } from 'react'
import { Botao } from '../componentes/base/Botao.tsx'
import { Numeros } from '../componentes/campo/Numeros.tsx'
import { FATOS, INICIO } from '../conteudo/textos.ts'
import { usePrototipo } from '../prototipo/contexto.ts'

/**
 * O Início, mínimo até o cartão dele (MAT-49c): a promessa em duas linhas (a segunda em itálico), o
 * texto, os dois caminhos e a faixa de números. Usa só as peças do Campo de mel que já existem. O h1
 * não anima: é a primeira coisa da página.
 */
export function Inicio() {
  const { dispatch } = usePrototipo()

  // O Início é sempre claro: sair do modo madrugada ao chegar aqui.
  useEffect(() => {
    dispatch({ tipo: 'definirMadrugada', valor: false })
  }, [dispatch])

  return (
    <main className="cm-area cm-sistema-abertura">
      <h1 className="cm-h1">
        {INICIO.titulo[0]}
        <span className="cm-segunda-linha">{` ${INICIO.titulo[1]}`}</span>
      </h1>
      <p className="cm-lide cm-medida">{INICIO.lide}</p>
      <div className="cm-sistema-acoes">
        <Botao to={INICIO.primario.destino}>{INICIO.primario.rotulo}</Botao>
        <Botao variante="texto" to={INICIO.secundario.destino}>
          {INICIO.secundario.rotulo}
        </Botao>
      </div>
      <Numeros itens={FATOS} className="cm-cena-numeros" />
    </main>
  )
}
