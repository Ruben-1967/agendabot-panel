import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RUBROS = [
  { id: 'OPTICA', nombre: 'Óptica' },
  { id: 'ESTETICA', nombre: 'Centro estético' },
  { id: 'SALUD', nombre: 'Salud independiente' },
  { id: 'MANTENCIÓN', nombre: 'Mantención técnica' },
  { id: 'OTRO', nombre: 'Otro' },
];

export default function ConvertirAClienteReal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serviciosExtraidos, setServiciosExtraidos] = useState([]);

  const [form, setForm] = useState({
    nombreNegocio: '',
    rubro: '',
    telefonoWhatsApp: '',
    correoContacto: '',
    sitioWeb: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleExtraerServicios = async (e) => {
    e.preventDefault();
    if (!form.sitioWeb) return;

    setLoading(true);
    setError(null);

    try {
      // Llamar a backend para extraer (el backend usa claudeJS internamente)
      // POST /demos/convertir-a-cliente-real?preview=true
      const res = await fetch(`${import.meta.env.VITE_API_URL}/demos/preview-servicios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitioWeb: form.sitioWeb }),
      });

      const data = await res.json();
      if (data.serviciosSugeridos) {
        setServiciosExtraidos(data.serviciosSugeridos);
      }
    } catch (err) {
      setError('No se pudieron extraer los servicios. Puedes continuár sin el sitio web.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/demos/convertir-a-cliente-real`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('agendabot_vendedor_session')}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear empresa');
      }

      const resultado = await res.json();
      
      // Redirigir al panel con empresaId
      window.location.href = `${import.meta.env.VITE_PANEL_URL}/admin/dashboard?empresaId=${resultado.empresaId}&nuevo=true`;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Conviértete en cliente de Totemsystem</h1>
        <p style={styles.subtitle}>
          5 días de acceso completo sin costo. Después, elige tu plan.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          {/* Nombre del negocio */}
          <div style={styles.field}>
            <label>Nombre del negocio *</label>
            <input
              type="text"
              name="nombreNegocio"
              value={form.nombreNegocio}
              onChange={handleChange}
              placeholder="Ej: Óptica del Centro"
              required
              style={styles.input}
            />
          </div>

          {/* Rubro */}
          <div style={styles.field}>
            <label>Rubro *</label>
            <select
              name="rubro"
              value={form.rubro}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">Selecciona un rubro</option>
              {RUBROS.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {/* Teléfono WhatsApp */}
          <div style={styles.field}>
            <label>Teléfono WhatsApp *</label>
            <input
              type="tel"
              name="telefonoWhatsApp"
              value={form.telefonoWhatsApp}
              onChange={handleChange}
              placeholder="Ej: +56912345678"
              required
              style={styles.input}
            />
            <small style={styles.hint}>Usaremos este número para recibir tus clientes</small>
          </div>

          {/* Correo (opcional) */}
          <div style={styles.field}>
            <label>Correo de contacto</label>
            <input
              type="email"
              name="correoContacto"
              value={form.correoContacto}
              onChange={handleChange}
              placeholder="contacto@tunegocio.cl"
              style={styles.input}
            />
          </div>

          {/* Sitio web (opcional) */}
          <div style={styles.field}>
            <label>Sitio web (opcional)</label>
            <div style={styles.inputGroup}>
              <input
                type="url"
                name="sitioWeb"
                value={form.sitioWeb}
                onChange={handleChange}
                placeholder="https://tunegocio.cl"
                style={{ ...styles.input, marginBottom: '8px' }}
              />
              <button
                type="button"
                onClick={handleExtraerServicios}
                disabled={!form.sitioWeb || loading}
                style={styles.buttonSecondary}
              >
                {loading ? 'Extrayendo...' : 'Detectar servicios'}
              </button>
            </div>
            <small style={styles.hint}>
              Si proporcionas un sitio, extraeremos automáticamente tus servicios
            </small>
          </div>

          {/* Preview de servicios extraídos */}
          {serviciosExtraidos.length > 0 && (
            <div style={styles.preview}>
              <strong>Servicios detectados:</strong>
              <ul style={styles.list}>
                {serviciosExtraidos.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <small style={styles.hint}>Puedes editar estos después en tu panel</small>
            </div>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta (5 días gratis)'}
          </button>
        </form>

        <div style={styles.terms}>
          <p>
            Al crear tu cuenta, aceptas nuestros{' '}
            <a href="/terminos" style={styles.link}>términos de servicio</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #232e3f 0%, #1a1f2e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
  form: {
    marginTop: '24px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '6px',
    fontSize: '14px',
    color: '#16241f',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#2f6f62',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  buttonSecondary: {
    padding: '12px 16px',
    background: '#e4ede9',
    color: '#1f4e44',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  error: {
    background: '#f3e1dc',
    color: '#a8493b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  hint: {
    display: 'block',
    marginTop: '6px',
    color: '#6b7770',
    fontSize: '12px',
  },
  preview: {
    background: '#e4ede9',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  list: {
    margin: '8px 0',
    paddingLeft: '20px',
  },
  link: {
    color: '#2f6f62',
    textDecoration: 'none',
  },
  terms: {
    marginTop: '24px',
    fontSize: '12px',
    color: '#6b7770',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7770',
    fontSize: '15px',
    marginBottom: '24px',
  },
};
