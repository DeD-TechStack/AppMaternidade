// O conteúdo da página de amostra do sistema (/sistema): só fala do próprio sistema.

export const AMOSTRA = {
  titulo: 'Sistema',
  subtitulo: 'Grade, tipo e peças do site.',
  etiquetasDaAbertura: ['Base visual', 'Em construção'],
  // O link da coluna lateral: uma âncora para a seção dos campos, na própria página.
  linkDaAbertura: { texto: 'Ir aos campos', alvo: 'campos' },
  numeros: [
    { valor: '7', legenda: 'tipos de registro' },
    { valor: '2', legenda: 'toques para registrar' },
    { valor: '0', legenda: 'metas ou comparações' },
  ],
  midiaLarga: 'Moldura de mídia larga, em barro, sem imagem.',
  linhas: [
    {
      rotulo: 'Grade',
      texto:
        'Dez colunas iguais, sem calha. A margem é de 32 pixels no computador e de 16 no celular, e a área útil nunca passa de 1600 de largura.',
    },
    {
      rotulo: 'Tipo',
      texto:
        'Quatro famílias e uma escala fixa. O texto corrido mede 20 pixels e nada fica abaixo de 15. Nenhum texto usa caixa alta.',
    },
    {
      rotulo: 'Cor',
      texto:
        'Papel, tinta e um único urucum. O barro e a lavanda só aparecem como fundo de mídia. De madrugada, o papel escurece e os fios ficam mais suaves.',
    },
  ],
  galeria: {
    largaBarro: 'Moldura de mídia larga, em barro.',
    largaLavanda: 'Moldura de mídia larga, em lavanda.',
    parBarro: 'Moldura de mídia quadrada, em barro.',
    parLavanda: 'Moldura de mídia quadrada, em lavanda.',
  },
  campos: {
    senha: { rotulo: 'Senha', ajuda: 'Use o botão ao lado para ver o que você digitou.' },
    email: {
      rotulo: 'E-mail',
      valor: 'nome@exemplo',
      erro: 'Escreva o e-mail completo, como nome@exemplo.com.',
    },
  },
  botoes: {
    primario: 'Registrar sono',
    moldura: 'Ver histórico',
    desativado: 'Convidar',
    motivo: 'Disponível em breve.',
  },
  etiquetas: ['Rotina', 'Madrugada', 'Em breve'],
} as const
