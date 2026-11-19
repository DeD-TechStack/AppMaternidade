import { placa } from '../../componentes/campo/imagens.ts'
import m01Icaro from '../../assets/cenas/cuidado/m01-icaro-1152w.webp?w=760;1152&format=avif;webp&as=picture'
import m01Icaro390 from '../../assets/cenas/cuidado/m01-icaro-390c-780w.webp?w=390;780&format=avif;webp&as=picture'
import m05Maos from '../../assets/cenas/cuidado/m05-maos-1472w.webp?w=800;1472&format=avif;webp&as=picture'
import m05Maos390 from '../../assets/cenas/cuidado/m05-maos-390c-740w.webp?w=390;740&format=avif;webp&as=picture'
import m12Heroi from '../../assets/cenas/cuidado/m12-heroi-981w.webp?w=600;981&format=avif;webp&as=picture'

// Cuidado compartilhado (/cuidado-compartilhado), reconstruída sobre as seções da casa (CLONE-CUIDADO).
// Cada frase abaixo é uma frase do deck COPY_cuidado.md, palavra por palavra, com o id do deck no comentário da
// mesma linha. A página e a pasta componentes/cuidado-casa/ não escrevem texto de interface.
export const CUIDADO = {
  aba: 'Cuidado compartilhado | AppMaternidade', // cc.aba (o título da aba; quem o grava é NOMES_DE_PAGINA, sem mudança)
  h1: 'A babá vê o quê?', // cc.h1
  lede: 'Cada adulto entra com a própria conta e um papel. O papel decide o que a pessoa vê e o que pode fazer.', // cc.lede
  cta1: 'Criar conta', // cc.cta1
  alt: {
    cena1:
      'Ícaro e Juliana, de óculos, em pé, lado a lado. Ela segura Heloísa no colo e os dois olham para a bebê. Heloísa sorri para a porta entreaberta à direita, por onde entra a luz do dia. Não há ninguém na porta.', // cc.alt.cena1
    tela1:
      'Tela Família do site num celular: a lista de membros, com Juliana e Ícaro e o papel de cada um, e um convite pendente com a data em que vence.', // cc.alt.tela1
    cena2:
      'As mãos de Juliana e de Ícaro seguram Heloísa ao mesmo tempo, na hora em que ela passa de um colo para o outro.', // cc.alt.cena2
    cena3: 'Ícaro, sentado no chão do quarto, à noite, com o celular na mão.', // cc.alt.cena3
  },
  tres: {
    h2: 'Por enquanto, somos três.', // cc.h2.tres
    p: 'A tela Família mostra quem cuida da Helo e o papel de cada pessoa. Mostra também o convite que ainda não foi aceito e a data em que ele vence.', // cc.p.tres
  },
  papeis: {
    h2: 'Quem convida escolhe o papel.', // cc.h2.papeis
    legenda: 'Papéis na família', // cc.papeis.legenda
    linhas: [
      {
        nome: 'Responsável', // cc.papel.1.nome
        quem: 'Mãe, pai ou outro responsável legal. Pode haver mais de um.', // cc.papel.1.quem
        pode: 'Cuidar da família, do cadastro do bebê, dos convites e dos dados.', // cc.papel.1.pode
      },
      {
        nome: 'Cuidador', // cc.papel.2.nome
        quem: 'Avó, babá ou outro adulto de confiança.', // cc.papel.2.quem
        pode: 'Registrar e acompanhar. Editar e excluir só o que ele mesmo registrou, e encerrar qualquer sessão em andamento.', // cc.papel.2.pode
      },
      {
        nome: 'Observador', // cc.papel.3.nome
        quem: 'Quem só acompanha.', // cc.papel.3.quem
        pode: 'Ler os registros e as notas, sem escrever.', // cc.papel.3.pode
      },
    ],
  },
  sono: {
    h2: 'Dormiu comigo, acordou com ele.', // cc.h2.sono
    p: 'O sono das 13:00 foi a Ju que começou. Às 14:40, quem encerrou foi o Ícaro. O registro guarda os dois nomes.', // cc.p.sono
  },
  senha: {
    h2: 'Cada um com a sua senha.', // cc.h2.senha
    p: 'Cada adulto entra com a própria conta. Ninguém divide uma senha da família, e cada registro sai com o nome de quem anotou.', // cc.p.senha
    legenda: '03:00, mamada, anotada por Ícaro', // cc.leg1
  },
  parar: {
    h2: 'Quando alguém para de cuidar.', // cc.h2.parar
    p1: 'Quem é responsável tira o acesso de alguém da família quando quiser, e a pessoa perde o acesso na hora.', // cc.p.parar1
    p2: 'O que ela já viu não pode ser apagado. Um vínculo com prazo, como o de uma babá contratada por um período, vence sozinho.', // cc.p.parar2
  },
  fecho: {
    h2: 'Chame quem vai cuidar junto.', // cc.h2.fecho
    cta2: 'Criar conta', // cc.cta2
  },
} as const

/** Para onde vai a ação principal da página (a mesma no começo e no fim). */
export const DESTINO_CRIAR_CONTA = '/criar-conta'

/** Uma cena de página: o arquivo largo e, abaixo de 1024, o recorte do celular. Largura e altura são as do maior arquivo. */
export interface CenaDePagina {
  largo: { src: string; srcSet: string; avif?: string; sizes: string; largura: number; altura: number }
  celular: { src: string; srcSet: string; avif?: string; sizes: string; largura: number; altura: number }
}

// As três cenas saem de um mestre cada (web/src/assets/cenas/cuidado, vite-imagetools: AVIF e WebP com hash); a tela
// e a moldura são os arquivos servidos (web/public/telas/t1i e web/public/molduras).
// Os nomes e os tamanhos são os do slot sheet t1i_cuidado e da spec §3; a caixa final de cada um vem do CSS.
export const IMAGENS_CUIDADO = {
  /** CC-S1: a família e a porta entreaberta (M12). 1440: 600 × 662. Abaixo de 1024 vale a mesma placa inteira, de
   * no máximo 420 px de largura (350 × 386 em 390): o recorte 390c (350 × 220) cortava Ícaro na borda e as pernas na
   * base, e nenhuma figura do herói fica cortada por uma borda. */
  cena1: {
    largo: placa(m12Heroi, '(min-width: 1440px) 600px, 42vw', 600),
    celular: placa(m12Heroi, 'min(90vw, 420px)', 600),
  },
  /** CC-S3: as quatro mãos (M05). 1440: 800 × 353 rente à borda direita; 390: 390 × 343. */
  cena2: {
    // O mestre tem 1472 × 650; a página sempre levou 649 na `<img>`, e a proporção da caixa fica como era.
    largo: placa(m05Maos, '(min-width: 1440px) 800px, 56vw', 800, 649),
    // O mestre tem 740 × 650; a página sempre levou 651.
    celular: placa(m05Maos390, '100vw', 390, 651),
  },
  /** CC-S4: Ícaro com o celular (M01). 1440: 760 × 439 rente à borda esquerda; 390: 390 × 332. */
  cena3: {
    largo: placa(m01Icaro, '(min-width: 1440px) 760px, 53vw', 760),
    // O mestre tem 780 × 665; a página sempre levou 664.
    celular: placa(m01Icaro390, '100vw', 390, 664),
  },
  /** CC-S2: a captura da tela Família (ASSET-2), sob a moldura do dia. Tela de 640 × 1385 no maior arquivo. */
  tela: {
    src: '/telas/t1i/familia-280w.webp',
    srcSet:
      '/telas/t1i/familia-280w.webp 280w, /telas/t1i/familia-320w.webp 320w, /telas/t1i/familia-560w.webp 560w, /telas/t1i/familia-640w.webp 640w',
    sizes: '(min-width: 1024px) 320px, min(330px, 85vw)',
    largura: 640,
    altura: 1385,
  },
  /** A moldura do dia servida (web/public/molduras, PROVENANCE): 678 × 1423, a tela de 640 × 1385 mais 3 % de borda. */
  moldura: {
    src: '/molduras/moldura-dia.png',
    largura: 678,
    altura: 1423,
  },
} as const
