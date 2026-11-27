export function Luminaria() {
  return (
    <div className="co-placa pt-luminaria" aria-hidden="true">
      <img
        src={`${import.meta.env.BASE_URL}composicao/a/luminaria.webp`}
        width={195}
        height={645}
        alt=""
        loading="eager"
        decoding="async"
      />
    </div>
  )
}
