import { CENA_ACESSO } from '../../conteudo/conta.ts'
import { CenaEstudio } from '../campo/CenaEstudio.tsx'

// A cena de mel ao lado do formulário. Em 1440 o painel enche a altura da coluna do formulário e a
// imagem (2:3) o preenche cortada por cima e por baixo, com o aparelho ao centro; no celular ele vem
// depois do formulário, com altura fixa. A largura é a da coluna (e não a do painel de campo).
// `[&_[data-revela]]` é o recipiente da escala de rolagem da `CenaEstudio`.
const PAINEL =
  'mx-0 w-full min-h-[22rem] ' +
  '[&_[data-revela]]:h-full [&_picture]:block [&_picture]:h-full ' +
  '[&_img]:h-[22rem] [&_img]:w-full [&_img]:object-cover [&_img]:object-[50%_66%] ' +
  'lg:min-h-[36rem] lg:[&_[data-revela]]:absolute lg:[&_[data-revela]]:inset-0 lg:[&_img]:h-full'

/** Os arquivos `entrar@1x.webp` e `entrar@2x.webp` são recompostos depois com os mesmos nomes. */
export function CenaAcesso() {
  return (
    <CenaEstudio
      base={CENA_ACESSO.base}
      largura={CENA_ACESSO.largura}
      altura={CENA_ACESSO.altura}
      alt={CENA_ACESSO.alt}
      prioritaria
      className={PAINEL}
    />
  )
}
