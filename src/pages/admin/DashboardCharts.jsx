import { useState } from 'react';

// Colores tomados de la paleta validada de la skill de dataviz (modo claro
// únicamente — este panel no tiene modo oscuro). Slot 1 = azul (magnitud de
// una sola serie), slot 3 = aqua (dinero, para distinguirlo de citas).
const COLOR_CITAS = '#2a78d6';
// Verde (slot 6), no aqua (slot 3) — aqua queda bajo 3:1 de contraste sobre
// blanco (validado con scripts/validate_palette.js de la skill dataviz) y
// esta línea no lleva etiquetas de texto pegadas que lo compensen.
const COLOR_DINERO = '#008300';
const COLORES_CATEGORICOS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const COLOR_OTROS = '#c3c2b7';
const COLOR_GRID = '#e1e0d9';
const COLOR_EJE = '#c3c2b7';
const COLOR_TEXTO_MUTED = '#898781';
const COLOR_TEXTO_SECUNDARIO = '#52514e';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function formatearFechaCorta(fechaISO) {
  const [, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}`;
}

function formatearMesCorto(mesISO) {
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const [, mes] = mesISO.split('-');
  return nombres[parseInt(mes, 10) - 1];
}

// ------------------------------------------------------------
// Gráfico de barras de una sola serie (citas por día)
// ------------------------------------------------------------
export function BarChartSerie({ datos, color = COLOR_CITAS, etiquetaEje, formatoEtiqueta }) {
  const [hover, setHover] = useState(null);
  const ancho = 560;
  const alto = 200;
  const margen = { arriba: 16, abajo: 28, izquierda: 8, derecha: 8 };
  const alturaGrafico = alto - margen.arriba - margen.abajo;
  const anchoGrafico = ancho - margen.izquierda - margen.derecha;

  const valorMax = Math.max(1, ...datos.map((d) => d.value));
  const anchoBarra = anchoGrafico / datos.length;
  const anchoBarraReal = Math.max(4, anchoBarra - 6);

  return (
    <div className="grafico-wrapper">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="grafico-svg" role="img" aria-label={etiquetaEje}>
        {/* líneas de referencia */}
        {[0, 0.5, 1].map((frac) => (
          <line
            key={frac}
            x1={margen.izquierda}
            x2={ancho - margen.derecha}
            y1={margen.arriba + alturaGrafico * (1 - frac)}
            y2={margen.arriba + alturaGrafico * (1 - frac)}
            stroke={COLOR_GRID}
            strokeWidth="1"
          />
        ))}
        {datos.map((d, i) => {
          const alturaBarra = (d.value / valorMax) * alturaGrafico;
          const x = margen.izquierda + i * anchoBarra + (anchoBarra - anchoBarraReal) / 2;
          const y = margen.arriba + alturaGrafico - alturaBarra;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={anchoBarraReal}
                height={Math.max(alturaBarra, 1)}
                rx="3"
                fill={color}
                opacity={hover === i ? 1 : 0.85}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              {i % 2 === 0 && (
                <text
                  x={x + anchoBarraReal / 2}
                  y={alto - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fill={COLOR_TEXTO_MUTED}
                >
                  {formatearFechaCorta(d.label)}
                </text>
              )}
            </g>
          );
        })}
        <line
          x1={margen.izquierda}
          x2={ancho - margen.derecha}
          y1={margen.arriba + alturaGrafico}
          y2={margen.arriba + alturaGrafico}
          stroke={COLOR_EJE}
          strokeWidth="1"
        />
      </svg>
      {hover !== null && (
        <div className="grafico-tooltip">
          <strong>{formatearFechaCorta(datos[hover].label)}</strong>
          {': '}
          {formatoEtiqueta ? formatoEtiqueta(datos[hover].value) : datos[hover].value}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Gráfico de línea de una sola serie (evolución mensual)
// ------------------------------------------------------------
export function LineChartSerie({ datos, color = COLOR_CITAS, etiquetaEje, formatoEtiqueta }) {
  const [hover, setHover] = useState(null);
  const ancho = 560;
  const alto = 200;
  const margen = { arriba: 16, abajo: 28, izquierda: 8, derecha: 8 };
  const alturaGrafico = alto - margen.arriba - margen.abajo;
  const anchoGrafico = ancho - margen.izquierda - margen.derecha;

  const valorMax = Math.max(1, ...datos.map((d) => d.value));
  const paso = datos.length > 1 ? anchoGrafico / (datos.length - 1) : 0;

  const puntos = datos.map((d, i) => ({
    x: margen.izquierda + i * paso,
    y: margen.arriba + alturaGrafico - (d.value / valorMax) * alturaGrafico,
    ...d,
  }));

  const lineaPath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="grafico-wrapper">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="grafico-svg" role="img" aria-label={etiquetaEje}>
        {[0, 0.5, 1].map((frac) => (
          <line
            key={frac}
            x1={margen.izquierda}
            x2={ancho - margen.derecha}
            y1={margen.arriba + alturaGrafico * (1 - frac)}
            y2={margen.arriba + alturaGrafico * (1 - frac)}
            stroke={COLOR_GRID}
            strokeWidth="1"
          />
        ))}
        <path d={lineaPath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((p, i) => (
          <g key={p.label}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 4}
              fill={color}
              stroke="#fcfcfb"
              strokeWidth="1.5"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            <text x={p.x} y={alto - 8} textAnchor="middle" fontSize="9" fill={COLOR_TEXTO_MUTED}>
              {formatearMesCorto(p.label)}
            </text>
          </g>
        ))}
        <line
          x1={margen.izquierda}
          x2={ancho - margen.derecha}
          y1={margen.arriba + alturaGrafico}
          y2={margen.arriba + alturaGrafico}
          stroke={COLOR_EJE}
          strokeWidth="1"
        />
      </svg>
      {hover !== null && (
        <div className="grafico-tooltip">
          <strong>{formatearMesCorto(puntos[hover].label)}</strong>
          {': '}
          {formatoEtiqueta ? formatoEtiqueta(puntos[hover].value) : puntos[hover].value}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Gráfico de barras categórico (atenciones por tipo de servicio)
// Máximo 8 categorías con color propio (paleta categórica en orden fijo,
// nunca ciclada) — el resto se agrupa en "Otros" con gris neutro.
// ------------------------------------------------------------
export function BarChartCategorias({ datos }) {
  const [hover, setHover] = useState(null);

  if (!datos || datos.length === 0) {
    return <div className="grafico-vacio">Sin atenciones registradas todavía.</div>;
  }

  const CAPACIDAD = COLORES_CATEGORICOS.length;
  let categorias = datos;
  if (datos.length > CAPACIDAD) {
    const principales = datos.slice(0, CAPACIDAD - 1);
    const restoTotal = datos.slice(CAPACIDAD - 1).reduce((acc, d) => acc + d.cantidad, 0);
    categorias = [...principales, { categoria: 'Otros', cantidad: restoTotal, esOtros: true }];
  }

  const total = categorias.reduce((acc, d) => acc + d.cantidad, 0);
  const valorMax = Math.max(1, ...categorias.map((d) => d.cantidad));

  return (
    <div className="grafico-categorico">
      {categorias.map((d, i) => {
        const color = d.esOtros ? COLOR_OTROS : COLORES_CATEGORICOS[i % COLORES_CATEGORICOS.length];
        const porcentaje = total > 0 ? Math.round((d.cantidad / total) * 100) : 0;
        return (
          <div
            key={d.categoria}
            className="grafico-categorico-fila"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="grafico-categorico-etiqueta">
              <span className="grafico-categorico-punto" style={{ background: color }} />
              {d.categoria}
            </div>
            <div className="grafico-categorico-barra-fondo">
              <div
                className="grafico-categorico-barra"
                style={{ width: `${(d.cantidad / valorMax) * 100}%`, background: color }}
              />
            </div>
            <div className="grafico-categorico-valor">
              {d.cantidad} {hover === i && <span className="grafico-categorico-pct">({porcentaje}%)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { formatoCLP, COLOR_CITAS, COLOR_DINERO, COLOR_TEXTO_SECUNDARIO };
