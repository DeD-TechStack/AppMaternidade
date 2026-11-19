// vite-imagetools: `?...&as=picture` devolve as fontes por formato e a `<img>` de reserva (o último formato da lista).
// `sources` tem um `srcset` por formato (a chave é o formato: `avif`, `webp`); `img` é o maior arquivo do formato de
// reserva. Só os imports com `&as=picture` ficam tipados aqui.
declare module '*&as=picture' {
  const picture: {
    sources: Record<string, string>
    img: { src: string; w: number; h: number; srcset?: string }
  }
  export default picture
}
