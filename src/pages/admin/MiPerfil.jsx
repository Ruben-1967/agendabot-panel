import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function MiPerfil() {
  const { usuario } = useAuth();
  const [formData, setFormData] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmar: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(false);

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
    setExito(false);

    try {
      // Validar campos
      if (!formData.passwordActual || !formData.passwordNueva || !formData.passwordConfirmar) {
        throw new Error('Todos los campos son requeridos');
      }

      if (formData.passwordNueva.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      if (formData.passwordNueva !== formData.passwordConfirmar) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }

      if (formData.passwordActual === formData.passwordNueva) {
        throw new Error('La contraseña nueva debe ser diferente a la actual');
      }

      // Hacer request al backend
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/cambiar-contraseña`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          passwordActual: formData.passwordActual,
          passwordNueva: formData.passwordNueva,
          passwordConfirmar: formData.passwordConfirmar,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al cambiar contraseña');
      }

      const resultado = await res.json();

      // Éxito
      setExito(true);
      setFormData({
        passwordActual: '',
        passwordNueva: '',
        passwordConfirmar: '',
      });

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setExito(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.titulo}>Mi Perfil</h1>

        {/* Información del usuario */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitulo}>Información de Cuenta</h2>
          <div style={styles.infoRow}>
            <span style={styles.label}>Nombre:</span>
            <span style={styles.value}>{usuario?.nombre}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Email:</span>
            <span style={styles.value}>{usuario?.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Rol:</span>
            <span style={styles.value}>{usuario?.rol}</span>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitulo}>Cambiar Contraseña</h2>

          {error && <div style={styles.error}>{error}</div>}
          {exito && <div style={styles.exito}>✓ Contraseña actualizada exitosamente</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Contraseña actual */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Contraseña actual *</label>
              <input
                type="password"
                name="passwordActual"
                value={formData.passwordActual}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña actual"
                style={styles.input}
                required
              />
            </div>

            {/* Contraseña nueva */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Contraseña nueva *</label>
              <input
                type="password"
                name="passwordNueva"
                value={formData.passwordNueva}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                style={styles.input}
                required
              />
              <p style={styles.hint}>Debe tener al menos 8 caracteres</p>
            </div>

            {/* Confirmar contraseña */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Confirmar contraseña *</label>
              <input
                type="password"
                name="passwordConfirmar"
                value={formData.passwordConfirmar}
                onChange={handleChange}
                placeholder="Confirma tu contraseña nueva"
                style={styles.input}
                required
              />
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  titulo: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#16241f',
    marginBottom: '30px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitulo: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#16241f',
    marginBottom: '20px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
  },
  label: {
    fontWeight: 600,
    color: '#6b7770',
  },
  value: {
    color: '#16241f',
  },
  form: {
    marginTop: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
    marginTop: '8px',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7770',
    marginTop: '6px',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#2f6f62',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  error: {
    background: '#f3e1dc',
    color: '#a8493b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  exito: {
    background: '#e4ede9',
    color: '#1f4e44',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
  },
};
