import { Abertura } from '../componentes/base/Abertura.tsx'
import { AMOSTRA } from '../componentes/base/amostraSistema.ts'
import { Botao } from '../componentes/base/Botao.tsx'
import { Campo } from '../componentes/base/Campo.tsx'
import { Etiqueta } from '../componentes/base/Etiqueta.tsx'
import { FaixaNumeros } from '../componentes/base/FaixaNumeros.tsx'
import { Galeria } from '../componentes/base/Galeria.tsx'
import { LinhaRotuloTexto } from '../componentes/base/LinhaRotuloTexto.tsx'
import { Midia } from '../componentes/base/Midia.tsx'

/**
 * A amostra viva do sistema-base: abertura, números, mídia larga, linhas rótulo + texto, galeria,
 * campos, botões e etiquetas, na ordem do contrato. Sem link no cabeçalho.
 */
export function Sistema() {
  const { campos, botoes, galeria } = AMOSTRA

  return (
    <main>
      <Abertura
        titulo={AMOSTRA.titulo}
        subtitulo={AMOSTRA.subtitulo}
        lateral={[
          ...AMOSTRA.etiquetasDaAbertura.map((texto) => (
            <li key={texto}>
              <Etiqueta>{texto}</Etiqueta>
            </li>
          )),
          <li key="link">
            <a className="sb-abertura-link t-corpo" href={`#${AMOSTRA.linkDaAbertura.alvo}`}>
              {AMOSTRA.linkDaAbertura.texto}
            </a>
          </li>,
        ]}
      />

      <section className="sb-area sb-mt-fio-bloco">
        <FaixaNumeros itens={AMOSTRA.numeros} />
      </section>

      <div className="sb-area sb-mt-numeros-midia">
        <Midia formato="larga" fundo="barro" aria-label={AMOSTRA.midiaLarga} />
      </div>

      <section className="sb-area sb-mt-midia-linhas" data-bloco="">
        {AMOSTRA.linhas.map((linha) => (
          <LinhaRotuloTexto key={linha.rotulo} rotulo={linha.rotulo}>
            {linha.texto}
          </LinhaRotuloTexto>
        ))}
      </section>

      <div className="sb-area sb-mt-midia-linhas">
        <Galeria>
          <Midia formato="larga" fundo="barro" aria-label={galeria.largaBarro} />
          <Midia formato="larga" fundo="lavanda" aria-label={galeria.largaLavanda} />
          <Midia formato="par" fundo="barro" aria-label={galeria.parBarro} />
          <Midia formato="par" fundo="lavanda" aria-label={galeria.parLavanda} />
        </Galeria>
      </div>

      <section id={AMOSTRA.linkDaAbertura.alvo} className="sb-area sb-mt-midia-titulo sb-campos" data-bloco="">
        <Campo id="amostra-senha" rotulo={campos.senha.rotulo} tipo="senha" ajuda={campos.senha.ajuda} />
        <Campo
          id="amostra-email"
          rotulo={campos.email.rotulo}
          tipo="email"
          defaultValue={campos.email.valor}
          erro={campos.email.erro}
        />
      </section>

      <section className="sb-area sb-mt-midia-titulo sb-fila" data-bloco="">
        <Botao>{botoes.primario}</Botao>
        <Botao variante="moldura" alto>
          {botoes.moldura}
        </Botao>
        <Botao desativado motivo={botoes.motivo}>
          {botoes.desativado}
        </Botao>
      </section>

      <section className="sb-area sb-mt-64" data-bloco="">
        <ul className="sb-pilha">
          {AMOSTRA.etiquetas.map((texto) => (
            <li key={texto}>
              <Etiqueta>{texto}</Etiqueta>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
