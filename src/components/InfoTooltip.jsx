// Ícono "?" que muestra un texto de ayuda al pasar el mouse o hacer foco
// (tab/tap), en vez de un párrafo siempre visible debajo del campo. Uso:
// <label>Campo <InfoTooltip texto="Explicación larga..." /></label>
export default function InfoTooltip({ texto }) {
  return (
    <span className="info-tooltip" tabIndex={0}>
      <span className="info-tooltip-icono" aria-hidden="true">?</span>
      <span className="info-tooltip-texto" role="tooltip">{texto}</span>
    </span>
  );
}
