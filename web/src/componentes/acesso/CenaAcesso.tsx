import { CENA_ACESSO } from '../../conteudo/conta.ts'
import { CenaEstudio } from '../campo/CenaEstudio.tsx'

// A cena de mel ao lado do formulário, com proporção fixa (`aspect-ratio`): 4:3 no celular, onde vem
// depois do formulário, e 4:5 a partir de 64 rem, onde ela não estica com a altura do formulário. A
// imagem (2:3) cobre o painel (`object-cover`), com o aparelho ao centro. A largura é a da coluna (e
// não a do painel de campo). `[&_[data-revela]]` é o recipiente da escala de rolagem da `CenaEstudio`;
// ele preenche o painel, e o painel é quem tem a altura.
const PAINEL =
  'relative mx-0 w-full aspect-[4/3] lg:aspect-[4/5] ' +
  '[&_[data-revela]]:absolute [&_[data-revela]]:inset-0 [&_[data-revela]]:h-full ' +
  '[&_picture]:block [&_picture]:h-full ' +
  '[&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:object-[50%_66%]'

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
