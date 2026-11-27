// Cuidado compartilhado (/cuidado-compartilhado): cada frase abaixo é uma frase do deck COPY_cuidado.md, palavra por
// palavra, com o id do deck no comentário da mesma linha. A página e `componentes/cuidado-casa/` não escrevem texto
// de interface.
export const CUIDADO = {
  aba: 'Cuidado compartilhado | AppMaternidade', // cc.aba (o título da aba; quem o grava é NOMES_DE_PAGINA, sem mudança)
  h1: 'A babá vê o quê?', // cc.h1
  lede: 'A babá vê o histórico do bebê, com o nome de quem anotou cada registro. Ela anota sono, mamada e fralda, e só edita ou exclui o que ela mesma anotou.', // cc.lede
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
    // Os rótulos curtos dos três campos de cada papel (cc.papeis.rotulo.quem, .ve e .muda).
    rotulos: ['Quem é', 'O que vê', 'O que muda'],
    // Cada papel tem os mesmos três campos. Os verbos que a página destaca em `muda` estão em VERBOS_DOS_PAPEIS.
    linhas: [
      {
        nome: 'Responsável', // cc.papel.1.nome
        quem: 'Mãe, pai ou outro responsável legal. Pode haver mais de um.', // cc.papel.1.quem
        ve: 'Tudo o que a família registra.', // cc.papel.1.ve
        muda: 'Administra a família, o cadastro do bebê, os convites e os dados.', // cc.papel.1.muda
      },
      {
        nome: 'Cuidador', // cc.papel.2.nome
        quem: 'Avó, babá ou outro adulto de confiança.', // cc.papel.2.quem
        ve: 'Os registros e as notas da família.', // cc.papel.2.ve
        muda: 'Registra. Edita e exclui só o que ele mesmo registrou, e encerra qualquer sessão em andamento.', // cc.papel.2.muda
      },
      {
        nome: 'Observador', // cc.papel.3.nome
        quem: 'Quem só acompanha.', // cc.papel.3.quem
        ve: 'Os registros e as notas.', // cc.papel.3.ve
        muda: 'Nada: só lê, não escreve.', // cc.papel.3.muda
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

/**
 * Os verbos de `muda` que a página põe em `<strong data-cc-verbo>` (peso, não só cor), por nome de papel. Cada trecho é
 * um começo de frase de `CUIDADO.papeis.linhas[].muda`: a frase não muda, só ganha marcação. Ficam fora de `CUIDADO`
 * porque não são frases do deck.
 */
export const VERBOS_DOS_PAPEIS: Readonly<Record<string, readonly string[]>> = {
  Responsável: ['Administra'],
  Cuidador: ['Registra', 'Edita e exclui'],
  Observador: ['Nada'],
}

/** Para onde vai a ação principal da página (a mesma no começo e no fim). */
export const DESTINO_CRIAR_CONTA = '/criar-conta'

const RAIZ = import.meta.env.BASE_URL

/** Pasta dos recortes e capturas da composição (paleta A). */
export const ARTE_CUIDADO = `${RAIZ}composicao/a`

/** Recorte M12 (família e a porta entreaberta), dimensões de `public/composicao/medidas.json`. */
export const CENA_M12 = {
  src: `${ARTE_CUIDADO}/m12.webp`,
  largura: 981,
  altura: 1602,
} as const

/** Mantido apenas para `componentes/campo/imagens.prioridade.test.tsx` (fora do escopo de AGY-04); não usado na página. */
export interface CenaDePagina {
  largo: { src: string; srcSet: string; avif?: string; sizes: string; largura: number; altura: number }
  celular: { src: string; srcSet: string; avif?: string; sizes: string; largura: number; altura: number }
}

/** Mantido apenas para `componentes/campo/imagens.prioridade.test.tsx`; `/cuidado-compartilhado` não importa nem renderiza M05/M01. */
export const IMAGENS_CUIDADO = {
  cena2: {
    largo: {
      src: CENA_M12.src,
      srcSet: `${CENA_M12.src} 981w`,
      avif: `${CENA_M12.src} 981w`,
      sizes: '(min-width: 69em) 504px, 350px',
      largura: CENA_M12.largura,
      altura: CENA_M12.altura,
    },
    celular: {
      src: CENA_M12.src,
      srcSet: `${CENA_M12.src} 981w`,
      avif: `${CENA_M12.src} 981w`,
      sizes: 'min(90vw, 350px)',
      largura: CENA_M12.largura,
      altura: CENA_M12.altura,
    },
  },
} as const
