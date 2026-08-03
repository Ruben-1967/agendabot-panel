import React, { useState } from 'react';

export default function ConvertirAClienteReal() {
  const [formData, setFormData] = useState({
    nombreNegocio: '',
    rubro: '',
    telefonoWhatsApp: '',
    correoContacto: '',
    sitioWeb: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serviciosExtraidos, setServiciosExtraidos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const rubros = [
    { id: 'de229102-0b1d-4ffa-8087-cb39660cfd70', nombre: 'Óptica' },
    { id: '4df31014-0858-4aa6-bd92-69059082458c', nombre: 'Centro estético' },
    { id: '264347b4-e8c9-49d8-ae07-775523644ea1', nombre: 'Salud independiente' },
    { id: 'f26f47ca-7fa3-406a-ba1c-5d2993b64303', nombre: 'Mantención técnica' },
    { id: '3dddc2a6-77f5-4ceb-ac40-cd8a25d7b043', nombre: 'Otro rubro' },
    { id: 'f619e6af-bd81-47c1-b0bb-34d02fabf740', nombre: 'Catálogo rotativo' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setServiciosExtraidos([]);

    try {
      // Validaciones básicas
      if (!formData.nombreNegocio.trim()) {
        throw new Error('El nombre del negocio es requerido');
      }
      if (!formData.rubro) {
        throw new Error('Debes seleccionar un rubro');
      }
      if (!formData.telefonoWhatsApp.trim()) {
        throw new Error('El teléfono de WhatsApp es requerido');
      }
      if (!formData.correoContacto.trim()) {
        throw new Error('El correo de contacto es requerido');
      }

      // Validar formato email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.correoContacto)) {
        throw new Error('El correo no es válido');
      }

      const payload = {
        nombreNegocio: formData.nombreNegocio.trim(),
        rubro: formData.rubro,
        telefonoWhatsApp: formData.telefonoWhatsApp.trim(),
        correoContacto: formData.correoContacto.trim(),
        sitioWeb: formData.sitioWeb.trim() || null,
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/demos/convertir-a-cliente-real`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear la empresa');
      }

      const resultado = await res.json();

      // Mostrar servicios extraídos si los hay
      if (resultado.serviciosExtraidos && resultado.serviciosExtraidos.length > 0) {
        setServiciosExtraidos(resultado.serviciosExtraidos);
      }

      // Redirigir a elegir plan con el empresaId
      setEnviando(true);
      setTimeout(() => {
        window.location.href = `/suscripcion/elegir-plan?empresaId=${resultado.empresaId}`;
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (enviando) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.successMessage}>
            <h2>¡Éxito!</h2>
            <p>Tu empresa ha sido creada correctamente.</p>
            <p>Redirigiendo a la selección de planes...</p>
            <div style={styles.spinner}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1>Conviértete en Cliente</h1>
          <p style={styles.subtitle}>
            Completa este formulario para crear tu cuenta y elegir un plan de suscripción.
          </p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {serviciosExtraidos.length > 0 && (
          <div style={styles.success}>
            <h3>Servicios extraídos de tu sitio web:</h3>
            <ul style={styles.serviceList}>
              {serviciosExtraidos.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Nombre del negocio */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Nombre del negocio *</label>
            <input
              type="text"
              name="nombreNegocio"
              value={formData.nombreNegocio}
              onChange={handleChange}
              placeholder="Ej: Mi Óptica Chile"
              style={styles.input}
              required
            />
          </div>

          {/* Rubro */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Rubro *</label>
            <select
              name="rubro"
              value={formData.rubro}
              onChange={handleChange}
              style={styles.select}
              required
            >
              <option value="">-- Selecciona un rubro --</option>
              {rubros.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          {/* Teléfono WhatsApp */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Teléfono WhatsApp *</label>
            <input
              type="tel"
              name="telefonoWhatsApp"
              value={formData.telefonoWhatsApp}
              onChange={handleChange}
              placeholder="Ej: +56912345678"
              style={styles.input}
              required
            />
          </div>

          {/* Correo de contacto */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Correo de contacto *</label>
            <input
              type="email"
              name="correoContacto"
              value={formData.correoContacto}
              onChange={handleChange}
              placeholder="Ej: contacto@mioptika.cl"
              style={styles.input}
              required
            />
          </div>

          {/* Sitio web (opcional) */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Sitio web (opcional)</label>
            <input
              type="url"
              name="sitioWeb"
              value={formData.sitioWeb}
              onChange={handleChange}
              placeholder="Ej: https://mioptika.cl"
              style={styles.input}
            />
            <p style={styles.hint}>Si proporcionas tu sitio web, extraeremos tus servicios automáticamente.</p>
          </div>

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
            {loading ? 'Creando cuenta...' : 'Continuar a planes de pago'}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
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
    maxWidth: '600px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '8px',
    padding: '40px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7770',
    maxWidth: '500px',
    margin: '12px auto 0',
  },
  form: {
    marginBottom: '30px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#16241f',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7770',
    marginTop: '6px',
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
    transition: 'opacity 0.2s',
  },
  error: {
    background: '#f3e1dc',
    color: '#a8493b',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '14px',
  },
  success: {
    background: '#e4ede9',
    color: '#1f4e44',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  serviceList: {
    listStyle: 'none',
    padding: '8px 0',
    margin: '0',
  },
  footer: {
    textAlign: 'center',
    borderTop: '1px solid #ddd',
    paddingTop: '20px',
    color: '#6b7770',
    fontSize: '14px',
  },
  link: {
    color: '#2f6f62',
    textDecoration: 'none',
  },
  successMessage: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  spinner: {
    display: 'inline-block',
    width: '40px',
    height: '40px',
    marginTop: '20px',
    border: '4px solid #e4ede9',
    borderTop: '4px solid #2f6f62',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Agregar animación CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
