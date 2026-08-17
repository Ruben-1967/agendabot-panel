import React, { useState, useEffect } from 'react';

const PLANES = {
  A: {
    nombre: 'Plan A',
    precio: 9900,
    citas: 100,
    excedente: 150,
    descripcion: 'Ideal para pequeños negocios',
    features: ['100 citas/mes', 'Excedente: $150/cita', 'Dashboard básico', 'Soporte por email'],
  },
  B: {
    nombre: 'Plan B',
    precio: 19900,
    citas: 300,
    excedente: 90,
    descripcion: 'El más popular',
    features: ['300 citas/mes', 'Excedente: $90/cita', 'Dashboard avanzado', 'Soporte prioritario', 'Campañas proactivas'],
  },
  C: {
    nombre: 'Plan C',
    precio: 39900,
    citas: 700,
    excedente: 60,
    descripcion: 'Para negocios en crecimiento',
    features: ['700 citas/mes', 'Excedente: $60/cita', 'Múltiples profesionales', 'Historial de clientes', 'Todas las features'],
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
          {diasRestantes !== null && (
            <p style={styles.subtitle}>
              Tu período de prueba {diasRestantes && diasRestantes <= 0 ? 'ha vencido' : `vence en ${diasRestantes} días`}
            </p>
          )}
          <p style={styles.description}>
            Selecciona el plan que mejor se ajuste a tu negocio. Puedes cambiar en cualquier momento.
          </p>
        </div>

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
                <span style={styles.moneda}>/mes</span>
              </div>

              <ul style={styles.features}>
                {planData.features.map((f, i) => (
                  <li key={i} style={styles.feature}>✓ {f}</li>
                ))}
              </ul>

              <button
                onClick={() => handleElegirPlan(planKey)}
                disabled={loading}
                style={{
                  ...styles.button,
                  background: planKey === 'B' ? '#2f6f62' : '#e4ede9',
                  color: planKey === 'B' ? '#fff' : '#1f4e44',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Procesando...' : 'Elegir este plan'}
              </button>
            </div>
          ))}
        </div>}

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
