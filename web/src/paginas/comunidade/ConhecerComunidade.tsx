import { Botao } from '../../componentes/base/Botao.tsx'
import { Cartao } from '../../componentes/base/layout/Cartao.tsx'
import { Pilha } from '../../componentes/base/layout/Pilha.tsx'
import { urlPublica } from '../../componentes/campo/urlPublica.ts'
import { Selo, AvisoDeSaude } from '../../componentes/comunidade/Avisos.tsx'
import { Faixa } from '../../componentes/comunidade/Faixa.tsx'
import { TituloDaTela } from '../../componentes/comunidade/Quadro.tsx'
import { LINK_ALVO } from '../../componentes/conta/Partes.tsx'
import { CONHECER_COMUNIDADE as TEXTO } from '../../conteudo/comunidade.ts'
import { fixtureComunidadeDemonstracao } from '../../dados/comunidade.demonstracao.ts'
import './comunidade.css'

// Projeção de exibição da fixture fictícia de produção. Nenhum adaptador, sessão,
// perfil, vínculo, identificador ou registro real participa desta leitura pública.
const espacos = (fixtureComunidadeDemonstracao.espacos ?? []).map(({ nome }) => nome)
const exemplos = (fixtureComunidadeDemonstracao.topicos ?? [])
  .filter(({ estado }) => estado === 'visivel')
  .map(({ titulo, corpo }) => ({ titulo, corpo }))

export function ConhecerComunidade() {
  return (
    <main className="wrap-anywhere">
      <Faixa>
        <Pilha vao="grupo">
          <Selo />
          <TituloDaTela>{TEXTO.titulo}</TituloDaTela>
          <p className="cm-lide text-abertura max-w-leitura">{TEXTO.lide}</p>
          <AvisoDeSaude />
        </Pilha>
      </Faixa>
      <Faixa aria-labelledby="conhecer-espacos">
        <Pilha vao="grupo">
          <h2 id="conhecer-espacos" className="cm-h3 text-titulo-3">{TEXTO.espacos}</h2>
          <ul className="flex flex-wrap gap-esp-grupo">
            {espacos.map((nome) => <li key={nome}>{nome}</li>)}
          </ul>
        </Pilha>
      </Faixa>
      <Faixa aria-labelledby="conhecer-exemplos">
        <Pilha vao="grupo">
          <h2 id="conhecer-exemplos" className="cm-h3 text-titulo-3">{TEXTO.exemplos}</h2>
          <p className="max-w-leitura" role="note">{TEXTO.aviso}</p>
          {exemplos.map(({ titulo, corpo }) => (
            <Cartao as="article" key={titulo} className="max-w-leitura border border-[var(--cor-fio-suave)] bg-[var(--cor-cartao)]">
              <Pilha>
                <p className="text-pequeno">{TEXTO.exemplo}</p>
                <h3 className="cm-h4 text-titulo-4">{titulo}</h3>
                <p>{corpo}</p>
              </Pilha>
            </Cartao>
          ))}
        </Pilha>
      </Faixa>
      <Faixa>
        <Pilha vao="grupo" className="items-start">
          <p className="max-w-leitura">{TEXTO.acesso}</p>
          <Botao href={urlPublica('/app/comunidade')}>{TEXTO.participar}</Botao>
          <a href={urlPublica('/regras-da-comunidade')} className={LINK_ALVO}>{TEXTO.regras}</a>
        </Pilha>
      </Faixa>
    </main>
  )
}
