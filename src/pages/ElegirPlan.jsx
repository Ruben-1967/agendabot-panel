import React, { useState, useEffect } from 'react';

// Mismos montos que DETALLE_PLANES en src/services/contratoHtml.js (backend)
// — fuente única de verdad real al momento de cobrar; esto es solo para
// mostrar el precio antes de elegir. El texto de "Excedente: $X/cita" se arma
// desde el propio campo `excedente` de cada plan más abajo, para que no
// puedan quedar desincronizados como pasó acá antes (excedente:70 vs texto
// "$60/cita").
const PLANES = {
  A: {
    nombre: 'Plan A',
    precio: 14900,
    citas: 150,
    excedente: 130,
    descripcion: 'Ideal para pequeños negocios',
    featuresExtra: ['1 profesional', 'Dashboard básico', 'Soporte por email'],
  },
  B: {
    nombre: 'Plan B',
    precio: 24900,
    citas: 400,
    excedente: 85,
    descripcion: 'El más popular',
    featuresExtra: ['Hasta 2 profesionales', 'Dashboard avanzado', 'Soporte prioritario', 'Campañas proactivas'],
  },
  C: {
    nombre: 'Plan C',
    precio: 59900,
    citas: 1000,
    excedente: 70,
    descripcion: 'Para negocios en crecimiento',
    featuresExtra: ['Hasta 5 profesionales', 'Historial de clientes', 'Todas las features'],
  },
  D: {
    nombre: 'Plan D',
    precio: 149900,
    citas: 2500,
    excedente: 55,
    descripcion: 'Para operaciones grandes',
    featuresExtra: ['Profesionales ilimitados', 'Historial de clientes', 'Todas las features'],
  },
};

export default function ElegirPlan() {
  const searchParams = new URLSearchParams(window.location.search);
  const empresaIdParam = searchParams.get('empresaId');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diasRestantes, setDiasRestantes] = useState(null);
  const [resultadoElegido, setResultadoElegido] = useState(null);

  // agendabot_panel_session guarda { token, usuario } serializado (ver
  // AuthContext.jsx) — no es el JWT en sí.
  let token = null;
  try {
    const sesionGuardada = localStorage.getItem('agendabot_panel_session');
    token = sesionGuardada ? JSON.parse(sesionGuardada).token : null;
  } catch {
    token = null;
  }

  useEffect(() => {
    // Solo traer estado si hay token (usuario autenticado)
    if (!token) {
      return;
    }
    
    const fetchEstado = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/suscripcion/estado`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          console.warn('No se pudo traer estado de suscripción');
          return;
        }
        
        const data = await res.json();
        setDiasRestantes(data.diasParaVencer || 0);
      } catch (err) {
        console.error('Error consultando estado:', err);
      }
    };

    fetchEstado();
  }, [token]);

  const handleElegirPlan = async (plan) => {
    setLoading(true);
    setError(null);

    try {
      const body = { plan };
      if (empresaIdParam) {
        body.empresaId = empresaIdParam; // Pasar empresaId si es nuevo cliente
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/suscripcion/elegir-plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al procesar el pago');
      }

      const resultado = await res.json();

      if (resultado.url) {
        // Redirige a Flow para que el cliente registre su tarjeta — desde
        // ahí Flow lo trae de vuelta a /suscripcion/resultado.
        window.location.href = resultado.url;
        return;
      }

      setResultadoElegido(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1>Elige tu plan</h1>
          {diasRestantes !== null && diasRestantes > 0 && (
            <p style={styles.subtitle}>Tu período de prueba vence en {diasRestantes} días</p>
          )}
          <p style={styles.description}>
            Selecciona el plan que mejor se ajuste a tu negocio. Puedes cambiar en cualquier momento.
          </p>
        </div>

        {diasRestantes !== null && diasRestantes <= 0 && (
          <div style={styles.avisoUrgente}>
            ⚠️ Tu período de prueba ha expirado. Activa un plan ahora para no perder acceso al sistema.
          </div>
        )}

        {/* Aviso de error */}
        {error && <div style={styles.error}>{error}</div>}

        {resultadoElegido && (
          <div style={styles.success}>
            <h3 style={{ margin: '0 0 8px' }}>{resultadoElegido.mensaje}</h3>
            <p style={{ margin: 0 }}>{resultadoElegido.proximoPaso}</p>
            {token && (
              <a href="/admin" style={{ ...styles.link, display: 'inline-block', marginTop: '16px', fontWeight: 600 }}>
                Ir a mi panel →
              </a>
            )}
          </div>
        )}

        {/* Grid de planes */}
        {!resultadoElegido && <div style={styles.grid}>
          {Object.entries(PLANES).map(([planKey, planData]) => (
            <div key={planKey} style={{
              ...styles.planCard,
              borderColor: planKey === 'B' ? '#2f6f62' : '#ddd',
              boxShadow: planKey === 'B' ? '0 8px 24px rgba(47, 111, 98, 0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              {planKey === 'B' && <div style={styles.badge}>Más popular</div>}
              
              <h2 style={styles.planName}>{planData.nombre}</h2>
              <p style={styles.planDesc}>{planData.descripcion}</p>
              
              <div style={styles.precio}>
                <span style={styles.monto}>${planData.precio.toLocaleString()}</span>
                <span style={styles.moneda}>/mes · IVA incluido</span>
              </div>

              <ul style={styles.features}>
                <li style={styles.feature}>✓ {planData.citas.toLocaleString()} citas/mes</li>
                <li style={styles.feature}>✓ Excedente: ${planData.excedente.toLocaleString()}/cita</li>
                {planData.featuresExtra.map((f, i) => (
                  <li key={i} style={styles.feature}>✓ {f}</li>
                ))}
              </ul>

              <button
                onClick={() => handleElegirPlan(planKey)}
                disabled={loading}
                style={{
                  ...styles.button,
                  background: planKey === 'B' ? '#2f6f62' : '#fff',
                  color: planKey === 'B' ? '#fff' : '#2f6f62',
                  border: planKey === 'B' ? '2px solid #2f6f62' : '2px solid #2f6f62',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Procesando...' : 'Elegir este plan'}
              </button>
            </div>
          ))}
        </div>}

        {!resultadoElegido && (
          <div style={styles.tablaComparativaWrap}>
            <h2 style={styles.tablaComparativaTitulo}>Comparación rápida</h2>
            <table style={styles.tablaComparativa}>
              <thead>
                <tr>
                  <th style={styles.tablaTh}></th>
                  {Object.entries(PLANES).map(([planKey, planData]) => (
                    <th key={planKey} style={styles.tablaTh}>{planData.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.tablaTdLabel}>Precio mensual</td>
                  {Object.entries(PLANES).map(([planKey, planData]) => (
                    <td key={planKey} style={styles.tablaTd}>${planData.precio.toLocaleString()}</td>
                  ))}
                </tr>
                <tr style={styles.tablaFilaAlterna}>
                  <td style={styles.tablaTdLabel}>Citas incluidas/mes</td>
                  {Object.entries(PLANES).map(([planKey, planData]) => (
                    <td key={planKey} style={styles.tablaTd}>{planData.citas.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td style={styles.tablaTdLabel}>Excedente por cita</td>
                  {Object.entries(PLANES).map(([planKey, planData]) => (
                    <td key={planKey} style={styles.tablaTd}>${planData.excedente.toLocaleString()}</td>
                  ))}
                </tr>
                <tr style={styles.tablaFilaAlterna}>
                  <td style={styles.tablaTdLabel}>Profesionales</td>
                  {Object.entries(PLANES).map(([planKey, planData]) => (
                    <td key={planKey} style={styles.tablaTd}>{planData.featuresExtra[0]}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <p>
            Todos los planes incluyen <strong>1 UF de hosting anual</strong> ($34.000 CLP aprox.)
          </p>
          <p>
            ¿Preguntas? Contacta a <a href="mailto:contacto@multidigital.cl" style={styles.link}>contacto@multidigital.cl</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0eee2 0%, #faf8ef 100%)',
    padding: '40px 20px',
    fontFamily: "'Inter', sans-serif",
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '50px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#6b7770',
    marginBottom: '12px',
  },
  description: {
    fontSize: '16px',
    color: '#6b7770',
    maxWidth: '600px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  planCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '32px 24px',
    border: '2px solid',
    position: 'relative',
    transition: 'transform 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#2f6f62',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  planName: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#16241f',
  },
  planDesc: {
    fontSize: '14px',
    color: '#6b7770',
    marginBottom: '20px',
    margin: '0 0 20px',
  },
  precio: {
    marginBottom: '24px',
  },
  monto: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#2f6f62',
  },
  moneda: {
    fontSize: '14px',
    color: '#6b7770',
    marginLeft: '4px',
  },
  features: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '28px',
  },
  feature: {
    fontSize: '14px',
    color: '#3a4842',
    marginBottom: '10px',
    lineHeight: 1.5,
  },
  button: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'opacity 0.2s',
  },
  success: {
    background: '#e4ede9',
    color: '#1f4e44',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center',
    fontSize: '15px',
  },
  error: {
    background: '#f3e1dc',
    color: '#a8493b',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center',
    fontSize: '14px',
  },
  avisoUrgente: {
    background: '#f3e1dc',
    color: '#a8493b',
    border: '1px solid #e3b3a8',
    padding: '14px 20px',
    borderRadius: '8px',
    marginBottom: '32px',
    textAlign: 'center',
    fontSize: '15px',
    fontWeight: 600,
    maxWidth: '700px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  tablaComparativaWrap: {
    marginBottom: '40px',
  },
  tablaComparativaTitulo: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#16241f',
    textAlign: 'center',
    marginBottom: '16px',
  },
  tablaComparativa: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  tablaTh: {
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#1f4e44',
    textAlign: 'center',
    borderBottom: '2px solid #ddd',
  },
  tablaTdLabel: {
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#3a4842',
  },
  tablaTd: {
    padding: '10px 16px',
    fontSize: '13px',
    color: '#3a4842',
    textAlign: 'center',
  },
  tablaFilaAlterna: {
    background: '#faf8ef',
  },
  footer: {
    textAlign: 'center',
    borderTop: '1px solid #ddd',
    paddingTop: '24px',
    color: '#6b7770',
    fontSize: '14px',
  },
  link: {
    color: '#2f6f62',
    textDecoration: 'none',
  },
};
