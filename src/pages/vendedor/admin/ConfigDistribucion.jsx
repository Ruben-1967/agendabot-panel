import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import { fetchConfigDistribucion, guardarConfigDistribucion } from '../../../api/client';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';

export default function ConfigDistribucion() {
  const { token } = useVendedorAuth();
  const [cupo, setCupo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetchConfigDistribucion(token)
      .then((data) => setCupo(String(data.cupoMaximoCasosActivos)))
      .catch((err) => setError(err.message || 'No se pudo cargar la configuración'))
      .finally(() => setCargando(false));
  }, [token]);

  async function manejarGuardar() {
    setGuardando(true);
    setError('');
    setGuardado(false);
    try {
      await guardarConfigDistribucion(token, Number(cupo));
      setGuardado(true);
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Configuración de distribución de leads</h1>
        <p className="texto-ayuda">
          Cupo máximo de casos activos por vendedor. Un lead nuevo (WhatsApp o email) se asigna
          automáticamente al vendedor activo con menos casos que aún no llegue a este cupo. Cuando un
          vendedor cierra un caso (lo convierte o lo descarta), si le queda cupo libre se le entra
          automáticamente el siguiente lead que esté esperando en el pool. Si nadie tiene cupo libre,
          el lead queda sin asignar en el pool para traspasarlo a mano.
        </p>

        {error && <p className="login-error">{error}</p>}
        {guardado && <p className="aviso-guardado">Guardado.</p>}
        {cargando && <p>Cargando…</p>}

        {!cargando && (
          <div className="form-vendedor" style={{ marginBottom: 18 }}>
            <label>
              Cupo máximo de casos activos por vendedor
              <input
                type="number"
                min="1"
                value={cupo}
                onChange={(e) => setCupo(e.target.value)}
              />
            </label>
          </div>
        )}

        {!cargando && (
          <button className="cta-primaria" onClick={manejarGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  );
}
